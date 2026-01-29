"use client"

import {
    Line, LineChart, Bar, BarChart, Area, AreaChart, Pie, PieChart, Cell,
    ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend
} from "recharts"
import { VisualizationType } from "@/lib/dashboard-types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface UniversalChartProps {
    title: string;
    type: VisualizationType;
    data: any[];
    metricId: string; // Key to graph
    dateKey?: string;
    loading?: boolean;
    headerContent?: React.ReactNode;
    compareData?: any[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function UniversalChart({ title, type, data, metricId, dateKey = "date", loading, headerContent, compareData }: UniversalChartProps) {
    if (loading) {
        return <Card className="animate-pulse h-[350px]" />
    }

    const dataKey = data?.length && data[0]?.[metricId] !== undefined ? metricId : 'value'

    const chartData = compareData && compareData.length > 0
        ? data.map((item, i) => ({
            ...item,
            periodIndex: i + 1,
            compareValue: compareData[i] ? (Number(compareData[i][dataKey]) || 0) : null
        }))
        : data

    const axisKey = compareData && compareData.length > 0 ? "periodIndex" : dateKey

    const renderChart = () => {
        // ... (Pie chart logic omitted for brevity, unlikely to use comparison)
        if (type === 'pie') {
            const sum = data.reduce((acc, curr) => acc + (Number(curr[dataKey]) || 0), 0)
            // Pie ignores comparison for now
            const pieData = [{ name: title, value: sum }]
            return (
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                            <Cell key={`cell-0`} fill={COLORS[0]} />
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            )
        }

        const CommonAxis = () => (
            <>
                <XAxis
                    dataKey={axisKey}
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={30}
                />
                <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                />
                <Tooltip
                    contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    itemStyle={{ color: '#1e293b' }}
                />
                <Legend />
            </>
        )

        switch (type) {
            case 'bar':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                            {CommonAxis()}
                            <Bar dataKey={dataKey} fill="#0f172a" radius={[4, 4, 0, 0]} name={title} />
                            {compareData && <Bar dataKey="compareValue" fill="#006fcf" radius={[4, 4, 0, 0]} name="Previous" />}
                        </BarChart>
                    </ResponsiveContainer>
                )
            case 'area':
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData}>
                            <defs>
                                <linearGradient id={`grad-${metricId}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                            {CommonAxis()}
                            <Area
                                type="monotone"
                                dataKey={dataKey}
                                stroke="#0f172a"
                                fillOpacity={1}
                                fill={`url(#grad-${metricId})`}
                                name={title}
                            />
                            {compareData && <Area type="monotone" dataKey="compareValue" stroke="#006fcf" fill="none" name="Previous" />}
                        </AreaChart>
                    </ResponsiveContainer>
                )
            case 'line':
            default:
                return (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e5e5" />
                            {CommonAxis()}
                            <Line
                                type="monotone"
                                dataKey={dataKey}
                                stroke="#0f172a"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 6 }}
                                name={title}
                            />
                            {compareData && <Line type="monotone" dataKey="compareValue" stroke="#006fcf" strokeWidth={2} dot={false} name="Previous" />}
                        </LineChart>
                    </ResponsiveContainer>
                )
        }
    }

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>{title}</CardTitle>
                {headerContent}
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
                {data.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        No data available
                    </div>
                ) : renderChart()}
            </CardContent>
        </Card>
    )
}
