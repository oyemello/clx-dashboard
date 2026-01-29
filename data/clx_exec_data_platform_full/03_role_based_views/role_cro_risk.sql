CREATE OR REPLACE VIEW `${PROJECT_ID}.amex_synth_exec.role_cro_risk_monthly` AS
SELECT
  month,
  risk_band,
  customers,
  total_balance_usd,
  delinquency_rate,
  churn_rate,
  fraud_rate,
  dispute_rate
FROM `${PROJECT_ID}.amex_synth_exec.kpi_risk_monthly`;
