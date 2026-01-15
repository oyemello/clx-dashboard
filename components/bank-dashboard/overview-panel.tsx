import * as React from "react"
import { useMemo } from "react"
import useSWR from "swr"
import { fetcher } from "@/lib/api/fetcher"
import { Customer } from "@/lib/data"
import { OverviewChart } from "./overview-chart"
import { Card } from "@/components/ui/card"
import { METRIC_REGISTRY, MetricDefinition } from "@/lib/metrics"
import { MetricConfig, MetricConfigurationPanel } from "./metric-configuration-panel" // Update import
import { OverviewMetricCard } from "./overview-metric-card"
import { RawDataTable } from "./raw-data-table"
import { InsightsPanel } from "./insights-panel"
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Settings2 } from "lucide-react"

import { RawCustomerRow } from "@/lib/api/types"
import { Button } from "@/components/ui/button"
import { ColumnDef } from "@tanstack/react-table"

interface OverviewPanelProps {
    data: Customer[] // Keep for now to avoid breaking other things, but make optional?
    metricConfigs: MetricConfig[]
    onNavigateToConfig: () => void
    onSaveConfigs: (configs: MetricConfig[]) => void
    activeProjectId?: string | null
    activeConnectorId?: string | null
}

const rawDataColumns: ColumnDef<RawCustomerRow>[] = [
    { accessorKey: "customerId", header: "ID" },
    { accessorKey: "name", header: "Customer Name" },
    { accessorKey: "segment", header: "Segment" },
    {
        accessorKey: "net_contribution",
        header: "Net Contribution",
        cell: ({ row }: any) => {
            // Safe parse
            const raw = row.getValue("net_contribution");
            const val = typeof raw === 'number' ? raw : parseFloat(raw || '0');
            return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val)
        }
    },
    {
        accessorKey: "churn_risk",
        header: "Risk Score",
        cell: ({ row }: any) => {
            const raw = row.getValue("churn_risk");
            const val = typeof raw === 'number' ? raw : parseInt(raw || '0');
            return (
                <div className={`font-medium ${val > 80 ? 'text-destructive' : val > 50 ? 'text-amber-500' : 'text-green-600'}`}>
                    {val}/100
                </div>
            )
        }
    },
]

export function OverviewPanel({ data, metricConfigs, onNavigateToConfig, onSaveConfigs, activeProjectId, activeConnectorId }: OverviewPanelProps) {
    // State for interactive charts
    const [activeMetric, setActiveMetric] = React.useState<string>("revenue")
    const [showInsights, setShowInsights] = React.useState(false)
    const [showAddMetric, setShowAddMetric] = React.useState(false)

    // 1. Fetch Real Overview Stats
    const { data: realStats, error: statsError } = useSWR(
        activeProjectId ? `/api/dashboard/overview?projectId=${activeProjectId}` : null,
        fetcher,
        { refreshInterval: 30000 }
    )

    // Helper to calculate metric value (Prefer Real Stats -> Legacy Scalar)
    const getMetricValue = React.useCallback((metricId: string) => {
        if (realStats) {
            switch (metricId) {
                case 'customers': return realStats.totalCustomers;
                case 'revenue': return realStats.spend30d; // Using Spend as proxy for Revenue in this view
                case 'risk': return realStats.fraudRate30d * 100; // Mock mapping
                case 'churn_risk': return realStats.churnRate * 100;
                case 'active_accounts': return realStats.totalAccounts;
                default: break;
            }
        }
        // Fallback to legacy if no real stats or unknown metric
        const def = METRIC_REGISTRY.find((m: MetricDefinition) => m.id === metricId)
        if (!def) return 0
        return def.calculate(data)
    }, [data, realStats])

    // Get Active Config
    const activeConfig = metricConfigs.find(c => c.id === activeMetric)
    const activeChartType = activeConfig?.visualizationType || 'line'

    // 2. Aggregate Monthly Data based on Active Metric
    const activeDef = METRIC_REGISTRY.find(m => m.id === activeMetric)
    // Inject Connector ID into endpoint params for Dynamic Metrics
    const activeEndpoint = activeDef?.endpoint && activeConnectorId
        ? activeDef.endpoint({ range: 'ALL', connectorId: activeConnectorId })
        : null

    const { data: activeApiData } = useSWR(activeEndpoint, fetcher)

    const chartData = useMemo(() => {
        // 1. If we have API data for the active metric, use it.
        // API returns [{ date: '2023-01-01', value: 123 }, ...]
        // We need to map it to { month: 'Jan', value: 123 } or similar for the chart
        if (activeApiData && Array.isArray(activeApiData) && activeApiData.length > 0) {
            return activeApiData.map((row: any) => ({
                month: row.date, // Chart likely expects 'month' key, or we need to update Chart component
                value: row.value,
                ...row
            }));
        }

        // 2. Legacy / Mock Fallback if API returns empty/null
        // ... (Keep existing fallback for smooth transition if waiting for data)
        // We have M-0 to M-23.
        const months: { month: string; value: number }[] = []

        const currentVal = getMetricValue(activeMetric)

        // Initialize the sequence
        let currentMonthValue = currentVal || 0

        // Generate reverse chronological data (M-0 back to M-23)
        for (let i = 0; i < 24; i++) {
            months.unshift({
                month: `M-${i}`,
                value: i === 0 ? currentVal : currentMonthValue
            })
            // ... (Simplified decay logic for fallback) ...
            const variance = (Math.random() - 0.5) * (currentMonthValue * 0.05)
            currentMonthValue = Math.max(0, currentMonthValue - variance)
        }
        return months

    }, [data, getMetricValue, activeApiData, activeMetric])

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            {/* Status Indicator */}
            {!activeProjectId && (
                <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md text-sm mb-4">
                    ⚠️ No Active Connector. Visualizing mock data. Go to <strong>Connectors</strong> to connect.
                </div>
            )}

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {METRIC_REGISTRY.map((metric) => {
                    const conf = metricConfigs.find(c => c.id === metric.id)
                    if (metricConfigs.length === 0) {
                        if (!["revenue", "customers", "risk"].includes(metric.id)) return null
                    } else if (!conf?.visible) {
                        return null
                    }

                    const isSelected = activeMetric === metric.id

                    return (
                        <OverviewMetricCard
                            key={metric.id}
                            metric={metric}
                            isActive={isSelected}
                            onClick={() => setActiveMetric(metric.id)}
                            data={data}
                            overrideValue={getMetricValue(metric.id)} // Pass real value
                        />
                    )
                })}

                <Card
                    className="cursor-pointer border-dashed flex flex-col items-center justify-center min-h-[140px] hover:bg-muted/50 transition-colors"
                    onClick={() => setShowAddMetric(true)}
                >
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <div className="h-8 w-8 rounded-full border border-current flex items-center justify-center">
                            <span className="text-lg font-medium">+</span>
                        </div>
                        <span className="text-sm font-medium">Add Metric</span>
                    </div>
                </Card>
            </div>

            <div className="grid gap-4 grid-cols-1">
                {(() => {
                    if (activeChartType === 'table') {
                        return (
                            <div className="bg-background rounded-xl border shadow">
                                <RawDataTable columns={rawDataColumns} />
                            </div>
                        )
                    }
                    return (
                        <>
                            <OverviewChart
                                data={chartData}
                                metric={activeMetric}
                                initialChartType={activeChartType as any}
                                onDrilldown={(mode, data) => {
                                    if (mode === 'insights') {
                                        setShowInsights(true)
                                    }
                                }}
                            />
                            <Dialog open={showInsights} onOpenChange={setShowInsights}>
                                <DialogContent className="max-w-4xl h-[80vh] overflow-y-auto">
                                    <InsightsPanel />
                                </DialogContent>
                            </Dialog>
                        </>
                    )
                })()}
            </div>

            <Dialog open={showAddMetric} onOpenChange={setShowAddMetric}>
                <DialogContent className="sm:max-w-7xl w-full h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <div className="p-6 pb-4 border-b">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-semibold">Add Metric</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground mt-1">Configure new metrics for your dashboard.</p>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <MetricConfigurationPanel
                            configs={metricConfigs}
                            onSave={onSaveConfigs}
                            data={data}
                        />
                    </div>
                    <div className="p-4 border-t bg-muted/10 flex justify-end">
                        <Button onClick={() => setShowAddMetric(false)}>Done</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
