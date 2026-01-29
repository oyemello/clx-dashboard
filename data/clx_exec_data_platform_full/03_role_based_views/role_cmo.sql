CREATE OR REPLACE VIEW `${PROJECT_ID}.amex_synth_exec.role_cmo_monthly` AS
SELECT
  cohort_month AS month,
  acquisition_channel,
  acquired_customers,
  activation_30d_rate,
  avg_digital_adoption
FROM `${PROJECT_ID}.amex_synth_exec.kpi_marketing_monthly`;
