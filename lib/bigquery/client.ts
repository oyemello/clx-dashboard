import { BigQuery } from '@google-cloud/bigquery';
import fs from 'fs';
import path from 'path';

// Server-only enforcement
if (typeof window !== 'undefined') {
    throw new Error('BigQuery client must be used on the server only.');
}

interface ClientConfig {
    projectId?: string;
    credentials?: any;
    location?: string;
}

function readServiceAccountFromEnv() {
    const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!json) return null;
    try {
        return typeof json === 'string' ? JSON.parse(json) : json;
    } catch (error) {
        console.error('Failed to parse GOOGLE_SERVICE_ACCOUNT_JSON', error);
        return null;
    }
}

function findLocalKeyFile() {
    const candidateDir = path.join(process.cwd(), 'key');
    if (!fs.existsSync(candidateDir)) return null;

    const jsonFiles = fs.readdirSync(candidateDir).filter(f => f.endsWith('.json'));
    if (jsonFiles.length === 0) return null;

    return path.join(candidateDir, jsonFiles[0]);
}

export function getBigQueryClient(config?: ClientConfig) {
    // 1. Prefer Config (Dynamic)
    if (config?.credentials) {
        try {
            return new BigQuery({
                projectId: config.projectId || config.credentials.project_id,
                credentials: config.credentials,
                location: config.location || 'US'
            });
        } catch (error) {
            console.error('Failed to init BigQuery with dynamic credentials:', error);
            throw error;
        }
    }

    // 2. Service Account JSON in env (Vercel-friendly)
    const envCredentials = readServiceAccountFromEnv();
    const projectFromEnv = config?.projectId || process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_PROJECT_ID;
    if (envCredentials) {
        return new BigQuery({
            projectId: projectFromEnv || envCredentials.project_id,
            credentials: envCredentials,
            location: config?.location || 'US'
        });
    }

    // 3. Fallback to key file (env or bundled ./key/*.json)
    let credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || findLocalKeyFile();
    if (credentialsPath && !path.isAbsolute(credentialsPath)) {
        credentialsPath = path.join(process.cwd(), credentialsPath);
    }

    let projectId = projectFromEnv;
    if (!projectId && credentialsPath && fs.existsSync(credentialsPath)) {
        try {
            const parsed = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
            projectId = parsed.project_id || projectId;
        } catch (error) {
            console.warn('Unable to infer projectId from credentials file', error);
        }
    }

    if (!projectId) {
        throw new Error('Missing projectId for BigQuery client. Provide projectId in config or set GOOGLE_CLOUD_PROJECT/GOOGLE_PROJECT_ID.');
    }

    if (!credentialsPath) {
        throw new Error('Missing BigQuery credentials. Set GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_APPLICATION_CREDENTIALS, or place a key file in ./key');
    }

    // Explicitly check if file exists
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
