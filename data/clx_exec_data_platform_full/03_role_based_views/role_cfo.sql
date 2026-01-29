CREATE OR REPLACE VIEW `${PROJECT_ID}.amex_synth_exec.role_cfo_monthly` AS
SELECT
  month,
  customers_in_snapshots AS customers,
  active_customers,
  total_spend_usd AS spend_usd,
  statement_balance_usd,
  payment_usd,
  delinquency_rate,
  churn_rate,
  fraud_rate,
  dispute_rate
FROM `${PROJECT_ID}.amex_synth_exec.kpi_company_monthly`;
