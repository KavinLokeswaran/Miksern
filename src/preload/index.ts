import { contextBridge, ipcRenderer } from 'electron'
import { IPC, type MikserenApi } from '../shared/ipc'

const api: MikserenApi = {
  platform: process.platform,
  pickAudioFile: () => ipcRenderer.invoke(IPC.pickAudioFile),
  readAudioFile: (path) => ipcRenderer.invoke(IPC.readAudioFile, path)
}

contextBridge.exposeInMainWorld('mikseren', api)
