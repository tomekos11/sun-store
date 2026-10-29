// node scripts/lighthouse.mjs [url ...]
// Mobile + desktop Lighthouse for each url, reports go to ./lighthouse/.
// Run it against a production build, not nuxt dev.
import { mkdirSync, writeFileSync } from 'node:fs'
import * as chromeLauncher from 'chrome-launcher'
import lighthouse from 'lighthouse'
import desktopConfig from 'lighthouse/core/config/desktop-config.js'

const urls = process.argv.slice(2)
if (!urls.length) urls.push('http://localhost:3100/', 'http://localhost:3100/?category=battery&manufacturer=ecocharge,aurapower&capacity=7.5-&sort=capacity-desc')

const categories = ['performance', 'accessibility', 'best-practices', 'seo']
const metrics = {
  'first-contentful-paint': 'FCP',
  'largest-contentful-paint': 'LCP',
  'total-blocking-time': 'TBT',
  'cumulative-layout-shift': 'CLS',
  'speed-index': 'SI',
  'server-response-time': 'TTFB',
}

mkdirSync('lighthouse', { recursive: true })
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new'] })
const rows = []

try {
  for (const url of urls) {
    for (const [formFactor, config] of [['mobile', undefined], ['desktop', desktopConfig]]) {
      const result = await lighthouse(url, { port: chrome.port, output: 'html', onlyCategories: categories, logLevel: 'error' }, config)
      const { lhr, report } = result
      const slug = `${new URL(url).search ? 'filtered' : 'home'}-${formFactor}`
      writeFileSync(`lighthouse/${slug}.html`, report)

      const row = { page: slug }
      for (const c of categories) row[c] = Math.round(lhr.categories[c].score * 100)
      for (const [id, label] of Object.entries(metrics)) row[label] = lhr.audits[id]?.displayValue ?? '–'
      rows.push(row)
    }
  }
}
finally {
  await chrome.kill()
}

console.table(rows)
writeFileSync('lighthouse/summary.json', JSON.stringify(rows, null, 2))
