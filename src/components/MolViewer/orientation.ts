// Orientación inicial: gira la molécula para verla "de frente" (su cara más
// ancha hacia la cámara) en vez de en la orientación arbitraria del archivo.

type Vec3 = [number, number, number]
export type Quaternion = [x: number, y: number, z: number, w: number]

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
]
const normalize = (v: Vec3): Vec3 => {
  const length = Math.hypot(...v) || 1
  return [v[0] / length, v[1] / length, v[2] / length]
}

/** Vector propio dominante de una matriz simétrica 3×3 (iteración de potencias). */
function dominantAxis(matrix: Vec3[], orthogonalTo?: Vec3): Vec3 {
  let axis: Vec3 = normalize([1, 0.7, 0.4])
  for (let i = 0; i < 100; i++) {
    let next: Vec3 = [dot(matrix[0], axis), dot(matrix[1], axis), dot(matrix[2], axis)]
    if (orthogonalTo) {
      const projection = dot(next, orthogonalTo)
      next = [
        next[0] - projection * orthogonalTo[0],
        next[1] - projection * orthogonalTo[1],
        next[2] - projection * orthogonalTo[2],
      ]
    }
    if (Math.hypot(...next) < 1e-9) break
    axis = normalize(next)
  }
  return axis
}

/**
 * Cuaternión que lleva el eje más largo de la nube de puntos a X y el segundo a Y,
 * de modo que el más corto apunte a la cámara.
 */
export function faceOnQuaternion(points: { x: number; y: number; z: number }[]): Quaternion {
  if (points.length < 3) return [0, 0, 0, 1]
  const center: Vec3 = [0, 0, 0]
  for (const p of points) {
    center[0] += p.x / points.length
    center[1] += p.y / points.length
    center[2] += p.z / points.length
  }
  const covariance: Vec3[] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ]
  for (const p of points) {
    const d: Vec3 = [p.x - center[0], p.y - center[1], p.z - center[2]]
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) covariance[i][j] += d[i] * d[j]
  }
  const e1 = dominantAxis(covariance)
  const e2 = dominantAxis(covariance, e1)
  const e3 = cross(e1, e2)

  // Matriz de rotación con filas e1, e2, e3 → cuaternión.
  const [m00, m01, m02] = e1
  const [m10, m11, m12] = e2
  const [m20, m21, m22] = e3
  const trace = m00 + m11 + m22
  if (trace > 0) {
    const s = Math.sqrt(trace + 1) * 2
    return [(m21 - m12) / s, (m02 - m20) / s, (m10 - m01) / s, s / 4]
  }
  if (m00 > m11 && m00 > m22) {
    const s = Math.sqrt(1 + m00 - m11 - m22) * 2
    return [s / 4, (m01 + m10) / s, (m02 + m20) / s, (m21 - m12) / s]
  }
  if (m11 > m22) {
    const s = Math.sqrt(1 + m11 - m00 - m22) * 2
    return [(m01 + m10) / s, s / 4, (m12 + m21) / s, (m02 - m20) / s]
  }
  const s = Math.sqrt(1 + m22 - m00 - m11) * 2
  return [(m02 + m20) / s, (m12 + m21) / s, s / 4, (m10 - m01) / s]
}
