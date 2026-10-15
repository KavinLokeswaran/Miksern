import { create } from 'zustand'

export interface ActiveTour {
  /** 'intro' for grunnkurset, ellers leksjons-ID. */
  tourId: string
  step: number
  /** Steget er fullført: vis «Bra!» et øyeblikk før neste steg. */
  success: boolean
}

export interface Toast {
  id: number
  title: string
  text: string
}

export interface LearnState {
  active: ActiveTour | null
  /** Brukeren valgte øvelses-beats i grunnkurset. */
  practiceChosen: boolean
  toast: Toast | null
  /** ?-menyen er åpen. */
  menuOpen: boolean
}

/** Tilstand for grunnkurs, leksjoner og beskjeder. Endres bare via dispatch(). */
export const useLearnStore = create<LearnState>()(() => ({
  active: null,
  practiceChosen: false,
  toast: null,
  menuOpen: false
}))
