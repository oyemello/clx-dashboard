CREATE OR REPLACE VIEW `${PROJECT_ID}.amex_synth_exec.role_cpo_monthly` AS
SELECT
  month,
  product_tier,
  customers,
  avg_digital_adoption,
  avg_nps,
  churn_rate
FROM `${PROJECT_ID}.amex_synth_exec.kpi_product_monthly`;
