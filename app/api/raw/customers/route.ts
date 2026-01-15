import { NextRequest, NextResponse } from 'next/server'
import { queryBigQuery } from '@/lib/bigquery'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams
        const limit = parseInt(searchParams.get('limit') || '100', 10)
        const offset = parseInt(searchParams.get('offset') || '0', 10)
        const segment = searchParams.get('segment')
        const includeRaw = searchParams.get('includeRaw') === 'true'

        // Validate params
        const safeLimit = Math.min(limit, 1000) // Max 1000 records
        const safeOffset = Math.max(offset, 0)

        let query = `
            SELECT 
                customerId,
                segment,
                lifecycleState,
                revenue,
                risk
                ${includeRaw ? ', TO_JSON_STRING(t) as raw_json' : ''}
            FROM \`bank_intelligence.customers_raw\` t
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

        query += ` ORDER BY customerId LIMIT @limit OFFSET @offset`

        const rows = await queryBigQuery(query, params)
        return NextResponse.json(rows)

    } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json({ error: 'Failed to fetch customer data' }, { status: 500 })
    }
}
