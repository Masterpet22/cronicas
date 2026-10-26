# Validación de la plantilla artística común

Fecha de revisión: 26 de octubre de 2026.

## Resultado

La integridad técnica de las seis combinaciones activas de cuerpo/cabello pasa. La plantilla
artística común **todavía no está lista para exportar el vestuario definitivo ni para cerrar
la fase de identidad visual**. El informe distingue estas dos conclusiones de forma explícita.

Se añadió un contrato maestro candidato verificable y una guía SVG para producir los próximos
recursos sin seguir multiplicando atlas incompatibles. No se reemplazó ninguna marioneta ni
se habilitó personalización experimental.

## Evidencia revisada

- Hoja artística: `assets/reference/modular-character-system-v1.png`.
- Contrato medible nuevo: `assets/reference/character-template-v1.json`.
- Guía vectorial: `assets/reference/character-template-v1.svg`.
- Piezas activas: `assets/modular/man_sprites/runtime/` y `woman_sprites/runtime/`.
- Constructor real de combate: `src/fighters.js` y `src/animations/rig.js`.
- Constructor real de la vista del Dojo: `rasterCharacterPreviewMarkup` en `src/ui/meta/views/dojo.js`.
- Catálogo de movimientos: `src/animations/clips.js`.
- Inventario experimental archivado: `assets/modular/manifest.json`.

El manifiesto de 768×768 describe los atlas experimentales; no es el contrato de las piezas
recortadas usadas en combate. El runtime usa centros y pivotes registrados en coordenadas
de un lienzo conceptual 2048×2048. Confundir ambos contratos produce prendas y rostros
desalineados aunque los PNG tengan transparencia y los nombres correctos.

## Comprobaciones reproducibles

```powershell
node scripts/validate-character-template.mjs
node tests/character-template.test.mjs
```

La auditoría ejecuta `createPlayerFighter` con un adaptador de escena sin animación temporal,
usa las dimensiones PNG reales y recorre su jerarquía de contenedores. Compara sus matrices
neutrales con el markup real del Dojo, incluido su redondeo CSS. Evalúa únicamente los
literales y la función local de esa vista en un VM sin acceso al DOM ni a Node; no mantiene
otra copia editable de coordenadas, cabello o cuerpos.

Genera:

- `artifacts/character-template/validation.json`: dimensiones, SHA-256 de los 30 PNG usados,
  registros por combinación, orden de capas y motivos por los que el arte sigue pendiente.
- `artifacts/character-template/comparison.html`: lámina autónoma de las seis combinaciones;
  incorpora los PNG originales una sola vez y permite mostrar/ocultar los pivotes.
- `assets/reference/character-template-v1.svg`: guía regenerable desde el contrato JSON.

`artifacts/character-template/comparison.png` conserva la revisión visual de la lámina
renderizada en Chromium, con seis tarjetas y 176 instancias de capas, sin errores de navegador.

El comando normal devuelve 0 si la integridad técnica pasa. **No significa aprobación artística.**
`node scripts/validate-character-template.mjs --strict` devuelve 1 mientras el informe siga
marcando `productionApproval.approved: false`; es el resultado esperado con los recursos actuales.

## Hallazgos medidos

Todas las magnitudes de esta tabla están en unidades del rig neutral, antes de la escala 0,13
de combate. Las cajas son geométricas; no representan una medición anatómica del contorno opaco.

| Comprobación | Masculino | Femenino |
| --- | ---: | ---: |
| Piezas de cuerpo | 14 | 14 |
| Peinados comprobados | Sin cabello, Corto, Coleta | Sin cabello, Corto, Coleta |
| Coronilla de caja neutral | −694,684 | −615,980 |
| Suelo de caja neutral | 800,316 | 692,070 |
| Altura geométrica de cabeza | 392,000 | 345,840 |
| Relación altura total / cabeza | 3,8138 | 3,7822 |
| Máximo error geométrico Dojo/combate | 0,0080 | 0,0073 |
| Orden de capas Dojo/combate | Difiere | Coincide |
| Clips con objetivos requeridos presentes | 18 | 18 |

- **Registro de cuerpo y cabello:** las seis combinaciones coinciden en recursos, centros,
  tamaño y rotación dentro de la tolerancia de 0,1 unidades. El residuo se debe al redondeo
  porcentual de CSS. La adaptación de cabello femenino conserva el registro de la cabeza.
- **Línea de suelo común:** difiere 108,246 unidades entre cuerpos, aproximadamente 14,072 px
  a escala 0,13. Las coronillas difieren 78,704 unidades, aproximadamente 10,232 px. No deben
  tratarse como dos exportaciones ya normalizadas a la misma plantilla.
- **Capas del masculino:** el Dojo ordena piezas globalmente; el combate dibuja ramas completas
  del esqueleto. Por ejemplo, antebrazo y mano izquierdos quedan detrás del torso en combate,
  pero el orden global del Dojo los sitúa por delante. La coincidencia de posiciones neutrales
  no garantiza el mismo solapamiento. No se cambió ese orden automáticamente.
- **Lados anatómicos:** los alias de PNG de brazos se conservan. Derecha anatómica se representa
  a la izquierda de la pantalla. El contrato no renombra archivos para ocultar esos alias.
- **Estilo y proporciones:** la hoja guía es ilustrada y plantea unas 3,5 cabezas; las piezas
  activas son raster provisionales y rondan 3,8 en sus cajas geométricas. No son ilustraciones
  finales aprobadas por cumplir un esquema de pivotes.
- **Animaciones:** disponer de los objetivos de 18 clips demuestra compatibilidad del rig.
  Esta auditoría neutral no aprueba visualmente todas las poses, contactos ni costuras en movimiento.
- **Renderer WebGL de referencia:** en las capturas de preparación con SwiftShader se observan
  recortes triangulares en algunas piezas. También aparecen en la línea base anterior de fase 0
  (`artifacts/phaser-performance/1366x768-webgl-normal-charged-turn.png`); la captura Canvas
  equivalente conserva las piezas completas. La validación geométrica/SVG no acredita por sí
  sola el resultado WebGL. El problema de renderizado debe aislarse antes de aprobar el arte
  en producción; no se atribuye todavía al driver ni a los PNG sin una prueba específica.

## Contrato común para producir el arte

El JSON es una **candidata técnica de producción**, no un nuevo diseño ilustrado aprobado.
Toma como espacio de trabajo el lienzo conceptual 2048×2048 ya documentado por el runtime:

1. Un maestro RGBA sin recortar por cuerpo; origen (1024,1024), coronilla objetivo y=330 y
   suelo y=1800, cabeza objetivo de 420 unidades y relación total 3,5.
2. Escala, coronilla, suelo y anclajes semánticos comunes en ambos maestros. Las siluetas
   masculina y femenina pueden diferir, pero las prendas no deben inventar otro cuerpo.
3. Anchors `HEAD`, `NECK`, `SHOULDER_R/L`, `HAND_R/L`, `WAIST`, `FOOT_R/L` y `WEAPON_HAND`
   definidos en el contrato; tolerancia de registro de cuatro unidades. El arma usa la mano
   derecha anatómica, situada a la izquierda de pantalla, salvo declaración explícita de otra pose.
4. Capas separadas de cabello trasero, cuerpo, inferior, calzado, superior, rostro, cabello
   delantero, accesorio y arma. Brazos, antebrazos y manos articulados necesitan sus pivotes y
   solapes propios; una prenda de torso no debe cubrir de forma rígida todo el brazo animado.
5. Todo recorte de runtime debe conservar el registro respecto del maestro: cuerpo, variante,
   rol, caja de recorte, offsets, pivotes, escala y orden. No recentrar ni reescalar cada PNG
   independientemente. La coincidencia de un nombre de archivo no acredita compatibilidad.
6. Metadatos por recurso: `templateId`, `bodyType`, `role`, `variantId`, `anchors`, `source`,
   `license` y `artReview`. El vestido se produce sobre esos cuerpos, no sobre los atlas archivados.

## Criterio de salida artístico pendiente

Producir los dos maestros ilustrados y al menos un conjunto completo compatible (rostro,
prenda superior, inferior y calzado), con el mismo registro. Revisar las seis combinaciones
actuales a 220–255 px de altura, mirando cara y cabello en retratos, y probar reposo, ataque,
guardia, preparación, impacto y derrota. Verificar hombros, codos, muñecas, cintura, rodillas,
tobillos, solapes y reflejo horizontal. Confirmar que Dojo y combate dibujan el mismo orden.

Después se podrá integrar cada recurso con su revisión artística registrada. Hasta entonces
la salida correcta de esta validación es: **rig y registros actuales coherentes; arte común
definitivo y vestuario pendientes**.
