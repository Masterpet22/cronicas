let accountStorage;

export function browserSaveStorage() {
  try { return globalThis.localStorage; }
  catch (_) { return undefined; }
}

export function currentSaveStorage() {
  return accountStorage || browserSaveStorage();
}

export function useAccountSaveStorage(storage) {
  accountStorage = storage;
}
