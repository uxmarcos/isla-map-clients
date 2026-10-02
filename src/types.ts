export type Status = 'draft' | 'ready' | 'printed' | 'shipped'

export type LogoMode = 'ink' | 'gray' | 'original' | 'hidden'

export type MapStyle = 'white' | 'dark' | 'color'

export type Lang = 'en' | 'pt'

export const LANG_LABEL: Record<Lang, string> = { en: 'English', pt: 'Português' }
export const LANG_ORDER: Lang[] = ['en', 'pt']

export const STYLE_LABEL: Record<MapStyle, string> = { white: 'Branco', dark: 'Preto', color: 'Colorido' }
export const STYLE_ORDER: MapStyle[] = ['color', 'white', 'dark']

export interface LetterStep {
  title: string
  text: string
}

/** Everything written on the letter. {company} and {goal} are filled in from the map. */
export interface LetterText {
  eyebrow: string
  title: string
  intro: string
  howTitle: string
  steps: LetterStep[]
  closing: string
  signoff: string
  qrCaption: string
}

export interface Dangers {
  kraken: string
  whirlpool: string
}

export interface Client {
  id: string
  company: string
  slug: string
  style: MapStyle
  /** Language of everything printed on the map. */
  lang: Lang
  /** Kept equal to destination; older maps may differ. */
  goal: string
  /** Five stage plaques along the path. */
  stages: string[]
  /** One line under each stage plaque: what Isla does there. */
  stageNotes: string[]
  /** "You are here": the client's real starting point. Empty hides the tag. */
  start: string
  /** Labels on the sea creatures: what Isla protects the client from. Empty hides a label. */
  dangers: Dangers
  /** Last plaque, next to the X. */
  destination: string
  logo: string | null // PNG data URL, downscaled
  logoMode: LogoMode
  /** Edited letter text; anything missing falls back to the default for the map's language. */
  letter?: Partial<LetterText>
  status: Status
  notes: string
  createdAt: number
  updatedAt: number
}

/** What the renderer needs; derived from a Client. */
export interface MapData {
  lang: Lang
  company: string
  stages: string[]
  stageNotes: string[]
  start: string
  dangers: Dangers
  /** Last plaque and the subtitle ("The path to …"). */
  destination: string
  url: string // printed, without protocol
  qrUrl: string // encoded in the QR
}

export const STATUS_LABEL: Record<Status, string> = {
  draft: 'Rascunho',
  ready: 'Pronto para imprimir',
  printed: 'Impresso',
  shipped: 'Enviado',
}

export const STATUS_ORDER: Status[] = ['draft', 'ready', 'printed', 'shipped']
