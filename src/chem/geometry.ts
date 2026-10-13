// Geometría molecular pura: distancias, ángulos y diedros a partir de coordenadas.

export interface Point3 {
  x: number
  y: number
  z: number
}

type Vec3 = [number, number, number]

const subtract = (a: Point3, b: Point3): Vec3 => [a.x - b.x, a.y - b.y, a.z - b.z]
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const norm = (a: Vec3) => Math.hypot(a[0], a[1], a[2])
const toDegrees = (radians: number) => (radians * 180) / Math.PI

/** Distancia entre dos puntos (en las unidades de las coordenadas; Å en un SDF o PDB). */
export function distance(a: Point3, b: Point3): number {
  return norm(subtract(a, b))
}

/** Ángulo a–b–c en grados (0–180), con vértice en `b`. */
export function angle(a: Point3, b: Point3, c: Point3): number {
  const u = subtract(a, b)
  const v = subtract(c, b)
  return toDegrees(Math.atan2(norm(cross(u, v)), dot(u, v)))
}

/**
 * Ángulo diedro a–b–c–d en grados (−180 a 180), con el signo de la IUPAC:
 * positivo si, mirando de `b` hacia `c`, hay que girar `a` en sentido horario
 * para eclipsarlo con `d`.
 */
export function dihedral(a: Point3, b: Point3, c: Point3, d: Point3): number {
  const b1 = subtract(b, a)
  const b2 = subtract(c, b)
  const b3 = subtract(d, c)
  const n2 = cross(b2, b3)
  return toDegrees(Math.atan2(norm(b2) * dot(b1, n2), dot(cross(b1, b2), n2)))
}

export function midpoint(a: Point3, b: Point3): Point3 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }
}
