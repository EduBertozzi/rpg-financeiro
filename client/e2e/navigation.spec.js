// e2e/navigation.spec.js
import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Navegação', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('GameHeader aparece nas telas do jogo', async ({ page }) => {
    await page.goto('/map')
    // GameHeader usa div, não header/nav — busca pelo conteúdo que ele exibe
    await expect(page.getByText('RPG Financeiro')).toBeVisible()
  })

  test('navega para o banco', async ({ page }) => {
    await page.goto('/bank')
    await expect(page).toHaveURL('/bank')
    await expect(page.getByRole('heading', { name: 'Banco' })).toBeVisible()
  })

  test('navega para a corretora', async ({ page }) => {
    await page.goto('/broker')
    await expect(page).toHaveURL('/broker')
    await expect(page.getByRole('heading', { name: 'Corretora' })).toBeVisible()
  })

  test('navega para skill tree', async ({ page }) => {
    await page.goto('/skills')
    await expect(page).toHaveURL('/skills')
    await expect(page.getByText('Árvore de Habilidades')).toBeVisible()
  })

  test('tela de admin redireciona para login para não-admin', async ({ page }) => {
    // AdminRoute no App.jsx redireciona não-admins pro login
    await page.goto('/admin')
    await expect(page).toHaveURL('/login')
  })
})