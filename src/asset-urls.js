export const META_ASSET_VERSION = "0.82.5";

export function versionedAsset(path, version) {
  return `${path}?v=${version}`;
}

export const SHARED_BATTLE_ASSETS = Object.freeze({
  villageOutskirts: versionedAsset("assets/locations/village-outskirts.webp", "0.74.0"),
  forestRoad: versionedAsset("assets/locations/forest-road.webp", "0.75.0"),
  villageOutskirtsBranches: versionedAsset("assets/locations/village-outskirts-branches.webp", "0.74.0"),
  preparationMote: versionedAsset("assets/vfx/feedback/preparation-mote.png", "0.91.0"),
  kagemori: versionedAsset("assets/locations/kagemori.webp", "0.63.0")
});
