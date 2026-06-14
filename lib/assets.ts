// Prefixes public/ asset paths with the configured Next.js basePath so they
// resolve correctly when the site is served from a subpath (e.g. GitHub Pages).
// Next.js exposes the configured basePath as process.env.NEXT_BASE_PATH.
const BASE_PATH = process.env.NEXT_BASE_PATH ?? ''

export function asset(path: string): string {
  if (/^(https?:)?\/\//.test(path)) return path
  if (path.startsWith('data:')) return path
  if (!path.startsWith('/')) return path
  return `${BASE_PATH}${path}`
}
