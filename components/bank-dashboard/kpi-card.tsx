import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"
import { MetricDefinition } from "@/lib/connectors/types"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useCardSettings } from "@/components/card-settings-provider"
import { extractLabels } from "@/lib/label-utils"

interface KPICardProps {
    metric: MetricDefinition;
    title?: string;
    data: any[];
    loading?: boolean;
    selected?: boolean;
    onClick?: () => void;
    className?: string;
}

export function KPICard({ metric, title, data, loading, selected, onClick, className }: KPICardProps) {
    const { showLabels, showTrend, showSubtext } = useCardSettings()

    if (loading) {
        return (
            <Card className={cn("transition-all h-full p-4 flex flex-col justify-between", className)}>
                <Skeleton className="h-4 w-24" />
                <div className="mt-4 space-y-2">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-3 w-16" />
                </div>
            </Card>
        )
    }

    // Calculate current value (sum or last value depending on logic)
    const lastPoint = data && data.length > 0 ? data[data.length - 1] : null
    const currentValue = lastPoint ? (lastPoint.value || lastPoint[metric.id] || 0) : 0
    const previousValue = data && data.length > 1 ? (data[data.length - 2]?.value || 0) : 0

    const delta = currentValue - previousValue
    const percentage = previousValue ? ((delta / previousValue) * 100).toFixed(1) : 0

    const isPositive = delta >= 0
    const formattedValue = metric.type === 'currency'
        ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: "compact" }).format(currentValue)
        : metric.type === 'percent'
            ? `${currentValue.toFixed(1)}%`
            : currentValue.toLocaleString()

    let displayTitle = title || metric.label
    let labels: string[] = []

    const { displayTitle: cleanTitle, labels: extractedLabels } = extractLabels(title || metric.label)
    displayTitle = cleanTitle
    labels = extractedLabels



    return (
        <Card
            className={cn(
                "cursor-pointer transition-all h-full p-4 flex flex-col justify-between",
                selected ? 'border-primary ring-1 ring-primary shadow-md' : 'hover:border-slate-300',
                className
            )}
            onClick={onClick}
        >
            <div className="flex flex-col items-start gap-1.5">
                <div className="text-sm font-medium text-muted-foreground truncate w-full min-h-[20px]" title={displayTitle}>
                    {displayTitle}
                </div>
                {showLabels && labels.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                        {labels.map((lbl, i) => (
                            <Badge key={i} variant="outline" className="px-1.5 py-0 text-[10px] uppercase tracking-wider font-semibold bg-white text-gray-500 hover:bg-white border-border opacity-100">
                                {lbl}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-4">
                <div className="text-2xl font-bold tracking-tight">{formattedValue}</div>
                {(showTrend || showSubtext) && (
                    <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        {data.length > 1 ? (
                            <>
                                {showTrend && (
                                    <span className={isPositive ? "text-emerald-500 flex items-center" : "text-red-500 flex items-center"}>
                                        {isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                                        {Math.abs(Number(percentage))}%
                                    </span>
                                )}
                                {showSubtext && <span>from last period</span>}
                            </>
                        ) : (
                            <span className="flex items-center text-slate-400">
                                <Minus className="h-3 w-3 mr-1" /> No prior data
                            </span>
                        )}
                    </div>
                )}
            </div>
        </Card>
    )
}
