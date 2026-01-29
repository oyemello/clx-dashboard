import { NextRequest, NextResponse } from 'next/server'
import { queryBigQuery } from '@/lib/bigquery'

export const revalidate = 300 // Cache for 5 minutes
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = request.nextUrl
        const projectIdRaw = searchParams.get('projectId') || process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_PROJECT_ID
        const datasetIdRaw = searchParams.get('datasetId')

        if (!projectIdRaw || !datasetIdRaw) {
            return NextResponse.json({ error: 'projectId and datasetId are required' }, { status: 400 })
        }

        const projectId = projectIdRaw.replace(/[^a-zA-Z0-9_-]/g, '')
        const datasetId = datasetIdRaw.replace(/[^a-zA-Z0-9_]/g, '')

        const sql = `
            WITH acct AS (
                SELECT 
                    customer_id,
                    SUM(credit_limit_usd) AS credit_limit_usd,
                    AVG(fico_score) AS fico_score
                FROM \`${projectId}.${datasetId}.accounts\`
                GROUP BY customer_id
            )
            SELECT 
                c.segment,
                COUNT(DISTINCT c.customer_id) AS customer_count,
                AVG(a.credit_limit_usd) AS avg_credit_limit_usd,
                SUM(a.credit_limit_usd) AS total_credit_limit_usd,
                AVG(a.fico_score) AS avg_fico_score
            FROM \`${projectId}.${datasetId}.customers\` c
            LEFT JOIN acct a USING (customer_id)
            GROUP BY 1
            ORDER BY 1
        `

        const rows = await queryBigQuery(sql)
        return NextResponse.json(rows)

    } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json({ error: 'Failed to fetch segment contribution' }, { status: 500 })
    }
}
