"use client"

import * as React from "react"
import { Check, BarChart3, LineChart, PieChart, Table, LayoutDashboard, Save } from "lucide-react"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { METRIC_REGISTRY } from "@/lib/metrics"
import { ScrollArea } from "@/components/ui/scroll-area"
import { OverviewChart } from "./overview-chart"
import { generateMetricHistory } from "@/lib/aggregation"
import { Customer } from "@/lib/data"

export interface MetricConfig {
    id: string
    visible: boolean
    visualizationType: 'line' | 'bar' | 'area' | 'table'
    color?: string
}

interface MetricConfigurationPanelProps {
    configs: MetricConfig[]
    onSave: (configs: MetricConfig[]) => void
    data?: Customer[]
}

export function MetricConfigurationPanel({ configs, onSave, data }: MetricConfigurationPanelProps) {
    const [localConfigs, setLocalConfigs] = React.useState<MetricConfig[]>(configs)
    const [activeId, setActiveId] = React.useState<string | null>(null)

    // Reset local state when configs prop changes (e.g. initial load)
    React.useEffect(() => {
        setLocalConfigs(configs)
        if (!activeId && configs.length > 0) setActiveId(configs[0].id)
    }, [configs])

    const getLocalConfig = (id: string) => {
        return localConfigs.find(c => c.id === id) || { id, visible: false, visualizationType: 'line' }
    }

    const updateConfig = (id: string, updates: Partial<MetricConfig>) => {
        const newConfigs = [...localConfigs]
        const idx = newConfigs.findIndex(c => c.id === id)

        if (idx !== -1) {
            newConfigs[idx] = { ...newConfigs[idx], ...updates }
        } else {
            newConfigs.push({ id, visible: false, visualizationType: 'line', ...updates })
        }

        setLocalConfigs(newConfigs)
        // Auto-save on change? Or explicit save? 
        // User requested "save it for the session", usually implies explicit action or auto.
        // The previous dialog had "Save". 
        // Let's keep explicit save for now to match behavior, OR pass intermediate updates?
        // Since it's a main panel now, auto-save feels more natural for a "Settings" page.
        // Let's do AUTO SAVE for a smooth experience, but maybe debounce it?
        // Actually, let's just trigger onSave immediately for responsiveness.
        onSave(newConfigs)
    }

    const activeMetric = METRIC_REGISTRY.find(m => m.id === activeId)
    const activeConfig = activeId ? getLocalConfig(activeId) : null

    return (
        <div className="flex h-full border rounded-xl overflow-hidden bg-background shadow-sm">
            {/* Left Sidebar: Metric List */}
            <Command className="w-1/3 border-r bg-muted/10 flex flex-col">
                <div className="p-4 border-b">
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">Available Metrics</h3>
                    <div className="relative">
                        <CommandInput placeholder="Filter metrics..." className="h-8 text-xs" />
                    </div>
                </div>
                <ScrollArea className="flex-1">
                    <CommandList className="h-full max-h-[calc(100vh-12rem)]">
                        <CommandEmpty>No metrics found.</CommandEmpty>
                        <CommandGroup>
                            {METRIC_REGISTRY.map(metric => {
                                const cfg = getLocalConfig(metric.id)
                                return (
                                    <CommandItem
                                        key={metric.id}
                                        value={metric.label}
                                        onSelect={() => setActiveId(metric.id)}
                                        className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors !aria-selected:bg-transparent ${activeId === metric.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm font-medium">{metric.label}</span>
                                            <span className="text-[10px] text-muted-foreground line-clamp-1">{metric.description}</span>
                                        </div>
                                        {cfg.visible && <Check className="h-3 w-3 text-indigo-600" />}
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                    </CommandList>
                </ScrollArea>
            </Command>

            {/* Right Panel: Settings */}
            <div className="flex-1 overflow-y-auto bg-slate-50/50">
                {activeMetric && activeConfig ? (
                    <div className="max-w-6xl mx-auto p-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        {/* Header Section */}
                        <div className="flex items-start justify-between mb-8 bg-white p-6 rounded-2xl border shadow-sm">
                            <div className="flex items-center gap-5">
                                <div className={`p-4 rounded-2xl border ${activeConfig.color ? `bg-${activeConfig.color}-50 border-${activeConfig.color}-100` : 'bg-indigo-50 border-indigo-100'}`}>
                                    {activeMetric.type === 'currency' ?
                                        <span className={`font-bold text-2xl ${activeConfig.color ? `text-${activeConfig.color}-600` : 'text-indigo-600'}`}>$</span> :
                                        <BarChart3 className={`h-8 w-8 ${activeConfig.color ? `text-${activeConfig.color}-600` : 'text-indigo-600'}`} />
                                    }
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-bold tracking-tight text-slate-900">{activeMetric.label}</h3>
                                    <p className="text-muted-foreground text-sm max-w-md">{activeMetric.description}</p>
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-3">
                                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-full border">
                                    <Label htmlFor="visible-toggle" className="text-sm font-medium cursor-pointer text-slate-600">
                                        {activeConfig.visible ? "Active" : "Hidden"}
                                    </Label>
                                    <Switch
                                        id="visible-toggle"
                                        checked={activeConfig.visible}
                                        onCheckedChange={(c) => updateConfig(activeMetric.id, { visible: c })}
                                        className="data-[state=checked]:bg-indigo-600"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* LIVE PREVIEW SECTION */}
                        <div className="mb-8">
                            <div className="bg-white p-6 rounded-2xl border shadow-sm h-[300px] relative overflow-hidden">
                                {data ? (
                                    <OverviewChart
                                        data={generateMetricHistory(data, activeMetric.id, null)}
                                        metric={activeMetric.id}
                                        initialChartType={activeConfig.visualizationType === 'table' ? 'line' : activeConfig.visualizationType}
                                        color={activeConfig.color}
                                        onDrilldown={() => { }}
                                        hideControls
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-muted-foreground">
                                        Loading Preview...
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Configuration Grid */}
                        <div className={`transition-all duration-300 grid grid-cols-1 gap-8 ${activeConfig.visible ? 'opacity-100 translate-y-0' : 'opacity-40 grayscale pointer-events-none'}`}>

                            {/* Visualization Style */}
                            <div>
                                <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Visualization</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    {[
                                        { type: 'line', icon: LineChart, label: 'Trend' },
                                        { type: 'bar', icon: BarChart3, label: 'Bar' },
                                        { type: 'area', icon: LayoutDashboard, label: 'Area' },
                                        { type: 'table', icon: Table, label: 'Table' }
                                    ].map((style) => (
                                        <div
                                            key={style.type}
                                            onClick={() => updateConfig(activeMetric.id, { visualizationType: style.type as any })}
                                            className={`
                                                flex flex-col items-center justify-center p-4 rounded-xl border cursor-pointer transition-all h-24
                                                ${activeConfig.visualizationType === style.type
                                                    ? 'border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600 shadow-sm'
                                                    : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-sm'
                                                }
                                            `}
                                        >
                                            <style.icon className={`h-6 w-6 mb-2 ${activeConfig.visualizationType === style.type ? 'text-indigo-600' : 'text-slate-400'}`} />
                                            <span className={`text-xs font-semibold uppercase tracking-wide ${activeConfig.visualizationType === style.type ? 'text-indigo-900' : 'text-slate-600'}`}>{style.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>


                        </div>
                    </div>
                ) : (
                    <div className="flex-1 h-full flex flex-col items-center justify-center text-muted-foreground animate-in zoom-in-95 duration-300">
                        <div className="p-6 bg-slate-50 rounded-full mb-4">
                            <LayoutDashboard className="h-12 w-12 text-slate-300" />
                        </div>
                        <p className="text-lg font-medium text-slate-700">Select a metric to configure</p>
                        <p className="text-sm">Choose from the list on the left to customize settings.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
