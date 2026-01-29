import { BigQuery } from '@google-cloud/bigquery';
import { ConnectorConfig, DiscoveryResult, ConnectorAuth } from '../types';

// Server-only Check
if (typeof window !== 'undefined') {
    throw new Error('BigQueryConnector must strictly be used on the server.');
}

export class BigQueryService {
    private client: BigQuery;

    constructor(projectId?: string) {
        // Relies on GOOGLE_APPLICATION_CREDENTIALS for auth
        // and GOOGLE_CLOUD_PROJECT if projectId not supplied
        this.client = new BigQuery({
            projectId: projectId || process.env.GOOGLE_CLOUD_PROJECT,
        });
    }

    /**
     * Requirement 1: Connector Validation (Handshake)
     * Executes a lightweight SELECT 1 to verify credentials and connectivity.
     */
    async validateConnection(): Promise<{ connected: boolean; error?: string }> {
        try {
            await this.client.query('SELECT 1');
            return { connected: true };
        } catch (error: any) {
            console.error('BigQuery Handshake Failed:', error);
            return {
                connected: false,
                error: error.message || 'Unknown connection error'
            };
        }
    }

    /**
     * Requirement 2: Discovery Layer (Enterprise-grade)
     * Lists datasets, tables, and fetches schemas.
     */
    async discoverSchema(): Promise<DiscoveryResult> {
        const result: DiscoveryResult = {
            totalDatasets: 0,
            totalTables: 0,
            lastRefreshed: new Date().toISOString(),
            schemaHash: '', // Logic to generate hash could go here
            datasets: []
        };

        try {
            const [datasets] = await this.client.getDatasets();
            result.totalDatasets = datasets.length;

            for (const dataset of datasets) {
                const datasetId = dataset.id;
                if (!datasetId) continue;

                // Get Dataset Location
                const [datasetMeta] = await dataset.getMetadata();
                const location = datasetMeta.location;

                // Get Tables
                const [tables] = await dataset.getTables();
                const tableDetails = [];

                for (const table of tables) {
                    const tableId = table.id;
                    if (!tableId) continue;

                    // Fetch Table Metadata (Schema & Row Count)
                    const [tableMeta] = await table.getMetadata();
                    const schema = tableMeta.schema?.fields || [];
                    const rowCount = parseInt(tableMeta.numRows || '0', 10);

                    tableDetails.push({
                        id: tableId,
                        type: tableMeta.type?.toLowerCase() || 'table',
                        rowCount,
                        schema: schema.map((field: any) => ({
                            name: field.name,
                            type: field.type,
                            mode: field.mode
                        })),
                        description: tableMeta.description || ''
                    });
                }

                result.totalTables += tableDetails.length;
                result.datasets?.push({
                    id: datasetId,
                    location,
                    tables: tableDetails
                });
            }

            return result;

        } catch (error: any) {
            console.error('BigQuery Discovery Failed:', error);
            throw new Error(`Discovery failed: ${error.message}`);
        }
    }
}
