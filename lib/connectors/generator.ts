import { DiscoveryResult, MetricDefinition } from './types';

export function generateMetricsFromSchema(discovery: DiscoveryResult): MetricDefinition[] {
    const metrics: MetricDefinition[] = [];

    // Helper to find column by regex
    const findCol = (schema: any[], pattern: RegExp) =>
        schema.find(c => pattern.test(c.name.toLowerCase()));

    // Helper to check if type is numeric
    const isNumeric = (type: string) =>
        ['INTEGER', 'INT64', 'FLOAT', 'FLOAT64', 'NUMERIC', 'BIGNUMERIC'].includes(type.toUpperCase());

    // Iterate through datasets
    discovery.datasets?.forEach(dataset => {
        dataset.tables.forEach(table => {
            const datasetId = (dataset as any).id || (dataset as any).datasetId
            const tableId = (table as any).id || (table as any).tableId
            const tableName = tableId.toLowerCase();
            const schema = table.schema;
            const fullTableName = datasetId ? `${datasetId}.${tableId}` : tableId;

            // --- UNIVERSAL DISCOVERY STRATEGY ---
            // Process every table irrespective of keywords

            // 1. Find Time Column
            // STRICT CHECK: Must match name pattern AND be a valid date/timestamp type
            // This prevents INT64 "month" columns from being treated as dates, causing query errors.
            const dateCol = schema.find(c =>
                /date|timestamp|created|time|period|month|day/.test(c.name.toLowerCase()) &&
                ['DATE', 'DATETIME', 'TIMESTAMP'].includes(c.type.toUpperCase())
            );

            // 2. Row Count (Universal)
            metrics.push({
                id: `gen_count_${tableName}`,
                label: `${tableId} Count`,
                description: `Total rows in ${tableId}`,
                type: 'number',
                sql: `COUNT(*)`,
                table: fullTableName,
                isTimeseries: !!dateCol,
                dateColumn: dateCol ? dateCol.name : undefined
            });

            // 3. Scan for Numeric Columns (SUM)
            schema.forEach((field: any) => {
                const colName = field.name.toLowerCase();
                const isId = colName === 'id' || colName.endsWith('_id') || colName.endsWith('id');

                if (isNumeric(field.type) && !isId) {
                    const label = field.name
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, (l: string) => l.toUpperCase());

                    let type: 'number' | 'currency' | 'percent' = 'number';
                    if (colName.includes('rate') || colName.includes('percent') || colName.includes('ratio')) type = 'percent';
                    else if (colName.includes('amount') || colName.includes('price') || colName.includes('cost') || colName.includes('rev')) type = 'currency';

                    metrics.push({
                        id: `gen_${tableName}_${field.name}`,
                        label: `${label} (${tableId})`,
                        description: `Sum of ${field.name}`,
                        type: type,
                        sql: `SUM(${field.name})`,
                        table: fullTableName,
                        isTimeseries: !!dateCol,
                        dateColumn: dateCol ? dateCol.name : undefined
                    });
                }
            });

            // 4. Distinct Counts for Entity IDs (Enhancement)
            const idCol = findCol(schema, /id|user_id|customer_id|account_id/);
            if (idCol) {
                const looksLikeEntity = tableName.includes('detail') || tableName.includes('dim') || tableName.includes('master') ||
                    tableName.includes('customer') || tableName.includes('user') || tableName.includes('product');

                // Generate distinct count if it seems like an entity table OR just always for ID columns?
                // Let's stick to "unrestricted" but keep it sane - only if it looks like a primary entity table or the column matches the table name (e.g. customer_id in customer table)
                // Actually the user said "irrespective". Let's simply Add Count Distinct for ANY ID column found.

                metrics.push({
                    id: `gen_distinct_${tableName}_${idCol.name}`,
                    label: `Unique ${idCol.name.replace(/_id/i, '')}s`,
                    description: `Unique count of ${idCol.name}`,
                    type: 'number',
                    sql: `COUNT(DISTINCT ${idCol.name})`,
                    table: fullTableName,
                    isTimeseries: !!dateCol,
                    dateColumn: dateCol ? dateCol.name : undefined
                });
            }
        });
    });

    return metrics;
}
