"use client"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { CheckCircle2, Shield, Database, Activity, MapPin, Server, Trash2 } from "lucide-react"
import { getAllConnectors } from "@/lib/connectors/registry"
import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

import { NewConnectorDialog } from "@/components/bank-dashboard/new-connector-dialog"
import { ConnectorConfig } from "@/lib/connectors/types"

export default function ConnectorsPage() {
    const [connectors, setConnectors] = useState<ConnectorConfig[]>([])
    const [activeId, setActiveId] = useState<string | null>(null)

    // Initial Load
    useEffect(() => {
        const saved = sessionStorage.getItem("dashboard_connectors")
        const savedActiveId = sessionStorage.getItem("active_dashboard_connector_id")

        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                setConnectors(parsed)

                // Prefer saved active ID, otherwise default to first
                if (savedActiveId && parsed.find((c: ConnectorConfig) => c.metadata.id === savedActiveId)) {
                    setActiveId(savedActiveId)
                } else if (parsed.length > 0) {
                    setActiveId(parsed[0].metadata.id)
                }
            } catch (e) { console.error(e) }
        } else {
            const defaults = getAllConnectors()
            setConnectors(defaults)
            if (defaults.length > 0) setActiveId(defaults[0].metadata.id)
        }
    }, [])

    // Persist Active Selection
    const handleSetActive = (id: string | null) => {
        setActiveId(id)
        if (id) {
            sessionStorage.setItem("active_dashboard_connector_id", id)
        } else {
            sessionStorage.removeItem("active_dashboard_connector_id")
        }
    }

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation() // Prevent selecting the card when deleting
        if (!confirm("Are you sure you want to remove this connection?")) return

        const updated = connectors.filter(c => c.metadata.id !== id)
        setConnectors(updated)
        sessionStorage.setItem("dashboard_connectors", JSON.stringify(updated))

        // If we deleted the active one, switch to another
        if (activeId === id) {
            handleSetActive(updated.length > 0 ? updated[0].metadata.id : null)
        }
    }

    const handleCreate = (newConfig: ConnectorConfig) => {
        const updated = [...connectors, newConfig]
        setConnectors(updated)
        sessionStorage.setItem("dashboard_connectors", JSON.stringify(updated))
        handleSetActive(newConfig.metadata.id)
    }

    const [handshake, setHandshake] = useState<any>(null)
    const [realDiscovery, setRealDiscovery] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(false)

    const activeConnector = connectors.find(c => c.metadata.id === activeId)

    useEffect(() => {
        if (!activeConnector) return

        const checkConnection = async () => {
            setIsLoading(true)
            setHandshake(null)
            setRealDiscovery(null)

            try {
                // 1. Handshake / Test
                const testRes = await fetch('/api/connectors/bigquery/test')
                const testData = await testRes.json()
                setHandshake(testData)

                if (testData.ok) {
                    // 2. Discover (lightweight initially)
                    const discRes = await fetch('/api/connectors/bigquery/discover?includeSchema=true')
                    const discData = await discRes.json()
                    setRealDiscovery(discData)
                }
            } catch (e) {
                setHandshake({ ok: false, error: 'Network error interacting with connector API.' })
            } finally {
                setIsLoading(false)
            }
        }

        checkConnection()
    }, [activeId])

    // Merge static config with real discovery for display
    // Logic: If real discovery exists, sum up counts. Else fallback.
    const totalDatasets = realDiscovery?.datasets?.length ?? activeConnector?.discovery.totalDatasets ?? 0
    // Sum tables across all datasets
    const totalTables = realDiscovery?.datasets?.reduce((acc: number, ds: any) => acc + ds.tables.length, 0) ?? activeConnector?.discovery.totalTables ?? 0

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <header className="flex h-16 shrink-0 items-center justify-between border-b bg-white px-6">
                <div className="flex items-center gap-2 font-medium">
                    <Database className="h-4 w-4 text-indigo-600" />
                    Data Connectors
                </div>
                <NewConnectorDialog onConnectorCreated={handleCreate} />
            </header>
            <div className="flex-1 p-8 overflow-hidden flex flex-col gap-6">

                {/* Main Content Area */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">

                    {/* Left: Connector List */}
                    <Card className="lg:col-span-1 h-full flex flex-col border-0 shadow-sm ring-1 ring-slate-200">
                        <CardHeader className="pb-4 border-b">
                            <CardTitle className="text-base">Active Connectors</CardTitle>
                        </CardHeader>
                        <ScrollArea className="flex-1">
                            <div className="p-4 flex flex-col gap-3">
                                {connectors.length === 0 && (
                                    <div className="text-center p-8 text-muted-foreground text-sm">
                                        No active connections.
                                    </div>
                                )}
                                {connectors.map(connector => (
                                    <div
                                        key={connector.metadata.id}
                                        onClick={() => handleSetActive(connector.metadata.id)}
                                        className={`p-4 rounded-xl border cursor-pointer shadow-sm relative transition-all group ${activeId === connector.metadata.id
                                            ? 'border-indigo-600 bg-indigo-50/30'
                                            : 'border-border bg-white hover:border-indigo-300'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700">
                                                    <Server className="h-4 w-4" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-sm text-slate-900">{connector.metadata.name}</h3>
                                                    <p className="text-xs text-muted-foreground capitalize">{connector.metadata.provider}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* Status indicator derived from Handshake */}
                                                {activeId === connector.metadata.id && handshake ? (
                                                    <Badge variant="outline" className={`text-[10px] uppercase bg-white ${handshake.ok ? 'text-emerald-600 border-emerald-200' : 'text-red-600 border-red-200'}`}>
                                                        {handshake.ok ? 'Healthy' : 'Error'}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] uppercase bg-white text-slate-500 border-slate-200">Configured</Badge>
                                                )}

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={(e) => handleDelete(e, connector.metadata.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mt-4 text-xs text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <MapPin className="h-3 w-3" />
                                                {connector.metadata.defaultLocation}
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Shield className="h-3 w-3" />
                                                {connector.auth.type.toUpperCase()}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </Card>

                    {/* Right: Detailed View */}
                    <Card className="lg:col-span-2 h-full flex flex-col border-0 shadow-sm ring-1 ring-slate-200 overflow-hidden">
                        {activeConnector ? (
                            <Tabs defaultValue="overview" className="flex-1 flex flex-col">
                                <div className="px-6 pt-6 pb-2">
                                    <TabsList>
                                        <TabsTrigger value="overview">Overview</TabsTrigger>
                                        <TabsTrigger value="schema">Schema & Governance</TabsTrigger>
                                        <TabsTrigger value="validation">Validation Checks</TabsTrigger>
                                        <TabsTrigger value="json">JSON Config</TabsTrigger>
                                    </TabsList>
                                </div>

                                <div className="flex-1 bg-slate-50/50 p-6 overflow-hidden">
                                    <ScrollArea className="h-full pr-4">
                                        <TabsContent value="overview" className="mt-0 space-y-6">
                                            {/* Top Status Area */}
                                            {isLoading && (
                                                <div className="flex items-center gap-2 p-3 bg-blue-50 text-blue-700 text-sm rounded-lg animate-pulse">
                                                    <Activity className="h-4 w-4 animate-spin" />
                                                    Connecting to BigQuery...
                                                </div>
                                            )}

                                            {handshake && !handshake.ok && (
                                                <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-lg text-sm">
                                                    <div className="font-semibold flex items-center gap-2 mb-1">
                                                        <CheckCircle2 className="h-4 w-4" /> Connection Check Failed
                                                    </div>
                                                    {handshake.error}
                                                    {handshake.isConfigError && (
                                                        <div className="mt-2 text-xs opacity-90 p-2 bg-red-100/50 rounded">
                                                            <strong>Tip:</strong> Check your .env file or credentials path.
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="bg-white p-4 rounded-xl border shadow-sm">
                                                    <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Total Datasets</p>
                                                    <p className="text-2xl font-bold text-slate-900">{totalDatasets}</p>
                                                </div>
                                                <div className="bg-white p-4 rounded-xl border shadow-sm">
                                                    <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Total Tables</p>
                                                    <p className="text-2xl font-bold text-slate-900">{totalTables}</p>
                                                </div>
                                                <div className="bg-white p-4 rounded-xl border shadow-sm">
                                                    <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Last Refreshed</p>
                                                    <p className="text-sm font-medium text-slate-900 mt-1.5">
                                                        {realDiscovery ? 'Just now' : 'Never'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                                                <div className="px-6 py-4 border-b bg-slate-50/50">
                                                    <h3 className="font-semibold text-sm">Environment Configuration</h3>
                                                </div>
                                                <div className="p-6 grid grid-cols-2 gap-y-6 gap-x-12">
                                                    <div>
                                                        <label className="text-xs font-medium text-muted-foreground">Detected Project ID</label>
                                                        <p className="text-sm font-medium mt-1 font-mono">
                                                            {handshake?.projectId || activeConnector.metadata.project}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-muted-foreground">Location</label>
                                                        <p className="text-sm font-medium mt-1">
                                                            {handshake?.location || activeConnector.metadata.defaultLocation}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-muted-foreground">Provider</label>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                                            <span className="text-sm capitalize">{activeConnector.metadata.provider}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-xs font-medium text-muted-foreground">Credentials</label>
                                                        <p className="text-sm font-medium mt-1 flex items-center gap-2">
                                                            {handshake?.hasCredentials ? (
                                                                <><CheckCircle2 className="h-3 w-3 text-emerald-600" /> Present</>
                                                            ) : (
                                                                <span className="text-red-500">Missing</span>
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="schema" className="mt-0">
                                            {/* Show Real Discovery */}
                                            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                                                {realDiscovery?.datasets?.length > 0 ? (
                                                    <div className="p-0">
                                                        {realDiscovery.datasets.map((ds: any) => (
                                                            <div key={ds.datasetId} className="border-b last:border-0">
                                                                <div className="bg-slate-50/50 px-4 py-3 flex items-center gap-2 font-medium text-sm">
                                                                    <Database className="h-3.5 w-3.5 text-slate-500" />
                                                                    {ds.datasetId}
                                                                    <span className="text-xs text-muted-foreground font-normal ml-auto">Region: {ds.location || 'Unknown'}</span>
                                                                </div>
                                                                <Table>
                                                                    <TableHeader>
                                                                        <TableRow className="text-xs uppercase bg-slate-50/20">
                                                                            <TableHead className="w-[200px]">Table Name</TableHead>
                                                                            <TableHead>Type</TableHead>
                                                                            <TableHead className="text-right">Rows</TableHead>
                                                                            <TableHead>Schema</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {ds.tables?.map((tbl: any) => (
                                                                            <TableRow key={tbl.tableId}>
                                                                                <TableCell className="font-medium text-sm pl-8 relative">
                                                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 h-full w-[1px] bg-slate-200" />
                                                                                    {tbl.tableId}
                                                                                </TableCell>
                                                                                <TableCell className="text-xs text-muted-foreground uppercase">{tbl.type}</TableCell>
                                                                                <TableCell className="text-right font-mono text-xs">
                                                                                    {tbl.numRows != null ? tbl.numRows.toLocaleString() : '-'}
                                                                                </TableCell>
                                                                                <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                                                                                    {tbl.schema?.map((f: any) => f.name).join(', ') || <span className="italic text-slate-300">Not loaded</span>}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        ))}
                                                                        {(!ds.tables || ds.tables.length === 0) && (
                                                                            <TableRow><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-4">No tables found.</TableCell></TableRow>
                                                                        )}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-center p-12 text-muted-foreground">
                                                        {isLoading ? 'Scanning schema...' : 'No datasets discovered. Check connection.'}
                                                    </div>
                                                )}
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="validation" className="mt-0">
                                            {/* Granular Checks */}
                                            <div className="space-y-4">
                                                {/* 1. Env Check */}
                                                <div className="bg-white p-4 rounded-xl border shadow-sm flex items-start gap-4">
                                                    <div className={`mt-0.5 rounded-full p-1 ${handshake?.hasCredentials ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="text-sm font-medium text-slate-900">Environment Variables</h4>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            Checking <code>GOOGLE_APPLICATION_CREDENTIALS</code> and <code>GOOGLE_CLOUD_PROJECT</code>.
                                                        </p>
                                                        {handshake?.hasCredentials ?
                                                            <p className="text-xs text-emerald-600 mt-2 font-medium">Variables Present</p> :
                                                            <p className="text-xs text-red-600 mt-2 font-medium">Missing Credentials</p>
                                                        }
                                                    </div>
                                                </div>

                                                {/* 2. Reachability */}
                                                <div className="bg-white p-4 rounded-xl border shadow-sm flex items-start gap-4">
                                                    <div className={`mt-0.5 rounded-full p-1 ${handshake?.ok ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="text-sm font-medium text-slate-900">Project Reachability</h4>
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            Attempting to query BigQuery (SELECT 1).
                                                        </p>
                                                        {handshake?.ok ? (
                                                            <p className="text-xs text-emerald-600 mt-2 font-medium">Successfully queried project {handshake.projectId}</p>
                                                        ) : (
                                                            <p className="text-xs text-red-600 mt-2 font-medium">
                                                                {handshake?.error ? `Failed: ${handshake.error}` : 'Waiting for check...'}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* 3. Permissions Advice */}
                                                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-start gap-4">
                                                    <div className="mt-0.5 rounded-full p-1 bg-blue-100 text-blue-600">
                                                        <Activity className="h-4 w-4" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="text-sm font-medium text-blue-900">Permissions Check</h4>
                                                        <p className="text-sm text-blue-700 mt-1 leading-relaxed">
                                                            If discovery fails, ensure your Service Account has <strong>BigQuery User</strong> and <strong>BigQuery Data Viewer</strong> roles.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="json" className="mt-0">
                                            <div className="bg-slate-950 text-slate-50 p-6 rounded-xl overflow-x-auto text-xs font-mono leading-relaxed shadow-inner">
                                                <pre>{JSON.stringify({ ...activeConnector, handshake, realDiscovery }, null, 2)}</pre>
                                            </div>
                                        </TabsContent>
                                    </ScrollArea>
                                </div>
                            </Tabs>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground pb-20">
                                <Server className="h-12 w-12 text-slate-200 mb-4" />
                                <p className="text-sm font-medium">No connector selected</p>
                                <p className="text-xs text-slate-400 mt-1 max-w-xs text-center">Select a connector from the list or add a new one to view details.</p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    )
}
