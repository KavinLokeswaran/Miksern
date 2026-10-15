import type { TrackStatus } from '@shared/library'

/** Vennlige feilmeldinger når en låt ikke kan lastes inn. */
export type LoadProblem = 'not-allowed' | 'not-found' | 'unreadable' | 'undecodable'

export function loadErrorMessage(problem: LoadProblem): string {
  switch (problem) {
    case 'not-found':
      return 'Fant ikke fila. Kanskje den er flyttet eller slettet?'
    case 'unreadable':
    case 'not-allowed':
      return 'Fikk ikke lest fila. Prøv å velge den på nytt.'
    case 'undecodable':
      return 'Denne fila kan ikke spilles av. Den kan være skadet, eller kopibeskyttet (for eksempel kjøpt eller lastet ned fra Apple Music).'
  }
}

/** Forklaring på hvorfor en låt i biblioteket ble hoppet over. */
export function trackProblemMessage(status: Exclude<TrackStatus, 'ok'>): string {
  switch (status) {
    case 'protected':
      return 'Kopibeskyttet (for eksempel fra Apple Music). Slike filer kan bare spilles i Apple sin egen app.'
    case 'unsupported':
      return 'Formatet støttes ikke (Apple Lossless). Gjør den om til MP3, AAC, WAV eller FLAC for å bruke den.'
    case 'unreadable':
      return 'Fila ser ut til å være skadet, eller den er ikke en lydfil appen kan lese.'
  }
}

export function folderErrorMessage(reason: 'no-folder' | 'folder-missing'): string {
  return reason === 'folder-missing'
    ? 'Fant ikke musikkmappa. Er den flyttet, eller er en ekstern disk koblet fra?'
    : 'Velg en mappe med musikk for å komme i gang.'
}
