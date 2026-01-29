-- Marketing acquisition KPIs (CMO) - proxies based on acquisition_channel + activation
CREATE OR REPLACE TABLE `${PROJECT_ID}.amex_synth_exec.kpi_marketing_monthly` AS
WITH first_active AS (
  SELECT customer_id, MIN(tx_date) AS first_tx_date
  FROM `${PROJECT_ID}.amex_synth_semantic.fact_tx`
  GROUP BY customer_id
),
base AS (
  SELECT
    DATE_TRUNC(d.open_date, MONTH) AS cohort_month,
    d.acquisition_channel,
    COUNT(*) AS acquired_customers,
    AVG(d.digital_adoption_score) AS avg_digital_adoption
  FROM `${PROJECT_ID}.amex_synth_semantic.dim_customer` d
  GROUP BY 1,2
),
activation AS (
  SELECT
    DATE_TRUNC(d.open_date, MONTH) AS cohort_month,
    d.acquisition_channel,
    SAFE_DIVIDE(SUM(CASE WHEN DATE_DIFF(f.first_tx_date, d.open_date, DAY) <= 30 THEN 1 ELSE 0 END), COUNT(*)) AS activation_30d_rate
  FROM `${PROJECT_ID}.amex_synth_semantic.dim_customer` d
  LEFT JOIN first_active f USING (customer_id)
  GROUP BY 1,2
)
SELECT
  b.cohort_month,
  b.acquisition_channel,
  b.acquired_customers,
  a.activation_30d_rate,
  b.avg_digital_adoption
FROM base b
JOIN activation a USING (cohort_month, acquisition_channel);
