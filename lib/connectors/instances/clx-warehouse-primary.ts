import { ConnectorConfig } from "../types";

export const CLX_WAREHOUSE_PRIMARY: ConnectorConfig = {
    metadata: {
        id: 'clx_warehouse_primary',
        name: 'CLX Warehouse Primary',
        description: 'Primary analytical warehouse for Dashboard metrics and reporting.',
        provider: 'bigquery',
        environments: ['dev', 'staging', 'prod'],
        defaultLocation: 'us-east1',
        project: 'clx-dashboard'
    },
    auth: {
        type: 'adc', // Application Default Credentials
    },
    sources: [
        {
            id: 'amex_synth',
            description: 'Synthetic dataset for development and testing.',
            governance: {
                owner: 'data-engineering@amex-bench.com',
                piiClassification: 'sensitive',
                retentionPolicy: '7 years',
                allowedConsumers: ['analyst-group', 'executive-dashboard'],
                lastAudit: '2025-12-15T00:00:00Z'
            },
            tables: [
                {
                    id: 'customers',
                    type: 'table',
                    description: 'Core customer profiles and metadata.'
                },
                {
                    id: 'accounts',
                    type: 'table',
                    description: 'Active account registry linked to customers.'
                },
                {
                    id: 'transactions',
                    type: 'table',
                    description: 'TimeSeries transaction logs.',
                    governance: {
                        piiClassification: 'critical' // Higher sensitivity override
                    }
                },
                {
                    id: 'monthly_snapshots',
                    type: 'table',
                    description: 'Aggregated monthly performance metrics.'
                },
                {
                    id: 'customer_360',
                    type: 'view',
                    description: 'Unified semantic view of customer activity.'
                }
            ]
        }
    ],
    validation: [
        {
            status: 'success',
            step: 'Permissions',
            message: 'Service Account has roles/bigquery.dataViewer',
            timestamp: new Date().toISOString(),
            latencyMs: 145
        },
        {
            status: 'success',
            step: 'Location',
            message: 'Verified dataset location matches us-east1',
            timestamp: new Date().toISOString(),
            latencyMs: 89
        },
        {
            status: 'success',
            step: 'Sample Query',
            message: 'SELECT * FROM `clx-dashboard.amex_synth.customers` LIMIT 10 returned 10 rows',
            timestamp: new Date().toISOString(),
            latencyMs: 430
        }
    ],
    discovery: {
        totalDatasets: 1,
        totalTables: 5,
        lastRefreshed: new Date().toISOString(),
        schemaHash: 'sha256-8a7b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5g6h7i8j9k0l'
    },
    metrics: [
        {
            id: 'revenue',
            label: 'Total Revenue',
            description: 'Sum of all transaction amounts USD',
            type: 'currency',
            sql: 'SUM(amount_usd)',
            table: 'transactions',
            isTimeseries: true,
            dateColumn: 'tx_date'
        },
        {
            id: 'customers',
            label: 'Active Customers',
            description: 'Count of unique customer IDs',
            type: 'number',
            sql: 'COUNT(DISTINCT customer_id)',
            table: 'customers',
            isTimeseries: true,
            dateColumn: 'open_date'
        },
        {
            id: 'risk',
            label: 'Avg Risk Score',
            description: 'Average FICO score of active accounts',
            type: 'number',
            sql: 'AVG(fico_score)',
            table: 'accounts',
            isTimeseries: false // Accounts is current state, not timeseries event log
        },
        {
            id: 'churn_risk',
            label: 'Churn Rate',
            description: 'Percentage of churned customers in latest snapshot',
            type: 'percent',
            sql: 'SAFE_DIVIDE(SUM(CAST(is_churned AS INT64)), COUNT(*)) * 100',
            table: 'monthly-snapshots',
            isTimeseries: true,
            dateColumn: 'snapshot_month'
        },
        {
            id: 'fraud_prevented',
            label: 'Fraud Rate',
            description: 'Percentage of transactions flagged as fraud',
            type: 'percent',
            sql: 'SAFE_DIVIDE(SUM(CAST(is_fraud AS INT64)), COUNT(*)) * 100',
            table: 'transactions',
            isTimeseries: true,
            dateColumn: 'tx_date'
        }
    ]
}
