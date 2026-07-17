const { createClient } = require('@vercel/postgres');

let client = null;

/**
 * Get or create a database connection.
 * Reuses the same client across warm invocations.
 */
async function getDb() {
  if (!client) {
    client = createClient();
    await client.connect();
  }
  return client;
}

module.exports = { getDb };
