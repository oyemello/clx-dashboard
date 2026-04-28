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

const KPI_LABEL_PATTERNS: Record<string, string[]> = {
    'arpu': ['average revenue', 'arpu', 'revenue per user', 'revenue per card'],
    'cac': ['customer acquisition', 'cac', 'acquisition cost'],
    'clv': ['customer lifetime', 'clv', 'lifetime value'],
    'nps': ['net promoter', 'nps', 'promoter score'],
    'digital_adoption': ['digital adoption', 'adoption rate', 'adoption_rate', 'digital_adoption'],
    'delinquency': ['delinquency', 'delinquent'],
    'retention': ['retention', 'retain'],
    'revenue_growth': ['revenue growth', 'revenue_growth'],
    'margin': ['profit margin', 'net margin', 'net_profit', 'net_margin'],
    'ebitda': ['ebitda', 'ebitda_margin'],
    'eps': ['earnings per share', 'eps', 'earnings_per_share'],
    'roic': ['return on invested capital', 'roic'],
    'free_cash_flow': ['free cash flow', 'free_cash_flow'],
    'operating_cash_flow': ['operating cash flow', 'operating_cash_flow'],
    'cost_to_income': ['cost to income', 'cost_to_income'],
    'net_interest_margin': ['net interest margin', 'net_interest'],
    'provision_losses': ['provision', 'charge loss', 'provision_for', 'credit losses', 'provision_losses'],
    'net_charge_off': ['charge.off', 'nco', 'net_charge_off', 'chargeoff', 'net_charge_off_rate'],
    'employee_engagement': ['employee engagement', 'employee_engagement', 'engagement score', 'engagement_score'],
    'voluntary_attrition': ['attrition', 'voluntary_attrition', 'voluntary attrition', 'attrition_rate']
};

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const connectorMetrics = body.metrics || [];

        // Fetch persona data
        const client = getBigQueryClient({
            projectId: process.env.GOOGLE_CLOUD_PROJECT || 'bankingmetrics'
        });

        const query = `
            SELECT persona, kpi_name
            FROM \`banking.kpi_persona\`
            GROUP BY 1, 2
        `;

        const [rows] = await client.query(query);

        // Build KPI persona map
        const kpiPersonaMap: Record<string, string[]> = {};
        rows.forEach((r: any) => {
            const rawName = r.kpi_name;
            const cleanId = PERSONA_KPI_REVERSE_MAPPING[rawName];
            if (cleanId) {
                if (!kpiPersonaMap[cleanId]) kpiPersonaMap[cleanId] = [];
                if (!kpiPersonaMap[cleanId].includes(r.persona)) {
                    kpiPersonaMap[cleanId].push(r.persona);
                }
            }
        });

        // Match connector metrics to KPIs
        const mapping: Record<string, string[]> = {};

        connectorMetrics.forEach((metric: any) => {
            const metricLabel = (metric.label || '').toLowerCase();
            const metricId = (metric.id || '').toLowerCase();

            // Try to find a KPI match by label or id
            for (const [kpiId, patterns] of Object.entries(KPI_LABEL_PATTERNS)) {
                for (const pattern of patterns) {
                    const hasMatch = metricLabel.includes(pattern) || metricId.includes(pattern);
                    if (hasMatch) {
                        mapping[metric.id] = kpiPersonaMap[kpiId] || [];
                        return;
                    }
                }
            }
        });

        return NextResponse.json({ mapping });
    } catch (error: any) {
        console.error("Failed to fetch connector personas", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
