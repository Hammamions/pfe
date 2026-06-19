const { Client } = require('pg');

const urls = [
    'postgresql://postgres:postgres@localhost:5432/hospital-db',
    'postgresql://postgres@localhost:5432/hospital-db',
    'postgresql://postgres:admin@localhost:5432/hospital-db',
    'postgresql://postgres:postgres@localhost:5432/postgres'
];

async function test() {
    for (const url of urls) {
        console.log(`Testing ${url}...`);
        const client = new Client({ connectionString: url });
        try {
            await client.connect();
            console.log(`SUCCESS: Connected to ${url}`);
            const res = await client.query('SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = \'public\'');
            console.log('Tables:', res.rows.map(r => r.tablename).join(', '));
            await client.end();
            return;
        } catch (e) {
            console.log(`FAILED: ${e.message}`);
        }
    }
}

test();
