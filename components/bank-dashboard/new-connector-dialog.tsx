"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Check, Clipboard, Plus, Code2 } from "lucide-react"
import { ConnectorConfig, ConnectorProvider } from "@/lib/connectors/types"

interface NewConnectorDialogProps {
    onConnectorCreated?: (config: ConnectorConfig) => void
}

export function NewConnectorDialog({ onConnectorCreated }: NewConnectorDialogProps) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<'details' | 'code'>('details')
    const [formData, setFormData] = useState({
        name: '',
        provider: '',
        id: '',
        region: '',
        project: ''
    })

    const generateId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '_')

    const createConfigObject = (): ConnectorConfig => {
        return {
            metadata: {
                id: formData.id || 'new_connector',
                name: formData.name,
                provider: formData.provider as ConnectorProvider,
                environments: ['dev', 'prod'],
                defaultLocation: formData.region || 'us-east1',
                project: formData.project || 'my-project-id'
            },
            auth: {
                type: 'service_account',
            },
            sources: [],
            validation: [],
            discovery: {
                totalDatasets: 0,
                totalTables: 0,
                lastRefreshed: new Date().toISOString(),
                schemaHash: ''
            }
        }
    }

    const handleCreate = () => {
        if (!formData.name || !formData.provider) return

        const newConfig = createConfigObject()

        if (onConnectorCreated) {
            onConnectorCreated(newConfig)
            setOpen(false)
            // Reset form
            setFormData({ name: '', provider: '', id: '', region: '', project: '' })
            setStep('details')
        } else {
            // Fallback to code view involved
            setStep('code')
        }
    }

    const generatedCode = `import { ConnectorConfig } from "../types";

export const ${formData.id ? formData.id.toUpperCase() : 'NEW_CONNECTOR'}: ConnectorConfig = ${JSON.stringify(createConfigObject(), null, 4)}`

    const [copied, setCopied] = useState(false)
    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
                    <Plus className="h-4 w-4" />
                    New Connection
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Add New Connection</DialogTitle>
                    <DialogDescription>
                        Configure a new enterprise data source.
                    </DialogDescription>
                </DialogHeader>

                {step === 'details' ? (
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Provider</Label>
                                <Select onValueChange={(v) => setFormData(prev => ({ ...prev, provider: v }))}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select platform" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bigquery">Google BigQuery</SelectItem>
                                        <SelectItem value="snowflake">Snowflake</SelectItem>
                                        <SelectItem value="redshift">Redshift</SelectItem>
                                        <SelectItem value="postgres">PostgreSQL</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Region</Label>
                                <Input
                                    placeholder="e.g. us-east1"
                                    value={formData.region}
                                    onChange={e => setFormData(prev => ({ ...prev, region: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Display Name</Label>
                            <Input
                                placeholder="Marketing Warehouse"
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value, id: generateId(e.target.value) }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Connector ID</Label>
                            <Input
                                value={formData.id}
                                onChange={e => setFormData(prev => ({ ...prev, id: e.target.value }))}
                                className="font-mono text-xs"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Project / Account ID</Label>
                            <Input
                                placeholder="gcp-project-id or snowflake-account"
                                value={formData.project}
                                onChange={e => setFormData(prev => ({ ...prev, project: e.target.value }))}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="py-4 space-y-4">
                        <div className="rounded-lg bg-slate-950 p-4 border border-slate-800 relative group">
                            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button size="icon" variant="secondary" className="h-8 w-8" onClick={copyToClipboard}>
                                    {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Clipboard className="h-4 w-4" />}
                                </Button>
                            </div>
                            <pre className="text-xs font-mono text-slate-50 overflow-x-auto p-2">
                                {generatedCode}
                            </pre>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                            <Code2 className="h-4 w-4" />
                            <span>Add this file to <strong>lib/connectors/instances/</strong> and register it in <strong>registry.ts</strong></span>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    {step === 'details' ? (
                        <div className="flex gap-2 justify-end w-full">
                            <Button variant="ghost" onClick={() => setStep('code')} disabled={!formData.name || !formData.provider}>
                                View Code
                            </Button>
                            <Button onClick={handleCreate} disabled={!formData.name || !formData.provider}>
                                Create Connection
                            </Button>
                        </div>
                    ) : (
                        <Button variant="outline" onClick={() => setOpen(false)}>
                            Done
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
