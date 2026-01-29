import { NextResponse } from 'next/server';
import { getDashboardOverview } from '@/lib/data-service/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { projectId, datasetId: datasetIdInput, connector } = body;

        let credentials = null;
        if (connector?.auth?.jsonContent) {
            try {
                credentials = JSON.parse(connector.auth.jsonContent);
            } catch (e) {
                console.warn("Invalid credentials JSON in request");
            }
        }

        const resolvedDatasetId = datasetIdInput || connector?.sources?.[0]?.id || connector?.discovery?.datasets?.[0]?.id;
        if (!projectId || !resolvedDatasetId) {
            return NextResponse.json({ error: 'projectId and datasetId are required' }, { status: 400 });
        }

        const data = await getDashboardOverview(projectId, resolvedDatasetId, credentials, connector);
        if (!data) return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });

        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const datasetId = searchParams.get('datasetId'); // Support params

    if (!projectId || !datasetId) {
        return NextResponse.json({ error: 'projectId and datasetId required' }, { status: 400 });
    }

    try {
        const data = await getDashboardOverview(projectId, datasetId);
        if (!data) {
            return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
        }
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
