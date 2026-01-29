"use client"

import { useState } from "react"
import { useMemo } from "react"
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
import { Textarea } from "@/components/ui/textarea"
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
    initialData?: ConnectorConfig
    children?: React.ReactNode
}

export function NewConnectorDialog({ onConnectorCreated, initialData, children }: NewConnectorDialogProps) {
    const [open, setOpen] = useState(false)
    const [step, setStep] = useState<'details' | 'code'>('details')

    // Initialize form with defaults or initialData
    const [formData, setFormData] = useState({
        name: initialData?.metadata.name || '',
        provider: initialData?.metadata.provider || '',
        id: initialData?.metadata.id || '',
        region: initialData?.metadata.defaultLocation || '',
        project: initialData?.metadata.project || '',
        dataset: initialData?.sources?.[0]?.id || '',
        jsonContent: initialData?.auth.jsonContent || ''
    })

    const isEditMode = !!initialData

    // Stable ID to avoid SSR/CSR hydration mismatches from Radix auto-generated IDs
    const dialogContentId = useMemo(() => {
        const base = initialData?.metadata.id || 'new-connector'
        return `dialog-${base.replace(/[^a-zA-Z0-9_-]/g, '-')}`
    }, [initialData?.metadata.id])

    const generateId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '_')

    const createConfigObject = (): ConnectorConfig => {
        return {
            metadata: {
                id: formData.id || generateId(formData.name) || 'new_connector',
                name: formData.name,
                provider: formData.provider as ConnectorProvider,
                environments: ['dev', 'prod'],
                defaultLocation: formData.region || 'US',
                project: formData.project
            },
            auth: {
                type: 'service_account',
                jsonContent: formData.jsonContent
            },
            sources: initialData?.sources?.length
                ? initialData.sources
                : formData.dataset
                    ? [{
                        id: formData.dataset,
                        description: 'User-specified dataset',
                        governance: {
                            owner: '',
                            piiClassification: 'sensitive',
                            retentionPolicy: '',
                            allowedConsumers: [],
                        },
                        tables: []
                    }]
                    : [],
            validation: initialData?.validation || [],
            discovery: initialData?.discovery || {
                totalDatasets: 0,
                totalTables: 0,
                lastRefreshed: new Date().toISOString(),
                schemaHash: ''
            }
        }
    }

    const handleCreate = () => {
        if (!formData.name || !formData.provider || !formData.project || !formData.dataset || !formData.jsonContent) return

        const newConfig = createConfigObject()

        if (onConnectorCreated) {
            onConnectorCreated(newConfig)
            setOpen(false)
            if (!isEditMode) {
                setFormData({ name: '', provider: '', id: '', region: '', project: '', dataset: '', jsonContent: '' })
                setStep('details')
            }
        } else {
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
                {children || (
                    <Button className="bg-[#006fcf] hover:bg-[#0059b3] text-white gap-2">
                        <Plus className="h-4 w-4" />
                        New Connection
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent id={dialogContentId} className="sm:max-w-[700px]">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Connection' : 'Add New Connection'}</DialogTitle>
                    <DialogDescription>
                        {isEditMode ? 'Update connection details.' : 'Configure a new enterprise data source.'}
                    </DialogDescription>
                </DialogHeader>

                {step === 'details' ? (
                    <div className="grid gap-4 py-4 max-h-[75vh] overflow-y-auto px-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Provider</Label>
                                <Select
                                    value={formData.provider}
                                    onValueChange={(v) => setFormData(prev => ({ ...prev, provider: v }))}
                                >
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
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <Label>Service Account JSON</Label>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="file"
                                        accept=".json"
                                        className="hidden"
                                        id="file-upload"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onload = (ev) => {
                                                    try {
                                                        const text = ev.target?.result as string;
                                                        const json = JSON.parse(text);
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            jsonContent: text,
                                                            project: json.project_id || prev.project,
                                                            // Auto-fill provider if applicable
                                                            provider: prev.provider || 'bigquery'
                                                        }));
                                                    } catch (err) {
                                                        console.error("Invalid JSON file");
                                                    }
                                                };
                                                reader.readAsText(file);
                                            }
                                        }}
                                    />
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-6 text-xs"
                                        onClick={() => document.getElementById('file-upload')?.click()}
                                    >
                                        Upload Key File
                                    </Button>
                                </div>
                            </div>
                            <Textarea
                                className="h-24 font-mono text-xs resize-none w-full max-w-full break-all"
                                placeholder='Paste contents or upload .json file...'
                                value={formData.jsonContent || ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    setFormData(prev => ({ ...prev, jsonContent: val }));
                                    // Try to auto-extract project ID from paste
                                    try {
                                        const json = JSON.parse(val);
                                        if (json.project_id) {
                                            setFormData(prev => ({ ...prev, project: json.project_id }));
                                        }
                                    } catch { }
                                }}
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Upload your service account key file. This will automatically populate the Project ID.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label>Display Name</Label>
                            <Input
                                placeholder="Marketing Warehouse"
                                value={formData.name}
                                onChange={e => {
                                    const newName = e.target.value;
                                    setFormData(prev => ({
                                        ...prev,
                                        name: newName,
                                        // Only auto-update ID if NOT in edit mode
                                        id: isEditMode ? prev.id : generateId(newName)
                                    }))
                                }}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Connector ID</Label>
                            <Input
                                value={formData.id}
                                onChange={e => setFormData(prev => ({ ...prev, id: e.target.value }))}
                                className="font-mono text-xs"
                                disabled={isEditMode} // Lock ID in edit mode
                            />
                            {isEditMode && <p className="text-[10px] text-muted-foreground">ID cannot be changed after creation.</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>Project / Account ID</Label>
                            <Input
                                placeholder="gcp-project-id or snowflake-account"
                                value={formData.project}
                                onChange={e => setFormData(prev => ({ ...prev, project: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Dataset ID</Label>
                            <Input
                                placeholder="e.g. clx_exec"
                                value={formData.dataset}
                                onChange={e => setFormData(prev => ({ ...prev, dataset: e.target.value }))}
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
                                {isEditMode ? 'Save Changes' : 'Create Connection'}
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
