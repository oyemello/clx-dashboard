import { BigQuery } from '@google-cloud/bigquery';
import fs from 'fs';
import path from 'path';
import { executeMockQuery } from './mock-query-engine';

// Server-only enforcement
if (typeof window !== 'undefined') {
    throw new Error('BigQuery client must be used on the server only.');
}

class MockBigQueryClient {
    private projectId: string;

    constructor(projectId: string) {
        this.projectId = projectId;
        console.log(`[MockBQ] Initialized for ${projectId}`);
    }

    async query(options: any) {
        const sql = typeof options === 'string' ? options : options.query;
        console.log(`[MockBQ] Querying: ${sql.substring(0, 100)}`);
        const rows = executeMockQuery(sql);
        return [rows, null, {}];
    }

    async getDatasets() {
        console.log(`[MockBQ] getDatasets() called`);
        const mockDataset = this.createMockDataset('sim_dataset_v1');
        return [[mockDataset], null, {}];
    }

    dataset(id: string) {
        console.log(`[MockBQ] dataset('${id}') called`);
        return this.createMockDataset(id);
    }

    private createMockDataset(id: string) {
        return {
            id,
            getMetadata: async () => {
                console.log(`[MockBQ] dataset('${id}').getMetadata() called`);
                return [{ location: 'asia-south1' }, {}];
            },
            getTables: async () => {
                console.log(`[MockBQ] dataset('${id}').getTables() called`);
                const tables = [
                    this.createMockTable('customers', [
                        { name: 'customer_id', type: 'STRING' },
                        { name: 'adoption', type: 'FLOAT' },
                        { name: 'nps', type: 'FLOAT' },
                        { name: 'clv', type: 'FLOAT' }
                    ]),
                    this.createMockTable('transactions', [
                        { name: 'date', type: 'DATE' },
                        { name: 'amount', type: 'FLOAT' },
                        { name: 'arpu', type: 'FLOAT' }
                    ]),
                    this.createMockTable('accounts', [
                        { name: 'account_id', type: 'STRING' },
                        { name: 'credit_limit', type: 'FLOAT' },
                        { name: 'fico', type: 'INTEGER' }
                    ]),
                    this.createMockTable('monthly_snapshots', [
                        { name: 'date', type: 'DATE' },
                        { name: 'profit', type: 'FLOAT' },
                        { name: 'roic', type: 'FLOAT' },
                        { name: 'delinq', type: 'FLOAT' },
                        { name: 'churn', type: 'FLOAT' }
                    ])
                ];
                return [tables, null, {}];
            }
        };
    }

    private createMockTable(id: string, fields: any[]) {
        return {
            id,
            getMetadata: async () => {
                console.log(`[MockBQ] table('${id}').getMetadata() called`);
                return [{
                    schema: { fields },
                    numRows: '1240000',
                    type: 'TABLE'
                }, {}];
            }
        };
    }
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
    const requestedProject = config?.projectId || process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_PROJECT_ID;

    // 0. Simulation Bypass
    if (requestedProject === 'clx-simulation') {
        return new MockBigQueryClient(requestedProject) as unknown as BigQuery;
    }

    // 1. Prefer Config (Dynamic)
    if (config?.credentials) {
        try {
            return new BigQuery({
                projectId: requestedProject || config.credentials.project_id,
                credentials: config.credentials,
                location: config.location || process.env.BIGQUERY_LOCATION || 'US'
            });
        } catch (error) {
            console.error('Failed to init BigQuery with dynamic credentials:', error);
            throw error;
        }
    }

    // 2. Service Account JSON in env (Vercel-friendly)
    const envCredentials = readServiceAccountFromEnv();
    const defaultLocation = config?.location || process.env.BIGQUERY_LOCATION || 'US';

    if (envCredentials) {
        return new BigQuery({
            projectId: requestedProject || envCredentials.project_id,
            credentials: envCredentials,
            location: defaultLocation
        });
    }

    // 3. Fallback to key file (env or bundled ./key/*.json)
    let credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || findLocalKeyFile();
    if (credentialsPath && !path.isAbsolute(credentialsPath)) {
        credentialsPath = path.join(process.cwd(), credentialsPath);
    }

    let projectId = requestedProject;
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
            location: defaultLocation,
        });
        return client;
    } catch (error: any) {
        console.error('Failed to initialize BigQuery client:', error);
        throw error;
    }
}
