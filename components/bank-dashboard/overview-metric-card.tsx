import { useState } from "react"
import { useMemo } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Users, Activity, Sparkles, Loader2 } from "lucide-react"
import { fetcher } from "@/lib/api/fetcher"
import { MetricDefinition } from "@/lib/metrics"
import { Customer } from "@/lib/data"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

interface OverviewMetricCardProps {
    metric: MetricDefinition
    isActive: boolean
    onClick: () => void
    data: Customer[] // Fallback legacy data for non-API metrics
    overrideValue?: number
}

export function OverviewMetricCard({ metric, isActive, onClick, data, overrideValue }: OverviewMetricCardProps) {
    const [isReportOpen, setIsReportOpen] = useState(false)
    const [report, setReport] = useState<string | null>(null)
    const [isGenerating, setIsGenerating] = useState(false)

    // Determine fetch key
    const fetchKey = metric.endpoint && metric.componentType !== 'table' ? metric.endpoint({}) : null

    const { data: apiData, error, isLoading } = useSWR(fetchKey, fetcher)

    // Derived Value Logic
    const displayValue = useMemo(() => {
        if (overrideValue !== undefined) return overrideValue

        if (metric.endpoint && metric.componentType === 'table') {
            return "View Table"
        }

        if (apiData) {
            if (Array.isArray(apiData)) {
                const lastPoint = apiData[apiData.length - 1]
                if (lastPoint) {
                    if (typeof lastPoint.value === 'number') return lastPoint.value
                    if (typeof lastPoint.net_cashflow === 'number') return lastPoint.net_cashflow
                }
            }
            return 0
        }

        // Legacy Fallback
        return metric.calculate(data)
    }, [metric, data, apiData])

    const handleGenerateReport = async (e: React.MouseEvent) => {
        e.stopPropagation() // Prevent card click
        setIsReportOpen(true)

        if (report) return // Use cached if available in local state (API also caches)

        setIsGenerating(true)
        try {
            const res = await fetch('/api/ai/generate-report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    metricId: metric.id,
                    metricLabel: metric.label,
                    value: displayValue,
                    trend: Array.isArray(apiData) ? apiData.slice(-3) : 'No trend data'
                })
            })
            const data = await res.json()
            if (data.report) {
                setReport(data.report)
            }
        } catch (err) {
            console.error(err)
            setReport("Failed to generate report. Please check your API configuration.")
        } finally {
            setIsGenerating(false)
        }
    }

    // Loading State
    if (isLoading && fetchKey) {
        return (
            <Card className="animate-pulse">
                <CardHeader className="space-y-0 pb-2">
                    <div className="h-4 w-1/2 bg-muted rounded" />
                </CardHeader>
                <CardContent>
                    <div className="h-8 w-1/2 bg-muted rounded mt-2" />
                </CardContent>
            </Card>
        )
    }

    // Interactable Card
    return (
        <>
            <Card
                className={`cursor-pointer transition-all hover:bg-muted/50 ${isActive ? "border-primary ring-1 ring-primary" : ""}`}
                onClick={onClick}
            >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-indigo-500"
                            onClick={handleGenerateReport}
                            title="Generate AI Insight"
                        >
                            <Sparkles className="h-4 w-4" />
                        </Button>
                        {metric.type === "currency" ? <DollarSign className="h-4 w-4 text-muted-foreground" /> :
                            metric.type === "percent" ? <Activity className="h-4 w-4 text-muted-foreground" /> :
                                <Users className="h-4 w-4 text-muted-foreground" />}
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">
                        {typeof displayValue === 'number' ? (
                            metric.type === "currency"
                                ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(displayValue)
                                : metric.type === "percent"
                                    ? `${displayValue.toFixed(1)}%`
                                    : displayValue.toLocaleString()
                        ) : (
                            <span className="text-lg">{displayValue}</span>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                        {metric.description}
                    </p>
                </CardContent>
            </Card>

            <Dialog open={isReportOpen} onOpenChange={(open) => {
                setIsReportOpen(open)
                // Don't clear report on close so it feels "memoized" for the session
            }}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-indigo-600" />
                            AI Insight: {metric.label}
                        </DialogTitle>
                        <DialogDescription>
                            Analysis based on current trend and performance data.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4">
                        {isGenerating ? (
                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                <p className="text-sm">Analyzing financial signals...</p>
                            </div>
                        ) : (
                            <div className="bg-muted/30 p-4 rounded-md border text-sm leading-relaxed">
                                {report}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end mt-2">
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            Generated by GPT-4o-mini
                        </Badge>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
