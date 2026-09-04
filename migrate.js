const { Client } = require('pg');

const supabaseClient = new Client({
  host: '54.64.190.72',
  port: 5432,
  user: 'postgres.eidificdpzecsqqohigx',
  password: 'Jangankepo11',
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});

const localClient = new Client({
  host: '127.0.0.1',
  port: 5432,
  user: 'peligo',
  password: 'Pelindo3',
  database: 'peligo_db',
});

async function migrateTable(tableName, columns) {
  const res = await supabaseClient.query(`SELECT * FROM ${tableName}`);
  console.log(`${tableName}: ${res.rows.length} baris ditemukan`);

  for (const row of res.rows) {
    const cols = columns.join(', ');
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    const values = columns.map((col) => row[col]);

    const query = `INSERT INTO ${tableName} (${cols}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
    await localClient.query(query, values);
  }
  console.log(`${tableName}: selesai dipindahkan`);
}

async function main() {
  await supabaseClient.connect();
  await localClient.connect();

  await migrateTable('users', [
    'id', 'username', 'password_hash', 'name', 'nip', 'division',
    'phone', 'role', 'status', 'created_at',
  ]);

  await migrateTable('cars', [
    'id', 'name', 'plate_number', 'image', 'type', 'transmission',
    'fuel', 'status', 'display_order', 'created_at',
  ]);

  await migrateTable('peminjaman', [
    'id', 'user_id', 'borrower_name', 'nip', 'division', 'phone',
    'car_id', 'car_name', 'plate_number', 'start_date', 'start_time',
    'end_date', 'end_time', 'duration', 'destination', 'purpose',
    'driver_option', 'status', 'notes', 'request_date',
  ]);

  await supabaseClient.end();
  await localClient.end();
  console.log('Migrasi selesai!');
}

main().catch((err) => {
  console.error('Error migrasi:', err);
  process.exit(1);
});
