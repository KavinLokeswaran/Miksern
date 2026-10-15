# Mikseren

En DJ-mikser for Mac, laget for folk som aldri har DJ-et før. Du mikser to låter fra
din egen musikksamling, og appen lærer deg det viktigste underveis: et kort grunnkurs
første gang, og små leksjoner som låser opp nye kontroller etter hvert.

![Ikon](build/icon.png)

## Hva appen kan

- To decks (A og B) med play, cue, tempo-slider (±8 %) og Synk.
- Automatisk BPM og beatgrid, bølgeformer og fasemåler.
- Mikser med trim, EQ (bass, mellomtone, diskant), filter, volumfadere, krysslider,
  nivåmålere, klippevarsel og limiter.
- Hot cues (4 per låt, huskes), loops på 1/2–16 slag, effekter (Echo, Reverb, Flanger)
  og opptak av miksen til WAV.
- Musikkbibliotek med søk og sortering. Alle låtene analyseres én gang i bakgrunnen.
- Grunnkurs, seks leksjoner, Enkel og Avansert modus, hjelpebobler og små tips.
- To øvelses-beats som appen lager selv, så du kan øve uten egen musikk.

## Slik åpner du appen (installasjonsfila)

1. Dobbeltklikk på `Mikseren-0.1.0-arm64.dmg` (ligger i mappa `release`).
2. Dra **Mikseren** over i **Programmer** (Applications).
3. Åpne Mikseren fra Programmer eller Launchpad.

### Hvis Mac sier at appen ikke kan åpnes

Appen er **ikke signert** med et Apple-utviklersertifikat. Det koster penger og krever
en Apple-utviklerkonto. macOS stoler derfor ikke automatisk på appen.

- Har du laget `.dmg`-fila selv på denne Macen, åpner appen seg som regel helt vanlig.
- Har du fått fila fra noen andre (f.eks. lastet ned eller fått på e-post), stopper macOS
  den første gang. Gjør da slik:
  1. Prøv å åpne Mikseren én gang, og trykk **Ferdig** (eller **OK**) i beskjeden.
  2. Åpne **Systeminnstillinger → Personvern og sikkerhet**.
  3. Bla ned til beskjeden om Mikseren, og trykk **Åpne likevel**.
  4. Bekreft med passordet ditt eller Touch ID. Etter dette åpner appen seg som vanlig.

Hjelper ikke det, kan du fjerne «nedlastet fra Internett»-merket i Terminal:

```bash
xattr -dr com.apple.quarantine /Applications/Mikseren.app
```

> `.dmg`-fila er laget for Mac med Apple-chip (M1, M2, M3 …). For en eldre Mac med
> Intel-prosessor, endre `arch: ['arm64']` til `arch: ['x64']` i
> `electron-builder.config.cjs` og bygg på nytt.

## Første gang du bruker appen

- Grunnkurset starter av seg selv. Det tar et par minutter, og du lærer ved å gjøre det.
- Under **?** øverst til høyre finner du grunnkurset (på nytt) og leksjonene:
  EQ og filter, Trim og nivåer, Cue og hot cues, Loops, Effekter og Opptak.
  Hver leksjon låser opp kontrollene den handler om.
- Bryteren **Enkel modus / Avansert modus** viser alle kontroller med en gang.
- Hold musa stille over en kontroll, så får du en kort forklaring.

### Tastatursnarveier

| Tast | Hva den gjør                     |
| ---- | -------------------------------- |
| Q    | Spill av / pause deck A          |
| P    | Spill av / pause deck B          |
| W    | Cue på deck A                    |
| O    | Cue på deck B                    |
| ← →  | Flytt krysslideren               |
| Esc  | Lukk grunnkurset eller leksjonen |

## Hvilke filer appen kan spille

MP3, WAV, FLAC og M4A/AAC. Filer appen ikke kan spille, hoppes over med en forklaring:

- Kopibeskyttede filer fra Apple Music (`.m4p`).
- Apple Lossless (ALAC) i `.m4a`. Gjør dem om til AAC, MP3, WAV eller FLAC.
- Skadede filer.

## Hvor appen lagrer ting

Alt ligger i `~/Library/Application Support/Mikseren/`:

- `mikseren-data.json`: biblioteket, BPM, hot cues, innstillinger og fremgang i leksjonene.
- `waveforms/`: bølgeformene til låtene.

Vil du starte helt på nytt, avslutt appen og slett mappa. Musikkfilene dine blir aldri
endret.

---

## For deg som utvikler appen

Krever Node.js 22 og npm 10.

```bash
npm install
```

| Kommando            | Hva den gjør                                                   |
| ------------------- | -------------------------------------------------------------- |
| `npm run dev`       | Starter appen i utviklingsmodus (endringer vises med en gang). |
| `npm test`          | Kjører alle testene (Vitest).                                  |
| `npm run typecheck` | Sjekker at TypeScript-koden henger sammen.                     |
| `npm run format`    | Ordner kodestilen (Prettier).                                  |
| `npm run dist:mac`  | Lager `.dmg`-installasjonsfila i mappa `release`.              |
| `npm run icon`      | Lager `build/icon.png` på nytt fra `build/icon.svg`.           |

### Bytte navn på appen

Navnet står ett sted: `src/shared/appInfo.ts` (`APP_NAME` og `APP_ID`). Byggeoppsettet leser
derfra. Kjør `npm run dist:mac` etterpå. NB: Endrer du `APP_NAME`, får appen en ny datamappe.

### Endre tekster

- Hjelpebobler: `src/renderer/src/help/helpTexts.ts`
- Grunnkurs og leksjoner (steg, tekst og hva som fullfører et steg): `src/renderer/src/learn/tours.ts`
- Små tips: `src/renderer/src/tips/tipRules.ts`
- Feilmeldinger: `src/renderer/src/actions/messages.ts`

### Hvordan appen er bygget opp

- **Electron + Vite (electron-vite) + React + TypeScript.**
- `src/main/`: hovedprosessen. Vinduet, filer, mappeskanning (music-metadata), lagring
  i JSON, cues og opptak. Grensesnittet får bare lese filer brukeren har valgt.
- `src/preload/`: et lite, eksplisitt API (`window.mikseren`) mellom main og grensesnittet
  (contextIsolation på, nodeIntegration av, sandbox).
- `src/renderer/src/`: grensesnittet.
  - `actions/dispatch.ts`: **alle handlinger går gjennom `dispatch()`**: knapper,
    tastatur, grunnkurs og tips. MIDI kan kobles på her senere.
  - `audio/`: lydmotoren (Web Audio). `Deck` holder selv styr på posisjonen, så pause, cue,
    hopp og loops blir presise. Lydkjede per deck:
    kilde → trim → EQ → filter → effekter → (uttak for hodetelefoner senere) → volumfader
    → krysslider → master → limiter → høyttalere og opptak.
  - `analysis/`: BPM, beatgrid og bølgeform i en Web Worker.
  - `learn/`: grunnkurs, leksjoner, kontrollgrupper og synlighet (Enkel/Avansert modus).
  - `tips/`: de små tipsene.
  - `practice/`: øvelses-beatene.
- `src/shared/`: typer og logikk som brukes både i main og i grensesnittet.

### Ikke med ennå (men forberedt)

Forhåndslytting i hodetelefoner, key lock, MIDI-kontrollere, spillelister,
strømmetjenester og en Windows-versjon.
