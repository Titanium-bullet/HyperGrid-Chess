// Prefixes public/ asset paths with the configured Next.js basePath so they
// resolve correctly when the site is served from a subpath (e.g. GitHub Pages).
// NEXT_PUBLIC_BASE_PATH is set in .env.production and inlined at build time;
// it stays empty during `next dev` so local development runs from /.
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export function asset(path: string): string {
  if (/^(https?:)?\/\//.test(path)) return path
  if (path.startsWith('data:')) return path
  if (!path.startsWith('/')) return path
  return `${BASE_PATH}${path}`
}
