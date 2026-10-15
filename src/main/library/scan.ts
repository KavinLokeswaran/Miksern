import { createHash } from 'node:crypto'
import { readdir, stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import { parseFile } from 'music-metadata'
import { AUDIO_EXTENSIONS } from '../../shared/ipc'
import type { ScanProgress, TrackInfo, TrackStatus } from '../../shared/library'

/** Filtyper vi tar med i biblioteket. .m4p tas med så vi kan forklare at de er kopibeskyttet. */
const LIBRARY_EXTENSIONS = new Set<string>([...AUDIO_EXTENSIONS, 'm4p'])
const PARALLEL_READS = 4

export function trackId(path: string): string {
  return createHash('sha1').update(path).digest('hex').slice(0, 16)
}

function extensionOf(path: string): string {
  return extname(path).slice(1).toLowerCase()
}

/** Finner alle lydfiler i en mappe og alle undermapper. Skjulte mapper og snarveier hoppes over. */
export async function findAudioFiles(root: string, onFound?: (count: number) => void): Promise<string[]> {
  const found: string[] = []
  const queue = [root]
  while (queue.length > 0) {
    const dir = queue.pop()!
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      continue // Mapper vi ikke har lov til å lese, hopper vi over.
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      const full = join(dir, entry.name)
      if (entry.isDirectory()) queue.push(full)
      else if (entry.isFile() && LIBRARY_EXTENSIONS.has(extensionOf(entry.name))) {
        found.push(full)
        if (found.length % 50 === 0) onFound?.(found.length)
      }
    }
  }
  onFound?.(found.length)
  return found.sort()
}

function statusFrom(ext: string, codec: string | undefined, container: string | undefined): TrackStatus {
  if (ext === 'm4p' || /drm/i.test(`${codec ?? ''} ${container ?? ''}`)) return 'protected'
  // Chromium kan ikke spille Apple Lossless.
  if (codec && /alac/i.test(codec)) return 'unsupported'
  return 'ok'
}

/**
 * Mange programmer lagrer tagger som UTF-8 der standarden sier Latin-1 (særlig i WAV).
 * Da blir «ø» til «Ã¸». Ser teksten slik ut, leser vi den på nytt som UTF-8.
 */
export function repairMojibake(text: string): string {
  if (!/[\u00c2-\u00f4][\u0080-\u00bf]/.test(text)) return text
  if ([...text].some((c) => c.charCodeAt(0) > 0xff)) return text
  const repaired = Buffer.from(text, 'latin1').toString('utf8')
  return repaired.includes('\ufffd') ? text : repaired
}

function cleanText(value: string | undefined | null): string | null {
  const trimmed = value?.trim()
  return trimmed ? repairMojibake(trimmed) : null
}

/** Leser tittel, artist, lengde osv. fra en fil. Kaster aldri – feil gir status 'unreadable'. */
export async function readTrackInfo(path: string, size: number, mtimeMs: number): Promise<TrackInfo> {
  const ext = extensionOf(path)
  const fileName = basename(path, extname(path))
  const base: TrackInfo = {
    id: trackId(path),
    path,
    fileName,
    ext,
    title: fileName,
    artist: null,
    album: null,
    duration: null,
    tagBpm: null,
    size,
    mtimeMs,
    status: 'ok'
  }
  try {
    const meta = await parseFile(path, { duration: false, skipCovers: true })
    const bpm = meta.common.bpm
    return {
      ...base,
      title: cleanText(meta.common.title) ?? fileName,
      artist: cleanText(meta.common.artist) ?? cleanText(meta.common.albumartist),
      album: cleanText(meta.common.album),
      duration: meta.format.duration && Number.isFinite(meta.format.duration) ? meta.format.duration : null,
      tagBpm: bpm && bpm > 40 && bpm < 300 ? bpm : null,
      status: statusFrom(ext, meta.format.codec, meta.format.container)
    }
  } catch {
    return { ...base, status: ext === 'm4p' ? 'protected' : 'unreadable' }
  }
}

/**
 * Skanner en mappe. Filer som ikke er endret siden sist (samme størrelse og
 * endringstid), gjenbrukes fra `previous`, så nye skanninger går raskt.
 */
export async function scanFolder(
  folder: string,
  previous: Record<string, TrackInfo>,
  onProgress: (progress: ScanProgress) => void
): Promise<Record<string, TrackInfo>> {
  onProgress({ phase: 'finding', found: 0 })
  const paths = await findAudioFiles(folder, (found) => onProgress({ phase: 'finding', found }))
  const result: Record<string, TrackInfo> = {}
  let done = 0
  let next = 0
  const total = paths.length
  onProgress({ phase: 'reading', done, total })

  const worker = async (): Promise<void> => {
    while (next < paths.length) {
      const path = paths[next++]
      try {
        const info = await stat(path)
        const id = trackId(path)
        const cached = previous[id]
        result[id] =
          cached && cached.path === path && cached.size === info.size && cached.mtimeMs === info.mtimeMs
            ? cached
            : await readTrackInfo(path, info.size, info.mtimeMs)
      } catch {
        // Fila forsvant mens vi skannet. Den tas bare ikke med.
      }
      done++
      if (done % 10 === 0 || done === total) onProgress({ phase: 'reading', done, total })
    }
  }
  await Promise.all(Array.from({ length: PARALLEL_READS }, worker))
  onProgress({ phase: 'idle' })
  return result
}
