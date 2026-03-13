# Connector Details (Sample Setup)

Use this as a quick reference for filling out the **New Connection** dialog when you want to run the app against the bundled sample data in BigQuery.

## Required inputs
| Field (UI label)        | What to enter for the sample | Notes |
| ---                     | ---                           | --- |
| Provider                | `Google BigQuery`             | Must match the sample stack. |
| Region                  | `asia-south1`                          | Same as repo default. |
| Service Account JSON    | Use `sample-data/bankingmetrics-8321b229f8b5.json` |
| Display Name            | `bankingMetrics`             | Any friendly name works. |
| Connector ID            | `bankingMetrics`             | Auto-generated from name is fine. |
| Project / Account ID    | `auto`           | The sample BigQuery project used throughout the code. |
| Dataset ID              | `banking`                    | Primary dataset referenced in `app/context/gcp_context.md`. |


## Steps to connect
1) Go to `/connectors` and click **New Connection**.
2) Fill the fields using the values above.
3) Upload or paste the service-account JSON.
4) Click **Create Connection**. The app will:
   - Run a handshake (`SELECT 1`) via `/api/connectors/bigquery/test`.
   - Discover datasets/tables via `/api/connectors/bigquery/discover`.
   - Auto-generate metrics from the schema and store them in `sessionStorage`.
5) Ensure it becomes the active connector; the dashboard and chart studio will then fetch data through this connection.

## Notes
- These inputs align with the sample context in `app/context/gcp_context.md` and the default connector instance in `lib/connectors/instances/clx-warehouse-primary.ts`.
- If you use a different project/dataset, replace the IDs above but keep Provider/Region consistent with your BigQuery location.
