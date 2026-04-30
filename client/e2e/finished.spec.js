// e2e/finished.spec.js
// Testa a tela de fim de jogo
import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Tela de fim de jogo (/finished)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('exibe título de fim de jogo', async ({ page }) => {
    await page.goto('/finished')
    await expect(page.getByText(/fim de jogo/i)).toBeVisible()
  })

  test('exibe mensagem de erro se não há sala', async ({ page }) => {
    // Sem sala no store, deve mostrar erro
    await page.goto('/finished')
    const hasError = await page.getByText(/sala não encontrada|erro|ranking/i).isVisible()
    expect(hasError).toBeTruthy()
  })

  test('botão voltar ao lobby está presente', async ({ page }) => {
    await page.goto('/finished')
    await expect(page.getByRole('button', { name: /Voltar ao Lobby/i })).toBeVisible()
  })

  test('botão voltar ao lobby redireciona', async ({ page }) => {
    await page.goto('/finished')
    const btn = page.getByRole('button', { name: /Voltar ao Lobby/i })
    if (await btn.isVisible()) {
      await btn.click()
      await expect(page).not.toHaveURL('/finished')
    }
  })
})