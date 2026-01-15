import * as React from "react"
import { Check, BarChart3, LineChart, PieChart, Table, LayoutDashboard, Save } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { METRIC_REGISTRY } from "@/lib/metrics"
import { ScrollArea } from "@/components/ui/scroll-area"

export interface MetricConfig {
    id: string
    visible: boolean
    visualizationType: 'line' | 'bar' | 'area' | 'table'
}

interface MetricSelectorProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    configs: MetricConfig[]
    onSave: (configs: MetricConfig[]) => void
}

export function MetricSelector({ open, onOpenChange, configs, onSave }: MetricSelectorProps) {
    const [localConfigs, setLocalConfigs] = React.useState<MetricConfig[]>(configs)
    const [activeId, setActiveId] = React.useState<string | null>(null)

    // Reset local state when opening
    React.useEffect(() => {
        if (open) {
            setLocalConfigs(configs)
            if (!activeId && configs.length > 0) setActiveId(configs[0].id)
        }
    }, [open, configs])

    const getLocalConfig = (id: string) => {
        return localConfigs.find(c => c.id === id) || { id, visible: false, visualizationType: 'line' }
    }

    const updateConfig = (id: string, updates: Partial<MetricConfig>) => {
        setLocalConfigs(prev => {
            const exists = prev.find(c => c.id === id)
            if (exists) {
                return prev.map(c => c.id === id ? { ...c, ...updates } : c)
            }
            // If strictly not in list yet (shouldn't happen if we seed all from registry, but safety)
            return [...prev, { id, visible: false, visualizationType: 'line', ...updates }]
        })
    }

    const activeMetric = METRIC_REGISTRY.find(m => m.id === activeId)
    const activeConfig = activeId ? getLocalConfig(activeId) : null

    const handleSave = () => {
        onSave(localConfigs)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                <div className="p-6 pb-4 border-b">
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <LayoutDashboard className="h-5 w-5 text-indigo-600" />
                            Dashboard Configuration
                        </DialogTitle>
                        <DialogDescription>
                            Customize your workspace. Select metrics and choose how they should be visualized.
                        </DialogDescription>
                    </DialogHeader>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left Sidebar: Metric List */}
                    <div className="w-1/3 border-r bg-muted/10 flex flex-col">
                        <div className="p-4 border-b">
                            <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-2">Available Metrics</h3>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-2 space-y-1">
                                {METRIC_REGISTRY.map(metric => {
                                    const cfg = getLocalConfig(metric.id)
                                    return (
                                        <div
                                            key={metric.id}
                                            onClick={() => setActiveId(metric.id)}
                                            className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors ${activeId === metric.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
                                        >
                                            <div className="flex flex-col gap-0.5">
                                                <span className="text-sm font-medium">{metric.label}</span>
                                                <span className="text-[10px] text-muted-foreground line-clamp-1">{metric.description}</span>
                                            </div>
                                            {cfg.visible && <Check className="h-3 w-3 text-indigo-600" />}
                                        </div>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Right Panel: Settings */}
                    <div className="flex-1 p-6 bg-background flex flex-col">
                        {activeMetric && activeConfig ? (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-50 rounded-lg">
                                                {activeMetric.type === 'currency' ? <span className="text-indigo-600 font-bold">$</span> : <BarChart3 className="h-5 w-5 text-indigo-600" />}
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold">{activeMetric.label}</h3>
                                                <p className="text-sm text-muted-foreground">{activeMetric.description}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Label htmlFor="visible-mode" className="text-sm font-medium">Show on Dashboard</Label>
                                            <Switch
                                                id="visible-mode"
                                                checked={activeConfig.visible}
                                                onCheckedChange={(c) => updateConfig(activeMetric.id, { visible: c })}
                                            />
                                        </div>
                                    </div>

                                    <div className={`space-y-6 transition-opacity ${activeConfig.visible ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                        <div className="grid gap-4">
                                            <Label className="text-base">Visualization Style</Label>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div
                                                    className={`border rounded-lg p-4 cursor-pointer flex items-center gap-3 hover:border-primary transition-all ${activeConfig.visualizationType === 'line' ? 'border-primary ring-1 ring-primary bg-primary/5' : ''}`}
                                                    onClick={() => updateConfig(activeMetric.id, { visualizationType: 'line' })}
                                                >
                                                    <LineChart className="h-5 w-5 text-muted-foreground" />
                                                    <div>
                                                        <div className="font-medium text-sm">Trend Line</div>
                                                        <div className="text-xs text-muted-foreground">Best for historical performance</div>
                                                    </div>
                                                </div>
                                                <div
                                                    className={`border rounded-lg p-4 cursor-pointer flex items-center gap-3 hover:border-primary transition-all ${activeConfig.visualizationType === 'bar' ? 'border-primary ring-1 ring-primary bg-primary/5' : ''}`}
                                                    onClick={() => updateConfig(activeMetric.id, { visualizationType: 'bar' })}
                                                >
                                                    <BarChart3 className="h-5 w-5 text-muted-foreground" />
                                                    <div>
                                                        <div className="font-medium text-sm">Bar Chart</div>
                                                        <div className="text-xs text-muted-foreground">Compare distinct periods</div>
                                                    </div>
                                                </div>
                                                <div
                                                    className={`border rounded-lg p-4 cursor-pointer flex items-center gap-3 hover:border-primary transition-all ${activeConfig.visualizationType === 'area' ? 'border-primary ring-1 ring-primary bg-primary/5' : ''}`}
                                                    onClick={() => updateConfig(activeMetric.id, { visualizationType: 'area' })}
                                                >
                                                    <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
                                                    <div>
                                                        <div className="font-medium text-sm">Area Fill</div>
                                                        <div className="text-xs text-muted-foreground">Emphasize volume/magnitude</div>
                                                    </div>
                                                </div>
                                                <div
                                                    className={`border rounded-lg p-4 cursor-pointer flex items-center gap-3 hover:border-primary transition-all ${activeConfig.visualizationType === 'table' ? 'border-primary ring-1 ring-primary bg-primary/5' : ''}`}
                                                    onClick={() => updateConfig(activeMetric.id, { visualizationType: 'table' })}
                                                >
                                                    <Table className="h-5 w-5 text-muted-foreground" />
                                                    <div>
                                                        <div className="font-medium text-sm">Data Table</div>
                                                        <div className="text-xs text-muted-foreground">View detailed records</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                                Select a metric to configure
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 border-t bg-muted/10 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} className="gap-2">
                        <Save className="h-4 w-4" />
                        Save Configuration
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
