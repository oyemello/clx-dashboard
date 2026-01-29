
import { Customer } from "./data";

export type MetricType = "currency" | "percent" | "number";

export interface MetricDefinition {
    id: string;
    label: string;
    description: string;
    type: MetricType;
    calculate: (data: Customer[]) => number;
    // New fields for BigQuery Integration
    endpoint?: (params: any) => string;
    componentType?: "kpi_group" | "chart" | "table";
}

export const METRIC_REGISTRY: MetricDefinition[] = [
    // --- New BigQuery Metrics ---
    {
        id: "netContributionBySegment",
        label: "Net Contribution by Segment",
        description: "Profitability breakdown by customer segment",
        type: "currency",
        calculate: () => 0,
        endpoint: (params) => `/api/metrics/net-contribution-by-segment?projectId=${params.projectId || ''}&datasetId=${params.datasetId || ''}`,
        componentType: "chart"
    },
    {
        id: "cashflowAnomalies",
        label: "Cashflow Anomalies",
        description: "Time-series cashflow with anomaly detection",
        type: "currency",
        calculate: () => 0,
        endpoint: (params) => `/api/metrics/cashflow-anomalies?range=${params.range || 'year'}&connectorId=${params.connectorId || ''}&projectId=${params.projectId || ''}&datasetId=${params.datasetId || ''}`,
        componentType: "chart"
    },
    {
        id: "rawCustomers",
        label: "Raw Customer Data",
        description: "Full paginated customer table",
        type: "number",
        calculate: () => 0,
        endpoint: (params) => `/api/raw/customers?limit=${params.limit || 100}&offset=${params.offset || 0}&segment=${params.segment || ''}&projectId=${params.projectId || ''}&datasetId=${params.datasetId || ''}`,
        componentType: "table"
    },

    // --- Existing Client-Side Metrics (Mapped to BigQuery) ---
    // Financials
    {
        id: "revenue",
        label: "Total Revenue",
        description: "Net Contribution (Lifetime)",
        type: "currency",
        calculate: () => 0,
        endpoint: (params) => `/api/metrics/trend?metric=revenue&range=${params.range || 'ALL'}&connectorId=${params.connectorId || ''}&projectId=${params.projectId || ''}&datasetId=${params.datasetId || ''}`,
        componentType: "chart"
    },
    {
        id: "interchange",
        label: "Interchange Revenue",
        description: "Revenue from card swipe fees",
        type: "currency",
        calculate: () => 0,
        endpoint: (params) => `/api/metrics/trend?metric=interchange&range=${params.range || 'ALL'}&connectorId=${params.connectorId || ''}&projectId=${params.projectId || ''}&datasetId=${params.datasetId || ''}`,
        componentType: "chart"
    },
    {
        id: "interest",
        label: "Interest Income",
        description: "Revenue from revolving balances",
        type: "currency",
        calculate: () => 0,
        endpoint: (params) => `/api/metrics/trend?metric=interest&range=${params.range || 'ALL'}&connectorId=${params.connectorId || ''}&projectId=${params.projectId || ''}&datasetId=${params.datasetId || ''}`,
        componentType: "chart"
    },
    // Customer Health
    {
        id: "customers",
        label: "Active Customers",
        description: "Currently active accounts",
        type: "number",
        calculate: () => 0,
        endpoint: (params) => `/api/metrics/trend?metric=customers&range=${params.range || 'ALL'}&connectorId=${params.connectorId || ''}&projectId=${params.projectId || ''}&datasetId=${params.datasetId || ''}`,
        componentType: "chart"
    },
    {
        id: "churn_risk",
        label: "At-Risk Customers",
        description: "Customers flagged for potential churn",
        type: "number",
        calculate: () => 0,
        endpoint: (params) => `/api/metrics/trend?metric=churn_risk&range=${params.range || 'ALL'}&connectorId=${params.connectorId || ''}&projectId=${params.projectId || ''}&datasetId=${params.datasetId || ''}`,
        componentType: "chart"
    },
    // Risk & Compliance
    {
        id: "risk",
        label: "Avg Risk Score",
        description: "Portfolio Average Credit Risk",
        type: "number",
        calculate: () => 0,
        endpoint: (params) => `/api/metrics/trend?metric=risk&range=${params.range || 'ALL'}&connectorId=${params.connectorId || ''}&projectId=${params.projectId || ''}&datasetId=${params.datasetId || ''}`,
        componentType: "chart"
    },
    {
        id: "fraud_prevented",
        label: "Fraud Prevented",
        description: "Total value of stopped fraud",
        type: "currency",
        calculate: () => 0,
        endpoint: (params) => `/api/metrics/trend?metric=fraud_prevented&range=${params.range || 'ALL'}&connectorId=${params.connectorId || ''}&projectId=${params.projectId || ''}&datasetId=${params.datasetId || ''}`,
        componentType: "chart"
    },
    // Behavior
    {
        id: "utilization",
        label: "Avg Utilization",
        description: "Average credit limit usage",
        type: "percent",
        calculate: () => 0,
        endpoint: (params) => `/api/metrics/trend?metric=utilization&range=${params.range || 'ALL'}&connectorId=${params.connectorId || ''}&projectId=${params.projectId || ''}&datasetId=${params.datasetId || ''}`,
        componentType: "chart"
    },
    {
        id: "digital_adoption",
        label: "Digital Adoption",
        description: "% of users with App/Web usage",
        type: "percent",
        calculate: () => 0,
        endpoint: (params) => `/api/metrics/trend?metric=digital_adoption&range=${params.range || 'ALL'}&connectorId=${params.connectorId || ''}&projectId=${params.projectId || ''}&datasetId=${params.datasetId || ''}`,
        componentType: "chart"
    }
];

export const getMetricById = (id: string) => METRIC_REGISTRY.find(m => m.id === id);
