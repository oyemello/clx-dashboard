
const { BigQuery } = require('@google-cloud/bigquery');
const path = require('path');
require('dotenv').config({ path: '.env' });

async function run() {
    const projectId = 'clx-dashboard'; // Hardcoded from user report
    console.log(`Connecting to project: ${projectId}`);

    // Explicitly check env
    console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS);

    const client = new BigQuery({ projectId });

    const dataset = 'amex_synth';
    try {
        console.log('Listing tables in amex_synth...');
        const [tables] = await client.dataset(dataset).getTables();
        console.log('Tables found:');
        tables.forEach(table => console.log(table.id));
    } catch (e) {
        console.error('Query Failed!');
        console.error(e.message);
        if (e.errors) console.error(JSON.stringify(e.errors, null, 2));
    }
}

run();
