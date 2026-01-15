"use client"

import * as React from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Line, LineChart, Area, AreaChart, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { BarChart3, LineChart as LineChartIcon, AreaChart as AreaChartIcon, Database, FileJson } from "lucide-react"
import { METRIC_REGISTRY, MetricDefinition } from "@/lib/metrics"
import useSWR from "swr"
import { fetcher } from "@/lib/api/fetcher"

interface OverviewChartProps {
    data?: { month: string; value: number }[]
    metric: string
    initialChartType?: "bar" | "line" | "area"
    onDrilldown?: (mode: 'raw' | 'insights', data: any) => void
    color?: string
    hideControls?: boolean
}

// Helper component to avoid re-creation on render
const getDateFromMonthOffset = (label: string) => {
    // Check if label matches M-X format
    if (typeof label === 'string' && label.startsWith('M')) {
        const offset = parseInt(label.replace("M", ""), 10)
        // Check if parsing worked
        if (!isNaN(offset)) {
            const date = new Date()
            date.setMonth(date.getMonth() + offset)
            return date
        }
    }
    // Fallback: Try standard date parsing
    const date = new Date(label)
    return isNaN(date.getTime()) ? new Date() : date
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, label, config }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="rounded-lg border bg-background p-2 shadow-sm">
                <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                        <span className="text-[0.70rem] uppercase text-muted-foreground">
                            {config?.label || "Value"}
                        </span>
                        {/* Render all payload items for multi-line tooltip */}
                        {payload.map((item: any) => (
                            <div key={item.dataKey || 'val'} className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.stroke || item.fill }} />
                                <span className="font-bold text-muted-foreground text-xs">
                                    {item.name !== 'value' && item.name !== 'net_cashflow' ? `${item.name}: ` : ''}
                                    {config?.formatter ? config.formatter(item.value) : item.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                    {getDateFromMonthOffset(label).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </div>
            </div>
        )
    }
    return null
}

export function OverviewChart({ data, metric, initialChartType = "line", onDrilldown, color, hideControls }: OverviewChartProps) {
    const [range, setRange] = React.useState<"1M" | "3M" | "6M" | "ALL">("ALL")
    const [chartType, setChartType] = React.useState<"bar" | "line" | "area">(initialChartType)
    const [menuParams, setMenuParams] = React.useState<{ x: number, y: number, data: any } | null>(null)

    // Sync state if prop changes
    React.useEffect(() => {
        setChartType(initialChartType)
    }, [initialChartType])

    // Close menu on click outside
    React.useEffect(() => {
        const closeMenu = () => setMenuParams(null)
        if (menuParams) {
            window.addEventListener('click', closeMenu)
            // Prevent immediate closing from the triggering click
            // Actually, usually handled by stopping propagation on the trigger.
        }
        return () => window.removeEventListener('click', closeMenu)
    }, [menuParams])

    const handleChartClick = (state: any) => {
        if (state && state.activePayload && state.activePayload.length) {
            // Recharts event doesn't give clientX/Y easily in the state object for the container?
            // Actually it passes the event as second arg?
            // Wrapper onClick?
            // Let's rely on the Dot/Bar click passing event.
        }
    }

    // Easier: onClick on the Chart components
    const handleElementClick = (...args: any[]) => {
        // Recharts signature varies between components (Bar vs Dot)
        // Usually (data, index, event) for Bar, but (props, event) for Dot?
        // Let's find the event and payload
        const e = args.find(a => a && a.stopPropagation && a.clientX)
        const payload = args.find(a => a && a.payload)?.payload || args.find(a => a && a.value !== undefined)

        if (e) {
            e.stopPropagation()
            setMenuParams({
                x: e.clientX,
                y: e.clientY,
                data: payload || {}
            })
        }
    }

    const formatAxisDate = (label: string) => {
        return getDateFromMonthOffset(label).toLocaleDateString("en-US", { month: "short" })
    }

    const getMetricConfig = () => {
        // Find in registry
        const def = METRIC_REGISTRY.find((m: MetricDefinition) => m.id === metric)
        if (def) {
            const tooltipFmt = (val: number) => {
                if (typeof val !== 'number') return val;
                if (def.type === "currency") return `$${val.toLocaleString()}`
                if (def.type === "percent") return `${val.toFixed(1)}%`
                return val.toLocaleString()
            }
            const axisFmt = (val: number) => {
                if (typeof val !== 'number') return val;
                if (def.type === "currency") return `$${(val / 1000000).toFixed(1)}M`
                if (def.type === "percent") return `${val.toFixed(0)}%`
                return val.toLocaleString()
            }
            return { label: def.label, formatter: axisFmt, tooltip: tooltipFmt }
        }

        // Fallback for defaults if registry miss
        switch (metric) {
            case "revenue":
                return { label: "Net Flow", formatter: (val: number) => `$${(val / 1000000).toFixed(1)}M`, tooltip: (val: number) => `$${val.toLocaleString()}` }
            case "customers":
                return { label: "Active Customers", formatter: (val: number) => val.toLocaleString(), tooltip: (val: number) => val.toLocaleString() }
            case "risk":
                return { label: "Avg Risk Score", formatter: (val: number) => val.toFixed(0), tooltip: (val: number) => val.toFixed(0) }
            default:
                return { label: "Value", formatter: (val: any) => val?.toString(), tooltip: (val: any) => val?.toString() }
        }
    }

    const config = getMetricConfig() || { label: "Value", formatter: (val: number) => val.toString(), tooltip: (val: number) => val.toString() }

    // Fetch data if metric has endpoint
    const metricDef = METRIC_REGISTRY.find(m => m.id === metric)
    const endpoint = metricDef?.endpoint ? metricDef.endpoint({ range, includeBands: true, anomaliesOnly: false }) : null // Default to bands=true for chart

    const { data: apiData, isLoading } = useSWR(endpoint, fetcher)

    const filteredData = React.useMemo(() => {
        // 1. Use API data if available
        if (apiData && Array.isArray(apiData)) {
            // Check if we need to filter by range locally, or if API already handled it.
            // Our API handles it, but Recharts might expect specific sort.
            // Assuming API returns sorted 'month' asc.
            return apiData.map(row => ({
                month: row.month,
                value: row.net_cashflow, // Default map for main line
                // Pass through other props for composed chart
                ...row
            }))
        }

        // 2. Fallback to Props Data (Legacy Mock)
        if (data) {
            let months = 24
            if (range === "1M") months = 1
            if (range === "3M") months = 3
            if (range === "6M") months = 6
            if (range === "ALL") months = 24
            return data.slice(-months)
        }

        return []
    }, [data, apiData, range])

    const isChartLoading = isLoading && !!endpoint

    const isUsingApi = !!(apiData && Array.isArray(apiData) && apiData.length > 0)

    React.useEffect(() => {
        // Reset to ALL range if switching metrics? No, keep range persistence if possible.
        // But some metrics might not support all ranges.
    }, [metric])

    // Determine data keys (exclude 'month' and special keys)
    const dataKeys = React.useMemo(() => {
        if (!data || data.length === 0) return ['value']
        const keys = Object.keys(data[0]).filter(k => k !== 'month' && k !== 'month_key' && k !== 'value')
        return keys.length > 0 ? keys : ['value']
    }, [data])

    const getLineColor = (index: number) => {
        if (dataKeys.length === 1 && typeof color === 'string') {
            // Map color name to hex (simplified) or use CSS variable? 
            // Ideally we use tailwind classes but Recharts needs hex.
            // We can use a map or just basic hexes for the "theme" colors we offered.
            const colorMap: Record<string, string> = {
                'indigo': '#6366f1',
                'blue': '#3b82f6',
                'emerald': '#10b981',
                'amber': '#f59e0b',
                'rose': '#f43f5e',
                'violet': '#8b5cf6',
            }
            return colorMap[color] || '#2563eb'
        }
        const colors = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#9333ea"]
        return colors[index % colors.length]
    }

    // Derived area color
    const primaryColor = getLineColor(0)

    return (
        <Card className="col-span-4 h-full relative border-0 shadow-none">
            {!hideControls && (
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex flex-col gap-1">
                        <CardTitle className="text-base font-normal flex items-center gap-2">
                            {metric === "revenue" ? "Cashflow Trend" : metric === "customers" ? "Customer Growth" : metric === "cashflowAnomalies" ? "Cashflow Anomalies" : "Metric Trend"}
                            {isChartLoading && <span className="text-xs text-muted-foreground animate-pulse">(Loading...)</span>}
                        </CardTitle>
                        {endpoint && (
                            <div className="flex items-center gap-1">
                                <Badge variant={isUsingApi ? "default" : "outline"} className={`text-[10px] h-5 px-1.5 font-normal ${isUsingApi ? "bg-emerald-600 hover:bg-emerald-600" : "text-muted-foreground"}`}>
                                    {isUsingApi ? <Database className="w-3 h-3 mr-1" /> : <FileJson className="w-3 h-3 mr-1" />}
                                    {isUsingApi ? "Live: BigQuery" : "Source: Local"}
                                </Badge>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-4">
                        <Tabs value={chartType} onValueChange={(v: string) => setChartType(v as "bar" | "line" | "area")}>
                            <TabsList>
                                <TabsTrigger value="bar" className="px-2">
                                    <BarChart3 className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                    Bar
                                </TabsTrigger>
                                <TabsTrigger value="line" className="px-2">
                                    <LineChartIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                    Line
                                </TabsTrigger>
                                <TabsTrigger value="area" className="px-2">
                                    <AreaChartIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
                                    Area
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <div className="w-px h-4 bg-border" />
                        <Tabs value={range} onValueChange={(v: string) => setRange(v as "1M" | "3M" | "6M" | "ALL")}>
                            <TabsList>
                                <TabsTrigger value="1M">1M</TabsTrigger>
                                <TabsTrigger value="3M">3M</TabsTrigger>
                                <TabsTrigger value="6M">6M</TabsTrigger>
                                <TabsTrigger value="ALL">All</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardHeader>
            )}
            <CardContent>
                <div className="h-[350px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                        {chartType === "bar" && (
                            <BarChart data={filteredData} margin={{ top: 32, left: 12, right: 12 }}>
                                <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatAxisDate} interval={range === "ALL" ? 2 : 0} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={config.formatter} />
                                <Tooltip content={<CustomTooltip config={config} />} cursor={{ fill: 'transparent' }} />
                                <Bar
                                    dataKey="value"
                                    fill={primaryColor}
                                    radius={[4, 4, 0, 0]}
                                    className="cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={handleElementClick}
                                />
                            </BarChart>
                        )}
                        {chartType === "line" && (
                            <LineChart data={filteredData} margin={{ top: 32, left: 12, right: 12 }}>
                                <XAxis
                                    dataKey="month"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={formatAxisDate}
                                    interval={range === "ALL" ? 2 : 0}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={config.formatter}
                                />
                                <Tooltip content={<CustomTooltip config={config} />} />
                                <Legend />
                                {dataKeys.map((key, index) => (
                                    <Line
                                        key={key}
                                        type="monotone"
                                        dataKey={key}
                                        stroke={getLineColor(index)}
                                        strokeWidth={2}
                                        dot={false}
                                        activeDot={{ r: 4, onClick: handleElementClick }}
                                    />
                                ))}
                            </LineChart>
                        )}
                        {chartType === "area" && (
                            <AreaChart data={filteredData} margin={{ top: 32, left: 12, right: 12 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatAxisDate} interval={range === "ALL" ? 2 : 0} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={config.formatter} />
                                <Tooltip content={<CustomTooltip config={config} />} />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={primaryColor}
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                    activeDot={{ r: 6, onClick: handleElementClick }}
                                />
                            </AreaChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </CardContent>

            {/* Drilldown Menu */}
            {menuParams && (
                <div
                    className="fixed z-50 min-w-[160px] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md animate-in fade-in zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
                    style={{ left: menuParams.x, top: menuParams.y }}
                >
                    <div className="p-1">
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b mb-1">
                            {menuParams.data.month || "Data Point"}
                        </div>
                        <div
                            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            onClick={() => {
                                onDrilldown?.('raw', menuParams.data)
                                setMenuParams(null)
                            }}
                        >
                            View Raw Data
                        </div>
                        <div
                            className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
                            onClick={() => {
                                onDrilldown?.('insights', menuParams.data)
                                setMenuParams(null)
                            }}
                        >
                            View Insights
                        </div>
                    </div>
                </div>
            )}
        </Card >
    )
}
