
export type VisualizationType = 'line' | 'bar' | 'pie' | 'area';

export interface DashboardMetricConfig {
    metricId: string;
    isVisible: boolean;
    customTitle?: string;
    visualizationType: VisualizationType;
}

export const DEFAULT_VISUALIZATION_TYPE: VisualizationType = 'line';
