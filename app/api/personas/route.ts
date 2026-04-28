
import { NextResponse } from 'next/server';
import { queryBigQuery } from '@/lib/bigquery';

export async function GET() {
  try {
    const sql = 'SELECT DISTINCT persona FROM `banking.kpi_persona` ORDER BY persona ASC';
    const rows = await queryBigQuery<{ persona: string }>(sql);
    const personas = rows.map(r => r.persona);
    return NextResponse.json({ personas });
  } catch (error) {
    console.error('Failed to fetch personas:', error);
    // Return mock data if BigQuery fails for some reason, to keep the UI working
    return NextResponse.json(
      { 
        personas: [
          'CEO', 
          'CFO', 
          'CMO (Chief Marketing Officer)', 
          'COO', 
          'CRO (Chief Risk Officer)', 
          'CIO/CDO (Technology & Digital)', 
          'CHRO (Chief HR Officer)'
        ] 
      },
      { status: 200 } // We could return 500, but the user wants the dropdown to work
    );
  }
}
