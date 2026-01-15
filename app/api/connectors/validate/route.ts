import { NextResponse } from 'next/server';
import { BigQueryService } from '@/lib/connectors/server/bigquery';

export async function POST(request: Request) {
    try {
        const { projectId } = await request.json();
        const service = new BigQueryService(projectId);
        const result = await service.validateConnection();

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json(
            { connected: false, error: error.message },
            { status: 500 }
        );
    }
}
