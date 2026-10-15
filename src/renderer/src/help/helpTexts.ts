import type { DeckControl, GlobalControl } from './tourIds'

/**
 * ALLE HJELPETEKSTER I APPEN
 *
 * Vises i en hjelpeboble når man holder musa over en kontroll en liten stund.
 * - title: navnet på kontrollen (norsk, med det engelske DJ-ordet i parentes)
 * - what:  hva den gjør
 * - when:  når man bruker den
 * I tekstene for decks byttes {deck} ut med A eller B.
 */
export interface HelpText {
  title: string
  what: string
  when?: string
}

export const DECK_HELP: Record<DeckControl, HelpText> = {
  panel: {
    title: 'Deck {deck}',
    what: 'En deck er som en platespiller. Her spiller du én låt.',
    when: 'Du har to decks, så du kan gå jevnt over fra én låt til en annen. Dra en låt hit fra biblioteket for å laste den inn.'
  },
  load: {
    title: 'Åpne fil',
    what: 'Velg en låt fra maskinen din og legg den på deck {deck}.',
    when: 'Bruk den når decken er ledig, eller når du vil bytte låt.'
  },
  play: {
    title: 'Spill av / pause (play)',
    what: 'Starter låten, eller setter den på pause.',
    when: 'Start den nye låten når den forrige nærmer seg slutten. Snarvei: {key}.'
  },
  track: {
    title: 'Låt',
    what: 'Navnet på låten som ligger på deck {deck}, og hvem som har laget den.'
  },
  time: {
    title: 'Tid igjen',
    what: 'Hvor lenge det er til låten er ferdig.',
    when: 'Følg med på denne, så du rekker å starte neste låt i tide.'
  },
  bpm: {
    title: 'Tempo (BPM)',
    what: 'BPM betyr «slag per minutt» – hvor raskt låten går akkurat nå. Appen finner det selv.',
    when: 'Låter med nesten samme BPM er lettest å mikse sammen.'
  },
  position: {
    title: 'Oversikt over låten (waveform)',
    what: 'Hele låten fra start til slutt. Høye topper er kraftige partier, lave er rolige. Klikk for å hoppe dit.',
    when: 'Se etter rolige partier – der er det ofte lettest å starte en overgang.'
  },
  tempo: {
    title: 'Tempo (pitch)',
    what: 'Gjør låten raskere (opp) eller saktere (ned), opptil 8 %. Tonen endres litt også, som på en platespiller.',
    when: 'Bruk den for å få to låter til å gå i samme tempo. Dobbeltklikk for å nullstille.'
  },
  sync: {
    title: 'Synk (sync)',
    what: 'Gir deck {deck} samme tempo som den andre decken, og legger slagene oppå hverandre.',
    when: 'Trykk før eller mens du starter den nye låten. Flytter du tempo-slideren selv, slås Synk av.'
  },
  waveform: {
    title: 'Bølgeform (waveform)',
    what: 'Lyden i deck {deck} rett rundt der den spiller nå. Streken i midten er «nå». De tynne loddrette strekene er slagene.',
    when: 'Ligger strekene for A og B rett over hverandre, går låtene i takt.'
  },
  volume: {
    title: 'Volum (kanalfader)',
    what: 'Bestemmer hvor høyt deck {deck} spiller.',
    when: 'Dra den opp for å slippe inn en låt, eller ned for å ta den ut.'
  },
  meter: {
    title: 'Nivåmåler',
    what: 'Viser hvor høyt deck {deck} spiller akkurat nå.',
    when: 'Grønt er bra. Lyser den rødt, er det for høyt og lyden kan bli ødelagt.'
  }
}

export const GLOBAL_HELP: Record<GlobalControl, HelpText> = {
  crossfader: {
    title: 'Krysslider (crossfader)',
    what: 'Blander mellom deck A (venstre) og deck B (høyre). I midten hører du begge.',
    when: 'Dra den sakte fra én side til den andre for å gå over til neste låt. Snarvei: ← og →. Dobbeltklikk for å sette den i midten.'
  },
  'master-volume': {
    title: 'Mastervolum (master)',
    what: 'Det totale volumet for hele miksen.',
    when: 'Still det slik at måleren holder seg unna det røde.'
  },
  'master-meter': {
    title: 'Masternivå',
    what: 'Viser hvor høyt hele miksen er.',
    when: 'Lyser det rødt, klipper lyden. Skru ned volumet litt.'
  },
  'phase-meter': {
    title: 'Fasemåler',
    what: 'Viser om slagene i de to låtene treffer samtidig. Grønt i midten betyr i takt.',
    when: 'Står den til siden, er én låt litt foran den andre. Trykk Synk for å rette det.'
  },
  library: {
    title: 'Musikkbibliotek',
    what: 'Alle låtene i musikkmappa di.',
    when: 'Dra en låt til en deck, eller bruk knappene A og B på hver linje.'
  },
  'library-folder': {
    title: 'Velg musikkmappe',
    what: 'Velg mappa der musikken din ligger. Appen leter også i alle undermapper.',
    when: 'Gjør det første gang, eller når du vil bruke en annen mappe.'
  },
  'library-rescan': {
    title: 'Skann på nytt',
    what: 'Leter etter nye, endrede eller slettede låter i mappa.',
    when: 'Bruk den etter at du har lagt til ny musikk. Det skjer også av seg selv når appen starter.'
  },
  'library-status': {
    title: 'Status',
    what: 'Viser hvor mange låter du har, og hva appen holder på med.'
  },
  'library-search': {
    title: 'Søk',
    what: 'Skriv deler av tittelen eller artistnavnet for å finne en låt.',
    when: 'Du kan skrive flere ord, f.eks. «house remix».'
  },
  'library-sort': {
    title: 'Sortering',
    what: 'Klikk på en kolonne for å sortere etter den. Klikk igjen for å snu rekkefølgen.',
    when: 'Sorter etter BPM for å finne låter som passer sammen i tempo.'
  },
  'library-list': {
    title: 'Låtliste',
    what: 'Tittel, artist, lengde og tempo (BPM) for hver låt.',
    when: 'Dra en linje over til deck A eller B for å laste den inn.'
  },
  'library-load-a': {
    title: 'Last inn på A',
    what: 'Legger låten på deck A (venstre).'
  },
  'library-load-b': {
    title: 'Last inn på B',
    what: 'Legger låten på deck B (høyre).'
  },
  'library-skipped': {
    title: 'Hoppet over',
    what: 'Filer appen ikke kan spille, for eksempel kopibeskyttede Apple Music-filer eller skadede filer.',
    when: 'Klikk for å se hvilke filer det gjelder, og hvorfor.'
  }
}
