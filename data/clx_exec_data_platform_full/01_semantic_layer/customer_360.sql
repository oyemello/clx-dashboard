-- Customer 360 (gold) table for drilldowns (1 row per customer)
CREATE OR REPLACE TABLE `${PROJECT_ID}.amex_synth_semantic.customer_360` AS
WITH tx AS (
  SELECT
    customer_id,
    COUNT(*) AS tx_count,
    SUM(amount_usd) AS total_spend_usd,
    AVG(amount_usd) AS avg_tx_usd,
    SUM(CAST(is_fraud AS INT64)) AS fraud_tx_count,
    SUM(CAST(is_disputed AS INT64)) AS disputed_tx_count,
    MAX(tx_date) AS last_tx_date
  FROM `${PROJECT_ID}.amex_synth_semantic.fact_tx`
  GROUP BY customer_id
),
acct AS (
  SELECT
    customer_id,
    COUNT(*) AS account_count,
    AVG(credit_limit_usd) AS avg_credit_limit_usd,
    AVG(fico_score) AS avg_fico_score,
    AVG(apr_percent) AS avg_apr_percent,
    ANY_VALUE(risk_band) AS risk_band
  FROM `${PROJECT_ID}.amex_synth_raw.accounts`
  GROUP BY customer_id
),
snap AS (
  SELECT
    customer_id,
    MAX(snapshot_month) AS latest_month,
    ANY_VALUE(spend_usd) AS latest_spend_usd,
    ANY_VALUE(statement_balance_usd) AS latest_statement_balance_usd,
    ANY_VALUE(payment_usd) AS latest_payment_usd,
    ANY_VALUE(is_delinquent) AS latest_is_delinquent,
    ANY_VALUE(is_churned) AS latest_is_churned,
    ANY_VALUE(nps_0_10) AS latest_nps_0_10
  FROM (
    SELECT * FROM `${PROJECT_ID}.amex_synth_semantic.fact_customer_month`
    QUALIFY ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY snapshot_month DESC) = 1
  )
  GROUP BY customer_id
)
SELECT
  d.*,
  a.account_count,
  a.avg_credit_limit_usd,
  a.avg_fico_score,
  a.avg_apr_percent,
  a.risk_band,
  t.tx_count,
  t.total_spend_usd,
  t.avg_tx_usd,
  t.fraud_tx_count,
  t.disputed_tx_count,
  t.last_tx_date,
  s.latest_month,
  s.latest_spend_usd,
  s.latest_statement_balance_usd,
  s.latest_payment_usd,
  s.latest_is_delinquent,
  s.latest_is_churned,
  s.latest_nps_0_10
FROM `${PROJECT_ID}.amex_synth_semantic.dim_customer` d
LEFT JOIN acct a USING (customer_id)
LEFT JOIN tx t USING (customer_id)
LEFT JOIN snap s USING (customer_id);
