// Calcula la rejilla de potencial fuera del hilo principal.
import { computePotentialGrid, type CloudRequest, type CloudResponse } from './chargeCloud'

self.onmessage = (event: MessageEvent<CloudRequest>) => {
  const { id, atoms, charges, spec } = event.data
  const data = computePotentialGrid(atoms, charges, spec)
  const response: CloudResponse = { id, data }
  postMessage(response, { transfer: [data.buffer] })
}
