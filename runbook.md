# BigQuery Integration Runbook

This guide explains how to connect your local environment and production deployment to the BigQuery data layer.

## 1. Prerequisites

You need a Google Cloud Platform (GCP) Service Account with the following roles on your `clx_exec` dataset (project `clx-main-platform`):
- **BigQuery Job User**
- **BigQuery Data Viewer**

## 2. Environment Setup

### Local Development
1.  Obtain your Service Account Key JSON file from GCP IAM.
2.  Save it securely on your machine (e.g., `./service-account-key.json`). **DO NOT COMMIT THIS FILE.**
3.  In your `.env.local` (create if missing), add:
    ```bash
    GOOGLE_PROJECT_ID=your-project-id
    GOOGLE_APPLICATION_CREDENTIALS=./service-account-key.json
    ```

### Vercel / Production
1.  Get the **content** of your Service Account Key JSON file.
2.  Minify it (remove newlines) to a single string.
3.  In Vercel Project Settings > Environment Variables, add:
    - `GOOGLE_PROJECT_ID`: `your-project-id`
    - `GOOGLE_SERVICE_ACCOUNT_JSON`: `{"type":"service_account",...}`

> **Note**: `GOOGLE_SERVICE_ACCOUNT_JSON` takes precedence over `GOOGLE_APPLICATION_CREDENTIALS` if both are present.

## 3. Frontend Integration Guide

The frontend (shadcn components) should fetch data from the server-side API routes.

### Example: Fetching Anomalies (chart data)

```typescript
// components/bank-dashboard/insights-panel.tsx

import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function InsightsPanel() {
  const { data, error, isLoading } = useSWR(
    '/api/metrics/cashflow-anomalies?range=year&includeBands=true', 
    fetcher,
    { refreshInterval: 60000 } // Poll every minute
  )

  if (isLoading) return <div>Loading insights...</div>
  if (error) return <div>Failed to load data</div>

  // Pass 'data' to your Recharts component
  // ...
}
```

### Example: Fetching Raw Customers

```typescript
// components/bank-dashboard/raw-data-table.tsx

async function fetchCustomers(page = 0, limit = 100) {
  const offset = page * limit
  const res = await fetch(`/api/raw/customers?limit=${limit}&offset=${offset}`)
  return res.json()
}
```

## 4. API Reference

### `GET /api/metrics/cashflow-anomalies`
Returns time-series data for the cashflow chart.
- **Params**:
    - `range`: `7d`, `30d`, `quarter` (3m), `half` (6m), `year` (12m), `ytd`.
    - `anomaliesOnly`: `true` (optional)
    - `includeBands`: `true` (optional)

### `GET /api/metrics/net-contribution-by-segment`
Returns KPI blocks for different customer segments.
- **Params**: None.

### `GET /api/raw/customers`
Returns paginated customer list.
- **Params**:
    - `limit`: number (default 100)
    - `offset`: number (default 0)
    - `segment`: string (optional filter)
    - `includeRaw`: `true` (returns full JSON blob)
