import type { Action } from '../actions/types'
import type { TourId } from '../help/tourIds'
import type { AppState } from '../state/store'

/** Det grunnkurset og leksjonene kan se på når de sjekker om et steg er gjort. */
export interface TourSnapshot {
  app: AppState
  library: { folder: string | null; trackCount: number }
  practiceChosen: boolean
  /** Har kanalen/master klippet nylig? */
  clipping: { A: boolean; B: boolean; master: boolean }
}

/** En handling brukeren nettopp gjorde (eller null ved jevnlig sjekk), og tilstanden etterpå. */
export interface TourEvent {
  action: Action | null
  snap: TourSnapshot
}

/** Gir true når steget er gjort. `memo` kan brukes til å huske noe mellom sjekkene i samme steg. */
export type StepCheck = (event: TourEvent, memo: Record<string, unknown>) => boolean

export interface StepButton {
  label: string
  /** Handlingene kjøres etter hverandre. */
  actions: Action[]
  /** Vis knappen bare når dette er sant. */
  showIf?: (snap: TourSnapshot) => boolean
}

export interface TourStep {
  id: string
  title: string
  text: string
  /** Kontrollene som lyses opp. Uten mål vises forklaringen midt på skjermen. */
  target?: TourId[]
  /** Steget er fullført når denne gir true. Uten den går man videre med «Neste». */
  done?: StepCheck
  /** Kort beskjed om hva appen venter på. */
  waiting?: string
  buttons?: StepButton[]
  /** Handlinger som kjøres når steget starter (f.eks. åpne riktig fane). */
  onEnter?: Action[]
}

export interface Tour {
  id: string
  title: string
  /** Kort beskrivelse i ?-menyen. */
  description: string
  steps: TourStep[]
}
