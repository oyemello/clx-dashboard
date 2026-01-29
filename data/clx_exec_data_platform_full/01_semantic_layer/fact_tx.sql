-- Standardized transactions fact table
CREATE OR REPLACE TABLE `${PROJECT_ID}.amex_synth_semantic.fact_tx` AS
SELECT
  transaction_id,
  customer_id,
  tx_date,
  DATE_TRUNC(tx_date, MONTH) AS tx_month,
  category,
  channel,
  amount_usd,
  CAST(is_fraud AS BOOL) AS is_fraud,
  CAST(is_disputed AS BOOL) AS is_disputed
FROM `${PROJECT_ID}.amex_synth_raw.transactions`;
