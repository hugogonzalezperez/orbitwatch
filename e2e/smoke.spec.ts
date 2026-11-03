import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// La política de contenido de la página bloquea `new Function`, que Playwright usa para evaluar en ella: esos errores son de la
// herramienta, no de la app (sin evaluar nada la consola queda limpia), y se descartan.
const FROM_TOOL = 'Evaluating a string as JavaScript'

test('carga el catálogo, muestra las categorías y la ficha de la ISS, sin errores en consola', async ({ page }) => {
  const problems: string[] = []
  page.on('console', (message) => message.type() === 'error' && !message.text().includes(FROM_TOOL) && problems.push(message.text()))
  page.on('pageerror', (error) => !error.message.includes(FROM_TOOL) && problems.push(error.message))
  await page.goto('/')

  await expect(page.locator('.brand-line')).toContainText('objetos', { timeout: 30_000 })
  await expect(page.locator('.legend-toggle')).toHaveCount(13)
  await expect(page.locator('.card-name')).toHaveText('ISS (ZARYA)') // la primera vista es la ISS
  await expect(page.locator('.origin')).toContainText('Estación Espacial Internacional')
  expect(problems).toEqual([])
})

test('buscar un satélite lo elige y la dirección lo recuerda', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.legend-toggle').first()).toBeVisible({ timeout: 30_000 })
  await page.getByRole('combobox', { name: /Buscar satélite/ }).fill('noaa 19')
  await page.keyboard.press('Enter')
  await expect(page.locator('.card-name')).toHaveText('NOAA 19')
  await expect(page).toHaveURL(/sat=33591/)
})

test('un enlace con satélite, país y modo de color abre ese estado', async ({ page }) => {
  await page.goto('/?sat=25544&owner=US&color=regime')
  await expect(page.locator('.card-name')).toHaveText('ISS (ZARYA)', { timeout: 30_000 })
  await expect(page.locator('.owner-filter select')).toHaveValue('US')
  await expect(page.getByRole('radio', { name: 'Órbita' })).toBeChecked()
})

test('filtrar por país deja solo sus categorías y objetos', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.legend-toggle').first()).toBeVisible({ timeout: 30_000 })
  const todos = await page.locator('.legend-count').allTextContents()
  await page.locator('.owner-filter select').selectOption('CIS')
  const rusia = await page.locator('.legend-count').allTextContents()
  expect(rusia.join()).not.toBe(todos.join())
})

test('saltar a una hora cambia el reloj', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.legend-toggle').first()).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: 'Ir a…' }).click()
  await page.getByLabel('Fecha y hora (UTC)').fill('2026-03-20T14:46')
  await page.getByRole('button', { name: 'Ir', exact: true }).click()
  await expect(page.locator('.clock-utc')).toContainText('20 mar')
})

test('el buscador de acercamientos devuelve pares', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('.legend-toggle').first()).toBeVisible({ timeout: 30_000 })
  await page.getByText('Acercamientos ahora').click()
  // las posiciones llegan del Worker poco después del catálogo: se insiste hasta que haya resultado
  await expect(async () => {
    await page.getByRole('button', { name: /Buscar/ }).click()
    await expect(page.locator('.approaches-list li').first()).toBeVisible({ timeout: 1500 })
  }).toPass({ timeout: 20_000 })
})

test.describe('accesibilidad (axe)', () => {
  test.use({ bypassCSP: true }) // axe se inyecta con script, que la política de contenido de la página no deja

  for (const [name, url] of [['inicio', '/'], ['con filtros, ficha y modo órbita', '/?sat=25544&owner=US&color=regime']] as const) {
    test(`sin infracciones graves: ${name}`, async ({ page }) => {
      await page.goto(url)
      await expect(page.locator('.legend-toggle').first()).toBeVisible({ timeout: 30_000 })
      const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
      expect(violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length})`)).toEqual([])
    })
  }
})
