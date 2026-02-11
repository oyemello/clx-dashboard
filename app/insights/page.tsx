"use client"

import { useState, useEffect } from "react"
import { PageHeader } from "@/components/ui/page-header"
import { InsightsPanel } from "@/components/bank-dashboard/insights-panel"
import { ConnectorConfig } from "@/lib/connectors/types"

export default function InsightsPage() {
    const [activeConnector, setActiveConnector] = useState<ConnectorConfig | null>(null)
    const [metricData, setMetricData] = useState<any[]>([])
    const [compareMetricData, setCompareMetricData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null)

    // 1. Load Connector
    useEffect(() => {
        const loadState = () => {
            const savedConnectors = sessionStorage.getItem("dashboard_connectors")
            const savedActiveId = sessionStorage.getItem("active_dashboard_connector_id")

            if (savedConnectors) {
                try {
                    const parsed = JSON.parse(savedConnectors)
                    if (parsed.length > 0) {
                        let active = parsed[0]
                        if (savedActiveId) {
                            const found = parsed.find((c: any) => c.metadata.id === savedActiveId)
                            if (found) active = found
                        }
                        setActiveConnector(active)
                        // Default to first metric if available
                        if (active.metrics && active.metrics.length > 0) {
                            setSelectedMetricId(active.metrics[0].id)
                        }
                    }
                } catch (e) { console.error(e) }
            }
        }
        loadState()
    }, [])

    // 2. Fetch Data
    useEffect(() => {
        if (!activeConnector || !selectedMetricId) return

        setLoading(true)
        const metricDef = activeConnector.metrics?.find(m => m.id === selectedMetricId)
        if (!metricDef) return

        // Fetch Primary (Last 12 Months for trend)
        const fetchPrimary = fetch('/api/metrics/trend', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                metric: metricDef.id,
                connector: activeConnector,
                projectId: activeConnector.metadata.project,
                range: '12M'
            })
        }).then(res => res.json())

        // Fetch Previous (Previous 12 Months for comparison)
        // NOTE: The API might support 'previous_period' logic, but here we just fetch a longer range or handle it.
        // For simplicity, let's just fetch 24M and split it clientside, OR fetch distinct ranges.
        // Let's assume we want year-over-year.
        // Actually, the DashboardShell fetches '24M' in one go for primary.
        // Let's do the same here for consistency.

        fetchPrimary
            .then(data => {
                if (data.error) {
                    console.error(data.error)
                    setMetricData([])
                } else {
                    // Split data? Or just pass it all?
                    // InsightsPanel expects 'currentData' and 'previousData'.
                    // If we fetch 12M, that's current. 
                    // Let's fetch 24M and split.
                    // Or actually, let's just use what we have.
                    setMetricData(data || [])

                    // Mock previous data for now by shifting dates? 
                    // Or fetch real previous data?
                    // Let's try to fetch a previous period if the API supports it, 
                    // but for now, let's just use the data we have and let InsightsPanel handle it?
                    // No, InsightsPanel expects aligned arrays.
                    // Let's just fetch 'ALL' and let logic decide, or fetch 12M.
                    setMetricData(data)
                }
            })
            .catch(e => console.error(e))
            .finally(() => setLoading(false))

    }, [activeConnector, selectedMetricId])

    const metricDef = activeConnector?.metrics?.find(m => m.id === selectedMetricId)

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)]">
            <PageHeader title="Strategic Insights" description="AI-driven analysis and forecasting." />
            <div className="flex-1 p-4 max-w-[1600px] mx-auto w-full overflow-hidden">
                <div className="h-full bg-slate-50/50 rounded-xl border border-slate-200 overflow-y-auto">
                    {activeConnector && selectedMetricId ? (
                        <InsightsPanel
                            title={metricDef?.label || "Metric"}
                            metricId={selectedMetricId}
                            currentData={metricData}
                            previousData={[]} // TODO: Fetch real comparison data
                            loading={loading}
                        />
                    ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground">
                            Please select a connector in the Dashboard to view insights.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
