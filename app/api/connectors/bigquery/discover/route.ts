import { NextResponse } from 'next/server';
import { getBigQueryClient } from '@/lib/bigquery/client';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const targetDatasetId = searchParams.get('datasetId');
    const includeSchema = searchParams.get('includeSchema') === 'true';

    try {
        const client = getBigQueryClient();
        const projectId = client.projectId;

        const response: any = {
            ok: true,
            projectId,
            datasets: []
        };

        // 1. Fetch Datasets
        const [datasets] = await client.getDatasets();

        for (const dataset of datasets) {
            const datasetId = dataset.id;
            if (!datasetId) continue;

            // Filter if requested
            if (targetDatasetId && datasetId !== targetDatasetId) continue;

            // Get metadata (location etc) - doing this in parallel with table list might be faster but kept simple for now
            const [datasetMeta] = await dataset.getMetadata();

            const datasetInfo: any = {
                datasetId,
                location: datasetMeta.location,
                tables: []
            };

            // 2. Fetch Tables for this dataset
            const [tables] = await dataset.getTables();

            for (const table of tables) {
                const tableId = table.id;
                if (!tableId) continue;

                const tableInfo: any = {
                    tableId,
                    type: table.metadata?.type || 'TABLE', // 'VIEW' or 'TABLE'
                };

                // 3. Fetch Schema/Rows if requested or if we can get it cheaply
                // getMetadata() provides numRows and schema
                if (includeSchema) {
                    const [tableMeta] = await table.getMetadata();
                    tableInfo.numRows = parseInt(tableMeta.numRows || '0', 10);
                    tableInfo.schema = tableMeta.schema?.fields?.map((f: any) => ({
                        name: f.name,
                        type: f.type,
                        mode: f.mode
                    }));
                }

                datasetInfo.tables.push(tableInfo);
            }

            response.datasets.push(datasetInfo);
        }

        return NextResponse.json(response);

    } catch (error: any) {
        console.error('BigQuery Discovery API Error:', error);
        return NextResponse.json({
            ok: false,
            error: error.message
        }, { status: 500 });
    }
}
