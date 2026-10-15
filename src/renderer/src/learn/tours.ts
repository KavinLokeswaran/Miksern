import type { DeckId } from '../audio/types'
import type { AppState } from '../state/store'
import type { LessonId } from './controlGroups'
import type { Tour, TourSnapshot, TourStep } from './tourTypes'

/**
 * GRUNNKURS OG LEKSJONER
 *
 * Alt er data: hvert steg har tekst, hvilke kontroller som lyses opp, og en sjekk
 * som sier når brukeren har gjort det steget ber om. Legg til eller endre steg her.
 */

const deck = (s: TourSnapshot, id: DeckId): AppState['decks'][DeckId] => s.app.decks[id]
const playing = (s: TourSnapshot, id: DeckId): boolean => deck(s, id).status === 'ready' && deck(s, id).isPlaying
const loaded = (s: TourSnapshot, id: DeckId): boolean => deck(s, id).status === 'ready'

/** Felles steg i starten av en leksjon: sørg for at musikk spiller. */
function setupStep(which: 'A' | 'both'): TourStep {
  if (which === 'A') {
    return {
      id: 'setup',
      title: 'Start en låt på deck A',
      text: 'Til denne leksjonen trenger du musikk som spiller på deck A. Bruk en egen låt, eller trykk knappen under.',
      target: ['deck-a-panel'],
      waiting: 'Venter på at deck A spiller …',
      done: ({ snap }) => playing(snap, 'A'),
      buttons: [
        { label: 'Spill øvelses-beat 1 på A', actions: [{ type: 'practice/load', deck: 'A', beat: 1, play: true }] }
      ]
    }
  }
  return {
    id: 'setup',
    title: 'Start låter på begge decks',
    text: 'Til denne leksjonen trenger du musikk på både A og B, helst synket. Bruk egne låter, eller trykk knappen under.',
    target: ['deck-a-panel', 'deck-b-panel'],
    waiting: 'Venter på at begge decks spiller …',
    done: ({ snap }) => playing(snap, 'A') && playing(snap, 'B'),
    buttons: [
      {
        label: 'Spill øvelses-beats på begge',
        actions: [
          { type: 'practice/load', deck: 'A', beat: 1, play: true },
          { type: 'practice/load', deck: 'B', beat: 2 },
          { type: 'deck/toggleSync', deck: 'B' },
          { type: 'deck/play', deck: 'B' }
        ]
      }
    ]
  }
}

export const INTRO: Tour = {
  id: 'intro',
  title: 'Grunnkurs',
  description: 'De viktigste tingene, steg for steg. Tar et par minutter.',
  steps: [
    {
      id: 'welcome',
      title: 'Velkommen til Mikseren!',
      text: 'Her lærer du å mikse to låter sammen, slik en DJ gjør. Kurset tar et par minutter, og du lærer ved å gjøre det selv. Du kan hoppe over steg eller avslutte når du vil.'
    },
    {
      id: 'music',
      title: 'Velg musikk',
      text: 'Velg mappa der musikken din ligger – eller bruk to øvelses-beats som appen har laget. Øvelses-beatene passer godt til å lære.',
      target: ['library'],
      waiting: 'Velg mappe eller øvelses-beats …',
      done: ({ snap }) => snap.practiceChosen || (snap.library.folder !== null && snap.library.trackCount > 0),
      buttons: [
        { label: 'Bruk øvelses-beats', actions: [{ type: 'learn/choosePractice' }] },
        { label: 'Velg musikkmappe …', actions: [{ type: 'library/pickFolder' }] }
      ]
    },
    {
      id: 'load-a',
      title: 'Last inn en låt på deck A',
      text: 'En deck er som en platespiller. Dra en låt fra biblioteket til deck A, eller trykk A-knappen på en låt.',
      target: ['deck-a-panel', 'library-list'],
      waiting: 'Venter på en låt på deck A …',
      done: ({ snap }) => loaded(snap, 'A'),
      buttons: [
        {
          label: 'Last inn øvelses-beat 1 på A',
          actions: [{ type: 'practice/load', deck: 'A', beat: 1 }],
          showIf: (s) => s.practiceChosen
        }
      ]
    },
    {
      id: 'play-a',
      title: 'Spill av (play)',
      text: 'Trykk «Spill av» for å starte låten på deck A. (Snarvei: Q)',
      target: ['deck-a-play'],
      waiting: 'Venter på at du trykker «Spill av» …',
      done: ({ snap }) => playing(snap, 'A')
    },
    {
      id: 'volume',
      title: 'Volumfaderen',
      text: 'Hver deck har sin egen volumfader. Dra volumet for A helt ned, og så opp igjen. Hør hvordan låten forsvinner og kommer tilbake.',
      target: ['deck-a-volume'],
      waiting: 'Dra faderen ned og opp igjen …',
      done: ({ snap }, memo) => {
        const v = deck(snap, 'A').volume
        if (v < 0.3) memo.down = true
        return memo.down === true && v > 0.6
      }
    },
    {
      id: 'start-b',
      title: 'Gjør klar neste låt på deck B',
      text: 'Last inn en annen låt på deck B og trykk «Spill av» (snarvei: P). Nå spiller begge låtene – det er helt greit. Krysslideren bestemmer hva som høres.',
      target: ['deck-b-panel'],
      waiting: 'Venter på at deck B spiller …',
      done: ({ snap }) => playing(snap, 'B'),
      buttons: [
        {
          label: 'Spill øvelses-beat 2 på B',
          actions: [{ type: 'practice/load', deck: 'B', beat: 2, play: true }],
          showIf: (s) => s.practiceChosen
        }
      ]
    },
    {
      id: 'sync',
      title: 'BPM, tempo og Synk',
      text: 'BPM betyr «slag per minutt». Låtene har litt ulikt tempo, så trommene kommer ikke samtidig. Trykk «Synk» på B: da får B samme tempo som A, og slagene legges oppå hverandre. Se at fasemåleren blir grønn.',
      target: ['deck-a-bpm', 'deck-b-bpm', 'deck-b-sync', 'phase-meter'],
      waiting: 'Venter på at du trykker «Synk» på B …',
      done: ({ snap }) => deck(snap, 'B').synced || deck(snap, 'A').synced
    },
    {
      id: 'crossfader',
      title: 'Krysslider: fra A til B',
      text: 'Nå kommer selve overgangen! Dra krysslideren sakte helt over til B (høyre). Ta gjerne 10–20 sekunder.',
      target: ['crossfader'],
      waiting: 'Dra krysslideren helt til B …',
      done: ({ snap }) => snap.app.mixer.crossfader >= 0.95
    },
    {
      id: 'done',
      title: 'Gratulerer, du har gjort din første overgang!',
      text: 'Det er dette DJ-er gjør hele kvelden: gjør klar neste låt, få den i takt, og bland den inn. Under «?»-knappen øverst finner du små leksjoner. Hver leksjon låser opp nye kontroller, som EQ, loops og effekter. Vil du se alt med en gang, slå på «Avansert modus».'
    }
  ]
}

export const LESSONS: Record<LessonId, Tour> = {
  'eq-filter': {
    id: 'eq-filter',
    title: 'EQ og filter',
    description: 'Bytt bassen mellom to låter, og bruk filteret i en overgang.',
    steps: [
      setupStep('both'),
      {
        id: 'eq-intro',
        title: 'EQ: bass, mellomtone og diskant',
        text: 'EQ-knottene skrur opp og ned deler av lyden. Når to låter spiller samtidig, kolliderer ofte bassene og det blir grøtete. Derfor bytter DJ-er bassen fra én låt til den andre.',
        target: ['deck-a-eq-high', 'deck-a-eq-mid', 'deck-a-eq-low', 'deck-b-eq-low']
      },
      {
        id: 'kill-b',
        title: 'Ta bassen ut av B',
        text: 'Vri bass-knotten på B helt ned (helt til venstre). Nå hører du bare bassen fra A.',
        target: ['deck-b-eq-low'],
        waiting: 'Vri bassen på B helt ned …',
        done: ({ snap }) => deck(snap, 'B').eq.low <= -0.9
      },
      {
        id: 'swap',
        title: 'Bytt bassen',
        text: 'Nå bytter du: skru bassen på A helt ned, og bassen på B opp til midten igjen. Gjør det gjerne samtidig, på slutten av en takt. Dobbeltklikk setter en knott tilbake til midten.',
        target: ['deck-a-eq-low', 'deck-b-eq-low'],
        waiting: 'Bass på A ned, bass på B opp …',
        done: ({ snap }) => deck(snap, 'A').eq.low <= -0.9 && deck(snap, 'B').eq.low >= -0.1
      },
      {
        id: 'filter',
        title: 'Filteret',
        text: 'Filteret er én knott med to effekter. Vri filteret på A mot høyre: bassen forsvinner og lyden blir tynn. Vri det så tilbake til midten (eller dobbeltklikk). Filteret er fint for å tone ut en låt.',
        target: ['deck-a-filter'],
        waiting: 'Vri filteret på A til høyre, så tilbake …',
        done: ({ snap }, memo) => {
          const f = deck(snap, 'A').filter
          if (f > 0.5) memo.out = true
          return memo.out === true && Math.abs(f) < 0.05
        }
      },
      {
        id: 'eq-done',
        title: 'Bra jobbet!',
        text: 'Nå kan du bytte bass og bruke filter. EQ-knottene og filteret er nå låst opp i mikseren.'
      }
    ]
  },
  'trim-levels': {
    id: 'trim-levels',
    title: 'Trim og nivåer',
    description: 'Få låtene like sterke, og unngå klipping.',
    steps: [
      setupStep('A'),
      {
        id: 'meters',
        title: 'Nivåmålerne',
        text: 'Måleren ved siden av volumfaderen viser hvor sterkt signalet er. Grønt er bra, litt gult er greit. Lyser lampa øverst rødt, «klipper» lyden – den blir forvrengt.',
        target: ['deck-a-meter', 'deck-a-trim']
      },
      {
        id: 'clip',
        title: 'Prøv å klippe',
        text: 'Vri trim-knotten på A helt opp, til lampa øverst på måleren lyser rødt og klippevarselet kommer.',
        target: ['deck-a-trim', 'deck-a-meter'],
        waiting: 'Skru trim opp til det klipper …',
        done: ({ snap }) => snap.clipping.A
      },
      {
        id: 'fix',
        title: 'Skru ned igjen',
        text: 'Skru trim ned til måleren holder seg i det grønne og gule, uten rødt. Det er slik du stiller inn hver ny låt.',
        target: ['deck-a-trim', 'deck-a-meter'],
        waiting: 'Skru trim ned til det slutter å klippe …',
        done: ({ snap }) => deck(snap, 'A').trim < 0.4 && !snap.clipping.A
      },
      {
        id: 'trim-done',
        title: 'Flott!',
        text: 'Bruk trim slik at alle låtene ligger på omtrent samme nivå. Trim er nå låst opp i mikseren. Og husk: limiteren på master passer på at lyden aldri sprekker i høyttalerne.'
      }
    ]
  },
  cues: {
    id: 'cues',
    title: 'Cue og hot cues',
    description: 'Sett startpunkter og hopp rundt i låten.',
    steps: [
      setupStep('A'),
      {
        id: 'pause',
        title: 'Stopp låten',
        text: 'Trykk «Pause» på deck A, og klikk et sted i oversikten over låten for å finne et startpunkt.',
        target: ['deck-a-play', 'deck-a-position'],
        waiting: 'Venter på pause …',
        done: ({ snap }) => loaded(snap, 'A') && !deck(snap, 'A').isPlaying
      },
      {
        id: 'set-cue',
        title: 'Sett cue-punkt',
        text: 'Trykk «Cue». Nå er startpunktet lagret der du står (på nærmeste slag).',
        target: ['deck-a-cue'],
        waiting: 'Trykk «Cue» …',
        done: ({ action, snap }) => action?.type === 'deck/cue' && !deck(snap, 'A').isPlaying
      },
      {
        id: 'use-cue',
        title: 'Tilbake til start',
        text: 'Trykk «Spill av», lytt litt, og trykk så «Cue» igjen. Låten hopper tilbake til startpunktet og stopper. Slik finner DJ-er raskt starten på neste låt.',
        target: ['deck-a-play', 'deck-a-cue'],
        waiting: '«Spill av», og trykk «Cue» …',
        done: ({ action, snap }, memo) => {
          if (playing(snap, 'A')) memo.played = true
          return memo.played === true && action?.type === 'deck/cue' && !deck(snap, 'A').isPlaying
        }
      },
      {
        id: 'hotcue',
        title: 'Hot cues',
        text: 'Hot cues er snarveier i låten. Start låten, og trykk på en tom hot cue-knapp for å lagre stedet. Trykk så på den samme knappen igjen for å hoppe dit.',
        target: ['deck-a-hotcues'],
        onEnter: [{ type: 'deck/showPanel', deck: 'A', panel: 'hotcues' }],
        waiting: 'Lagre en hot cue og hopp til den …',
        done: ({ action, snap }, memo) => {
          // Var hot cuen allerede lagret før trykket, var trykket et hopp – og da er steget gjort.
          const before = (memo.filled as number[] | undefined) ?? []
          const jumped = action?.type === 'deck/hotCue' && action.deck === 'A' && before.includes(action.index)
          memo.filled = deck(snap, 'A').hotCues.flatMap((h, i) => (h === null ? [] : [i]))
          return jumped
        }
      },
      {
        id: 'cues-done',
        title: 'Supert!',
        text: 'Hot cues huskes for hver låt, så de er der neste gang også. Høyreklikk på en hot cue for å slette den. Hot cues er nå låst opp.'
      }
    ]
  },
  loops: {
    id: 'loops',
    title: 'Loops',
    description: 'Gjenta en bit av låten, i takt.',
    steps: [
      setupStep('A'),
      {
        id: 'loop4',
        title: 'Lag en loop',
        text: 'Trykk 4 for å gjenta de neste fire slagene om og om igjen. Loopen er alltid i takt.',
        target: ['deck-a-loops'],
        onEnter: [{ type: 'deck/showPanel', deck: 'A', panel: 'loops' }],
        waiting: 'Trykk 4 …',
        done: ({ snap }) => deck(snap, 'A').loop?.beats === 4
      },
      {
        id: 'shorter',
        title: 'Gjør den kortere',
        text: 'Trykk 1 eller 1/2. Loopen blir kortere og mer intens – fint for å bygge spenning.',
        target: ['deck-a-loops'],
        waiting: 'Trykk 1 eller 1/2 …',
        done: ({ snap }) => (deck(snap, 'A').loop?.beats ?? 99) <= 1
      },
      {
        id: 'exit',
        title: 'Slipp loopen',
        text: 'Trykk «Avslutt loop», så spiller låten videre som normalt.',
        target: ['deck-a-loop-exit'],
        waiting: 'Trykk «Avslutt loop» …',
        done: ({ action, snap }) => action?.type === 'deck/exitLoop' && deck(snap, 'A').loop === null
      },
      {
        id: 'loops-done',
        title: 'Bra!',
        text: 'Loops er fine for å forlenge en rolig del mens du gjør klar neste låt. Loops er nå låst opp.'
      }
    ]
  },
  fx: {
    id: 'fx',
    title: 'Effekter',
    description: 'Echo, reverb og flanger – og en klassisk «echo out».',
    steps: [
      setupStep('A'),
      {
        id: 'echo-on',
        title: 'Slå på «Echo»',
        text: 'Trykk «Echo». Lyden gjentas hvert halve slag, i takt med låten.',
        target: ['deck-a-fx-echo'],
        onEnter: [{ type: 'deck/showPanel', deck: 'A', panel: 'fx' }],
        waiting: 'Trykk «Echo» …',
        done: ({ snap }) => deck(snap, 'A').fx.echo.on
      },
      {
        id: 'echo-amount',
        title: 'Mer ekko',
        text: 'Vri «Mengde»-knotten ved «Echo» opp, så blir ekkoet sterkere og varer lenger.',
        target: ['deck-a-fx'],
        waiting: 'Skru mengden opp …',
        done: ({ snap }) => deck(snap, 'A').fx.echo.amount >= 0.8
      },
      {
        id: 'echo-out',
        title: 'Echo out',
        text: 'Trykk «Pause» på A mens «Echo» er på – og hør ekkoet klinge ut av seg selv. Slik avslutter mange DJ-er en låt.',
        target: ['deck-a-play', 'deck-a-fx-echo'],
        waiting: 'Trykk «Pause» med Echo på …',
        done: ({ action, snap }) => action !== null && !deck(snap, 'A').isPlaying && deck(snap, 'A').fx.echo.on
      },
      {
        id: 'others',
        title: 'Prøv de andre',
        text: 'Slå av «Echo», start låten igjen, og prøv «Reverb» (romklang) eller «Flanger» (svisj).',
        target: ['deck-a-fx'],
        waiting: 'Slå på «Reverb» eller «Flanger» …',
        done: ({ snap }) => deck(snap, 'A').fx.reverb.on || deck(snap, 'A').fx.flanger.on
      },
      {
        id: 'fx-done',
        title: 'Kult!',
        text: 'Effekter er gøy, men bruk dem med måte – litt effekt låter ofte best. Effektene er nå låst opp.'
      }
    ]
  },
  recording: {
    id: 'recording',
    title: 'Opptak av miksen din',
    description: 'Ta opp det du mikser, og lagre det som en lydfil.',
    steps: [
      setupStep('A'),
      {
        id: 'start-rec',
        title: 'Start opptaket',
        text: 'Trykk «Ta opp» øverst til høyre. Alt du hører blir tatt opp.',
        target: ['record'],
        waiting: 'Trykk «Ta opp» …',
        done: ({ snap }) => snap.app.recording.status === 'recording'
      },
      {
        id: 'stop-rec',
        title: 'Stopp og lagre',
        text: 'Miks litt – og trykk så «Stopp opptak». Velg hvor fila skal lagres.',
        target: ['record'],
        waiting: 'Trykk «Stopp opptak» …',
        done: ({ snap }) => snap.app.recording.status === 'idle' || snap.app.recording.status === 'unsaved'
      },
      {
        id: 'rec-done',
        title: 'Ferdig!',
        text: 'Opptaket er en vanlig WAV-fil du kan spille av hvor som helst. Opptak er nå låst opp.'
      }
    ]
  }
}

export function tourById(id: string): Tour | null {
  if (id === 'intro') return INTRO
  return (LESSONS as Record<string, Tour>)[id] ?? null
}
