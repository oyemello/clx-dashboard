export type ConnectorProvider = 'bigquery' | 'snowflake' | 'redshift' | 'postgres';

export type Environment = 'dev' | 'staging' | 'prod';

export interface ConnectorAuth {
    type: 'service_account' | 'adc' | 'oauth';
    keyFile?: string; // Path to key file (optional)
    jsonContent?: string; // Raw JSON content (optional, for dynamic auth)
}

export interface ConnectorMetadata {
    id: string; // e.g. 'clx_warehouse_primary'
    name: string; // e.g. 'CLX Warehouse Primary'
    description?: string;
    provider: ConnectorProvider;
    environments: Environment[];
    defaultLocation: string; // e.g. 'us-east1'
    project?: string; // GCP Project ID or similar
}

export interface GovernanceMetadata {
    owner: string;
    piiClassification: 'none' | 'sensitive' | 'critical';
    retentionPolicy: string; // e.g. "7 years"
    allowedConsumers: string[]; // e.g. ["analyst", "data-science"]
    lastAudit?: string; // ISO date
}

export interface TableDefinition {
    id: string; // e.g. 'customers'
    type: 'table' | 'view' | 'materialized_view';
    description?: string;
    governance?: Partial<GovernanceMetadata>; // Override at table level
}

export interface DatasetDefinition {
    id: string; // e.g. 'clx_exec'
    description?: string;
    tables: TableDefinition[];
    governance: GovernanceMetadata; // Default for dataset
}

export interface ValidationResult {
    status: 'success' | 'warning' | 'error';
    step: string;
    message: string;
    timestamp: string;
    latencyMs?: number;
}

export interface DiscoveryResult {
    totalDatasets: number;
    totalTables: number;
    lastRefreshed: string;
    schemaHash: string; // For change detection
    datasets?: Array<{
        id: string;
        location?: string;
        tables: Array<{
            id: string;
            type: string;
            rowCount: number;
            schema: Array<{ name: string; type: string; mode?: string }>;
            description?: string;
        }>
    }>;
}

export interface MetricDefinition {
    id: string;
    label: string;
    description?: string;
    type: 'currency' | 'percent' | 'number';
    sql: string; // The SQL snippet, e.g., "SUM(amount_usd)"
    table: string; // "transactions"
    isTimeseries: boolean;
    dateColumn?: string; // "tx_date"
}

export interface ConnectorConfig {
    metadata: ConnectorMetadata;
    auth: ConnectorAuth;
    sources: DatasetDefinition[];
    validation?: ValidationResult[];
    discovery?: DiscoveryResult;
    metrics?: MetricDefinition[]; // New field
}
