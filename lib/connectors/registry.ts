import { ConnectorConfig } from "./types";
import { CLX_WAREHOUSE_PRIMARY } from "./instances/clx-warehouse-primary";

export const CONNECTORS: Record<string, ConnectorConfig> = {
    [CLX_WAREHOUSE_PRIMARY.metadata.id]: CLX_WAREHOUSE_PRIMARY
};

export function getConnector(id: string): ConnectorConfig | undefined {
    return CONNECTORS[id];
}

export function getAllConnectors(): ConnectorConfig[] {
    return Object.values(CONNECTORS);
}
