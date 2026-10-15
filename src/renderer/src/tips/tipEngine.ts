import { TIP_RULES, type TipContext, type TipRule } from './tipRules'

export interface Tip {
  id: string
  text: string
}

/**
 * Bestemmer når et tips skal vises. Regler mot mas:
 * - hvert tips vises bare én gang (husket mellom gangene)
 * - betingelsen må holde seg sann en liten stund først
 * - det går minst `minGapSeconds` mellom to tips
 */
export class TipEngine {
  private readonly since = new Map<string, number>()
  private lastShownAt = -Infinity

  constructor(
    private readonly shown: Set<string>,
    private readonly minGapSeconds = 60,
    private readonly rules: TipRule[] = TIP_RULES
  ) {}

  /** Sjekker reglene. `now` er sekunder. Gir et tips som skal vises nå, eller null. */
  update(ctx: TipContext, now: number): Tip | null {
    let candidate: Tip | null = null
    for (const rule of this.rules) {
      const text = rule.check(ctx)
      if (!text) {
        this.since.delete(rule.id)
        continue
      }
      if (!this.since.has(rule.id)) this.since.set(rule.id, now)
      if (candidate || this.shown.has(rule.id)) continue
      if (now - this.since.get(rule.id)! >= rule.holdSeconds) candidate = { id: rule.id, text }
    }
    return candidate ? this.offer(candidate, now) : null
  }

  /** Tilbyr et tips (f.eks. utløst av en handling). Gir det tilbake hvis det skal vises. */
  offer(tip: Tip, now: number): Tip | null {
    if (this.shown.has(tip.id) || now - this.lastShownAt < this.minGapSeconds) return null
    this.shown.add(tip.id)
    this.lastShownAt = now
    return tip
  }

  /** Gjelder tipset fortsatt? (Brukes for å skjule et tips når brukeren har gjort det.) */
  stillRelevant(id: string, ctx: TipContext): boolean {
    const rule = this.rules.find((r) => r.id === id)
    return rule ? rule.check(ctx) !== null : true
  }
}
