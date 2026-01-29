import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Settings2, GripVertical } from "lucide-react"
import { ConnectorConfig, MetricDefinition } from "@/lib/connectors/types"
import { DashboardMetricConfig, DEFAULT_VISUALIZATION_TYPE, VisualizationType } from "@/lib/dashboard-types"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"

interface MetricConfigurationDialogProps {
    connector: ConnectorConfig;
    existingConfig: DashboardMetricConfig[];
    onSave: (config: DashboardMetricConfig[]) => void;
}

export function MetricConfigurationDialog({ connector, existingConfig, onSave }: MetricConfigurationDialogProps) {
    const [open, setOpen] = useState(false)
    const [draftConfig, setDraftConfig] = useState<DashboardMetricConfig[]>([])

    // Sync draft with existing + new metrics from connector
    useEffect(() => {
        if (!connector?.metrics) return;

        const merged: DashboardMetricConfig[] = connector.metrics.map(m => {
            const existing = existingConfig.find(c => c.metricId === m.id)
            if (existing) return { ...existing }

            // Default new metrics to visible
            return {
                metricId: m.id,
                isVisible: true,
                customTitle: m.label,
                visualizationType: DEFAULT_VISUALIZATION_TYPE
            }
        })

        setDraftConfig(merged)
    }, [connector, existingConfig, open])

    const handleSave = () => {
        onSave(draftConfig)
        setOpen(false)
    }

    const toggleVisibility = (id: string) => {
        setDraftConfig(prev => prev.map(c =>
            c.metricId === id ? { ...c, isVisible: !c.isVisible } : c
        ))
    }

    const updateTitle = (id: string, title: string) => {
        setDraftConfig(prev => prev.map(c =>
            c.metricId === id ? { ...c, customTitle: title } : c
        ))
    }

    const updateType = (id: string, type: VisualizationType) => {
        setDraftConfig(prev => prev.map(c =>
            c.metricId === id ? { ...c, visualizationType: type } : c
        ))
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="hidden md:flex gap-2">
                    <Settings2 className="h-4 w-4" />
                    Configuration
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Dashboard Configuration</DialogTitle>
                    <DialogDescription>
                        Select metrics to display and customize their visualization.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-4 -mr-4 py-4">
                    <div className="space-y-4">
                        {connector?.metrics?.map(metric => {
                            const config = draftConfig.find(c => c.metricId === metric.id)
                            if (!config) return null

                            return (
                                <div key={metric.id} className="flex items-start gap-4 p-4 border rounded-lg bg-slate-50/50">
                                    <Checkbox
                                        checked={config.isVisible}
                                        onCheckedChange={() => toggleVisibility(metric.id)}
                                        className="mt-3"
                                    />

                                    <div className="flex-1 grid gap-4 grid-cols-1 md:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                Metric
                                            </Label>
                                            <div className="text-sm font-medium">{metric.label}</div>
                                            <div className="text-xs text-muted-foreground line-clamp-1">{metric.description}</div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="grid gap-2">
                                                <Label htmlFor={`title-${metric.id}`} className="text-xs">Display Title</Label>
                                                <Input
                                                    id={`title-${metric.id}`}
                                                    value={config.customTitle || ''}
                                                    onChange={(e) => updateTitle(metric.id, e.target.value)}
                                                    disabled={!config.isVisible}
                                                    className="h-8"
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label className="text-xs">Visualization</Label>
                                                <Select
                                                    value={config.visualizationType}
                                                    onValueChange={(val) => updateType(metric.id, val as VisualizationType)}
                                                    disabled={!config.isVisible}
                                                >
                                                    <SelectTrigger className="h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="line">Line Chart</SelectItem>
                                                        <SelectItem value="bar">Bar Chart</SelectItem>
                                                        <SelectItem value="area">Area Chart</SelectItem>
                                                        <SelectItem value="pie">Pie Chart</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        {(!connector?.metrics || connector.metrics.length === 0) && (
                            <div className="text-center py-12 text-muted-foreground bg-slate-50 rounded-lg dashed border-2 border-slate-200">
                                No metrics available in this connector.
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t mt-auto">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Configuration</Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
