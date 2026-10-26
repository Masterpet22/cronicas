import assert from "node:assert/strict";
import { analyzeCharacterTemplate, compareLayerGeometry, validateTemplateContract } from "../scripts/validate-character-template.mjs";

const { report, contract } = await analyzeCharacterTemplate();
assert.deepEqual(validateTemplateContract(contract), []);
assert.equal(report.technicalIntegrity.passed, true, JSON.stringify(report.technicalIntegrity.errors));
assert.equal(report.variants.length, 6, "La auditoría debe cubrir ambos cuerpos y los tres peinados activos");
for (const variant of report.variants) {
  assert.deepEqual(variant.geometryDifferences, [], `${variant.bodyType}/${variant.hair}: el Dojo debe conservar el registro de combate`);
  assert.ok(variant.maxTransformError <= contract.tolerances.dojoTransformPx);
  assert.ok(variant.supportedClips.includes("prepare-technique"));
  assert.ok(variant.supportedClips.includes("punch-release"));
}
assert.equal(report.productionApproval.approved, false, "La integridad del rig no debe aprobar automáticamente el arte definitivo");
assert.ok(report.productionApproval.reasons.length > 0);

const part={id:"head",asset:"head.png",width:100,height:100,matrix:[1,0,0,1,0,0]};
assert.deepEqual(compareLayerGeometry([part],[{...part}]),[]);
assert.equal(compareLayerGeometry([part],[{...part,matrix:[1,0,0,1,8,0]}]).length,1,"Debe detectar un anclaje desplazado");
assert.equal(compareLayerGeometry([part],[{...part,asset:"other.png"}]).length,1,"Debe detectar un recurso diferente");
assert.equal(compareLayerGeometry([part],[]).length,1,"Debe detectar capas ausentes");
assert.equal(compareLayerGeometry([],[part]).length,1,"Debe detectar capas que solo aparecen en el Dojo");
assert.equal(compareLayerGeometry([part],[{...part,matrix:[NaN,0,0,1,0,0]}]).length,1,"No debe ocultar transformaciones inválidas");
for (const field of ["headHeight", "bodyHeadRatio"]) {
  for (const value of [undefined, NaN, Infinity, -Infinity, 0, -1]) {
    assert.ok(validateTemplateContract({...contract,[field]:value}).includes("invalid-proportions"),
      `${field} debe ser finito y positivo, recibido ${String(value)}`);
  }
}
assert.ok(validateTemplateContract({...contract,anchors:{...contract.anchors,HEAD:[NaN,30]}}).length);
assert.ok(validateTemplateContract({...contract,exportRules:{...contract.exportRules,artReviewRequired:false}}).length);
console.log("Plantilla común: contrato, 6 registros Dojo/combate y bloqueo de aprobación artística verificados.");
