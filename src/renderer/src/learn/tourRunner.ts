import type { Tour, TourEvent, TourStep } from './tourTypes'

/**
 * Holder styr på hvilket steg man er på i et kurs, og sjekker om steget er gjort.
 * Ren logikk uten skjerm, så den kan testes.
 */
export class TourRunner {
  private index = 0
  private memo: Record<string, unknown> = {}
  /** Etter «Tilbake» må brukeren gjøre noe nytt før steget kan fullføres av seg selv. */
  private waitForAction = false

  constructor(readonly tour: Tour) {}

  get stepIndex(): number {
    return this.index
  }

  get step(): TourStep {
    return this.tour.steps[this.index]
  }

  get isFirst(): boolean {
    return this.index === 0
  }

  get isLast(): boolean {
    return this.index === this.tour.steps.length - 1
  }

  /** Er steget gjort? Steg uten sjekk fullføres bare med «Neste». */
  check(event: TourEvent): boolean {
    const done = this.step.done
    if (!done) return false
    if (this.waitForAction) {
      if (!event.action) return false
      this.waitForAction = false
    }
    return done(event, this.memo)
  }

  /** Går til neste steg. Gir false hvis kurset er ferdig. */
  next(): boolean {
    if (this.isLast) return false
    this.index++
    this.memo = {}
    this.waitForAction = false
    return true
  }

  back(): void {
    if (this.isFirst) return
    this.index--
    this.memo = {}
    this.waitForAction = true
  }
}
