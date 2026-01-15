import { NextResponse } from 'next/server';
import { getMetricTimeseries } from '@/lib/data-service/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const metric = searchParams.get('metric');
    const range = searchParams.get('range') || 'ALL';
    const connectorId = searchParams.get('connectorId');
    const projectId = searchParams.get('projectId');

    if ((!connectorId && !projectId) || !metric) {
        return NextResponse.json({ error: 'Metric and either Connector ID or Project ID required' }, { status: 400 });
    }

    try {
        const data = await getMetricTimeseries(metric, range, connectorId, projectId);
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
