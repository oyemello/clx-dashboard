import { NextResponse } from 'next/server';
import { getDashboardOverview } from '@/lib/data-service/server';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
        return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    try {
        const data = await getDashboardOverview(projectId);
        if (!data) {
            return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
        }
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
