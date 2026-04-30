// e2e/character.spec.js
import { test, expect } from '@playwright/test'
import { login } from './helpers.js'

test.describe('Criação de personagem', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('formulário step 1 aparece com campos corretos', async ({ page }) => {
    await page.goto('/character')
    await expect(page.getByRole('heading', { name: 'Criar Personagem' })).toBeVisible()
    await expect(page.getByPlaceholder('Como você quer ser chamado?')).toBeVisible()
    await expect(page.getByText('Curso de Engenharia')).toBeVisible()
    await expect(page.getByPlaceholder('Ex: XYK940')).toBeVisible()
  })

  test('botão próximo desabilitado sem preencher campos', async ({ page }) => {
    await page.goto('/character')
    const btn = page.getByRole('button', { name: 'Próximo' })
    await expect(btn).toBeDisabled()
  })

  test('avança para step 2 ao preencher step 1', async ({ page }) => {
    await page.goto('/character')

    await page.getByPlaceholder('Como você quer ser chamado?').fill('Dudu Teste')
    await page.getByRole('button', { name: 'Masculino' }).click()
    await page.getByRole('combobox').selectOption('Engenharia de Software')
    await page.getByPlaceholder('Ex: XYK940').fill('ABC123')
    await page.getByRole('button', { name: 'Próximo' }).click()

    await expect(page.getByRole('heading', { name: 'Escolha seu Dom' })).toBeVisible()
  })

  test('step 2 exibe os três doms disponíveis', async ({ page }) => {
    await page.goto('/character')

    // Preenche step 1 pra chegar no step 2
    await page.getByPlaceholder('Como você quer ser chamado?').fill('Dudu Teste')
    await page.getByRole('button', { name: 'Masculino' }).click()
    await page.getByRole('combobox').selectOption('Engenharia de Software')
    await page.getByPlaceholder('Ex: XYK940').fill('ABC123')
    await page.getByRole('button', { name: 'Próximo' }).click()

    await expect(page.getByText('Mão de Vaca Estratégico')).toBeVisible()
    await expect(page.getByText('Desenrolado')).toBeVisible()
    await expect(page.getByText('Inteligente')).toBeVisible()
  })

  test('step 2 — botão próximo desabilitado sem escolher dom', async ({ page }) => {
    await page.goto('/character')

    await page.getByPlaceholder('Como você quer ser chamado?').fill('Dudu Teste')
    await page.getByRole('button', { name: 'Masculino' }).click()
    await page.getByRole('combobox').selectOption('Engenharia de Software')
    await page.getByPlaceholder('Ex: XYK940').fill('ABC123')
    await page.getByRole('button', { name: 'Próximo' }).click()

    // No step 2, próximo deve estar desabilitado sem dom selecionado
    const btns = page.getByRole('button', { name: 'Próximo' })
    await expect(btns).toBeDisabled()
  })

  test('step 3 — tela de confirmação mostra resumo do personagem', async ({ page }) => {
    await page.goto('/character')

    // Step 1
    await page.getByPlaceholder('Como você quer ser chamado?').fill('Dudu Teste')
    await page.getByRole('button', { name: 'Masculino' }).click()
    await page.getByRole('combobox').selectOption('Engenharia de Software')
    await page.getByPlaceholder('Ex: XYK940').fill('ABC123')
    await page.getByRole('button', { name: 'Próximo' }).click()

    // Step 2
    await page.getByText('Inteligente').click()
    await page.getByRole('button', { name: 'Próximo' }).click()

    // Step 3
    await expect(page.getByRole('heading', { name: 'Confirmação' })).toBeVisible()
    await expect(page.getByText('Dudu Teste')).toBeVisible()
    await expect(page.getByText('Engenharia de Software')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Começar Jogo!' })).toBeVisible()
  })

  test('botão voltar no step 2 retorna ao step 1', async ({ page }) => {
    await page.goto('/character')

    await page.getByPlaceholder('Como você quer ser chamado?').fill('Dudu Teste')
    await page.getByRole('button', { name: 'Masculino' }).click()
    await page.getByRole('combobox').selectOption('Engenharia de Software')
    await page.getByPlaceholder('Ex: XYK940').fill('ABC123')
    await page.getByRole('button', { name: 'Próximo' }).click()

    await page.getByRole('button', { name: 'Voltar' }).click()

    await expect(page.getByRole('heading', { name: 'Sua Identidade' })).toBeVisible()
  })
})