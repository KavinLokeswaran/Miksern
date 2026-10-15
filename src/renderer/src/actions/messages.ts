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
