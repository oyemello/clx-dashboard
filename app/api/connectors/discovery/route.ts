import { NextResponse } from 'next/server';
import { BigQueryService } from '@/lib/connectors/server/bigquery';

export async function POST(request: Request) {
    try {
        const { projectId } = await request.json();
        const service = new BigQueryService(projectId);
        const discovery = await service.discoverSchema();

        return NextResponse.json(discovery);
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
