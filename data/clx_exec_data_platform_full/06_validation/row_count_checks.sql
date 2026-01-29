SELECT
  (SELECT COUNT(*) FROM `${PROJECT_ID}.amex_synth_raw.customers`) AS customers_rows,
  (SELECT COUNT(*) FROM `${PROJECT_ID}.amex_synth_raw.accounts`) AS accounts_rows,
  (SELECT COUNT(*) FROM `${PROJECT_ID}.amex_synth_raw.transactions`) AS transactions_rows,
  (SELECT COUNT(*) FROM `${PROJECT_ID}.amex_synth_raw.monthly_snapshots`) AS monthly_snapshots_rows;
