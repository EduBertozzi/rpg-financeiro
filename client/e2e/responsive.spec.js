// e2e/responsive.spec.js
// Testa responsividade nas telas principais
import { test, expect, devices } from '@playwright/test'
import { login } from './helpers.js'

const MOBILE = devices['Pixel 5']

test.describe('Responsividade mobile', () => {
  test('login renderiza corretamente no mobile', async ({ browser }) => {
    const context = await browser.newContext({ ...MOBILE })
    const page = await context.newPage()

    await page.goto('/login')
    await expect(page.getByPlaceholder(/email/i)).toBeVisible()
    await expect(page.getByPlaceholder('••••••••')).toBeVisible()
    await expect(page.getByRole('button', { name: /entrar|login/i })).toBeVisible()

    await context.close()
  })

  test('register renderiza corretamente no mobile', async ({ browser }) => {
    const context = await browser.newContext({ ...MOBILE })
    const page = await context.newPage()

    await page.goto('/register')
    await expect(page.getByPlaceholder(/nome/i)).toBeVisible()
    await expect(page.getByPlaceholder(/email/i)).toBeVisible()

    await context.close()
  })

  test('map renderiza sem overflow horizontal no mobile', async ({ browser }) => {
    const context = await browser.newContext({ ...MOBILE })
    const page = await context.newPage()

    await login(page)
    await page.goto('/map')

    // Verifica que não há scroll horizontal
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalScroll).toBeFalsy()

    await context.close()
  })

  test('finished renderiza sem overflow no mobile', async ({ browser }) => {
    const context = await browser.newContext({ ...MOBILE })
    const page = await context.newPage()

    await login(page)
    await page.goto('/finished')

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth
    })
    expect(hasHorizontalScroll).toBeFalsy()

    await context.close()
  })
})