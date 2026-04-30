// e2e/helpers.js — funções reutilizadas entre os testes

import { expect } from '@playwright/test'

export const BASE_USER = {
  email: 'dudu4@gmail.com',
  password: '123456',
}

// Faz login e garante que saiu da tela de login
export async function login(page, user = BASE_USER) {
  await page.goto('/login')
  await page.getByPlaceholder(/email/i).fill(user.email)
  await page.getByPlaceholder('••••••••').fill(user.password)
  await page.getByRole('button', { name: /entrar|login/i }).click()
  await expect(page).not.toHaveURL('/login')
}

// Aguarda toast, alert ou qualquer mensagem de erro aparecer
export async function expectError(page, pattern) {
  await expect(page.getByText(pattern)).toBeVisible({ timeout: 5000 })
}