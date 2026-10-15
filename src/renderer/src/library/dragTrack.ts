/** Dra-og-slipp av låter fra biblioteket til en deck. */
export const TRACK_DRAG_TYPE = 'application/x-mikseren-track'

export function isTrackDrag(event: React.DragEvent): boolean {
  return event.dataTransfer.types.includes(TRACK_DRAG_TYPE)
}

export function startTrackDrag(event: React.DragEvent, trackId: string): void {
  event.dataTransfer.setData(TRACK_DRAG_TYPE, trackId)
  event.dataTransfer.effectAllowed = 'copy'
}

export function droppedTrackId(event: React.DragEvent): string | null {
  return event.dataTransfer.getData(TRACK_DRAG_TYPE) || null
}
