"use client"

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceArea } from "recharts"
// Card imports removed

interface MetricTrendChartProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { date: string;[key: string]: any }[]
}

export function MetricTrendChart({ data }: MetricTrendChartProps) {
    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <XAxis
                        dataKey="date"
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value: number) => `$${value}`}
                    />
                    <Tooltip
                        contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ color: '#1e293b' }}
                    />
                    {/* Historical (Comparison) - Dashed Line */}
                    <Line
                        type="monotone"
                        dataKey="previous"
                        stroke="#94a3b8"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name="Last Period"
                    />
                    {/* Current Period - Solid Line */}
                    <Line
                        type="monotone"
                        dataKey="current"
                        stroke="#0f172a"
                        strokeWidth={2}
                        activeDot={{ r: 6 }}
                        name="Current Period"
                    />
                    {/* Anomaly Highlight Example - Simplified */}
                    {/* In production, map through anomalies array to create ReferenceAreas */}
                    <ReferenceArea x1="M-7" x2="M-6" strokeOpacity={0.3} fill="red" fillOpacity={0.1} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    )
}
