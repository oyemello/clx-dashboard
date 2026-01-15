import { useMemo } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign } from "lucide-react"
import { fetcher } from "@/lib/api/fetcher"
import { SegmentContributionRow } from "@/lib/api/types"
import { MetricDefinition } from "@/lib/metrics"

interface OverviewSegmentGroupProps {
    metric: MetricDefinition
    isActive: boolean
    onClick: () => void
}

export function OverviewSegmentGroup({ metric, isActive, onClick }: OverviewSegmentGroupProps) {
    const { data, error, isLoading } = useSWR<SegmentContributionRow[]>(
        metric.endpoint ? metric.endpoint({}) : null,
        fetcher
    )

    if (isLoading) {
        return (
            <>
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="space-y-0 pb-2">
                            <div className="h-4 w-1/2 bg-muted rounded" />
                        </CardHeader>
                        <CardContent>
                            <div className="h-8 w-3/4 bg-muted rounded mt-2" />
                        </CardContent>
                    </Card>
                ))}
            </>
        )
    }

    if (error || !data) {
        return (
            <Card className="border-destructive/50 bg-destructive/10">
                <CardContent className="pt-6 text-sm text-destructive">
                    Failed to load segment data
                </CardContent>
            </Card>
        )
    }

    // Sort by total net contribution descending
    const sortedData = [...data].sort((a, b) => b.total_net_contribution - a.total_net_contribution)

    return (
        <>
            {sortedData.map((segment) => (
                <Card
                    key={segment.segment}
                    className={`cursor-pointer transition-all hover:bg-muted/50 ${isActive ? "border-primary ring-1 ring-primary" : ""}`}
                    onClick={onClick}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{segment.segment}</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                maximumFractionDigits: 0
                            }).format(segment.total_net_contribution)}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                            {segment.customer_count} customers • Avg {new Intl.NumberFormat('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                maximumFractionDigits: 0
                            }).format(segment.avg_net_contribution)}
                        </p>
                    </CardContent>
                </Card>
            ))}
        </>
    )
}
