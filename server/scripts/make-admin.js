// Promove uma conta a administrador, direto no banco (para quem cuida do servidor).
// Uso: npm run make-admin -- email@exemplo.com
require('dotenv').config()
const prisma = require('../src/lib/prisma')

async function main() {
  const email = process.argv[2]
  if (!email) throw new Error('Informe o e-mail: npm run make-admin -- email@exemplo.com')
  const user = await prisma.user.update({ where: { email }, data: { role: 'admin' } })
  console.log(`${user.email} agora é administrador.`)
}

main()
  .catch((err) => {
    console.error(err.message)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
