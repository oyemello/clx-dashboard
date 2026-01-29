import { NextRequest, NextResponse } from 'next/server'
import { queryBigQuery } from '@/lib/bigquery'

export const dynamic = 'force-dynamic'; // Ensure new data is fetched, though caching strategy can overlay this

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const connectorId = searchParams.get('connectorId')
        const projectIdRaw = searchParams.get('projectId') || process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_PROJECT_ID
        const datasetIdRaw = searchParams.get('datasetId')

        if (!projectIdRaw || !datasetIdRaw) {
            return NextResponse.json({ error: 'projectId and datasetId are required' }, { status: 400 })
        }

        const projectId = projectIdRaw.replace(/[^a-zA-Z0-9_-]/g, '')
        const datasetId = datasetIdRaw.replace(/[^a-zA-Z0-9_]/g, '')
        const tableName = (searchParams.get('table') || 'cashflow_anomalies').replace(/[^a-zA-Z0-9_]/g, '') || 'cashflow_anomalies'
        const range = searchParams.get('range') || 'year'
        const includeBands = searchParams.get('includeBands') === 'true'
        const anomaliesOnly = searchParams.get('anomaliesOnly') === 'true'

        // Map range to SQL interval (Integer months for M-X logic)
        let interval = 12 // Default 'year'
        if (range === '7d') interval = 1
        if (range === '30d') interval = 1
        if (range === 'quarter') interval = 3
        if (range === 'half') interval = 6
        if (range === 'ytd') interval = 12

        const tableRef = `\`${projectId}.${datasetId}.${tableName}\``

        let sql = `
            SELECT 
                month,
                net_cashflow,
                rolling_avg,
                upper_band,
                lower_band,
                is_anomaly,
                anomaly_direction,
                anomaly_score
            FROM ${tableRef}
            WHERE CAST(SPLIT(CAST(month AS STRING), '-')[OFFSET(1)] AS INT64) <= @interval
        `

        if (anomaliesOnly) {
            sql += ` AND is_anomaly = true`
        }

        sql += ` ORDER BY CAST(SPLIT(month, '-')[OFFSET(1)] AS INT64) DESC`

        const rows = await queryBigQuery(sql, { interval })

        // optimize response shape if bands are not requested (though BQ returns them, we can strip them to save bandwidth if needed, but for now we return what BQ gives to match requirement B)
        return NextResponse.json(rows)

    } catch (error) {
        const message = (error as any)?.message || 'Failed to fetch cashflow anomalies'
        console.error('API Error:', error)
        if (message.toLowerCase().includes('not found')) {
            return NextResponse.json([])
        }
        return NextResponse.json({ error: 'Failed to fetch cashflow anomalies' }, { status: 500 })
    }
}
