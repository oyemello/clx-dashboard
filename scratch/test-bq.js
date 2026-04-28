const { BigQuery } = require('@google-cloud/bigquery');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

async function testConnection() {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_PROJECT_ID;
    const keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    console.log(`Testing connection for project: ${projectId}`);
    console.log(`Using key file: ${keyFilename}`);

    try {
        const bq = new BigQuery({
            projectId,
            keyFilename: path.isAbsolute(keyFilename) ? keyFilename : path.join(process.cwd(), keyFilename)
        });

        const [rows] = await bq.query('SELECT 1');
        console.log('Success!', rows);
    } catch (e) {
        console.error('FAILED:', e.message);
        if (e.errors) {
            console.error('Detailed errors:', JSON.stringify(e.errors, null, 2));
        }
    }
}

testConnection();
