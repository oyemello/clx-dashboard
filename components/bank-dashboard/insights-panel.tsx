"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MetricTrendChart } from "./trend-chart"
import { AIPerformanceSummary } from "./ai-summary"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// Slider removed
import { Separator } from "@/components/ui/separator"
// Switch removed
import { Label } from "@/components/ui/label"
import { CheckCircle2, AlertTriangle, MessageSquare } from "lucide-react"

// Mock data for the chart
const mockChartData = [
    { date: 'M-12', current: 4230, previous: 4100 },
    { date: 'M-11', current: 1679, previous: 2000 },
    { date: 'M-10', current: 5793, previous: 5500 },
    { date: 'M-9', current: 2403, previous: 2200 },
    { date: 'M-8', current: 2812, previous: 2900 },
    { date: 'M-7', current: 2729, previous: 3000 }, // Dip
    { date: 'M-6', current: 8794, previous: 4000 }, // Spike
    { date: 'M-5', current: 3652, previous: 3500 },
    { date: 'M-4', current: 4452, previous: 4200 },
    { date: 'M-3', current: 7900, previous: 7000 },
    { date: 'M-2', current: 433, previous: 6000 }, // Crash
    { date: 'M-1', current: 371, previous: 500 },
    { date: 'M-0', current: 4245, previous: 4100 },
]

export function InsightsPanel() {
    return (
        <div className="w-full h-full p-6 space-y-8 animate-in slide-in-from-right-4 duration-500">
            {/* Section 1: Header */}
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Metric Insights</h2>
                    <Badge variant="outline" className="text-xs">Decision Mode</Badge>
                </div>
                <div className="flex items-baseline gap-4 mt-2">
                    <span className="text-4xl font-bold tracking-tight">$12.4M</span>
                    <span className="text-sm font-medium text-green-600 flex items-center">
                        ▲ 3.2% vs previous quarter
                    </span>
                </div>
            </div>

            {/* Section 2: Comparison Chart */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Trend Analysis</h3>
                    <Tabs defaultValue="year" className="w-[300px]">
                        <TabsList className="grid w-full grid-cols-4 h-7">
                            <TabsTrigger value="7d" className="text-xs">7D</TabsTrigger>
                            <TabsTrigger value="30d" className="text-xs">30D</TabsTrigger>
                            <TabsTrigger value="qtr" className="text-xs">QTR</TabsTrigger>
                            <TabsTrigger value="year" className="text-xs">Year</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                <Card>
                    <CardContent className="pt-6">
                        <MetricTrendChart data={mockChartData} />
                    </CardContent>
                </Card>
            </div>

            {/* Section 3: AI Summary */}
            <div className="space-y-2">
                <h3 className="text-sm font-semibold">Performance Summary</h3>
                <AIPerformanceSummary />
            </div>

            {/* Section 5: Anomaly & Forecast (Combined visually for panel) */}
            <div className="grid grid-cols-2 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Anomaly Detection</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 mb-2">
                            <Badge variant="destructive">Critical</Badge>
                            <span className="text-xs text-muted-foreground">Score: 92/100</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Unexpected dip in M-2 (-85% vs expected).
                            <br />
                            <span className="font-semibold text-foreground">Likely cause: Seasonal adjustment error.</span>
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Forecast (90d)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono">$4.8M</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Confidence Interval: 95%
                            <br />
                            Range: $4.1M — $5.5M
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Separator />

            {/* Section 6: Controls */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Model Controls</h3>
                    <Badge variant="secondary" className="text-[10px]">v2.1.0</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs">Sensitivity</Label>
                        <Select defaultValue="medium">
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select sensitivity" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="low">Low (Avoid False Positives)</SelectItem>
                                <SelectItem value="medium">Medium (Balanced)</SelectItem>
                                <SelectItem value="high">High (Capture All)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs">Confidence Interval</Label>
                        <Select defaultValue="95">
                            <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select CI" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="80">80%</SelectItem>
                                <SelectItem value="90">90%</SelectItem>
                                <SelectItem value="95">95% (Standard)</SelectItem>
                                <SelectItem value="99">99% (Strict)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            <Separator />

            {/* Section 7: Actions */}
            <div className="space-y-3">
                <h3 className="text-sm font-semibold">Actions</h3>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs">
                        <CheckCircle2 className="mr-2 h-3 w-3 text-green-600" />
                        Mark Expected
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 text-xs">
                        <AlertTriangle className="mr-2 h-3 w-3 text-amber-600" />
                        Flag Issue
                    </Button>
                </div>
                <Button variant="ghost" size="sm" className="w-full text-xs justify-start text-muted-foreground">
                    <MessageSquare className="mr-2 h-3 w-3" />
                    Add Analyst Note...
                </Button>
            </div>
        </div>
    )
}
