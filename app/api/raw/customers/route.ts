import { NextRequest, NextResponse } from 'next/server'
import { queryBigQuery } from '@/lib/bigquery'

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const limit = parseInt(searchParams.get('limit') || '100', 10)
        const offset = parseInt(searchParams.get('offset') || '0', 10)
        const segment = searchParams.get('segment')
        const includeRaw = searchParams.get('includeRaw') === 'true'
        const projectIdRaw = searchParams.get('projectId') || process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_PROJECT_ID
        const datasetIdRaw = searchParams.get('datasetId')

        if (!projectIdRaw || !datasetIdRaw) {
            return NextResponse.json({ error: 'projectId and datasetId are required' }, { status: 400 })
        }

        const projectId = projectIdRaw.replace(/[^a-zA-Z0-9_-]/g, '')
        const datasetId = datasetIdRaw.replace(/[^a-zA-Z0-9_]/g, '')

        // Validate params
        const safeLimit = Math.min(limit, 1000) // Max 1000 records
        const safeOffset = Math.max(offset, 0)

        let query = `
            WITH acct AS (
                SELECT 
                    customer_id,
                    SUM(credit_limit_usd) AS credit_limit_usd,
                    AVG(fico_score) AS fico_score,
                    ANY_VALUE(risk_band) AS risk_band
                FROM \`${projectId}.${datasetId}.accounts\`
                GROUP BY customer_id
            )
            SELECT 
                c.customer_id,
                c.segment,
                c.product_tier,
                c.country,
                c.open_date,
                c.digital_adoption_score,
                a.credit_limit_usd,
                a.fico_score,
                a.risk_band
                ${includeRaw ? ', TO_JSON_STRING(c) as raw_json' : ''}
            FROM \`${projectId}.${datasetId}.customers\` c
            LEFT JOIN acct a USING (customer_id)
            WHERE 1=1
        `

        const params: any = {
            limit: safeLimit,
            offset: safeOffset
        }

        if (segment) {
            query += ` AND segment = @segment`
            params.segment = segment
        }

        query += ` ORDER BY c.customer_id LIMIT @limit OFFSET @offset`

        const rows = await queryBigQuery(query, params)
        return NextResponse.json(rows)

    } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json({ error: 'Failed to fetch customer data' }, { status: 500 })
    }
}
