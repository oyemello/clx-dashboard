-- Executive roll-up scorecard (CEO/Board) with composite indices (0-100)
CREATE OR REPLACE TABLE `${PROJECT_ID}.amex_synth_exec.kpi_exec_rollup_monthly` AS
WITH k AS (
  SELECT
    month,
    SAFE_CAST(customers_in_snapshots AS FLOAT64) AS customers,
    SAFE_CAST(active_customers AS FLOAT64) AS active_customers,
    SAFE_CAST(total_spend_usd AS FLOAT64) AS spend_usd,
    fraud_rate,
    delinquency_rate,
    churn_rate,
    SAFE_CAST(avg_nps AS FLOAT64) AS nps
  FROM `${PROJECT_ID}.amex_synth_exec.kpi_company_monthly`
),
scaled AS (
  SELECT
    month,
    customers,
    active_customers,
    spend_usd,
    fraud_rate,
    delinquency_rate,
    churn_rate,
    nps,
    LEAST(100.0, GREATEST(0.0, 100.0 * SAFE_DIVIDE(active_customers, NULLIF(customers,0)))) AS engagement_score,
    LEAST(100.0, GREATEST(0.0, 100.0 * (1.0 - churn_rate))) AS retention_score,
    LEAST(100.0, GREATEST(0.0, 100.0 * (1.0 - delinquency_rate))) AS credit_health_score,
    LEAST(100.0, GREATEST(0.0, 100.0 * (1.0 - fraud_rate))) AS fraud_health_score,
    LEAST(100.0, GREATEST(0.0, 10.0 * nps)) AS experience_score
  FROM k
)
SELECT
  *,
  ROUND(0.25*engagement_score + 0.20*retention_score + 0.20*credit_health_score + 0.15*fraud_health_score + 0.20*experience_score, 2) AS business_health_score
FROM scaled;
