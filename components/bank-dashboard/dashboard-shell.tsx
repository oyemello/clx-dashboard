import { useState, useEffect } from "react"
import { isWithinInterval, parseISO, startOfDay, endOfDay, compareAsc } from "date-fns"
import { Customer } from "@/lib/data"
import { PageHeader } from "@/components/ui/page-header"
import { DashboardMetricConfig, DEFAULT_VISUALIZATION_TYPE } from "@/lib/dashboard-types"
import { MetricConfigurationDialog } from "./metric-config-dialog"
import { KPICard } from "./kpi-card"
import { UniversalChart } from "./universal-chart"
import { ConnectorConfig, MetricDefinition } from "@/lib/connectors/types"
import { Loader2, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DateRange } from "react-day-picker"



interface DashboardShellProps {
    data: Customer[] // Legacy prop
}

export function DashboardShell({ }: DashboardShellProps) {
    const [activeConnector, setActiveConnector] = useState<ConnectorConfig | null>(null)
    const [config, setConfig] = useState<DashboardMetricConfig[]>([])
    const [metricData, setMetricData] = useState<Record<string, any[]>>({})
    const [compareMetricData, setCompareMetricData] = useState<Record<string, any[]>>({})
    const [loadingMetrics, setLoadingMetrics] = useState<Record<string, boolean>>({})
    const [timeRange, setTimeRange] = useState("1Y")
    const [date, setDate] = useState<DateRange | undefined>()
    const [compareDate, setCompareDate] = useState<DateRange | undefined>()

    const [tempCompareDate, setTempCompareDate] = useState<DateRange | undefined>()
    const [isCalendarOpen, setIsCalendarOpen] = useState(false)
    const [isCompareOpen, setIsCompareOpen] = useState(false)

    // Sync temp state when opening compare popover
    useEffect(() => {
        if (isCompareOpen) {
            setTempCompareDate(compareDate)
        }
    }, [isCompareOpen, compareDate])



    // 1. Load Connector & Config
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
                    } else {
                        setActiveConnector(null)
                    }
                } catch (e) { console.error(e) }
            }

            // Load Config
            const savedConfig = sessionStorage.getItem("dashboard_config")
            if (savedConfig) {
                try {
                    setConfig(JSON.parse(savedConfig))
                } catch (e) { console.error(e) }
            }
        }

        loadState()
        window.addEventListener("dashboard_connector_changed", loadState)
        window.addEventListener("dashboard_config_changed", loadState)
        window.addEventListener("focus", loadState)
        return () => {
            window.removeEventListener("dashboard_connector_changed", loadState)
            window.removeEventListener("dashboard_config_changed", loadState)
            window.removeEventListener("focus", loadState)
        }
    }, [])

    // 2. Sync Config with Connector Metrics
    useEffect(() => {
        if (!activeConnector?.metrics) return

        setConfig(prev => {
            const newConfig = [...prev]
            let changed = false

            activeConnector.metrics?.forEach(m => {
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

            if (changed && prev.length === 0) {
                sessionStorage.setItem("dashboard_config", JSON.stringify(newConfig))
                return newConfig
            }
            return prev
        })
    }, [activeConnector])

    // 3. Save Config Handler
    const handleConfigSave = (newConfig: DashboardMetricConfig[]) => {
        setConfig(newConfig)
        sessionStorage.setItem("dashboard_config", JSON.stringify(newConfig))
    }

    // 4. Fetch Data for Visible Metrics
    useEffect(() => {
        if (!activeConnector || !activeConnector.metrics) return

        const visibleMetrics = config.filter(c => c.isVisible)

        visibleMetrics.forEach(c => {
            const metricDef = activeConnector.metrics?.find(m => m.id === c.metricId)
            if (!metricDef) return

            setLoadingMetrics(prev => ({ ...prev, [c.metricId]: true }))

            // Fetch Primary Data
            const fetchPrimary = fetch('/api/metrics/trend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    metric: metricDef.id,
                    connector: activeConnector,
                    projectId: activeConnector.metadata.project,
                    range: '24M' // Ensure enough history
                })
            }).then(res => res.json())

            // Fetch Comparison Data if active
            const fetchCompare = compareDate?.from && compareDate?.to ? fetch('/api/metrics/trend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    metric: metricDef.id,
                    connector: activeConnector,
                    projectId: activeConnector.metadata.project,
                    range: 'ALL' // Get everything to be safe for custom range
                })
            }).then(res => res.json()) : Promise.resolve([])

            Promise.all([fetchPrimary, fetchCompare])
                .then(([primaryData, comparisonData]) => {
                    if (primaryData.error) console.error(primaryData.error)

                    // Store both in a special structure or just merge?
                    // Let's store primary as usual, but attach comparison data if needed
                    // Actually, UniversalChart likely expects a single array.
                    // We need to merge them if we are doing overlay.
                    // But wait, the UNIVERSAL CHART needs `compareData` prop.
                    // So we should store `compareData` separately in state?

                    // Let's modify setMetricData to store { primary: [], compare: [] }? 
                    // Or just keep metricData as Primary and add `comparisonMetricData` state.
                    // Let's add specific state for comparison data.

                    setMetricData(prev => ({ ...prev, [c.metricId]: primaryData }))
                    if (comparisonData && !comparisonData.error) {
                        setCompareMetricData(prev => ({ ...prev, [c.metricId]: comparisonData }))
                    } else {
                        setCompareMetricData(prev => ({ ...prev, [c.metricId]: [] }))
                    }
                })
                .catch(e => console.error(e))
                .finally(() => {
                    setLoadingMetrics(prev => ({ ...prev, [c.metricId]: false }))
                })
        })
    }, [activeConnector, config, compareDate]) // Add compareDate dependency

    const visibleConfigs = config.filter(c => c.isVisible && activeConnector?.metrics?.find(m => m.id === c.metricId))

    const [selectedMetricId, setSelectedMetricId] = useState<string | null>(null)

    // Sync selected metric when config/connector changes
    useEffect(() => {
        if (visibleConfigs.length > 0 && !selectedMetricId) {
            setSelectedMetricId(visibleConfigs[0].metricId)
        } else if (visibleConfigs.length > 0 && selectedMetricId) {
            const exists = visibleConfigs.find(c => c.metricId === selectedMetricId)
            if (!exists) {
                setSelectedMetricId(visibleConfigs[0].metricId)
            }
        }
    }, [visibleConfigs, selectedMetricId])

    if (!activeConnector) {
        return (
            <div className="flex flex-col h-full bg-slate-50/50">
                <PageHeader title="Executive Dashboard" description="Real-time performance metrics." />
                <div className="flex-1 flex items-center justify-center text-muted-foreground p-8 text-center">
                    <div>
                        <p className="mb-2">No active database connection.</p>
                        <p className="text-sm">Go to Connectors to set up a data source.</p>
                    </div>
                </div>
            </div>
        )
    }

    const selectedConfig = config.find(c => c.metricId === selectedMetricId)
    const selectedMetricDef = activeConnector.metrics?.find(m => m.id === selectedMetricId)



    const getFilteredData = (data: any[]) => {
        if (!data) return []
        const len = data.length

        if (timeRange === "custom" && date?.from && date?.to) {
            const start = startOfDay(date.from)
            const end = endOfDay(date.to)
            return data.filter(item => {
                if (!item.date) return false
                const itemDate = parseISO(item.date)
                return isWithinInterval(itemDate, { start, end })
            }).sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)))
        }

        // For fixed ranges, we assume data is already sorted by date from the API/store
        // But if we want to be safe, we could sort here too. 
        // Typically recent data is at the end.
        if (timeRange === "3M") return data.slice(Math.max(len - 3, 0))
        if (timeRange === "6M") return data.slice(Math.max(len - 6, 0))
        return data
    }

    const getFilteredComparisonData = (data: any[]) => {
        if (!data) return []
        if (!compareDate?.from || !compareDate?.to) return [] // If no compare date, no data

        // Filter by compareDate range
        const start = startOfDay(compareDate.from)
        const end = endOfDay(compareDate.to)
        return data.filter(item => {
            if (!item.date) return false
            const itemDate = parseISO(item.date)
            return isWithinInterval(itemDate, { start, end })
        }).sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)))
    }

    const filteredMetricData = selectedMetricId ? getFilteredData(metricData[selectedMetricId] || []) : []
    const filteredCompareData = selectedMetricId && compareDate
        ? getFilteredComparisonData(compareMetricData[selectedMetricId] || [])
        : []

    return (
        <div className="grid h-full w-full max-w-full bg-slate-50/50 overflow-hidden p-2 gap-2 grid-rows-[auto_1fr]">
            <div className="min-h-0 no-scrollbar overflow-x-auto overflow-y-hidden p-[1px]">
                {visibleConfigs.length > 0 ? (
                    <div className="grid grid-rows-2 grid-flow-col auto-cols-[minmax(260px,1fr)] gap-2 min-h-full auto-rows-[minmax(0,1fr)]">
                        {visibleConfigs.map(c => {
                            const metric = activeConnector.metrics?.find(m => m.id === c.metricId)!
                            return (
                                <div key={c.metricId} className="min-w-[260px] h-full">
                                    <KPICard
                                        metric={metric}
                                        title={c.customTitle}
                                        data={metricData[c.metricId] || []}
                                        loading={loadingMetrics[c.metricId]}
                                        selected={selectedMetricId === c.metricId}
                                        onClick={() => setSelectedMetricId(c.metricId)}
                                        className="h-full"
                                    />
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        No metrics selected. Configure metrics to view cards.
                    </div>
                )}
            </div>
            {selectedMetricId && selectedConfig && selectedMetricDef && (
                <div className="flex-1 min-h-0 flex flex-col space-y-4">
                    <div className="flex-1 min-h-0">
                        <UniversalChart
                            title={selectedConfig.customTitle || selectedMetricDef.label}
                            type={selectedConfig.visualizationType}
                            data={filteredMetricData}
                            compareData={filteredCompareData}
                            metricId={selectedMetricId}
                            loading={loadingMetrics[selectedMetricId]}
                            headerContent={
                                <div className="flex items-center">
                                    <Tabs value={timeRange} onValueChange={setTimeRange}>
                                        <TabsList>
                                            <TabsTrigger value="3M">3M</TabsTrigger>
                                            <TabsTrigger value="6M">6M</TabsTrigger>
                                            <TabsTrigger value="1Y">1Y</TabsTrigger>
                                            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                                                <PopoverTrigger asChild>
                                                    <TabsTrigger
                                                        value="custom"
                                                        className="data-[state=active]:bg-background"
                                                        onClick={() => setIsCalendarOpen(true)}
                                                    >
                                                        {date?.from ? (
                                                            date.to ? (
                                                                `${date.from.toLocaleDateString()} - ${date.to.toLocaleDateString()}`
                                                            ) : (
                                                                date.from.toLocaleDateString()
                                                            )
                                                        ) : "Custom"}
                                                    </TabsTrigger>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="end">
                                                    <Calendar
                                                        initialFocus
                                                        mode="range"
                                                        defaultMonth={date?.from}
                                                        selected={date}
                                                        onSelect={setDate}
                                                        numberOfMonths={2}
                                                    />
                                                    <div className="p-3 border-t border-border">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="w-full text-xs"
                                                            onClick={() => {
                                                                setDate(undefined)
                                                                setIsCalendarOpen(false)
                                                            }}
                                                        >
                                                            Reset Range
                                                        </Button>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </TabsList>
                                    </Tabs>
                                    <div className="flex items-center space-x-2 border-l pl-2 ml-2 h-6">
                                        <Popover open={isCompareOpen} onOpenChange={setIsCompareOpen}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={compareDate ? "default" : "outline"}
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                >
                                                    {compareDate ? "Compare Active" : "Compare"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="end" sideOffset={-30}>
                                                <div className="flex divide-x">
                                                    <div className="p-3 pb-0">
                                                        <div className="mb-2 text-sm font-medium text-center">Current Period</div>
                                                        <Calendar
                                                            mode="range"
                                                            defaultMonth={date?.from}
                                                            selected={date}
                                                            onSelect={(range) => {
                                                                setDate(range)
                                                                if (range?.from) setTimeRange("custom")
                                                            }}
                                                            numberOfMonths={1}
                                                        />
                                                    </div>
                                                    <div className="p-3 pb-0 bg-[#edf7ff]/50">
                                                        <div className="mb-2 text-sm font-medium text-center text-[#00559e]">Comparison Period</div>
                                                        <Calendar
                                                            mode="range"
                                                            defaultMonth={tempCompareDate?.from}
                                                            selected={tempCompareDate}
                                                            onSelect={setTempCompareDate}
                                                            numberOfMonths={1}
                                                            className="text-[#001d3e]"
                                                            classNames={{
                                                                day_selected: "bg-[#006fcf] text-white hover:bg-[#006fcf] focus:bg-[#006fcf]",
                                                                day_today: "bg-[#edf7ff] text-[#001d3e]",
                                                                day_range_middle: "bg-[#b5d7f4] text-[#001d3e] hover:bg-[#b5d7f4]"
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="p-2 border-t flex justify-between items-center bg-muted/20">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-xs h-7 hover:text-destructive"
                                                        onClick={() => {
                                                            setCompareDate(undefined)
                                                            setTempCompareDate(undefined)
                                                            setIsCompareOpen(false)
                                                        }}
                                                    >
                                                        Clear Comparison
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="text-xs h-7 bg-[#006fcf] hover:bg-[#00559e] text-white"
                                                        onClick={() => {
                                                            setCompareDate(tempCompareDate)
                                                            setIsCompareOpen(false)
                                                            setTimeRange("custom")
                                                        }}
                                                        disabled={!tempCompareDate?.from || !tempCompareDate?.to}
                                                    >
                                                        Compare
                                                    </Button>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            }
                        />
                    </div>
                </div>
            )
            }
        </div >
    )
}
