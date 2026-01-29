-- Product / digital adoption KPIs (CPO/CXO)
CREATE OR REPLACE TABLE `${PROJECT_ID}.amex_synth_exec.kpi_product_monthly` AS
SELECT
  f.snapshot_month AS month,
  d.product_tier,
  COUNT(DISTINCT f.customer_id) AS customers,
  AVG(d.digital_adoption_score) AS avg_digital_adoption,
  AVG(f.nps_0_10) AS avg_nps,
  AVG(CAST(f.is_churned AS INT64)) AS churn_rate
FROM `${PROJECT_ID}.amex_synth_semantic.fact_customer_month` f
JOIN `${PROJECT_ID}.amex_synth_semantic.dim_customer` d USING (customer_id)
GROUP BY 1,2;
