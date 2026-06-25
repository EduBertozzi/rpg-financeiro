// Aplica as migrations do Prisma (prisma/migrations) em um banco Turso/libsql remoto.
// O `prisma migrate deploy` não suporta o protocolo libsql://, então aplicamos o SQL manualmente,
// rastreando o que já foi aplicado numa tabela própria (mesma ideia do _prisma_migrations).
const fs = require('fs')
const path = require('path')
const { createClient } = require('@libsql/client')

async function main() {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN
  if (!url) throw new Error('TURSO_DATABASE_URL não definida')

  const client = createClient({ url, authToken })

  await client.execute(`
    CREATE TABLE IF NOT EXISTS _migrations_applied (
      name TEXT PRIMARY KEY,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations')
  const folders = fs.readdirSync(migrationsDir).filter((f) =>
    fs.statSync(path.join(migrationsDir, f)).isDirectory()
  ).sort()

  for (const folder of folders) {
    const { rows } = await client.execute({
      sql: 'SELECT 1 FROM _migrations_applied WHERE name = ?',
      args: [folder],
    })
    if (rows.length > 0) {
      console.log(`✓ já aplicada: ${folder}`)
      continue
    }

    const sqlPath = path.join(migrationsDir, folder, 'migration.sql')
    const sql = fs.readFileSync(sqlPath, 'utf8')
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)

    console.log(`→ aplicando: ${folder} (${statements.length} statements)`)
    for (const statement of statements) {
      await client.execute(statement)
    }

    await client.execute({
      sql: 'INSERT INTO _migrations_applied (name) VALUES (?)',
      args: [folder],
    })
    console.log(`✓ aplicada: ${folder}`)
  }

  console.log('Migrations sincronizadas com o Turso.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
