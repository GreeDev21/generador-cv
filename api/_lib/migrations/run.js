const { createClient } = require('@vercel/postgres');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const client = createClient();
  await client.connect();

  const migrationsDir = __dirname;
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await client.query(sql);
    console.log(`✅ Migration ${file} applied`);
  }

  await client.end();
  console.log('✅ All migrations applied');
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
