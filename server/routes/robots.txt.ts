export default defineEventHandler((event) => {
  const origin = useRuntimeConfig(event).public.siteUrl || getRequestURL(event).origin
  setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
  // don't disallow filter URLs, google has to crawl them to see the noindex
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`
})
