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
    when: 'Du har to decks, så du kan gå jevnt over fra én låt til en annen.'
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
    what: 'BPM betyr «slag per minutt» – hvor raskt låten går.',
    when: 'Låter med nesten samme BPM er lettest å mikse sammen.'
  },
  position: {
    title: 'Hvor i låten',
    what: 'Viser hvor langt låten har kommet. Klikk for å hoppe til et annet sted.',
    when: 'Fint for å finne et godt sted å starte fra.'
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
  }
}
