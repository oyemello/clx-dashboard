-- Creates a cleaned customer dimension (1 row per customer)
CREATE OR REPLACE TABLE `${PROJECT_ID}.amex_synth_semantic.dim_customer` AS
SELECT
  customer_id,
  country,
  segment,
  product_tier,
  open_date,
  dob,
  digital_adoption_score,
  acquisition_channel
FROM `${PROJECT_ID}.amex_synth_raw.customers`;
