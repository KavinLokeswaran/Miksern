import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

/**
 * En enkel JSON-fil på disk. Endringer samles opp og skrives litt etter,
 * og alltid via en midlertidig fil, så fila ikke blir ødelagt om appen krasjer.
 */
export class JsonFile<T extends object> {
  private data: T
  private timer: NodeJS.Timeout | null = null

  constructor(
    private readonly file: string,
    defaults: () => T,
    migrate: (raw: unknown) => T | null = (raw) => raw as T,
    private readonly delayMs = 400
  ) {
    this.data = this.load(defaults, migrate)
  }

  get(): T {
    return this.data
  }

  update(change: (data: T) => T): T {
    this.data = change(this.data)
    this.scheduleSave()
    return this.data
  }

  /** Skriver til disk med en gang (f.eks. når appen avsluttes). */
  flush(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    mkdirSync(dirname(this.file), { recursive: true })
    const tmp = `${this.file}.tmp`
    writeFileSync(tmp, JSON.stringify(this.data))
    renameSync(tmp, this.file)
  }

  private scheduleSave(): void {
    if (this.timer) return
    this.timer = setTimeout(() => {
      this.timer = null
      try {
        this.flush()
      } catch (err) {
        console.error('Klarte ikke å lagre', this.file, err)
      }
    }, this.delayMs)
  }

  private load(defaults: () => T, migrate: (raw: unknown) => T | null): T {
    try {
      const raw: unknown = JSON.parse(readFileSync(this.file, 'utf8'))
      return migrate(raw) ?? defaults()
    } catch {
      // Ingen fil ennå, eller fila er ødelagt: start på nytt.
      return defaults()
    }
  }
}
