/** Número con signo explícito y menos tipográfico: +1.8, −3.5, 0.0. */
export function formatSigned(value: number, digits = 1): string {
  const text = Math.abs(value).toFixed(digits)
  if (Number(text) === 0) return text
  return `${value < 0 ? '−' : '+'}${text}`
}
