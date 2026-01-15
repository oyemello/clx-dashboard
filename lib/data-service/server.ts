import { getBigQueryClient } from '@/lib/bigquery/client';
import { BigQuery } from '@google-cloud/bigquery';
import { getConnector } from '@/lib/connectors/registry';

// Helper to find likely table matches (Dataset Agnostic)
async function resolveTable(client: BigQuery, tableNameFragment: string): Promise<string> {
    // 1. Try to find cached discovery result or just query information_schema
    // For now, valid performance optimization: just assume 'amex_synth' if exists, else search.
    // User Constraint: "dataset is amex_synth". We should prefer that.

    // Quick heuristic: Check if amex_synth exists
    const [exists] = await client.dataset('amex_synth').exists();
    if (exists) {
        return `amex_synth.${tableNameFragment}`;
    }

    // Fallback: This is expensive, so maybe we default to just `tableNameFragment` 
    // and hope the query uses a default dataset if configured, or fail gracefully.
    // For this implementation, we'll assume the tables exist in the default dataset or amex_synth.
    return tableNameFragment;
}

export async function getDashboardOverview(projectId?: string) {
    if (!projectId) throw new Error("Project ID required");

    // Legacy support: We might want to make this dynamic too, but for now
    // let's keep it optimized for the 'standard' view. 
    // Ideally, we'd iterate over all 'scalar' metrics in the connector and batch them.
    // For this step, we'll leave it as the 'fast path' for the default dashboard.

    const client = new BigQuery({ projectId }); // Client wrapper handles auth env

    // We assume standard schema tables exist.
    // Use fully qualified names if we can, or just table names if default dataset set (unlikely).
    // Let's use `amex_synth` as primary target as per prompt.
    const dataset = 'amex_synth';

    const query = `
        WITH 
        counts AS (
            SELECT 
                (SELECT COUNT(DISTINCT customer_id) FROM \`${dataset}.customers\`) as totalCustomers,
                (SELECT COUNT(DISTINCT account_id) FROM \`${dataset}.accounts\`) as totalAccounts,
                (SELECT COUNT(*) FROM \`${dataset}.transactions\` WHERE tx_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)) as totalTx30d,
                (SELECT SUM(amount_usd) FROM \`${dataset}.transactions\` WHERE tx_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)) as spend30d,
                (SELECT SAFE_DIVIDE(SUM(CAST(is_fraud AS INT64)), COUNT(*)) FROM \`${dataset}.transactions\` WHERE tx_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)) as fraudRate30d
        ),
        snapshots AS (
            SELECT 
                SAFE_DIVIDE(SUM(CAST(is_churned AS INT64)), COUNT(*)) as churnRate,
                SAFE_DIVIDE(SUM(CAST(is_delinquent AS INT64)), COUNT(*)) as delinquentRate
            FROM \`${dataset}.monthly-snapshots\`
            WHERE snapshot_month = (SELECT MAX(snapshot_month) FROM \`${dataset}.monthly-snapshots\`)
        )
        SELECT * FROM counts, snapshots
    `;

    try {
        const [rows] = await client.query(query);
        return rows[0];
    } catch (e) {
        console.error("Dashboard overview query failed", e);
        // Fallback or rethrow
        return null;
    }
}

import { CLX_WAREHOUSE_PRIMARY } from '@/lib/connectors/instances/clx-warehouse-primary';

export async function getMetricTimeseries(metricId: string, range: string, connectorId?: string | null, projectId?: string | null) {
    let metricDef;
    let effectiveProjectId = projectId;
    let connector = connectorId ? getConnector(connectorId) : undefined;

    // 1. Try to load from Registered Connector
    if (connector) {
        metricDef = connector.metrics?.find(m => m.id === metricId);
        // If connector has a project, it overrides the passed projectId
        if (connector.metadata.project) {
            effectiveProjectId = connector.metadata.project;
        }
    }

    // 2. Fallback: Use "Standard" definitions with provided Project ID
    // This handles client-side created connectors that aren't in the registry yet.
    if (!metricDef && effectiveProjectId) {
        metricDef = CLX_WAREHOUSE_PRIMARY.metrics?.find(m => m.id === metricId);
        // Note: we use the definitions from CLX but execute against the user's project.
    }

    if (!metricDef) {
        console.warn(`Metric ${metricId} not defined in connector ${connectorId} or standard set`);
        return [];
    }

    if (!effectiveProjectId) throw new Error("No Project ID determined for query");

    const client = new BigQuery({ projectId: effectiveProjectId });

    // Assume primary source or first source
    const datasetName = connector?.sources[0]?.id || 'amex_synth';
    const fullTableName = `${datasetName}.${metricDef.table}`; // e.g. amex_synth.transactions

    // Dynamic SQL Generation
    let query = '';

    if (metricDef.isTimeseries && metricDef.dateColumn) {
        // Timeseries Query
        query = `
            SELECT 
                FORMAT_DATE('%Y-%m-%d', DATE(${metricDef.dateColumn})) as date,
                ${metricDef.sql} as value
            FROM \`${fullTableName}\`
            WHERE ${metricDef.dateColumn} >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
            GROUP BY 1 ORDER BY 1
        `;
    } else {
        // Scalar/Snapshot Query (mocked as timeseries for chart compatibility)
        // Just return the single value repeated or as a single point
        query = `
            SELECT 
                FORMAT_DATE('%Y-%m-%d', CURRENT_DATE()) as date,
                ${metricDef.sql} as value
            FROM \`${fullTableName}\`
        `;
    }

    try {
        console.log(`Executing Dynamic Metric: ${metricId} -> ${query}`);
        const [rows] = await client.query(query);
        return rows.map((r: any) => ({
            date: r.date,
            value: r.value
        }));
    } catch (e: any) {
        console.error(`Timeseries query failed for ${metricId}`, e);
        throw new Error(`Query failed: ${e.message}`);
    }
}
