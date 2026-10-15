import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type MikserenApi } from '../shared/ipc'
import type { ScanProgress } from '../shared/library'

const api: MikserenApi = {
  platform: process.platform,
  pickAudioFile: () => ipcRenderer.invoke(IPC.pickAudioFile),
  readAudioFile: (path) => ipcRenderer.invoke(IPC.readAudioFile, path),
  getLibrary: () => ipcRenderer.invoke(IPC.getLibrary),
  pickLibraryFolder: () => ipcRenderer.invoke(IPC.pickLibraryFolder),
  rescanLibrary: () => ipcRenderer.invoke(IPC.rescanLibrary),
  markTrackProblem: (id, status) => ipcRenderer.invoke(IPC.markTrackProblem, id, status),
  getAnalysis: (path) => ipcRenderer.invoke(IPC.getAnalysis, path),
  saveAnalysis: (path, analysis, waveform) => ipcRenderer.invoke(IPC.saveAnalysis, path, analysis, waveform),
  onScanProgress: (listener) => {
    const handler = (_event: IpcRendererEvent, progress: ScanProgress): void => listener(progress)
    ipcRenderer.on(IPC.scanProgress, handler)
    return () => ipcRenderer.removeListener(IPC.scanProgress, handler)
  }
}

contextBridge.exposeInMainWorld('mikseren', api)
