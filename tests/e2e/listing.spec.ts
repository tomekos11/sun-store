import { expect, test, type Page } from '@playwright/test'

const grid = (page: Page) => page.getByTestId('product-grid')
const productNames = (page: Page) => grid(page).locator('h3').allTextContents()

// wait for the URL and for the refetch to finish
async function settled(page: Page, url: RegExp) {
  await expect(page).toHaveURL(url)
  await expect(page.locator('[aria-busy="false"]')).toBeAttached()
}

async function open(page: Page, path: string) {
  await page.goto(path)
  // clicks before hydration do nothing
  await page.waitForLoadState('networkidle')
}

test('filters, sorting and search survive a reload and work with the back button', async ({ page }) => {
  await open(page, '/')
  await expect(page.getByTestId('result-count')).toHaveText('1–24 of 150 products')

  await page.getByRole('checkbox', { name: /^Batteries/ }).click()
  await settled(page, /category=battery/)

  await page.getByRole('checkbox', { name: /^EcoCharge/ }).click()
  await settled(page, /manufacturer=ecocharge/)
  await page.getByRole('checkbox', { name: /^AuraPower/ }).click()
  await settled(page, /manufacturer=aurapower,ecocharge/)

  await page.getByRole('combobox', { name: 'Sort products' }).click()
  await page.getByRole('option', { name: 'Capacity: high to low' }).click()
  await settled(page, /sort=capacity-desc/)

  const minCapacity = page.getByLabel('Minimum capacity (batteries) (kWh)')
  await minCapacity.fill('7.5')
  await minCapacity.press('Tab')
  await settled(page, /capacity=7\.5-/)

  const url = page.url()
  const before = await productNames(page)
  expect(before).toEqual([
    'AuraPower Reserve 15',
    'EcoCharge HomeVault 13.5',
    'AuraPower Reserve 12.5',
    'EcoCharge HomeVault 12',
    'EcoCharge HomeVault 10',
    'AuraPower Reserve 10',
    'EcoCharge HomeVault 7.5',
    'AuraPower Reserve 7.5',
  ])
  await expect(page).toHaveTitle('AuraPower & EcoCharge batteries, from 7.5 kWh | sun.store')

  await page.reload()
  expect(page.url()).toBe(url)
  expect(await productNames(page)).toEqual(before)
  await expect(page.getByRole('checkbox', { name: /^EcoCharge/ })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: /^Batteries/ })).toBeChecked()
  await expect(minCapacity).toHaveValue('7.5')

  // back should undo only the last change
  await page.goBack()
  await settled(page, /sort=capacity-desc/)
  expect(page.url()).not.toContain('capacity=')
  await expect(page.getByTestId('result-count')).toHaveText('10 products')
})

test('a search is a single history entry and stays in sync with the input', async ({ page }) => {
  await open(page, '/?category=battery')
  const search = page.getByRole('searchbox', { name: 'Search products' })
  await search.pressSequentially('homevault', { delay: 40 })
  await settled(page, /q=homevault/)
  await expect(page.getByTestId('result-count')).toHaveText('5 products')

  await page.goBack()
  await settled(page, /\?category=battery$/)
  await expect(search).toHaveValue('')
  await expect(page.getByTestId('result-count')).toHaveText('1–24 of 50 products')
})

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false })

  test('a shared link is fully server-rendered with the right results and meta', async ({ page }) => {
    await page.goto('/?category=solar-panel&power=580-&sort=power-desc')
    expect(await productNames(page)).toEqual(['ZenithSolar Vertex 600', 'ZenithSolar Vertex 590', 'ZenithSolar Vertex 580'])
    await expect(page).toHaveTitle('Solar panels, from 580 W | sun.store')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex, follow')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/\?category=solar-panel&power=580-&sort=power-desc$/)
  })

  test('landing pages ship breadcrumbs as JSON-LD; robots.txt points to the sitemap', async ({ page, request }) => {
    await page.goto('/?category=battery&manufacturer=ecocharge')
    await expect(page.getByRole('navigation', { name: /breadcrumb/i })).toContainText('All products')
    const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent() ?? '{}')
    const trail = ld['@graph'].find((node: { '@type': string }) => node['@type'] === 'BreadcrumbList')
    expect(trail.itemListElement.map((i: { name: string }) => i.name)).toEqual(['All products', 'Batteries', 'EcoCharge'])

    await page.goto('/?category=battery&price=100-500')
    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0) // noindex page

    expect(await (await request.get('/robots.txt')).text()).toMatch(/Sitemap: http.+\/sitemap\.xml/)
    const sitemap = await (await request.get('/sitemap.xml')).text()
    expect(sitemap).toContain('/?category=battery&amp;manufacturer=ecocharge</loc>')
  })

  test('pagination links are real, crawlable links', async ({ page }) => {
    await page.goto('/?category=connector')
    const next = page.locator('a[href*="page=2"]').first()
    await expect(next).toHaveAttribute('href', '/?category=connector&page=2')
    await page.goto('/?category=connector&page=3')
    await expect(page.getByTestId('result-count')).toHaveText('49–50 of 50 products')
  })
})
