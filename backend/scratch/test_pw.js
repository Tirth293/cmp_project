const { Client } = require('pg');

async function testPassword(password) {
  const connectionString = `postgresql://postgres:${password}@localhost:5432/cmp_appraisal`;
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log(`SUCCESS: Password is "${password}"`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`FAILED: Password "${password}" - ${err.message}`);
    return false;
  }
}

async function run() {
  const commonPasswords = ['', 'postgres', 'admin', 'root', '123456', 'password'];
  for (const pw of commonPasswords) {
    if (await testPassword(pw)) {
      process.exit(0);
    }
  }
  process.exit(1);
}

run();
