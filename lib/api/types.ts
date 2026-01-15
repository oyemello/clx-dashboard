export interface SegmentContributionRow {
    segment: string
    customer_count: number
    avg_net_contribution: number
    total_net_contribution: number
}

export interface CashflowAnomalyPoint {
    month: string
    net_cashflow: number
    rolling_avg?: number
    upper_band?: number
    lower_band?: number
    is_anomaly?: boolean
    anomaly_direction?: string
    anomaly_score?: number
}

export interface RawCustomerRow {
    customerId: string
    segment: string
    lifecycleState: string
    revenue: {
        netContribution: number
        interchange: number
        interest: number
    }
    risk: {
        creditRiskScore: number
        fraudPrevented: number
    }
    raw_json?: string
}
