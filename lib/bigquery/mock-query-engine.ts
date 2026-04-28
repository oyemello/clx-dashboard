import fs from 'fs';
import path from 'path';

export interface MockRow {
    [key: string]: any;
}

export function executeMockQuery(sql: string): MockRow[] {
    const briefSql = sql.substring(0, 150).replace(/\s+/g, ' ');
    console.log(`[MockBQ] Executing Query: ${briefSql}...`);
    const normalizedSql = sql.toLowerCase();

    // 1. Loading Simulation Data
    const simData = loadSimulationData();
    const ceo = simData?.personas?.find((p: any) => p.id === 'ceo');
    const kpis = ceo?.kpis || [];

    // 2. Helper: Find KPI by keywords in SQL
    const findKpi = (keywords: string[]) => {
        return kpis.find((k: any) => {
            const name = k.name.toLowerCase();
            return keywords.some(kw => name.includes(kw));
        });
    };

    // 3. Pattern Matching Logic

    // A. Dashboard Overview (Big monolithic query with multiple subqueries)
    if (normalizedSql.includes('totalcustomers') && normalizedSql.includes('totalaccounts')) {
        const arpuKpi = findKpi(['arpu', 'revenue']);
        const latestArpu = arpuKpi?.sampleDataPoints?.slice(-1)[0]?.actualValue || 450;
        const delKpi = findKpi(['delinquency']);
        const latestDel = delKpi?.sampleDataPoints?.slice(-1)[0]?.actualValue || 1.6;
        const adoptionKpi = findKpi(['digital', 'adoption']);
        const latestAdoption = adoptionKpi?.sampleDataPoints?.slice(-1)[0]?.actualValue || 82;
        const churnKpi = findKpi(['retention', 'attrition']);
        const latestChurn = 100 - (churnKpi?.sampleDataPoints?.slice(-1)[0]?.actualValue || 92);

        return [{
            totalCustomers: 1240000,
            totalAccounts: 2150000,
            totalTx30d: 18450000,
            spend30d: latestArpu * 1250000,
            fraudRate30d: 0.0142,
            totalCreditExposure: 5200000000,
            avgFico: 724,
            avgDigitalAdoption: latestAdoption / 100,
            churnRate: latestChurn / 100,
            delinquentRate: latestDel / 100
        }];
    }

    // B. Timeseries Query (Metric Trends)
    if (normalizedSql.includes('format_date')) {
        let targetKpi = null;
        
        // Map common dashboard SQL snippets to Persona KPIs
        if (normalizedSql.includes('amount') || normalizedSql.includes('revenue') || normalizedSql.includes('spend')) {
            targetKpi = findKpi(['arpu', 'revenue', 'income']);
        } else if (normalizedSql.includes('churn') || normalizedSql.includes('retention') || normalizedSql.includes('attrition')) {
            targetKpi = findKpi(['retention', 'attrition']);
        } else if (normalizedSql.includes('delinq') || normalizedSql.includes('default')) {
            targetKpi = findKpi(['delinquency']);
        } else if (normalizedSql.includes('digital') || normalizedSql.includes('adoption')) {
            targetKpi = findKpi(['digital', 'adoption']);
        } else if (normalizedSql.includes('profit') || normalizedSql.includes('ebitda') || normalizedSql.includes('margin')) {
            targetKpi = findKpi(['profit', 'margin', 'ebitda']);
        } else if (normalizedSql.includes('eps')) {
            targetKpi = findKpi(['eps']);
        } else if (normalizedSql.includes('roic')) {
            targetKpi = findKpi(['roic']);
        } else if (normalizedSql.includes('cash_flow') || normalizedSql.includes('cash flow')) {
            targetKpi = findKpi(['cash flow', 'op_cashflow']);
        } else if (normalizedSql.includes('cac')) {
            targetKpi = findKpi(['cac']);
        } else if (normalizedSql.includes('clv')) {
            targetKpi = findKpi(['clv']);
        } else if (normalizedSql.includes('nps')) {
            targetKpi = findKpi(['nps']);
        } else if (normalizedSql.includes('arpu')) {
            targetKpi = findKpi(['arpu']);
        } else if (normalizedSql.includes('nim') || normalizedSql.includes('interest')) {
            targetKpi = findKpi(['interest', 'nim']);
        } else if (normalizedSql.includes('ratio')) {
            targetKpi = findKpi(['cost-to-income', 'ratio']);
        } else if (normalizedSql.includes('losses')) {
            targetKpi = findKpi(['losses', 'provision']);
        } else if (normalizedSql.includes('nco') || normalizedSql.includes('charge-off')) {
            targetKpi = findKpi(['charge-off', 'nco']);
        } else if (normalizedSql.includes('adoption')) {
            targetKpi = findKpi(['adoption']);
        } else if (normalizedSql.includes('fico') || normalizedSql.includes('credit_limit') || normalizedSql.includes('risk')) {
            targetKpi = findKpi(['delinquency', 'charge-off']);
        }

        // Table-based fallback if no KPI matched yet
        if (!targetKpi) {
            if (normalizedSql.includes('customers')) targetKpi = findKpi(['nps', 'clv', 'adoption']);
            else if (normalizedSql.includes('transactions')) targetKpi = findKpi(['arpu', 'revenue']);
            else if (normalizedSql.includes('monthly_snapshots')) targetKpi = findKpi(['profit', 'ebitda']);
            else if (normalizedSql.includes('accounts')) targetKpi = findKpi(['delinquency', 'charge-off']);
        }

        if (targetKpi) {
            console.log(`[MockBQ] Matched to KPI: ${targetKpi.name}`);
            return targetKpi.sampleDataPoints.map((dp: any) => ({
                date: dp.period.split(' ')[0],
                value: dp.actualValue
            }));
        }
    }

    // C. Default Fallback (Single point for scalars)
    console.log(`[MockBQ] No precise pattern match, using default fallback.`);
    return [{ 
        value: 123.45, 
        date: new Date().toISOString().split('T')[0],
        totalCustomers: 1000,
        totalAccounts: 2000,
        spend30d: 500000
    }];
}

function loadSimulationData() {
    try {
        const filePath = path.join(process.cwd(), 'data/persona_kpis_high_volume.json');
        if (fs.existsSync(filePath)) {
            return JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
        const fallbackPath = path.join(process.cwd(), 'data/persona_kpis.json');
        if (fs.existsSync(fallbackPath)) {
            return JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
        }
    } catch (e) {
        console.error("[MockBQ] Failed to load simulation data", e);
    }
    return null;
}
