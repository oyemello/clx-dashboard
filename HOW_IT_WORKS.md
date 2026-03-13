# How It Works

## Data path overview
- User selects or creates a connector on **/connectors** (service-account JSON pasted/uploaded).
- Connector config + credentials are stored in `sessionStorage` keys:
  - `dashboard_connectors`
  - `active_dashboard_connector_id`
  - `dashboard_config` (metric visibility, titles, chart types)
- UI components fetch data via Next API routes; the client never talks to BigQuery directly.

## Client → API
- **DashboardShell** (`components/bank-dashboard/dashboard-shell.tsx`)
  - Fetches trend data: `POST /api/metrics/trend` with `{ metric, range, connector, projectId }`.
  - Fetches overview cards: `POST /api/dashboard/overview` with `{ projectId, datasetId, connector }`.
- **Insights page** (`app/insights/page.tsx`): also uses `/api/metrics/trend` for the selected metric.
- **Raw data & specialized charts**:
  - `/api/raw/customers` (table view)
  - `/api/metrics/net-contribution-by-segment`
  - `/api/metrics/cashflow-anomalies`

## API → BigQuery
- Routes under `app/api/**` parse the connector payload, extract credentials and `projectId`/`datasetId`, then call server helpers.
- **Dynamic metrics**: `getMetricTimeseries` in `lib/data-service/server.ts`
  - Picks table/date column from discovery metadata.
  - Builds SQL for the metric’s `sql` + optional date filter (range → lookback days).
  - Executes via `getBigQueryClient` (credentials passed through) and returns `{ date, value }[]`.
- **Overview**: `getDashboardOverview` in the same file builds safe COUNT/SUM queries for customers, accounts, tx, snapshots.
- **Shared BigQuery client**: `lib/bigquery/client.ts` (inline creds) and `lib/bigquery.ts` (env/key-file fallback) create the BigQuery client.

## Discovery → Metrics
- On connector activation, `/api/connectors/bigquery/discover` scans datasets/tables/schemas.
- `lib/connectors/generator.ts` turns schema fields into metric definitions (sums, counts, distincts, timeseries when a date column exists).
- Updated metrics + discovery are written back to the connector object in `sessionStorage`; UI lists and fetches based on this set.

## Environment requirements
- BigQuery: `GOOGLE_PROJECT_ID` plus either `GOOGLE_SERVICE_ACCOUNT_JSON` (preferred) or `GOOGLE_APPLICATION_CREDENTIALS` path; local fallback to `./key/*.json`.
- OpenAI: `OPENAI_API_KEY` for chart-chat and mini reports.

## Typical request flow
1) User clicks a KPI/chart → client calls `/api/metrics/trend` with active connector + metric id.
2) Route resolves project/dataset, builds SQL, queries BigQuery.
3) JSON response feeds KPI cards and `UniversalChart` in `DashboardShell`.

