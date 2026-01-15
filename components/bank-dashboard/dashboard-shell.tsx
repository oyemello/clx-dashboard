import { useState, useEffect } from "react"
import { Customer } from "@/lib/data"
import { ColumnDef } from "@tanstack/react-table"
import { DataExplorer } from "./data-explorer"
import { InsightsPanel } from "./insights-panel"
import { OverviewPanel } from "./overview-panel"
import { MetricConfigurationPanel, MetricConfig } from "./metric-configuration-panel"
import { RawDataTable } from "./raw-data-table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, Database, LayoutDashboard, Settings2 } from "lucide-react"
import { METRIC_REGISTRY } from "@/lib/metrics"
import { Button } from "@/components/ui/button"

interface DashboardShellProps {
    data: Customer[]
}

type ViewMode = "overview" | "raw" | "insights" | "config"

const rawColumns: ColumnDef<Customer>[] = [
    {
        accessorKey: "customerId",
        header: "Customer ID",
    },
    {
        accessorKey: "segment",
        header: "Segment",
    },
    {
        accessorKey: "riskTier",
        header: "Risk Tier",
    },
    {
        accessorKey: "lifecycleState",
        header: "Lifecycle",
    },
    {
        accessorKey: "revenue.netContribution",
        header: "Net Contribution",
        cell: ({ getValue }) => {
            const val = getValue() as number;
            return val ? val.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '-';
        }
    },
    {
        accessorKey: "risk.creditRiskScore",
        header: "Credit Score",
    },
]

export function DashboardShell({ data }: DashboardShellProps) {
    const [mode, setMode] = useState<ViewMode>("overview")
    const [metricConfigs, setMetricConfigs] = useState<MetricConfig[]>([])

    // Load/Save Configuration from Session Storage (Lifted from OverviewPanel)
    useEffect(() => {
        const saved = sessionStorage.getItem("dashboard_metrics_config")
        if (saved) {
            try {
                setMetricConfigs(JSON.parse(saved))
            } catch (e) { console.error("Failed to parse saved config", e) }
        } else {
            // Default Init
            const defaults = METRIC_REGISTRY.map(m => ({
                id: m.id,
                visible: ["revenue", "customers", "risk"].includes(m.id),
                visualizationType: m.componentType === "table" ? 'table' : 'line' as any
            }))
            setMetricConfigs(defaults)
        }
    }, [])

    // Handle Deep Linking / Sidebar Navigation
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        if (params.get("action") === "configure-metrics") {
            setMode("config")
        }
    }, [])

    const handleSaveConfigs = (newConfigs: MetricConfig[]) => {
        setMetricConfigs(newConfigs)
        sessionStorage.setItem("dashboard_metrics_config", JSON.stringify(newConfigs))
    }

    const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
    const [activeConnectorId, setActiveConnectorId] = useState<string | null>(null)

    // Load active connector from session to drive real data
    useEffect(() => {
        const saved = sessionStorage.getItem("dashboard_connectors")
        const savedActiveId = sessionStorage.getItem("active_dashboard_connector_id")

        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                if (parsed.length > 0) {
                    let active = parsed[0]
                    if (savedActiveId) {
                        const found = parsed.find((c: any) => c.metadata.id === savedActiveId)
                        if (found) active = found
                    }

                    setActiveProjectId(active.metadata.project)
                    setActiveConnectorId(active.metadata.id)
                }
            } catch (e) { console.error(e) }
        }
    }, [])

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)]">
            {/* Mode Switcher Header */}
            <div className="border-b px-6 py-3 flex items-center justify-between bg-card text-card-foreground">
                <div className="flex items-center gap-4">
                    <h1 className="text-lg font-semibold tracking-tight text-foreground/90">
                        Transaction Analysis
                    </h1>
                    <span className="text-sm text-muted-foreground border-l pl-4">
                        Cust Data set: {activeProjectId ? activeProjectId : 'Using Mock Data'}
                    </span>
                </div>

                <div className="flex items-center gap-4">
                    {/* Configuration Button */}
                    <div className="border-r pr-4 mr-0">
                        <Tabs value={mode === "config" ? "config" : mode} onValueChange={(v) => setMode(v as ViewMode)} className="w-auto">
                            <TabsList className="bg-muted/50 p-1 h-9">
                                <TabsTrigger value="overview" className="text-xs px-3 h-7">Overview</TabsTrigger>
                                <TabsTrigger value="raw" className="text-xs px-3 h-7">Raw Data</TabsTrigger>
                                <TabsTrigger value="insights" className="text-xs px-3 h-7">Metric Insights</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                    <Button
                        variant={mode === 'config' ? 'secondary' : 'outline'}
                        size="sm"
                        className="h-9 gap-2 text-xs"
                        onClick={() => setMode('config')}
                    >
                        <Settings2 className="h-3.5 w-3.5" />
                        Configuration
                    </Button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden bg-slate-50/50">
                {mode === "overview" && (
                    <OverviewPanel
                        data={data}
                        metricConfigs={metricConfigs}
                        onNavigateToConfig={() => setMode("config")}
                        onSaveConfigs={setMetricConfigs}
                        activeProjectId={activeProjectId}
                        activeConnectorId={activeConnectorId}
                    />
                )}
                {mode === "raw" && (
                    <div className="p-6 h-full overflow-hidden">
                        <div className="bg-background rounded-xl border shadow h-full">
                            <RawDataTable columns={rawColumns} data={data} />
                        </div>
                    </div>
                )}
                {mode === "insights" && <InsightsPanel />}
                {mode === "config" && (
                    <div className="p-6 h-full overflow-y-auto">
                        <MetricConfigurationPanel
                            configs={metricConfigs}
                            onSave={setMetricConfigs}
                            data={data}
                        />
                    </div>
                )}
            </div>
        </div>
    )
}
