export interface SegmentContributionRow {
    segment: string
    customer_count: number
    avg_credit_limit_usd: number | null
    total_credit_limit_usd: number | null
    avg_fico_score: number | null
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
    customer_id: number
    segment: string | null
    product_tier: string | null
    country: string | null
    open_date: string | null
    digital_adoption_score: number | null
    credit_limit_usd?: number | null
    fico_score?: number | null
    risk_band?: string | null
}
