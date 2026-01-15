import { NextResponse } from 'next/server';
import { getBigQueryClient } from '@/lib/bigquery/client';

export async function GET() {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_PROJECT_ID;
    const hasCredentials = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const location = process.env.BIGQUERY_LOCATION || 'US';

    try {
        const client = getBigQueryClient();

        // Execute lightweight query
        const [rows] = await client.query('SELECT 1 AS ok');

        return NextResponse.json({
            ok: true,
            projectId,
            hasCredentials,
            location,
            rows,
        });

    } catch (error: any) {
        console.error('BigQuery Handshake API Error:', error);

        // Differentiate between config error and connection error
        const isConfigError = error.message.includes('Missing') || error.message.includes('not found');

        return NextResponse.json({
            ok: false,
            projectId,
            hasCredentials,
            location,
            error: error.message || 'Unknown connection error',
            isConfigError
        }, { status: 500 });
    }
}
