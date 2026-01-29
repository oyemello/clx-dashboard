-- Monthly customer snapshot fact table
CREATE OR REPLACE TABLE `${PROJECT_ID}.amex_synth_semantic.fact_customer_month` AS
SELECT
  snapshot_month,
  customer_id,
  spend_usd,
  statement_balance_usd,
  payment_usd,
  CAST(is_delinquent AS BOOL) AS is_delinquent,
  CAST(is_churned AS BOOL) AS is_churned,
  nps_0_10
FROM `${PROJECT_ID}.amex_synth_raw.monthly_snapshots`;
