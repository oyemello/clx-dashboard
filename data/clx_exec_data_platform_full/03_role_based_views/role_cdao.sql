CREATE OR REPLACE VIEW `${PROJECT_ID}.amex_synth_exec.role_cdao_health` AS
WITH maxes AS (
  SELECT
    (SELECT MAX(tx_date) FROM `${PROJECT_ID}.amex_synth_semantic.fact_tx`) AS max_tx_date,
    (SELECT MAX(snapshot_month) FROM `${PROJECT_ID}.amex_synth_semantic.fact_customer_month`) AS max_snapshot_month,
    (SELECT COUNT(*) FROM `${PROJECT_ID}.amex_synth_raw.customers`) AS customers_rows,
    (SELECT COUNT(*) FROM `${PROJECT_ID}.amex_synth_raw.transactions`) AS tx_rows
)
SELECT CURRENT_TIMESTAMP() AS checked_at, * FROM maxes;
