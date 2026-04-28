import { NextResponse } from 'next/server';
import { getBigQueryClient } from '@/lib/bigquery/client';

const PERSONA_KPI_REVERSE_MAPPING: Record<string, string> = {
    'Average Revenue per User/Card (ARPU)': 'arpu',
    'Customer Acquisition Cost (CAC)': 'cac',
    'Customer Lifetime Value (CLV)': 'clv',
    'Net Promoter Score (NPS)': 'nps',
    'Digital Adoption Rate': 'digital_adoption',
    'Delinquency Rate': 'delinquency',
    'Customer Retention Rate': 'retention',
    'Revenue Growth Rate': 'revenue_growth',
    'Net Profit Margin': 'margin',
    'EBITDA Margin': 'ebitda',
    'Earnings Per Share (EPS)': 'eps',
    'Return on Invested Capital (ROIC)': 'roic',
    'Free Cash Flow': 'free_cash_flow',
    'Operating Cash Flow': 'operating_cash_flow',
    'Cost-to-Income Ratio': 'cost_to_income',
    'Net Interest Margin': 'net_interest_margin',
    'Provision for Credit Losses': 'provision_losses',
    'Net Charge-Off Rate': 'net_charge_off',
    'Employee Engagement Score': 'employee_engagement',
    'Voluntary Attrition Rate': 'voluntary_attrition'
};

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const persona = searchParams.get('persona');

    if (!persona) {
        return NextResponse.json({ metrics: [] });
    }

    try {
        const client = getBigQueryClient({
            projectId: process.env.GOOGLE_CLOUD_PROJECT || 'bankingmetrics'
        });

        const query = `
            SELECT DISTINCT kpi_name 
            FROM \`banking.kpi_persona\` 
            WHERE persona = @persona
        `;
        
        const [rows] = await client.query({
            query,
            params: { persona }
        });

        const metrics = rows
            .map((r: any) => PERSONA_KPI_REVERSE_MAPPING[r.kpi_name])
            .filter(Boolean);

        return NextResponse.json({ metrics });
    } catch (error: any) {
        console.error("Failed to fetch persona metrics", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
