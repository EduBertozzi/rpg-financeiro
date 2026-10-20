// __tests__/events.test.js — calendário de imprevistos e lazer do mês
const { EVENT_CALENDAR, QUIET, QUIET_CHANCE, eventsFor, expectedPositiveEvents } = require('../src/utils/events')
const { LEISURE, leisureFor, leisurePrice, yearlyLeisureCost } = require('../src/utils/leisure')
const { payslip } = require('../src/utils/finance')

const fixedRng = (value) => () => value

describe('calendário de eventos', () => {
  it('tem eventos para todas as viradas, de fevereiro a dezembro', () => {
    expect(Object.keys(EVENT_CALENDAR).map(Number)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('todo evento tem título, descrição, valor e categoria', () => {
    for (const e of Object.values(EVENT_CALENDAR).flat()) {
      expect(e.title).toEqual(expect.any(String))
      expect(e.description.length).toBeGreaterThan(10)
      expect(Number.isFinite(e.cashImpact)).toBe(true)
      expect(['positive', 'daily', 'salary']).toContain(e.category)
      expect(e.category === 'positive').toBe(e.cashImpact > 0 && e.category !== 'salary')
    }
  })

  it('janeiro não tem imprevisto: o PIX de boas-vindas saiu do jogo', () => {
    expect(EVENT_CALENDAR[1]).toBeUndefined()
  })

  it('dezembro sempre tem 13º (líquido de R$ 5.463,74) e gastos de fim de ano (R$ 550)', () => {
    for (const r of [0, 0.1, 0.5, 0.99]) {
      expect(eventsFor(12, fixedRng(r)).map((e) => [e.title, e.cashImpact])).toEqual([
        ['13º salário', 5463.74], ['Gastos de fim de ano', -550],
      ])
    }
  })

  it('13º: cai o líquido do holerite de R$ 7.000 (INSS 781,51 e IR 754,75 descontados)', () => {
    const thirteenth = EVENT_CALENDAR[12].find((e) => e.title === '13º salário')
    expect(thirteenth.cashImpact).toBe(5463.74)
    expect(thirteenth.cashImpact).toBe(payslip(7000).net)
    expect(thirteenth.cashImpact).toBeCloseTo(7000 - 781.51 - 754.75, 2)
    expect(thirteenth.category).toBe('salary')
    expect(thirteenth.fixed).toBe(true)
  })

  it('13º: a descrição mostra o bruto, os descontos e o líquido', () => {
    const { description } = EVENT_CALENDAR[12].find((e) => e.title === '13º salário')
    expect(description).toContain('R$ 7.000,00 brutos')
    expect(description).toContain('INSS (R$ 781,51)')
    expect(description).toContain('Imposto de Renda (R$ 754,75)')
    expect(description).toContain('R$ 5.463,74 líquidos')
  })

  it('abaixo da chance de mês tranquilo, não acontece nada', () => {
    expect(QUIET_CHANCE).toBe(0.2)
    expect(eventsFor(7, fixedRng(0))).toEqual([QUIET])
    expect(eventsFor(7, fixedRng(0.199))).toEqual([QUIET])
  })

  it('acima dela, sorteia um da lista do mês por igual', () => {
    expect(eventsFor(7, fixedRng(0.2))[0].title).toBe('Multa de trânsito')
    expect(eventsFor(7, fixedRng(0.5))[0].title).toBe('Venda de usados')
    expect(eventsFor(7, fixedRng(0.9999))[0].title).toBe('Chuva forte')
  })

  it('mês com um evento só: acontece ou não', () => {
    expect(eventsFor(2, fixedRng(0.1))).toEqual([QUIET])
    expect(eventsFor(2, fixedRng(0.7))[0].title).toBe('Convite para casamento')
  })

  it('mês fora do calendário (janeiro, final do jogo) é tranquilo', () => {
    expect(eventsFor(1, fixedRng(0.9))).toEqual([QUIET])
    expect(eventsFor(13, fixedRng(0.9))).toEqual([QUIET])
  })

  it('aceita o mês como texto', () => {
    expect(eventsFor('2', fixedRng(0.7))[0].title).toBe('Convite para casamento')
  })

  it('em 2.000 sorteios, cerca de 20% dos meses são tranquilos', () => {
    let quiet = 0
    for (let i = 0; i < 2000; i++) if (eventsFor(5, fixedRng(i / 2000))[0] === QUIET) quiet++
    expect(quiet / 2000).toBeCloseTo(0.2, 2)
  })

  it('os consertos (25% mais baratos com o Técnico) são o celular e o notebook', () => {
    expect(Object.values(EVENT_CALENDAR).flat().filter((e) => e.repair).map((e) => e.cashImpact)).toEqual([-450, -450])
  })

  it('valor esperado dos eventos bons do ano: R$ 1.392', () => {
    expect(expectedPositiveEvents()).toBe(1392)
  })
})

describe('lazer do mês', () => {
  it('12 meses, cada um com duas opções', () => {
    expect(Object.keys(LEISURE).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    for (const m of Object.values(LEISURE)) {
      expect(m.options).toHaveLength(2)
      for (const o of m.options) {
        expect(o.title).toEqual(expect.any(String))
        expect(o.description).toEqual(expect.any(String))
      }
    }
  })

  it('preços do mural (×1,5 desde 20/10/2026), mês a mês', () => {
    expect(Object.values(LEISURE).map((m) => m.price)).toEqual([750, 450, 300, 530, 380, 230, 150, 900, 450, 680, 980, 1500])
  })

  it('o ano todo custa R$ 7.300', () => {
    expect(yearlyLeisureCost()).toBe(7300)
  })

  it('Trabalho em Equipe: 15% a menos, em centavos', () => {
    expect(leisurePrice(1, { leisureDiscount: 0.15 })).toBe(637.5)
    expect(leisurePrice(6, { leisureDiscount: 0.15 })).toBe(195.5)
  })

  it('sem desconto paga o preço cheio', () => {
    expect(leisurePrice(12)).toBe(1500)
    expect(leisurePrice(12, { leisureDiscount: 0 })).toBe(1500)
  })

  it('mês fora do ano não tem lazer', () => {
    expect(leisureFor(0)).toBeNull()
    expect(leisureFor(13)).toBeNull()
    expect(leisurePrice(13)).toBeNull()
  })
})
