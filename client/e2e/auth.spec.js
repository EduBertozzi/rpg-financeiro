// e2e/auth.spec.js
import { test, expect } from '@playwright/test'

const TIMESTAMP = Date.now()
const TEST_USER = {
  name: 'Jogador Teste',
  email: `teste_${TIMESTAMP}@gmail.com`,
  password: '123456',
}

test.describe('Autenticação', () => {
  test('register — cria conta e redireciona', async ({ page }) => {
    await page.goto('/register')

    await page.getByPlaceholder(/nome/i).fill(TEST_USER.name)
    await page.getByPlaceholder(/email/i).fill(TEST_USER.email)
    await page.getByPlaceholder('••••••••').fill(TEST_USER.password)
    await page.getByRole('button', { name: /cadastrar|criar|registrar/i }).click()

    await expect(page).not.toHaveURL('/register')
  })

  test('login — entra com credenciais válidas', async ({ page }) => {
    await page.goto('/login')

    await page.getByPlaceholder(/email/i).fill('dudu3@gmail.com')
    await page.getByPlaceholder('••••••••').fill('123456')
    await page.getByRole('button', { name: /entrar|login/i }).click()

    await expect(page).not.toHaveURL('/login')
  })

  test('login — exibe erro com credenciais inválidas', async ({ page }) => {
    await page.goto('/login')

    await page.getByPlaceholder(/email/i).fill('naoexiste@gmail.com')
    await page.getByPlaceholder('••••••••').fill('senhaerrada')
    await page.getByRole('button', { name: /entrar|login/i }).click()

    await expect(page).toHaveURL('/login')
    await expect(page.getByText(/erro|inválido|incorret|não encontrado/i)).toBeVisible()
  })

  test('redireciona para login se não autenticado', async ({ browser }) => {
    // Usa contexto limpo — sem cookies/localStorage do login anterior
    const context = await browser.newContext()
    const page = await context.newPage()

    await page.goto('/map')
    await expect(page).toHaveURL('/login')

    await context.close()
  })
})