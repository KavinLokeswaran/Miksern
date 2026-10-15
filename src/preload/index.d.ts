import type { MikserenApi } from '../shared/ipc'

declare global {
  interface Window {
    mikseren: MikserenApi
  }
}
