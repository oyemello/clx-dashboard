import { NextResponse } from 'next/server'
import { getBigQueryClient } from '@/lib/bigquery/client'

import fs from 'fs'
import path from 'path'

function parseConnector(connector: any) {
    const jsonContent = connector?.auth?.jsonContent
    const keyFile = connector?.auth?.keyFile

    let credentials = undefined

    if (jsonContent) {
        try {
            credentials = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent
        } catch (e) {
            // Ignore parsing error; will surface later
        }
    } else if (keyFile && typeof keyFile === 'string') {
        // Handle local key file path (e.g. from seeded connectors)
        try {
            const fullPath = path.isAbsolute(keyFile) ? keyFile : path.join(process.cwd(), keyFile)
            if (fs.existsSync(fullPath)) {
                credentials = JSON.parse(fs.readFileSync(fullPath, 'utf8'))
            }
        } catch (e) {
            console.warn("Failed to read key file:", keyFile)
        }
    }

    const projectId =
        connector?.metadata?.project ||
        credentials?.project_id ||
        process.env.GOOGLE_PROJECT_ID ||
        process.env.GOOGLE_CLOUD_PROJECT

    return { credentials, projectId }
}

export async function POST(request: Request) {
    try {
        const { connector } = await request.json()
        if (!connector) {
            return NextResponse.json({ error: 'Missing connector config' }, { status: 400 })
        }

        const { credentials, projectId } = parseConnector(connector)
        console.log(`[Discovery] Connecting to Project: ${projectId}`)
        if (credentials?.client_email) console.log(`[Discovery] Service Account: ${credentials.client_email}`)

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 })
        }

        const client = getBigQueryClient({
            projectId,
            credentials,
        })

        const discovery = {
            totalDatasets: 0,
            totalTables: 0,
            lastRefreshed: new Date().toISOString(),
            schemaHash: '',
            debugProject: projectId,
            debugEmail: credentials?.client_email || 'Unknown (Key File)',
            datasets: [] as any[],
        }

        const [datasets] = await client.getDatasets()
        console.log(`[Discovery] Found Datasets: ${datasets.map(d => d.id).join(', ')}`)
        discovery.totalDatasets = datasets.length

        for (const dataset of datasets) {
            const datasetId = dataset.id
            if (!datasetId) continue

            const [datasetMeta] = await dataset.getMetadata()
            const location = datasetMeta.location

            const [tables] = await dataset.getTables()
            const tableDetails = []

            for (const table of tables) {
                const tableId = table.id
                if (!tableId) continue

                const [tableMeta] = await table.getMetadata()
                const schema = tableMeta.schema?.fields || []
                const rowCount = parseInt(tableMeta.numRows || '0', 10)

                tableDetails.push({
                    id: tableId,
                    tableId,
                    type: tableMeta.type?.toLowerCase() || 'table',
                    rowCount,
                    numRows: rowCount,
                    schema: schema.map((field: any) => ({
                        name: field.name,
                        type: field.type,
                        mode: field.mode,
                    })),
                    description: tableMeta.description || '',
                })
            }

            discovery.totalTables += tableDetails.length
            discovery.datasets.push({
                id: datasetId,
                datasetId,
                location,
                tables: tableDetails,
            })
        }

        return NextResponse.json(discovery)
    } catch (error: any) {
        console.error("[Discovery] Global Error:", error);
        return NextResponse.json({ error: error?.message || 'Discovery failed' }, { status: 500 })
    }
}
