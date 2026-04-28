import { NextResponse } from 'next/server';
import { getMetricTimeseries } from '@/lib/data-service/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { metric, range, connectorId, projectId, datasetId: datasetIdInput, connector, persona } = body;

        let credentials = null;
        if (connector?.auth?.jsonContent) {
            try {
                credentials = JSON.parse(connector.auth.jsonContent);
            } catch (e) {
                console.warn("Invalid credentials JSON");
            }
        }

        const resolvedDatasetId = datasetIdInput || connector?.sources?.[0]?.id || connector?.discovery?.datasets?.[0]?.id;
        if (!projectId || !resolvedDatasetId) {
            return NextResponse.json({ error: 'projectId and datasetId are required' }, { status: 400 });
        }

        const data = await getMetricTimeseries(metric, range || 'ALL', connectorId, projectId, resolvedDatasetId, credentials, connector, persona);
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric');
    const range = searchParams.get('range') || 'ALL';
    const connectorId = searchParams.get('connectorId');
    const projectId = searchParams.get('projectId');
    const datasetId = searchParams.get('datasetId');
    const persona = searchParams.get('persona');

    if ((!connectorId && !projectId) || !metric || !datasetId) {
        return NextResponse.json({ error: 'metric, projectId (or connectorId), and datasetId are required' }, { status: 400 });
    }

    try {
        const data = await getMetricTimeseries(metric, range, connectorId, projectId, datasetId, null, null, persona);
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
