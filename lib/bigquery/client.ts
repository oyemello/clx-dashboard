import { BigQuery } from '@google-cloud/bigquery';
import fs from 'fs';
import path from 'path';

// Server-only enforcement
if (typeof window !== 'undefined') {
    throw new Error('BigQuery client must be used on the server only.');
}

export function getBigQueryClient() {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_PROJECT_ID;
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    if (!projectId) {
        throw new Error('Missing GOOGLE_CLOUD_PROJECT environment variable.');
    }

    if (!credentialsPath) {
        throw new Error('Missing GOOGLE_APPLICATION_CREDENTIALS environment variable.');
    }

    // Explicitly check if file exists to give a better error than the SDK
    if (!fs.existsSync(credentialsPath)) {
        throw new Error(`Credentials file not found at: ${credentialsPath}`);
    }

    try {
        const client = new BigQuery({
            projectId,
            keyFilename: credentialsPath,
            // location: process.env.BIGQUERY_LOCATION || 'US', // Optional default
        });
        return client;
    } catch (error: any) {
        console.error('Failed to initialize BigQuery client:', error);
        throw error;
    }
}
