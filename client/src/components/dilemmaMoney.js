// Dinheiro na carta do dilema: quanto tem na conta, quanto está guardado e
// quanto sobra na conta depois de cada opção (funções puras).

const cents = (n) => Math.round(Number(n) * 100) / 100

// o que sai da conta agora: o preço, ou a primeira parcela
export const payNow = (option) => cents(option.installment ? option.installment.amount : option.price ?? 0)

// saldo da conta depois de escolher a opção
export const cashAfter = (cash, option) => cents(Number(cash) - payNow(option))

// total guardado nas caixinhas abertas
export const savedTotal = (investments = []) =>
  cents(investments.filter((i) => !i.redeemedAt).reduce((sum, i) => sum + Number(i.amount), 0))

// texto curto do que sobra: "sobram R$ 1.200,00" ou "fica −R$ 300,00 no cheque especial"
export function afterLabel(cash, option, brl) {
  const after = cashAfter(cash, option)
  if (after >= 0) return { text: `sobram ${brl(after)} na conta`, negative: false }
  return { text: `fica −${brl(-after)}: entra no cheque especial`, negative: true }
}
