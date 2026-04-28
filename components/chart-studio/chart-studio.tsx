"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import {
    AreaChart, Area,
    BarChart, Bar, Cell,
    LineChart, Line,
    RadialBarChart, RadialBar, PolarAngleAxis,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer,
} from "recharts"

// ─── Types ────────────────────────────────────────────────────────────────────

interface MetricInfo {
    id: string
    label: string
    type: string
    description?: string
}

interface ChartConfig {
    type: "area" | "bar" | "line" | "radial" | "table"
    primaryMetric: string
    secondaryMetric?: string | null
    /** yoy/qoq/mom = relative period; months = specific calendar months */
    comparison: "yoy" | "qoq" | "mom" | "months" | null
    /** YYYY-MM strings, e.g. ["2025-11","2025-12"] — only for comparison: "months" */
    months?: string[]
    dateRange: "3M" | "6M" | "12M" | "24M" | "ALL"
    title: string
}

interface ChartData {
    primary: { date: string; value: number }[]
    secondary: { date: string; value: number }[]
    loading: boolean
    error?: string
}

interface Message {
    role: "user" | "assistant"
    content: string
    action?: string
    suggestions?: string[]
    chartConfig?: ChartConfig
    chartData?: ChartData
    primaryMeta?: MetricInfo
    secondaryMeta?: MetricInfo
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PALETTE = ["#006fcf", "#00a652", "#f5a623", "#e63946", "#7209b7", "#3a86ff"]
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

const STARTERS = [
    "Revenue year on year",
    "Statement balance trend",
    "Quarter by quarter spend",
    "Compare Nov vs Dec 2025",
    "Digital adoption rate",
    "Fraud rate last 12 months",
]

// ─── Data helpers ─────────────────────────────────────────────────────────────

function processYoY(raw: { date: string; value: number }[]) {
    const years = [...new Set(raw.map(d => new Date(d.date).getFullYear()))].sort()
    const byYM: Record<string, Record<number, number>> = {}
    raw.forEach(({ date, value }) => {
        const dt = new Date(date)
        const m = MON[dt.getMonth()]
        const y = dt.getFullYear()
        if (!byYM[m]) byYM[m] = {}
        byYM[m][y] = value
    })
    const data = MON
        .map(m => {
            const row: Record<string, any> = { month: m }
            years.forEach(y => { if (byYM[m]?.[y] !== undefined) row[String(y)] = byYM[m][y] })
            return row
        })
        .filter(row => years.some(y => row[String(y)] !== undefined))
    return { data, years }
}

function processQoQ(raw: { date: string; value: number }[]) {
    const map = new Map<string, number>()
    raw.forEach(({ date, value }) => {
        const dt = new Date(date)
        const q = Math.floor(dt.getMonth() / 3) + 1
        const key = `Q${q} ${dt.getFullYear()}`
        map.set(key, (map.get(key) ?? 0) + value)
    })
    return Array.from(map.entries())
        .map(([quarter, value]) => ({ quarter, value }))
        .sort((a, b) => {
            const [, ya] = a.quarter.split(" ")
            const [, yb] = b.quarter.split(" ")
            const qa = parseInt(a.quarter[1])
            const qb = parseInt(b.quarter[1])
            return ya !== yb ? parseInt(ya) - parseInt(yb) : qa - qb
        })
}

function processMoM(raw: { date: string; value: number }[]) {
    return raw.slice(-13).map(d => ({
        ...d,
        month: new Date(d.date).toLocaleString("default", { month: "short", year: "2-digit" }),
    }))
}

function filterMonths(raw: { date: string; value: number }[], months: string[]) {
    return raw.filter(d => months.some(m => d.date.startsWith(m)))
}

function fmtVal(v: number, type = "number") {
    if (type === "currency")
        return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 2 }).format(v)
    if (type === "percent")
        return `${(v > 1 ? v : v * 100).toFixed(1)}%`
    return new Intl.NumberFormat("en-US", { notation: "compact" }).format(v)
}

function fmtMonth(dateStr: string) {
    // Force noon UTC to avoid off-by-one from timezone shifts
    return new Date(dateStr.slice(0, 10) + "T12:00:00Z").toLocaleString("default", { month: "long", year: "numeric" })
}

const tickFmt = (v: number) => new Intl.NumberFormat("en-US", { notation: "compact" }).format(v)

// ─── Chart renderer ───────────────────────────────────────────────────────────

function InlineChart({
    config, primary, secondary, primaryMeta, secondaryMeta,
}: {
    config: ChartConfig
    primary: { date: string; value: number }[]
    secondary: { date: string; value: number }[]
    primaryMeta?: MetricInfo
    secondaryMeta?: MetricInfo
}) {
    const tooltip = { backgroundColor: "white", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }
    const axis = { stroke: "#888", fontSize: 11, tickLine: false as const, axisLine: false as const }

    if (!primary.length) {
        return (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-sm text-muted-foreground">
                <p>No data returned for this metric.</p>
                <p className="text-xs">Metric ID: <code className="bg-muted px-1 rounded">{config.primaryMetric}</code></p>
            </div>
        )
    }

    // ── TABLE: only when explicitly requested ─────────────────────────────────
    if (config.type === "table") {
        const months = config.months ?? []
        const rows = months.length ? filterMonths(primary, months) : primary
        const secRows = months.length && secondary.length ? filterMonths(secondary, months) : secondary

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="text-left py-2 px-3 text-xs text-muted-foreground font-medium">Period</th>
                            <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">
                                {primaryMeta?.label ?? config.primaryMetric}
                            </th>
                            {secRows.length > 0 && (
                                <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">
                                    {secondaryMeta?.label ?? config.secondaryMetric}
                                </th>
                            )}
                            <th className="text-right py-2 px-3 text-xs text-muted-foreground font-medium">Change</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, i) => {
                            const prev = rows[i - 1]
                            const change = prev && prev.value !== 0
                                ? ((row.value - prev.value) / Math.abs(prev.value)) * 100
                                : null
                            return (
                                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                                    <td className="py-2.5 px-3 font-medium">{fmtMonth(row.date)}</td>
                                    <td className="py-2.5 px-3 text-right tabular-nums">
                                        {fmtVal(row.value, primaryMeta?.type)}
                                    </td>
                                    {secRows.length > 0 && (
                                        <td className="py-2.5 px-3 text-right tabular-nums">
                                            {secRows[i] ? fmtVal(secRows[i].value, secondaryMeta?.type) : "—"}
                                        </td>
                                    )}
                                    <td className={cn(
                                        "py-2.5 px-3 text-right tabular-nums text-xs font-medium",
                                        change === null ? "text-muted-foreground"
                                            : change >= 0 ? "text-green-600" : "text-red-500"
                                    )}>
                                        {change === null ? "—" : `${change >= 0 ? "+" : ""}${change.toFixed(1)}%`}
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        )
    }

    // ── RADIAL: single percent metric ─────────────────────────────────────────
    if (config.type === "radial") {
        const latest = primary[primary.length - 1]?.value ?? 0
        const pct = Math.min(latest > 1 ? latest : latest * 100, 100)
        return (
            <div className="flex items-center gap-8 py-2">
                <ResponsiveContainer width={180} height={180}>
                    <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="82%" barSize={16}
                        data={[{ value: pct, fill: PALETTE[0] }]} startAngle={90} endAngle={-270}>
                        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                        <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "#f1f5f9" }} />
                    </RadialBarChart>
                </ResponsiveContainer>
                <div>
                    <p className="text-4xl font-bold tracking-tight">{pct.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground mt-1">{primaryMeta?.label}</p>
                    <p className="text-xs text-muted-foreground">Latest snapshot</p>
                </div>
            </div>
        )
    }

    // ── YoY ───────────────────────────────────────────────────────────────────
    if (config.comparison === "yoy") {
        const { data, years } = processYoY(primary)
        return (
            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data} barGap={3} barCategoryGap="28%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                    <XAxis dataKey="month" {...axis} />
                    <YAxis {...axis} width={54} tickFormatter={tickFmt} />
                    <Tooltip contentStyle={tooltip} />
                    <Legend />
                    {years.map((y, i) => (
                        <Bar key={y} dataKey={String(y)} fill={PALETTE[i % PALETTE.length]} radius={[3, 3, 0, 0]} name={String(y)} />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        )
    }

    // ── QoQ ───────────────────────────────────────────────────────────────────
    if (config.comparison === "qoq") {
        const data = processQoQ(primary)
        return (
            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                    <XAxis dataKey="quarter" {...axis} />
                    <YAxis {...axis} width={54} tickFormatter={tickFmt} />
                    <Tooltip contentStyle={tooltip} />
                    <Bar dataKey="value" fill={PALETTE[0]} radius={[3, 3, 0, 0]} name={primaryMeta?.label} />
                </BarChart>
            </ResponsiveContainer>
        )
    }

    // ── AREA ──────────────────────────────────────────────────────────────────
    if (config.type === "area") {
        const data = config.comparison === "mom" ? processMoM(primary) : primary
        const xKey = config.comparison === "mom" ? "month" : "date"
        const hasSec = secondary.length > 0 && secondaryMeta
        const combined = hasSec ? data.map((d, i) => ({ ...d, sec: secondary[i]?.value })) : data
        return (
            <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={combined}>
                    <defs>
                        <linearGradient id="g0" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={PALETTE[0]} stopOpacity={0.18} />
                            <stop offset="95%" stopColor={PALETTE[0]} stopOpacity={0} />
                        </linearGradient>
                        {hasSec && (
                            <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={PALETTE[1]} stopOpacity={0.18} />
                                <stop offset="95%" stopColor={PALETTE[1]} stopOpacity={0} />
                            </linearGradient>
                        )}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                    <XAxis dataKey={xKey} {...axis} minTickGap={40} />
                    <YAxis {...axis} width={54} tickFormatter={tickFmt} />
                    <Tooltip contentStyle={tooltip} />
                    {hasSec && <Legend />}
                    <Area type="monotone" dataKey="value" stroke={PALETTE[0]} fill="url(#g0)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name={primaryMeta?.label} />
                    {hasSec && <Area type="monotone" dataKey="sec" stroke={PALETTE[1]} fill="url(#g1)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} name={secondaryMeta!.label} />}
                </AreaChart>
            </ResponsiveContainer>
        )
    }

    // ── LINE ──────────────────────────────────────────────────────────────────
    if (config.type === "line") {
        const data = config.comparison === "mom" ? processMoM(primary) : primary
        const xKey = config.comparison === "mom" ? "month" : "date"
        const hasSec = secondary.length > 0 && secondaryMeta
        const combined = hasSec ? data.map((d, i) => ({ ...d, sec: secondary[i]?.value })) : data
        return (
            <ResponsiveContainer width="100%" height={260}>
                <LineChart data={combined}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                    <XAxis dataKey={xKey} {...axis} minTickGap={40} />
                    <YAxis {...axis} width={54} tickFormatter={tickFmt} />
                    <Tooltip contentStyle={tooltip} />
                    {hasSec && <Legend />}
                    <Line type="monotone" dataKey="value" stroke={PALETTE[0]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} name={primaryMeta?.label} />
                    {hasSec && <Line type="monotone" dataKey="sec" stroke={PALETTE[1]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} name={secondaryMeta!.label} />}
                </LineChart>
            </ResponsiveContainer>
        )
    }

    // ── MONTHS bar: two (or more) specific calendar months side by side ───────
    if (config.comparison === "months") {
        const months = config.months ?? []
        const filtered = months.length ? filterMonths(primary, months) : primary
        const data = filtered.map(d => ({ period: fmtMonth(d.date), value: d.value }))
        return (
            <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data} barCategoryGap="40%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                    <XAxis dataKey="period" {...axis} />
                    <YAxis {...axis} width={54} tickFormatter={tickFmt} />
                    <Tooltip contentStyle={tooltip} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} name={primaryMeta?.label}>
                        {data.map((_, i) => (
                            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        )
    }

    // ── BAR (default) ─────────────────────────────────────────────────────────
    const data = config.comparison === "mom" ? processMoM(primary) : primary
    const xKey = config.comparison === "mom" ? "month" : "date"
    return (
        <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                <XAxis dataKey={xKey} {...axis} minTickGap={40} />
                <YAxis {...axis} width={54} tickFormatter={tickFmt} />
                <Tooltip contentStyle={tooltip} />
                <Bar dataKey="value" fill={PALETTE[0]} radius={[3, 3, 0, 0]} name={primaryMeta?.label} />
            </BarChart>
        </ResponsiveContainer>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ChartStudio() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: "assistant",
            content: "Hey! Ask me anything about your data and I'll turn it into a chart or table.\n\nTry one of these:",
            action: "welcome",
        },
    ])
    const [input, setInput] = useState("")
    const [sending, setSending] = useState(false)
    const [connector, setConnector] = useState<any>(null)
    const [connectorMetrics, setConnectorMetrics] = useState<MetricInfo[]>([])
    const fetchedIndices = useRef(new Set<number>())
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Load connector + its generated metrics from sessionStorage
    useEffect(() => {
        try {
            const all = JSON.parse(sessionStorage.getItem("dashboard_connectors") || "[]")
            const activeId = sessionStorage.getItem("active_dashboard_connector_id")
            const active = (activeId && all.find((c: any) => c.metadata?.id === activeId || c.id === activeId)) || all[0]
            if (active) {
                setConnector(active)
                const metrics: MetricInfo[] = (active.metrics || []).map((m: any) => ({
                    id: m.id,
                    label: m.label,
                    type: m.type,
                    description: m.description ?? "",
                }))
                setConnectorMetrics(metrics)
            }
        } catch { /* ignore */ }
    }, [])

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages, sending])

    // Resolve metric label/type — connector metrics take priority over fallback label generation
    const getMeta = useCallback((id: string): MetricInfo => {
        return (
            connectorMetrics.find(m => m.id === id) ?? {
                id,
                label: id
                    .replace(/^gen_[^_]+_/, "")
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, c => c.toUpperCase()),
                type: "number",
            }
        )
    }, [connectorMetrics])

    // Fetch data for a specific message index and attach result back to that message
    const fetchChartData = useCallback(async (idx: number, config: ChartConfig) => {
        if (!connector) {
            setMessages(prev => prev.map((m, i) => i !== idx ? m : {
                ...m,
                chartData: {
                    primary: [], secondary: [], loading: false,
                    error: "No connector configured. Add one in the Connectors page.",
                },
            }))
            return
        }

        const projectId = connector.projectId || connector.metadata?.project || connector.discovery?.projectId
        const datasetId = connector.sources?.[0]?.id || connector.discovery?.datasets?.[0]?.id

        const fetchOne = async (metricId: string) => {
            const res = await fetch("/api/metrics/trend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ metric: metricId, range: config.dateRange, connector, projectId, datasetId }),
            })
            const d = await res.json()
            if (!Array.isArray(d)) throw new Error(d?.error ?? "Unexpected response from data API")
            return d as { date: string; value: number }[]
        }

        try {
            const [primary, secondary] = await Promise.all([
                fetchOne(config.primaryMetric),
                config.secondaryMetric ? fetchOne(config.secondaryMetric) : Promise.resolve([]),
            ])
            setMessages(prev => prev.map((m, i) => i !== idx ? m : {
                ...m,
                chartData: { primary, secondary, loading: false },
            }))
        } catch (e: any) {
            setMessages(prev => prev.map((m, i) => i !== idx ? m : {
                ...m,
                chartData: { primary: [], secondary: [], loading: false, error: e.message },
            }))
        }
    }, [connector])

    // Trigger fetch whenever a new message with loading=true is appended
    useEffect(() => {
        messages.forEach((msg, i) => {
            if (msg.chartData?.loading && msg.chartConfig && !fetchedIndices.current.has(i)) {
                fetchedIndices.current.add(i)
                fetchChartData(i, msg.chartConfig)
            }
        })
    }, [messages, fetchChartData])

    const sendMessage = async (text?: string) => {
        const userText = (text ?? input).trim()
        if (!userText || sending) return

        const userMsg: Message = { role: "user", content: userText }
        const history = [...messages.filter(m => m.action !== "welcome"), userMsg]

        setMessages(prev => [...prev, userMsg])
        setInput("")
        setSending(true)

        try {
            const res = await fetch("/api/ai/chart-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: history.map(m => ({ role: m.role, content: m.content })),
                    connectorMetrics,
                }),
            })

            const data = await res.json()
            const hasChart = data.action === "render_chart" && !!data.chartConfig

            const botMsg: Message = {
                role: "assistant",
                content: data.message ?? data.error ?? "Something went wrong.",
                action: data.action,
                suggestions: data.suggestions,
                chartConfig: hasChart ? data.chartConfig : undefined,
                // Start in loading state so the fetch effect picks it up
                chartData: hasChart ? { primary: [], secondary: [], loading: true } : undefined,
                primaryMeta: hasChart ? getMeta(data.chartConfig.primaryMetric) : undefined,
                secondaryMeta: hasChart && data.chartConfig.secondaryMetric
                    ? getMeta(data.chartConfig.secondaryMetric)
                    : undefined,
            }

            setMessages(prev => [...prev, botMsg])
        } catch {
            setMessages(prev => [...prev, {
                role: "assistant",
                content: "Sorry, something went wrong. Please try again.",
                action: "error",
            }])
        } finally {
            setSending(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    return (
        <div className="flex flex-col h-full bg-background">

            {/* ── Messages ─────────────────────────────────────────────── */}
            <ScrollArea className="flex-1 min-h-0">
                <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
                    {messages.map((msg, i) => (
                        <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>

                            {/* Bot icon */}
                            {msg.role === "assistant" && (
                                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                                </div>
                            )}

                            <div className={cn(
                                "flex flex-col gap-2.5",
                                msg.role === "user"
                                    ? "items-end max-w-[72%]"
                                    : "items-start w-full max-w-[calc(100%-2.5rem)]"
                            )}>
                                {/* Text bubble */}
                                <div className={cn(
                                    "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                                    msg.role === "user"
                                        ? "bg-primary text-primary-foreground rounded-br-sm"
                                        : "bg-muted text-foreground rounded-bl-sm"
                                )}>
                                    <p className="whitespace-pre-wrap">{msg.content}</p>

                                    {/* Welcome starter chips */}
                                    {msg.action === "welcome" && (
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {STARTERS.map(s => (
                                                <button
                                                    key={s}
                                                    onClick={() => sendMessage(s)}
                                                    className="px-2.5 py-1 rounded-lg bg-background border border-border text-xs font-medium hover:bg-accent transition-colors"
                                                >
                                                    {s}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* Disambiguation chips */}
                                    {msg.suggestions && msg.suggestions.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-3">
                                            {msg.suggestions.map(id => {
                                                const meta = getMeta(id)
                                                return (
                                                    <button
                                                        key={id}
                                                        onClick={() => sendMessage(meta.label)}
                                                        className="px-2.5 py-1 rounded-lg bg-background border border-border text-xs font-medium hover:bg-accent transition-colors"
                                                    >
                                                        {meta.label}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Inline chart / table card */}
                                {msg.chartConfig && (
                                    <div className="w-full rounded-xl border bg-card shadow-sm overflow-hidden">
                                        {/* Header row */}
                                        <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
                                            <p className="text-xs font-semibold text-foreground truncate pr-2">
                                                {msg.chartConfig.title}
                                            </p>
                                            <div className="flex gap-1 shrink-0">
                                                <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                                    {msg.chartConfig.type}
                                                </Badge>
                                                {msg.chartConfig.comparison && (
                                                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
                                                        {msg.chartConfig.comparison}
                                                    </Badge>
                                                )}
                                                <Badge variant="outline" className="text-[10px]">
                                                    {msg.chartConfig.dateRange}
                                                </Badge>
                                            </div>
                                        </div>

                                        {/* Body */}
                                        <div className="p-4">
                                            {msg.chartData?.loading ? (
                                                <div className="flex items-center justify-center h-48 gap-2 text-sm text-muted-foreground">
                                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                    Fetching data…
                                                </div>
                                            ) : msg.chartData?.error ? (
                                                <div className="flex flex-col items-center justify-center h-32 gap-1.5 text-sm">
                                                    <p className="font-medium text-destructive">Could not load data</p>
                                                    <p className="text-xs text-muted-foreground text-center max-w-xs">
                                                        {msg.chartData.error}
                                                    </p>
                                                </div>
                                            ) : msg.chartData ? (
                                                <InlineChart
                                                    config={msg.chartConfig}
                                                    primary={msg.chartData.primary}
                                                    secondary={msg.chartData.secondary}
                                                    primaryMeta={msg.primaryMeta}
                                                    secondaryMeta={msg.secondaryMeta}
                                                />
                                            ) : null}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Typing indicator */}
                    {sending && (
                        <div className="flex gap-3 justify-start">
                            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3.5 flex items-center gap-1">
                                {[0, 150, 300].map(d => (
                                    <span
                                        key={d}
                                        className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
                                        style={{ animationDelay: `${d}ms` }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* ── Input bar ────────────────────────────────────────────── */}
            <div className="border-t bg-card px-4 py-3 shrink-0">
                <div className="max-w-2xl mx-auto flex gap-2 items-end">
                    <textarea
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        placeholder="Ask for a chart or comparison…"
                        disabled={sending}
                        className="flex-1 resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground disabled:opacity-50 min-h-[40px] max-h-[120px] overflow-y-auto leading-snug"
                        style={{ fieldSizing: "content" } as React.CSSProperties}
                    />
                    <Button
                        onClick={() => sendMessage()}
                        disabled={sending || !input.trim()}
                        className="h-10 w-10 p-0 shrink-0 rounded-xl"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                    {connectorMetrics.length > 0
                        ? `${connectorMetrics.length} metrics from your database · Enter to send`
                        : "Enter to send · Shift+Enter for new line"}
                </p>
            </div>
        </div>
    )
}
