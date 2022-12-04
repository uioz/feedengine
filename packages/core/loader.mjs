const sequelizePath = await import.meta.resolve('sequelize');

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'sequelize') {
    return {
      shortCircuit: true,
      url: sequelizePath,
    };
  }

  return nextResolve(specifier);
}
