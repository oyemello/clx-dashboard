-- Monthly KPIs by risk band (CRO Risk / CFO)
CREATE OR REPLACE TABLE `${PROJECT_ID}.amex_synth_exec.kpi_risk_monthly` AS
WITH risk AS (
  SELECT customer_id, ANY_VALUE(risk_band) AS risk_band
  FROM `${PROJECT_ID}.amex_synth_raw.accounts`
  GROUP BY customer_id
),
snap AS (
  SELECT
    f.snapshot_month AS month,
    r.risk_band,
    COUNT(DISTINCT f.customer_id) AS customers,
    SUM(f.statement_balance_usd) AS total_balance_usd,
    AVG(CAST(f.is_delinquent AS INT64)) AS delinquency_rate,
    AVG(CAST(f.is_churned AS INT64)) AS churn_rate
  FROM `${PROJECT_ID}.amex_synth_semantic.fact_customer_month` f
  JOIN risk r USING (customer_id)
  GROUP BY 1,2
),
tx AS (
  SELECT
    DATE_TRUNC(tx_date, MONTH) AS month,
    r.risk_band,
    COUNT(*) AS tx_count,
    SUM(amount_usd) AS spend_usd,
    SAFE_DIVIDE(SUM(CAST(is_fraud AS INT64)), COUNT(*)) AS fraud_rate,
    SAFE_DIVIDE(SUM(CAST(is_disputed AS INT64)), COUNT(*)) AS dispute_rate
  FROM `${PROJECT_ID}.amex_synth_semantic.fact_tx` t
  JOIN risk r USING (customer_id)
  GROUP BY 1,2
)
SELECT
  COALESCE(snap.month, tx.month) AS month,
  COALESCE(snap.risk_band, tx.risk_band) AS risk_band,
  customers,
  total_balance_usd,
  delinquency_rate,
  churn_rate,
  tx_count,
  spend_usd,
  fraud_rate,
  dispute_rate
FROM snap
FULL OUTER JOIN tx USING (month, risk_band);
