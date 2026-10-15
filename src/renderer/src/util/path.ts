/** Siste del av en filsti (virker med både / og \). */
export function lastPathPart(path: string): string {
  const parts = path.split(/[\\/]/).filter(Boolean)
  return parts.at(-1) ?? path
}
