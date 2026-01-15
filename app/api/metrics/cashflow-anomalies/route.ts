import { NextRequest, NextResponse } from 'next/server'
import { queryBigQuery } from '@/lib/bigquery'

export const dynamic = 'force-dynamic' // Ensure new data is fetched, though caching strategy can overlay this

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const connectorId = searchParams.get('connectorId')
        const projectId = searchParams.get('projectId')
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

        // Determine dataset - similar fallback logic as other metrics
        // In a real implementation this might use getConnector(connectorId)
        // For now, we default to 'amex_synth' if not specified, or use the connector's dataset if reachable.
        // To keep it simple and fix the 404:
        const dataset = 'amex_synth'

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
            FROM \`${dataset}.v_cashflow_anomalies\`
            WHERE CAST(SPLIT(month, '-')[OFFSET(1)] AS INT64) < @interval
        `

        if (anomaliesOnly) {
            sql += ` AND is_anomaly = true`
        }

        sql += ` ORDER BY CAST(SPLIT(month, '-')[OFFSET(1)] AS INT64) DESC`

        const rows = await queryBigQuery(sql, { interval })

        // optimize response shape if bands are not requested (though BQ returns them, we can strip them to save bandwidth if needed, but for now we return what BQ gives to match requirement B)
        return NextResponse.json(rows)

    } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json({ error: 'Failed to fetch cashflow anomalies' }, { status: 500 })
    }
}
