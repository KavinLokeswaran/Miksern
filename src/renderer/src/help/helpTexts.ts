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
    what: 'Viser hvor sterkt signalet fra deck {deck} er, etter trim og EQ, men før volumfaderen.',
    when: 'Still trim slik at den ligger i det grønne og av og til i det gule. Lyser lampa øverst rødt, klipper det – skru ned trim.'
  },
  trim: {
    title: 'Trim (gain)',
    what: 'Justerer hvor sterkt låten kommer inn i mikseren. Noen låter er mikset sterkere enn andre.',
    when: 'Bruk den så begge låtene ligger på omtrent samme nivå på målerne. Dobbeltklikk for å nullstille.'
  },
  'eq-high': {
    title: 'Diskant (high)',
    what: 'Skrur opp eller ned de lyse lydene: hi-hat, cymbaler og «luft».',
    when: 'Skru litt ned hvis det blir skarpt når to låter spiller samtidig. Dobbeltklikk for å nullstille.'
  },
  'eq-mid': {
    title: 'Mellomtone (mid)',
    what: 'Skrur opp eller ned midten av lyden: vokal, synth og gitar.',
    when: 'Skru ned for å gi plass til vokalen i den andre låten. Dobbeltklikk for å nullstille.'
  },
  'eq-low': {
    title: 'Bass (low)',
    what: 'Skrur opp eller ned bassen og kicken. Helt ned fjerner nesten all bass («kill»).',
    when: 'I en overgang: ta bassen helt ut på den ene låten, så de to bassene ikke kolliderer. Dobbeltklikk for å nullstille.'
  },
  cue: {
    title: 'Cue',
    what: 'Et startpunkt i låten. Står låten stille, setter Cue startpunktet der du er. Spiller den, hopper Cue tilbake til startpunktet og stopper.',
    when: 'Finn et godt sted å starte (f.eks. første slag), trykk Cue, og trykk så Spill av når du vil starte låten. Snarvei: {cueKey}. Hold Shift (Shift+{cueKey} eller Shift-klikk) for å sette cue akkurat der låten er nå, uten at den stopper.'
  },
  tabs: {
    title: 'Flere verktøy',
    what: 'Bytt mellom hot cues, loops og effekter for deck {deck}.'
  },
  hotcues: {
    title: 'Hot cues',
    what: 'Fire snarveier til steder i låten. En tom knapp lagrer stedet du er nå. En full knapp hopper dit.',
    when: 'Lagre f.eks. refrenget eller et break, så kan du hoppe dit når som helst. Høyreklikk (eller Shift-klikk) for å slette. Hot cues huskes til neste gang.'
  },
  loops: {
    title: 'Loops',
    what: 'Spiller den samme biten om og om igjen, i takt. Tallet er hvor mange slag loopen er.',
    when: 'Fint for å forlenge en rolig del mens du gjør klar neste låt. Trykk et annet tall for å endre lengden.'
  },
  'loop-exit': {
    title: 'Avslutt loop',
    what: 'Slipper loopen, så låten spiller videre som normalt.'
  },
  fx: {
    title: 'Effekter',
    what: 'Tre effekter du kan legge på deck {deck}. Slå dem av og på, og velg hvor mye med knotten.',
    when: 'Bruk dem med måte – litt effekt i en overgang låter ofte best.'
  },
  'fx-echo': {
    title: 'Echo (delay)',
    what: 'Gjentar lyden hvert halve slag, i takt med låten. Slår du den av, klinger ekkoet ut av seg selv.',
    when: 'Klassisk måte å avslutte en låt på: slå på Echo, og trekk ned volumet.'
  },
  'fx-reverb': {
    title: 'Reverb (romklang)',
    what: 'Får lyden til å høres ut som den spilles i et stort rom.',
    when: 'Fint for å gjøre en overgang mykere, eller på et rolig parti.'
  },
  'fx-flanger': {
    title: 'Flanger',
    what: 'En svevende «jetfly»-lyd som sakte går opp og ned.',
    when: 'Brukes gjerne i oppbygginger før et drop.'
  },
  filter: {
    title: 'Filter',
    what: 'Én knott med to filtre. Til venstre blir lyden mørk og dempet (lavpass). Til høyre blir den tynn uten bass (høypass). I midten er filteret av.',
    when: 'Fint for å «tone ut» en låt i en overgang, eller for å bygge spenning. Dobbeltklikk for å slå av.'
  },
  platter: {
    title: 'Plate (jog wheel)',
    what: 'Platen snurrer når deck {deck} spiller. Dra oppå platen for å scratche – låten følger hånda, også baklengs. Dra i kanten for å skyve låten litt raskere eller saktere.',
    when: 'Bruk kanten (eller to fingre på styreflaten) for å legge slagene oppå den andre låten. Ringen rundt viser hvor langt låten har kommet, og blinker når det er under 30 sekunder igjen.'
  },
  nudge: {
    title: 'Skyv (nudge)',
    what: 'Hold inne ›› for å gjøre deck {deck} litt raskere en kort stund, eller ‹‹ for litt saktere. Tempoet går tilbake når du slipper.',
    when: 'Går slagene litt i utakt? Gi den nye låten et lite skyv til strekene ligger oppå hverandre.'
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
  'help-menu': {
    title: 'Hjelp og leksjoner',
    what: 'Her finner du grunnkurset og små leksjoner. Hver leksjon låser opp nye kontroller.',
    when: 'Ta en leksjon når du er klar for noe nytt.'
  },
  'mode-switch': {
    title: 'Avansert modus',
    what: 'I Enkel modus vises bare det viktigste. Avansert modus viser alle kontroller med en gang.',
    when: 'Slå den på hvis du vil utforske alt selv, uten å ta leksjonene først.'
  },
  practice: {
    title: 'Øvelses-beats',
    what: 'To enkle låter som appen lager selv (120 og 124 BPM), med trommer og bass.',
    when: 'Fine for å øve, og for leksjonene, også hvis du ikke har egen musikk.'
  },
  record: {
    title: 'Opptak (record)',
    what: 'Tar opp alt du hører – hele miksen – til en lydfil (WAV).',
    when: 'Trykk for å starte. Trykk igjen for å stoppe, så velger du hvor fila skal lagres.'
  },
  limiter: {
    title: 'Limiter',
    what: 'En automatisk sikring på master som demper de sterkeste toppene, så lyden aldri sprekker i høyttalerne.',
    when: 'Lyser lampa ofte, spiller du for høyt. Skru ned trim eller mastervolumet litt.'
  },
  'clip-warning': {
    title: 'Klippevarsel',
    what: 'Vises når lyden er så sterk at den blir forvrengt («klipper»).',
    when: 'Gjør det som står i varselet, så forsvinner det.'
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
  },
  'auto-mix': {
    title: 'Auto-overgang',
    what: 'Appen mikser over til den andre decken for deg: starter låten (i takt, hvis det går), flytter krysslideren mykt og bytter bassen på midten.',
    when: 'Velg hvor mange slag overgangen skal ta. Trykk igjen, eller ta tak i krysslideren, for å avbryte. Snarvei: M.'
  },
  'crossfader-curve': {
    title: 'Kurve på krysslideren',
    what: 'Myk: lyden glir jevnt fra én låt til den andre. Skarp: begge spiller fullt, og den ene kuttes helt ute i kanten.',
    when: 'Myk passer til vanlige overganger. Skarp passer til scratch og raske kutt.'
  }
}
