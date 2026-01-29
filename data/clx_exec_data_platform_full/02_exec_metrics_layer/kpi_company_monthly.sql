-- Company-level monthly executive KPIs (CEO/CFO baseline)
CREATE OR REPLACE TABLE `${PROJECT_ID}.amex_synth_exec.kpi_company_monthly` AS
WITH tx AS (
  SELECT
    DATE_TRUNC(tx_date, MONTH) AS month,
    COUNT(*) AS tx_count,
    SUM(amount_usd) AS total_spend_usd,
    AVG(amount_usd) AS avg_tx_amount_usd,
    SUM(CAST(is_fraud AS INT64)) AS fraud_tx_count,
    SUM(CAST(is_disputed AS INT64)) AS disputed_tx_count,
    COUNT(DISTINCT customer_id) AS active_customers
  FROM `${PROJECT_ID}.amex_synth_semantic.fact_tx`
  GROUP BY 1
),
snap AS (
  SELECT
    snapshot_month AS month,
    COUNT(DISTINCT customer_id) AS customers_in_snapshots,
    SUM(spend_usd) AS statement_spend_usd,
    SUM(statement_balance_usd) AS statement_balance_usd,
    SUM(payment_usd) AS payment_usd,
    AVG(CAST(is_delinquent AS INT64)) AS delinquency_rate,
    AVG(CAST(is_churned AS INT64)) AS churn_rate,
    AVG(nps_0_10) AS avg_nps
  FROM `${PROJECT_ID}.amex_synth_semantic.fact_customer_month`
  GROUP BY 1
)
SELECT
  COALESCE(tx.month, snap.month) AS month,
  customers_in_snapshots,
  active_customers,
  tx_count,
  total_spend_usd,
  avg_tx_amount_usd,
  SAFE_DIVIDE(fraud_tx_count, tx_count) AS fraud_rate,
  SAFE_DIVIDE(disputed_tx_count, tx_count) AS dispute_rate,
  statement_balance_usd,
  payment_usd,
  delinquency_rate,
  churn_rate,
  avg_nps
FROM tx
FULL OUTER JOIN snap USING (month);
