import { toPath } from '#shared/utils/structured-data'
import { landingPages } from '../lib/landing-pages'

const escapeXml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default defineEventHandler(async (event) => {
  const { entries } = await useCatalog()
  const origin = useRuntimeConfig(event).public.siteUrl || getRequestURL(event).origin

  const urls = landingPages(entries)
    .map(query => `  <url><loc>${escapeXml(origin + toPath(query))}</loc></url>`)
    .join('\n')

  setResponseHeaders(event, {
    'content-type': 'application/xml; charset=utf-8',
    'cache-control': 'public, max-age=3600',
  })
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
})
