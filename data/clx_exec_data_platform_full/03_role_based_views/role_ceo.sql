CREATE OR REPLACE VIEW `${PROJECT_ID}.amex_synth_exec.role_ceo_monthly` AS
SELECT
  month,
  customers,
  active_customers,
  spend_usd,
  churn_rate,
  delinquency_rate,
  fraud_rate,
  experience_score,
  business_health_score
FROM `${PROJECT_ID}.amex_synth_exec.kpi_exec_rollup_monthly`;
