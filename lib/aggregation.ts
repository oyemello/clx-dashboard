import { Customer } from "@/lib/data"
import { METRIC_REGISTRY } from "@/lib/metrics"

export interface ChartDataPoint {
    month: string
    value: number
    [key: string]: any
}

// Helper to calculate metric value (Legacy Scalar)
const getMetricValue = (data: Customer[], metricId: string) => {
    const def = METRIC_REGISTRY.find((m) => m.id === metricId)
    if (!def) return 0
    return def.calculate(data)
}

export function generateMetricHistory(data: Customer[], metricId: string, apiData: any[] | null | undefined): ChartDataPoint[] {
    // 1. If we have API data for the active metric, use it.
    if (apiData && Array.isArray(apiData)) {
        return apiData.map((row: any) => ({
            ...row, // Spread all keys (including segments)
            month: row.month,
            value: row.value !== undefined ? row.value : row.net_cashflow, // Ensure value fallback logic
        }))
    }

    // 2. Legacy / Mock Fallback
    // We have M-0 to M-23.
    const months: { month: string; value: number }[] = []

    const currentVal = getMetricValue(data, metricId)

    // Initialize the sequence
    let currentMonthValue = currentVal

    // Generate reverse chronological data (M-0 back to M-23)
    // We start with the REAL current value and work backwards with plausible variations
    for (let i = 0; i < 24; i++) {
        months.unshift({
            month: `M-${i}`,
            value: i === 0 ? currentVal : currentMonthValue
        })

        // Calculate previous month's value based on metric type
        // 1. Percentages (Stable, 0-100 bound)
        if (metricId.includes("percent") || metricId.includes("rate") || metricId.includes("adoption")) {
            const variance = (Math.random() - 0.5) * 5 // +/- 2.5% variation
            currentMonthValue = Math.max(0, Math.min(100, currentMonthValue - variance))
        }
        // 2. Counts/Customers (Steady Growth)
        else if (metricId === "customers") {
            const growth = 50 + Math.random() * 50 // +50-100 per month
            currentMonthValue = Math.max(0, currentMonthValue - growth)
        }
        // 3. Risk (Volatile)
        else if (metricId.includes("risk") || metricId.includes("fraud")) {
            const variance = (Math.random() - 0.5) * (currentMonthValue * 0.1) // +/- 10%
            currentMonthValue = Math.max(0, currentMonthValue - variance)
        }
        // 4. Default/Financials (Seasonal + Growth)
        else {
            const seasonal = Math.sin(i) * (currentMonthValue * 0.02)
            const growth = currentMonthValue * 0.01 // 1% monthly growth trend
            const noise = (Math.random() - 0.5) * (currentMonthValue * 0.05)
            currentMonthValue = Math.max(0, currentMonthValue - growth - seasonal - noise)
        }
    }
    return months
}
