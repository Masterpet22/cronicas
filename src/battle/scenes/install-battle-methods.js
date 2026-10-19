export function installBattleMethods(targetClass, ...methodClasses) {
  methodClasses.forEach((methodClass) => {
    const descriptors = Object.getOwnPropertyDescriptors(methodClass.prototype);
    delete descriptors.constructor;
    Object.defineProperties(targetClass.prototype, descriptors);
  });
}

