import { NextResponse } from 'next/server'
import { queryBigQuery } from '@/lib/bigquery'

export const revalidate = 300 // Cache for 5 minutes

export async function GET() {
    try {
        const sql = `
            SELECT *
            FROM \`bank_intelligence.v_net_contribution_by_segment\`
        `

        const rows = await queryBigQuery(sql)
        return NextResponse.json(rows)

    } catch (error) {
        console.error('API Error:', error)
        return NextResponse.json({ error: 'Failed to fetch segment contribution' }, { status: 500 })
    }
}
