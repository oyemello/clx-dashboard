"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { PageHeader } from "@/components/ui/page-header"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DashboardMetricConfig, DEFAULT_VISUALIZATION_TYPE, VisualizationType } from "@/lib/dashboard-types"
import { ConnectorConfig } from "@/lib/connectors/types"
import { ArrowLeft, Save } from "lucide-react"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"


// Helper to group metrics by table
const groupMetricsByTable = (metrics: any[]) => {
    const groups: { [table: string]: any[] } = {}
    metrics.forEach(m => {
        const table = m.table || 'Other'
        if (!groups[table]) groups[table] = []
        groups[table].push(m)
    })
    return groups
}

export default function MetricsConfigPage() {
    const router = useRouter()
    const [connector, setConnector] = useState<ConnectorConfig | null>(null)
    const [config, setConfig] = useState<DashboardMetricConfig[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [filter, setFilter] = useState("")

    // Load State
    useEffect(() => {
        const loadState = () => {
            const savedConnectors = sessionStorage.getItem("dashboard_connectors")
            const savedActiveId = sessionStorage.getItem("active_dashboard_connector_id")

            let active: ConnectorConfig | null = null
            if (savedConnectors) {
                try {
                    const parsed: ConnectorConfig[] = JSON.parse(savedConnectors)
                    if (parsed.length > 0) {
                        active = parsed[0]
                        if (savedActiveId) {
                            const found = parsed.find((c) => c.metadata.id === savedActiveId)
                            if (found) active = found
                        }
                    }
                } catch (e) { console.error(e) }
            }
            setConnector(active)

            // Config
            const savedConfig = sessionStorage.getItem("dashboard_config")
            if (savedConfig) {
                try {
                    setConfig(JSON.parse(savedConfig))
                } catch (e) { console.error(e) }
            }
        }
        loadState()
    }, [])

    // Sync config defaults
    useEffect(() => {
        if (!connector?.metrics) return

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setConfig(prev => {
            const newConfig = [...prev]
            let changed = false
            connector.metrics?.forEach(m => {
                const exists = newConfig.find(c => c.metricId === m.id)
                if (!exists) {
                    newConfig.push({
                        metricId: m.id,
                        isVisible: true,
                        customTitle: m.label,
                        visualizationType: DEFAULT_VISUALIZATION_TYPE
                    })
                    changed = true
                }
            })
            if (changed && prev.length === 0) return newConfig
            return prev
        })
    }, [connector])

    const handleSave = () => {
        setIsSaving(true)
        sessionStorage.setItem("dashboard_config", JSON.stringify(config))
        window.dispatchEvent(new Event("dashboard_config_changed"))
        setTimeout(() => {
            router.push("/")
        }, 500)
    }

    const filteredMetrics = connector?.metrics?.filter(metric => {
        if (!filter.trim()) return true
        const q = filter.toLowerCase()
        return metric.label.toLowerCase().includes(q) || metric.id.toLowerCase().includes(q) || (metric.description || '').toLowerCase().includes(q)
    }) || []

    const groupedMetrics = groupMetricsByTable(filteredMetrics)

    const handleSelectAll = () => {
        const ids = filteredMetrics.map(m => m.id)
        setConfig(prev => prev.map(c => ids.includes(c.metricId) ? { ...c, isVisible: true } : c))
    }

    const handleDeselectAll = () => {
        const ids = filteredMetrics.map(m => m.id)
        setConfig(prev => prev.map(c => ids.includes(c.metricId) ? { ...c, isVisible: false } : c))
    }

    const toggleVisibility = (id: string) => {
        setConfig(prev => prev.map(c =>
            c.metricId === id ? { ...c, isVisible: !c.isVisible } : c
        ))
    }

    const updateTitle = (id: string, title: string) => {
        setConfig(prev => prev.map(c =>
            c.metricId === id ? { ...c, customTitle: title } : c
        ))
    }

    const updateType = (id: string, type: VisualizationType) => {
        setConfig(prev => prev.map(c =>
            c.metricId === id ? { ...c, visualizationType: type } : c
        ))
    }

    if (!connector) {
        return (
            <div className="p-8 text-center text-muted-foreground">
                No active connector found. Please configure a connector first.
                <Button variant="link" onClick={() => router.push("/connectors")}>Go to Connectors</Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <PageHeader
                title="Metrics Config"
                description={`Configure dashboard metrics for ${connector.metadata.name}`}
            >
                <div className="flex items-center gap-2">
                    <Input
                        placeholder="Filter metrics..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="h-9 w-56"
                    />
                    <Button variant="outline" onClick={handleSelectAll} disabled={filteredMetrics.length === 0}>
                        Select All
                    </Button>
                    <Button variant="outline" onClick={handleDeselectAll} disabled={filteredMetrics.length === 0}>
                        Deselect All
                    </Button>

                    <Button onClick={handleSave} disabled={isSaving}>
                        <Save className="mr-2 h-4 w-4" />
                        {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </PageHeader>

            <div className="flex-1 overflow-y-auto p-6 max-w-5xl mx-auto w-full">
                <div className="space-y-4">
                    <Accordion type="multiple" className="w-full space-y-4">
                        {Object.entries(groupedMetrics).map(([table, metrics]) => {
                            const tableMetricIds = metrics.map(m => m.id)
                            const handleSelectAllTable = () => {
                                setConfig(prev => prev.map(c => tableMetricIds.includes(c.metricId) ? { ...c, isVisible: true } : c))
                            }
                            const handleDeselectAllTable = () => {
                                setConfig(prev => prev.map(c => tableMetricIds.includes(c.metricId) ? { ...c, isVisible: false } : c))
                            }

                            return (
                                <div key={table} className="group/accordion-item relative">
                                    <AccordionItem value={table} className="border rounded-xl bg-white overflow-hidden px-4 md:px-0">
                                        <div className="relative">
                                            <AccordionTrigger className="px-6 hover:no-underline">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <span className="font-semibold text-lg text-slate-900 capitalize">{table}</span>
                                                    <span className="text-xs text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-full">
                                                        {metrics.length} metrics
                                                    </span>
                                                </div>
                                            </AccordionTrigger>
                                            <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover/accordion-item:opacity-100 transition-opacity pointer-events-none group-hover/accordion-item:pointer-events-auto z-10">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleSelectAllTable()
                                                    }}
                                                    className="h-7 text-xs"
                                                >
                                                    Select All
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleDeselectAllTable()
                                                    }}
                                                    className="h-7 text-xs"
                                                >
                                                    Deselect All
                                                </Button>
                                            </div>
                                        </div>
                                        <AccordionContent className="px-6 pb-6 pt-2">
                                            <div className="space-y-4">
                                                {metrics.map(metric => {
                                                    const metricConfig = config.find(c => c.metricId === metric.id)
                                                    if (!metricConfig) return null

                                                    return (
                                                        <div key={metric.id} className="flex items-start gap-4 p-4 border rounded-lg bg-slate-50/50">
                                                            <Checkbox
                                                                checked={metricConfig.isVisible}
                                                                onCheckedChange={() => toggleVisibility(metric.id)}
                                                                className="mt-1.5 h-5 w-5"
                                                            />

                                                            <div className="flex-1 grid gap-8 grid-cols-1 md:grid-cols-12">
                                                                <div className="md:col-span-4 space-y-1">
                                                                    <Label className="text-sm font-semibold text-slate-900">
                                                                        {metric.label}
                                                                    </Label>
                                                                    <p className="text-sm text-muted-foreground">{metric.description}</p>
                                                                    <div className="flex items-center gap-2 mt-2">
                                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono">
                                                                            {metric.id}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="md:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                    <div className="space-y-2">
                                                                        <Label htmlFor={`title-${metric.id}`} className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                                            Display Title
                                                                        </Label>
                                                                        <Input
                                                                            id={`title-${metric.id}`}
                                                                            value={metricConfig.customTitle || ''}
                                                                            onChange={(e) => updateTitle(metric.id, e.target.value)}
                                                                            disabled={!metricConfig.isVisible}
                                                                            className="bg-white"
                                                                        />
                                                                    </div>

                                                                    <div className="space-y-2">
                                                                        <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                                                                            Chart Type
                                                                        </Label>
                                                                        <Select
                                                                            value={metricConfig.visualizationType}
                                                                            onValueChange={(val) => updateType(metric.id, val as VisualizationType)}
                                                                            disabled={!metricConfig.isVisible}
                                                                        >
                                                                            <SelectTrigger className="bg-white">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="line">Line Chart</SelectItem>
                                                                                <SelectItem value="bar">Bar Chart</SelectItem>
                                                                                <SelectItem value="area">Area Chart</SelectItem>
                                                                                <SelectItem value="pie">Pie Chart</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                </div>
                            )
                        })}
                    </Accordion>

                    {(!connector.metrics || connector.metrics.length === 0) && (
                        <div className="text-center py-12 text-muted-foreground">
                            No metrics available in this connector.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
