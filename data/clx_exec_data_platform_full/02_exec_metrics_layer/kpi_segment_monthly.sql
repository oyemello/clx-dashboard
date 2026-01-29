-- Monthly KPIs by customer segment and product tier (CMO/CPO/CEO)
CREATE OR REPLACE TABLE `${PROJECT_ID}.amex_synth_exec.kpi_segment_monthly` AS
WITH snap AS (
  SELECT
    f.snapshot_month AS month,
    d.segment,
    d.product_tier,
    COUNT(DISTINCT f.customer_id) AS customers,
    SUM(f.spend_usd) AS spend_usd,
    AVG(CAST(f.is_churned AS INT64)) AS churn_rate,
    AVG(CAST(f.is_delinquent AS INT64)) AS delinquency_rate,
    AVG(f.nps_0_10) AS avg_nps
  FROM `${PROJECT_ID}.amex_synth_semantic.fact_customer_month` f
  JOIN `${PROJECT_ID}.amex_synth_semantic.dim_customer` d USING (customer_id)
  GROUP BY 1,2,3
),
tx AS (
  SELECT
    DATE_TRUNC(tx_date, MONTH) AS month,
    d.segment,
    d.product_tier,
    COUNT(*) AS tx_count,
    SUM(amount_usd) AS tx_spend_usd
  FROM `${PROJECT_ID}.amex_synth_semantic.fact_tx` t
  JOIN `${PROJECT_ID}.amex_synth_semantic.dim_customer` d USING (customer_id)
  GROUP BY 1,2,3
)
SELECT
  COALESCE(snap.month, tx.month) AS month,
  COALESCE(snap.segment, tx.segment) AS segment,
  COALESCE(snap.product_tier, tx.product_tier) AS product_tier,
  customers,
  spend_usd,
  churn_rate,
  delinquency_rate,
  avg_nps,
  tx_count,
  tx_spend_usd
FROM snap
FULL OUTER JOIN tx USING (month, segment, product_tier);
