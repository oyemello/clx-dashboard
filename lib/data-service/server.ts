import { getBigQueryClient } from '@/lib/bigquery/client';
import { getConnector } from '@/lib/connectors/registry';
import fs from 'fs';
import path from 'path';

function getSimulationData(personaId: string = 'ceo') {
    try {
        const filePath = path.join(process.cwd(), 'data/persona_kpis_high_volume.json');
        if (!fs.existsSync(filePath)) {
            // Fallback to low volume if high volume not yet ready or deleted
            const lowVolPath = path.join(process.cwd(), 'data/persona_kpis.json');
            if (fs.existsSync(lowVolPath)) {
                return JSON.parse(fs.readFileSync(lowVolPath, 'utf8'));
            }
            return null;
        }
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
        console.error("Failed to read simulation data", e);
        return null;
    }
}

export async function getDashboardOverview(projectId?: string, datasetId?: string | null, credentials?: any, connector?: any) {
    console.log(`[getDashboardOverview] projectId=${projectId} datasetId=${datasetId} provider=${connector?.metadata?.provider}`);
    if (!projectId && connector?.metadata?.project) {
        projectId = connector.metadata.project;
    }

    if (!projectId && connector?.auth?.jsonContent) {
        try {
            const parsed = JSON.parse(connector.auth.jsonContent);
            projectId = parsed.project_id || projectId;
        } catch (e) {
            // ignore parse error
        }
    }

    if (!projectId) throw new Error("Project ID required");
    datasetId = datasetId || connector?.sources?.[0]?.id || connector?.discovery?.datasets?.[0]?.id || null;
    if (!datasetId) throw new Error("Dataset ID required");

    // Initialize client with credentials if provided
    const client = getBigQueryClient({
        projectId,
        credentials
    });

    // Helper: resolve best-fit table from discovery if available.
    // If discovery exists but no match is found, avoid guessing a table name that will 404.
    const selectTable = (keywords: string[], fallbackName: string) => {
        const discovery = connector?.discovery;
        const datasets = discovery?.datasets || [];
        const chosenDataset = datasets.find((ds: any) => ds.id === datasetId || ds.datasetId === datasetId) || datasets[0];

        const resolvedDatasetId =
            datasetId ||
            chosenDataset?.id ||
            chosenDataset?.datasetId ||
            connector?.sources?.[0]?.id ||
            null;

        if (!resolvedDatasetId) return { tableRef: null, tableMeta: null, datasetId: null };

        const declaredSource = connector?.sources?.find((src: any) => src.id === resolvedDatasetId) || connector?.sources?.[0];
        const declaredTables = declaredSource?.tables?.map((t: any) => (t.id || '').toLowerCase()) || [];

        const candidateTables = chosenDataset?.tables || [];
        const found = candidateTables.find((tbl: any) => {
            const name = (tbl.id || tbl.tableId || '').toLowerCase();
            return keywords.some(k => name.includes(k));
        });

        if (found) {
            const tableId = found.id || found.tableId;
            return { tableRef: `${resolvedDatasetId}.${tableId}`, tableMeta: found, datasetId: resolvedDatasetId };
        }

        // If we have discovery and nothing matched, return null to avoid querying non-existent tables.
        if (discovery) {
            return { tableRef: null, tableMeta: null, datasetId: resolvedDatasetId };
        }

        if (declaredTables.length > 0 && !declaredTables.includes(fallbackName.toLowerCase())) {
            return { tableRef: null, tableMeta: null, datasetId: resolvedDatasetId };
        }

        // Legacy fallback for static/sample data.
        return { tableRef: `${resolvedDatasetId}.${fallbackName}`, tableMeta: null, datasetId: resolvedDatasetId };
    };

    const pickColumn = (tableMeta: any, patterns: RegExp[], opts?: { allowFallback?: boolean }) => {
        const schema = tableMeta?.schema || [];
        const hit = schema.find((field: any) => {
            const name = (field.name || '').toLowerCase();
            return patterns.some(p => p.test(name));
        });

        // If no pattern match, fall back to first column to keep queries valid.
        if (hit) return hit.name;
        if (opts?.allowFallback === false) return null;
        return schema[0]?.name || null;
    };

    // Prefer discovery dataset -> source -> fallback
    const customersTable = selectTable(['customer', 'customers', 'user', 'users', 'client', 'clients', 'profile', 'profiles'], 'customers');
    const accountsTable = selectTable(['account', 'accounts', 'wallet', 'wallets', 'holding', 'holdings'], 'accounts');
    const transactionsTable = selectTable(['transaction', 'transactions', 'txn', 'order', 'orders', 'sale', 'sales', 'payment', 'payments', 'purchase', 'purchases'], 'transactions');
    const snapshotsTable = selectTable(['snapshot', 'monthly', 'monthly_snapshot', 'monthly_snapshots'], 'monthly_snapshots');

    console.log(`[Overview] Discovery Results: Customers=${customersTable.tableRef}, Accounts=${accountsTable.tableRef}, Tx=${transactionsTable.tableRef}`);

    const customerIdCol = pickColumn(customersTable.tableMeta, [/customer.*id/, /cust.*id/, /user.*id/, /client.*id/, /^id$/]);
    const accountIdCol = pickColumn(accountsTable.tableMeta, [/account.*id/, /^id$/]);
    const txDateCol = pickColumn(transactionsTable.tableMeta, [/date/, /timestamp/, /time/, /created_at/], { allowFallback: false });
    const txAmountCol = pickColumn(transactionsTable.tableMeta, [/amount/, /total/, /value/, /price/, /cost/]);
    const txFraudCol = pickColumn(transactionsTable.tableMeta, [/fraud/]);
    const snapshotDateCol = pickColumn(snapshotsTable.tableMeta, [/snapshot/, /month/, /date/], { allowFallback: false });
    const churnCol = pickColumn(snapshotsTable.tableMeta, [/churn/]);
    const delinquentCol = pickColumn(snapshotsTable.tableMeta, [/delinq/]);
    const creditLimitCol = pickColumn(accountsTable.tableMeta, [/credit.*limit/, /limit/], { allowFallback: false });
    const ficoCol = pickColumn(accountsTable.tableMeta, [/fico/], { allowFallback: false });
    const digitalAdoptionCol = pickColumn(customersTable.tableMeta, [/digital/, /adoption/], { allowFallback: false });

    const countsSelects = [
        customersTable.tableRef && customerIdCol
            ? `(SELECT COUNT(DISTINCT \`${customerIdCol}\`) FROM \`${customersTable.tableRef}\`) as totalCustomers`
            : `CAST(NULL AS INT64) as totalCustomers`,
        accountsTable.tableRef && accountIdCol
            ? `(SELECT COUNT(DISTINCT \`${accountIdCol}\`) FROM \`${accountsTable.tableRef}\`) as totalAccounts`
            : `CAST(NULL AS INT64) as totalAccounts`,
        transactionsTable.tableRef && txDateCol
            ? `(SELECT COUNT(*) FROM \`${transactionsTable.tableRef}\` WHERE \`${txDateCol}\` >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)) as totalTx30d`
            : `CAST(NULL AS INT64) as totalTx30d`,
        transactionsTable.tableRef && txDateCol && txAmountCol
            ? `(SELECT SUM(\`${txAmountCol}\`) FROM \`${transactionsTable.tableRef}\` WHERE \`${txDateCol}\` >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)) as spend30d`
            : `CAST(NULL AS FLOAT64) as spend30d`,
        transactionsTable.tableRef && txDateCol && txFraudCol
            ? `(SELECT SAFE_DIVIDE(SUM(CAST(\`${txFraudCol}\` AS INT64)), COUNT(*)) FROM \`${transactionsTable.tableRef}\` WHERE \`${txDateCol}\` >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)) as fraudRate30d`
            : `CAST(NULL AS FLOAT64) as fraudRate30d`,
        accountsTable.tableRef && creditLimitCol
            ? `(SELECT SUM(\`${creditLimitCol}\`) FROM \`${accountsTable.tableRef}\`) as totalCreditExposure`
            : `CAST(NULL AS FLOAT64) as totalCreditExposure`,
        accountsTable.tableRef && ficoCol
            ? `(SELECT AVG(\`${ficoCol}\`) FROM \`${accountsTable.tableRef}\`) as avgFico`
            : `CAST(NULL AS FLOAT64) as avgFico`,
        customersTable.tableRef && digitalAdoptionCol
            ? `(SELECT AVG(\`${digitalAdoptionCol}\`) FROM \`${customersTable.tableRef}\`) as avgDigitalAdoption`
            : `CAST(NULL AS FLOAT64) as avgDigitalAdoption`,
    ];

    const snapshotWhere = snapshotsTable.tableRef && snapshotDateCol
        ? `WHERE \`${snapshotDateCol}\` = (SELECT MAX(\`${snapshotDateCol}\`) FROM \`${snapshotsTable.tableRef}\`)`
        : '';

    const snapshotsSelects = [
        snapshotsTable.tableRef && churnCol
            ? `(SELECT SAFE_DIVIDE(SUM(CAST(\`${churnCol}\` AS INT64)), COUNT(*)) FROM \`${snapshotsTable.tableRef}\` ${snapshotWhere}) as churnRate`
            : `CAST(NULL AS FLOAT64) as churnRate`,
        snapshotsTable.tableRef && delinquentCol
            ? `(SELECT SAFE_DIVIDE(SUM(CAST(\`${delinquentCol}\` AS INT64)), COUNT(*)) FROM \`${snapshotsTable.tableRef}\` ${snapshotWhere}) as delinquentRate`
            : `CAST(NULL AS FLOAT64) as delinquentRate`,
    ];

    const query = `
        WITH 
        counts AS (
            SELECT 
                ${countsSelects.join(',\n                ')}
        ),
        snapshots AS (
            SELECT 
                ${snapshotsSelects.join(',\n                ')}
        )
        SELECT * FROM counts, snapshots
    `;

    try {
        const [rows] = await client.query(query);
        const result = rows?.[0] || {};
        return {
            totalCustomers: Number(result.totalCustomers) || 0,
            totalAccounts: Number(result.totalAccounts) || 0,
            totalTx30d: Number(result.totalTx30d) || 0,
            spend30d: Number(result.spend30d) || 0,
            fraudRate30d: Number(result.fraudRate30d) || 0,
            churnRate: Number(result.churnRate) || 0,
            delinquentRate: Number(result.delinquentRate) || 0,
            totalCreditExposure: Number(result.totalCreditExposure) || 0,
            avgFico: Number(result.avgFico) || 0,
            avgDigitalAdoption: Number(result.avgDigitalAdoption) || 0,
            meta: {
                datasetId: datasetId || customersTable.datasetId || accountsTable.datasetId || transactionsTable.datasetId || snapshotsTable.datasetId,
                tables: {
                    customers: customersTable.tableRef,
                    accounts: accountsTable.tableRef,
                    transactions: transactionsTable.tableRef,
                    snapshots: snapshotsTable.tableRef,
                }
            }
        };
    } catch (e: any) {
        console.error("Dashboard overview query failed", e);
        const detail = e?.errors?.[0]?.message || e?.message || 'Unknown error';
        throw new Error(`Overview query failed: ${detail}`);
    }
}

import { CLX_WAREHOUSE_PRIMARY } from '@/lib/connectors/instances/clx-warehouse-primary';

export async function getMetricTimeseries(metricId: string, range: string, connectorId?: string | null, projectId?: string | null, datasetId?: string | null, credentials?: any, inlineConnector?: any) {
    let metricDef;
    let effectiveProjectId = projectId;
    let connector = connectorId ? getConnector(connectorId) : undefined;

    // 0. Inline connector (client-created)
    if (!connector && inlineConnector) {
        connector = inlineConnector;
    }

    // 1. Simulation Provider Logic
    // 1. Resolve Effective Project ID
    if (!effectiveProjectId && connector?.metadata?.project) {
        effectiveProjectId = connector.metadata.project;
    }

    // 2. Try to load from Registered Connector
    if (connector) {
        metricDef = connector.metrics?.find(m => m.id === metricId);
        // If connector has a project, it overrides the passed projectId
        if (connector.metadata.project) {
            effectiveProjectId = connector.metadata.project;
        }
    }

    // 2. Fallback: Use inline connector metrics (client-created)
    if (!metricDef && inlineConnector?.metrics) {
        metricDef = inlineConnector.metrics.find((m: any) => m.id === metricId);
        if (inlineConnector.metadata?.project) {
            effectiveProjectId = inlineConnector.metadata.project;
        }
    }

    // 3. Fallback: Use "Standard" definitions with provided Project ID
    // This handles client-side created connectors that aren't in the registry yet.
    if (!metricDef && effectiveProjectId) {
        metricDef = CLX_WAREHOUSE_PRIMARY.metrics?.find(m => m.id === metricId);
        // Note: we use the definitions from CLX but execute against the user's project.
    }

    if (!metricDef) {
        console.warn(`Metric ${metricId} not defined in connector ${connectorId} or standard set`);
        return [];
    }

    console.log(`[getMetricTimeseries] metricId=${metricId} projectId=${effectiveProjectId}`);
    if (!effectiveProjectId) throw new Error("No Project ID determined for query");

    const client = getBigQueryClient({
        projectId: effectiveProjectId,
        credentials
    });

    // Assume primary source or first source
    // Priority: Passed datasetId -> Connector Source -> Default 'clx_exec'
    const datasetName = datasetId || connector?.discovery?.datasets?.[0]?.id || connector?.sources?.[0]?.id;

    // Improved Table Name Resolution
    // Generator.ts usually embeds the datasetId in table property (e.g. "dataset.table")
    // But static metrics might just be "transactions".
    let fullTableName = metricDef.table;
    if (!fullTableName.includes('.')) {
        if (!datasetName) {
            throw new Error("Dataset ID required for metric query (table name has no prefix)");
        }
        fullTableName = `${datasetName}.${fullTableName}`;
    }

    console.log(`[MetricQuery] Resolving table for ${metricId}: Def=${metricDef.table} -> Full=${fullTableName} (DS=${datasetName})`);

    // Dynamic SQL Generation
    let query = '';

    // Map range to days
    let lookbackDays = 90;
    if (range === '3M') lookbackDays = 90;
    else if (range === '6M') lookbackDays = 180;
    else if (range === '12M' || range === '1Y') lookbackDays = 365;
    else if (range === '24M' || range === '2Y') lookbackDays = 730;
    else if (range === 'ALL') lookbackDays = 3650; // 10 years

    if (metricDef.isTimeseries && metricDef.dateColumn) {
        // Timeseries Query
        query = `
            SELECT 
                FORMAT_DATE('%Y-%m-%d', DATE(${metricDef.dateColumn})) as date,
                ${metricDef.sql} as value
            FROM \`${fullTableName}\`
            WHERE ${metricDef.dateColumn} >= DATE_SUB(CURRENT_DATE(), INTERVAL ${lookbackDays} DAY)
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
