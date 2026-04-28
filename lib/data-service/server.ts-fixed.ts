import { getBigQueryClient } from '@/lib/bigquery/client';
import { getConnector } from '@/lib/connectors/registry';
import fs from 'fs';
import path from 'path';

/**
 * Shared Helpers for BigQuery Query Construction
 */

const selectTable = (connector: any, datasetId: string | null, keywords: string[], fallbackName: string) => {
    const discovery = connector?.discovery;
    const datasets = discovery?.datasets || [];
    const chosenDataset = datasets.find((ds: any) => ds.id === datasetId || ds.datasetId === datasetId) || datasets[0];

    const resolvedDatasetId =
        datasetId ||
        chosenDataset?.id ||
        chosenDataset?.datasetId ||
        connector?.sources?.[0]?.id ||
        'banking';

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

export async function getDashboardOverview(projectId?: string, datasetId?: string | null, credentials?: any, connector?: any, persona?: string | null) {
    if (!projectId && connector?.metadata?.project) {
        projectId = connector.metadata.project;
    }

    if (!projectId && connector?.auth?.jsonContent) {
        try {
            const parsed = JSON.parse(connector.auth.jsonContent);
            projectId = parsed.project_id || projectId;
        } catch (e) { }
    }

    if (!projectId) throw new Error("Project ID required");
    const effectiveDatasetId = datasetId || connector?.sources?.[0]?.id || connector?.discovery?.datasets?.[0]?.id || null;

    const client = getBigQueryClient({
        projectId,
        credentials
    });

    // Resolve tables using the shared helper
    const customersTable = selectTable(connector, effectiveDatasetId, ['customer', 'customers', 'user', 'users', 'client', 'clients', 'profile', 'profiles'], 'customers');
    const accountsTable = selectTable(connector, effectiveDatasetId, ['account', 'accounts', 'wallet', 'wallets', 'holding', 'holdings'], 'accounts');
    const transactionsTable = selectTable(connector, effectiveDatasetId, ['transaction', 'transactions', 'txn', 'order', 'orders', 'sale', 'sales', 'payment', 'payments', 'purchase', 'purchases'], 'transactions');
    const snapshotsTable = selectTable(connector, effectiveDatasetId, ['snapshot', 'monthly', 'monthly_snapshot', 'monthly_snapshots'], 'monthly_snapshots');

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

    const getPersonaFilter = (tableMeta: any) => {
        if (!persona) return '';
        const directCol = pickColumn(tableMeta, [/persona/], { allowFallback: false });
        if (directCol) return ` \`${directCol}\` = @persona`;
        const custId = pickColumn(tableMeta, [/customer.*id/, /cust.*id/], { allowFallback: false });
        if (custId) {
            return ` CAST(\`${custId}\` AS STRING) IN (SELECT DISTINCT CAST(customer_id AS STRING) FROM \`banking.kpi_persona\` WHERE persona = @persona)`;
        }
        return '';
    };

    const customerPersonaFilter = getPersonaFilter(customersTable.tableMeta);
    const accountPersonaFilter = getPersonaFilter(accountsTable.tableMeta);
    const txPersonaFilter = getPersonaFilter(transactionsTable.tableMeta);
    const snapshotPersonaFilter = getPersonaFilter(snapshotsTable.tableMeta);

    const countsSelects = [
        customersTable.tableRef && customerIdCol
            ? `(SELECT COUNT(DISTINCT \`${customerIdCol}\`) FROM \`${customersTable.tableRef}\` ${customerPersonaFilter ? `WHERE ${customerPersonaFilter}` : ''}) as totalCustomers`
            : `CAST(NULL AS INT64) as totalCustomers`,
        accountsTable.tableRef && accountIdCol
            ? `(SELECT COUNT(DISTINCT \`${accountIdCol}\`) FROM \`${accountsTable.tableRef}\` ${accountPersonaFilter ? `WHERE ${accountPersonaFilter}` : ''}) as totalAccounts`
            : `CAST(NULL AS INT64) as totalAccounts`,
        transactionsTable.tableRef && txDateCol
            ? `(SELECT COUNT(*) FROM \`${transactionsTable.tableRef}\` WHERE \`${txDateCol}\` >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) ${txPersonaFilter ? `AND ${txPersonaFilter}` : ''}) as totalTx30d`
            : `CAST(NULL AS INT64) as totalTx30d`,
        transactionsTable.tableRef && txDateCol && txAmountCol
            ? `(SELECT SUM(\`${txAmountCol}\`) FROM \`${transactionsTable.tableRef}\` WHERE \`${txDateCol}\` >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) ${txPersonaFilter ? `AND ${txPersonaFilter}` : ''}) as spend30d`
            : `CAST(NULL AS FLOAT64) as spend30d`,
        transactionsTable.tableRef && txDateCol && txFraudCol
            ? `(SELECT SAFE_DIVIDE(SUM(CAST(\`${txFraudCol}\` AS INT64)), COUNT(*)) FROM \`${transactionsTable.tableRef}\` WHERE \`${txDateCol}\` >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) ${txPersonaFilter ? `AND ${txPersonaFilter}` : ''}) as fraudRate30d`
            : `CAST(NULL AS FLOAT64) as fraudRate30d`,
        accountsTable.tableRef && creditLimitCol
            ? `(SELECT SUM(\`${creditLimitCol}\`) FROM \`${accountsTable.tableRef}\` ${accountPersonaFilter ? `WHERE ${accountPersonaFilter}` : ''}) as totalCreditExposure`
            : `CAST(NULL AS FLOAT64) as totalCreditExposure`,
        accountsTable.tableRef && ficoCol
            ? `(SELECT AVG(\`${ficoCol}\`) FROM \`${accountsTable.tableRef}\` ${accountPersonaFilter ? `WHERE ${accountPersonaFilter}` : ''}) as avgFico`
            : `CAST(NULL AS FLOAT64) as avgFico`,
        customersTable.tableRef && digitalAdoptionCol
            ? `(SELECT AVG(\`${digitalAdoptionCol}\`) FROM \`${customersTable.tableRef}\` ${customerPersonaFilter ? `WHERE ${customerPersonaFilter}` : ''}) as avgDigitalAdoption`
            : `CAST(NULL AS FLOAT64) as avgDigitalAdoption`,
    ];

    const snapshotWhereBase = snapshotsTable.tableRef && snapshotDateCol
        ? `\`${snapshotDateCol}\` = (SELECT MAX(\`${snapshotDateCol}\`) FROM \`${snapshotsTable.tableRef}\`)`
        : '';
    
    const finalSnapshotWhere = snapshotWhereBase 
        ? `WHERE ${snapshotWhereBase}${snapshotPersonaFilter ? ` AND ${snapshotPersonaFilter}` : ''}`
        : (snapshotPersonaFilter ? `WHERE ${snapshotPersonaFilter}` : '');

    const snapshotsSelects = [
        snapshotsTable.tableRef && churnCol
            ? `(SELECT SAFE_DIVIDE(SUM(CAST(\`${churnCol}\` AS INT64)), COUNT(*)) FROM \`${snapshotsTable.tableRef}\` ${finalSnapshotWhere}) as churnRate`
            : `CAST(NULL AS FLOAT64) as churnRate`,
        snapshotsTable.tableRef && delinquentCol
            ? `(SELECT SAFE_DIVIDE(SUM(CAST(\`${delinquentCol}\` AS INT64)), COUNT(*)) FROM \`${snapshotsTable.tableRef}\` ${finalSnapshotWhere}) as delinquentRate`
            : `CAST(NULL AS FLOAT64) as delinquentRate`,
    ];

    const query = `
        WITH 
        counts AS (
            SELECT ${countsSelects.join(', ')}
        ),
        snapshots AS (
            SELECT ${snapshotsSelects.join(', ')}
        )
        SELECT * FROM counts, snapshots
    `;

    try {
        const queryParams: any = {};
        if (persona) queryParams.persona = persona;
        const [rows] = await client.query({ query, params: queryParams });
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
        throw new Error(`Overview query failed: ${e.message}`);
    }
}
