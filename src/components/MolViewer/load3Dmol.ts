// 3Dmol pesa varios cientos de kB: se importa de forma diferida, una sola vez,
// para que no entre en el bundle inicial.

export type Lib3Dmol = typeof import('3dmol')

let promise: Promise<Lib3Dmol> | undefined

export function load3Dmol(): Promise<Lib3Dmol> {
  promise ??= import('3dmol').then((module) => {
    // Según el empaquetador, el build UMD llega como espacio de nombres o como `default`.
    const lib = module as Lib3Dmol & { default?: Lib3Dmol }
    return typeof lib.createViewer === 'function' ? lib : (lib.default ?? lib)
  })
  return promise
}
