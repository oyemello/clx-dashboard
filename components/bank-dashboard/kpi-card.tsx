import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react"
import { MetricDefinition } from "@/lib/connectors/types"
import { Skeleton } from "@/components/ui/skeleton"

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
    // For simplicity, we sum the last month or use the last data point
    const lastPoint = data && data.length > 0 ? data[data.length - 1] : null

    // Naive Logic: Access the key matching the metric SQL alias or ID
    // In our connector, ID is like 'kpi_...' 
    // The data points usually have keys like 'month' and 'value' or specific metric keys?
    // Let's assume the API returns data where key = metric.id or 'val'
    // NOTE: The API response format usually matches the metric ID if generating dynamic queries.
    // Or it returns a standard structure. 
    // Let's assume for now the data point has a key matching the metric ID?
    // Actually, `TrendChart` likely knows the data shape.
    // Inspecting `TrendChart`... it uses `dataKey="value"`.
    // So distinct API calls per metric? Yes, insights-panel does that.

    // If usage is ONE card per metric, we get `data` specific to that metric.
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

    return (
        <Card
            className={cn(
                "cursor-pointer transition-all h-full p-4 flex flex-col justify-between",
                selected ? 'border-primary ring-1 ring-primary shadow-md' : 'hover:border-slate-300',
                className
            )}
            onClick={onClick}
        >
            <div className="text-sm font-medium text-muted-foreground">
                {title || metric.label}
            </div>

            <div className="mt-4">
                <div className="text-2xl font-bold tracking-tight">{formattedValue}</div>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    {data.length > 1 ? (
                        <>
                            <span className={isPositive ? "text-emerald-500 flex items-center" : "text-red-500 flex items-center"}>
                                {isPositive ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
                                {Math.abs(Number(percentage))}%
                            </span>
                            <span>from last period</span>
                        </>
                    ) : (
                        <span className="flex items-center text-slate-400">
                            <Minus className="h-3 w-3 mr-1" /> No prior data
                        </span>
                    )}
                </div>
            </div>
        </Card>
    )
}
