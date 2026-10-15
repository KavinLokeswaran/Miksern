/**
 * Holder styr på avspillingsposisjonen (i sekunder i låten) ut fra en klokke.
 * Ren logikk uten Web Audio, så den kan testes. `now` er AudioContext.currentTime.
 */
export class Playhead {
  private anchorPos = 0
  private anchorTime = 0
  private rate = 1
  private running = false

  get isRunning(): boolean {
    return this.running
  }

  get playbackRate(): number {
    return this.rate
  }

  position(now: number): number {
    if (!this.running) return this.anchorPos
    return this.anchorPos + (now - this.anchorTime) * this.rate
  }

  start(pos: number, now: number): void {
    this.anchorPos = pos
    this.anchorTime = now
    this.running = true
  }

  /** Stopper klokka og returnerer posisjonen der den stoppet. */
  stop(now: number): number {
    this.anchorPos = this.position(now)
    this.anchorTime = now
    this.running = false
    return this.anchorPos
  }

  /** Flytter posisjonen uten å endre om klokka går eller ikke. */
  set(pos: number, now: number): void {
    this.anchorPos = pos
    this.anchorTime = now
  }

  /** Endrer tempoet fra og med `now`. Posisjonen så langt beholdes. */
  setRate(rate: number, now: number): void {
    this.anchorPos = this.position(now)
    this.anchorTime = now
    this.rate = rate
  }
}
