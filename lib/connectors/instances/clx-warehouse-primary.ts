import { ConnectorConfig } from "../types";

export const CLX_WAREHOUSE_PRIMARY: ConnectorConfig = {
    metadata: {
        id: 'clx_warehouse_primary',
        name: 'CLX Exec Platform',
        description: 'Live executive dataset for CLX (BigQuery).',
        provider: 'bigquery',
        environments: ['dev', 'staging', 'prod'],
        defaultLocation: 'US',
        project: 'clx-main-platform'
    },
    auth: {
        type: 'service_account',
        keyFile: 'key/clx-main-platform-cdd39f23a8f1.json'
    },
    sources: [
        {
            id: 'clx_exec',
            description: 'Executive-ready dataset built from the clx_exec_data_platform_full bundle.',
            governance: {
                owner: 'data-team@clx-main-platform.com',
                piiClassification: 'sensitive',
                retentionPolicy: '7 years',
                allowedConsumers: ['exec-dashboard', 'data-team'],
                lastAudit: new Date().toISOString()
            },
            tables: []
        }
    ],



}
