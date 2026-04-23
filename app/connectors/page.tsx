"use client"

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { CheckCircle2, Shield, Database, Activity, MapPin, Server, Trash2, Pencil, Table as TableIcon, Loader2 } from "lucide-react"
import { getAllConnectors } from "@/lib/connectors/registry"
import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

import { NewConnectorDialog } from "@/components/bank-dashboard/new-connector-dialog"
import { ConnectorConfig } from "@/lib/connectors/types"
import { generateMetricsFromSchema } from "@/lib/connectors/generator"
import { PageHeader } from "@/components/ui/page-header"

export default function ConnectorsPage() {
    const [connectors, setConnectors] = useState<ConnectorConfig[]>([])
    const [activeId, setActiveId] = useState<string | null>(null)
    const [handshake, setHandshake] = useState<any>(null)
    const [realDiscovery, setRealDiscovery] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        // VERSION CHECK: Force clear old data
        const currentVersion = "v2_clean"
        const savedVersion = sessionStorage.getItem("dashboard_version")
        if (savedVersion !== currentVersion) {
            sessionStorage.removeItem("dashboard_connectors")
            sessionStorage.removeItem("active_dashboard_connector_id")
            sessionStorage.setItem("dashboard_version", currentVersion)
            // Reload to ensure we start clean
            window.location.reload()
            return
        }

        // Load persist
        const saved = sessionStorage.getItem("dashboard_connectors")
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                setConnectors(parsed)
                // If we possess saved connectors, try to restore active selection
                const savedActiveId = sessionStorage.getItem("active_dashboard_connector_id")
                if (savedActiveId && parsed.find((c: any) => c.metadata.id === savedActiveId)) {
                    setActiveId(savedActiveId)
                } else if (parsed.length > 0) {
                    setActiveId(parsed[0].metadata.id)
                }
            } catch (e) {
                console.error("Failed to load saved connectors", e)
            }
        }
    }, [])

    const activeConnector = connectors.find(c => c.metadata.id === activeId)

    useEffect(() => {
        if (!activeConnector) {
            setHandshake(null)
            setRealDiscovery(null)
            return
        }

        const checkConnection = async () => {
            setIsLoading(true)
            setHandshake(null)
            setRealDiscovery(null)
            try {
                // Determine provider and use appropriate endpoint
                const provider = activeConnector.metadata.provider
                const testEndpoint = `/api/connectors/${provider}/test`
                const discoverEndpoint = `/api/connectors/${provider}/discover`

                // 1. Handshake (POST with config)
                const res = await fetch(testEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ connector: activeConnector })
                })
                const data = await res.json()
                setHandshake(data)

                if (data.ok) {
                    // 2. Real Discovery (POST with config)
                    const discRes = await fetch(discoverEndpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ connector: activeConnector, type: 'datasets' })
                    })
                    const discData = await discRes.json()
                    setRealDiscovery(discData)

                    // 3. Auto-Generate Metrics
                    const generatedMetrics = generateMetricsFromSchema(discData)
                    // Deep compare to ensure we catch property changes (like dateColumn removal)
                    const metricsChanged = JSON.stringify(activeConnector.metrics) !== JSON.stringify(generatedMetrics)
                    const discoveryMissing = !activeConnector.discovery
                    const discoveryChanged = activeConnector.discovery?.schemaHash !== discData.schemaHash

                    if (metricsChanged || discoveryMissing || discoveryChanged) {
                        // Update connector with new metrics + discovery (even if none generated)
                        const updatedConnector = { ...activeConnector, metrics: generatedMetrics, discovery: discData }
                        handleUpdate(updatedConnector)
                    }
                }
            } catch (e) {
                console.error("Connection check failed", e)
            } finally {
                setIsLoading(false)
            }
        }

        checkConnection()
    }, [activeConnector])

    // Derived stats
    const totalDatasets = realDiscovery?.datasets?.length || 0
    const totalTables = realDiscovery?.datasets?.reduce((acc: number, ds: any) => acc + (ds.tables?.length || 0), 0) || 0

    // Persist Active Selection
    const handleSetActive = (id: string | null) => {
        setActiveId(id)
        if (id) {
            sessionStorage.setItem("active_dashboard_connector_id", id)
        } else {
            sessionStorage.removeItem("active_dashboard_connector_id")
        }
        // Notify DashboardShell
        window.dispatchEvent(new Event("dashboard_connector_changed"))
    }

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        if (!confirm("Are you sure you want to remove this connection?")) return

        const updated = connectors.filter(c => c.metadata.id !== id)
        setConnectors(updated)
        sessionStorage.setItem("dashboard_connectors", JSON.stringify(updated))

        if (activeId === id) {
            handleSetActive(updated.length > 0 ? updated[0].metadata.id : null)
        } else {
            // Even if active didn't change (it wasn't this one), the list changed
            window.dispatchEvent(new Event("dashboard_connector_changed"))
        }
    }

    const handleCreate = (newConfig: ConnectorConfig) => {
        const updated = [...connectors, newConfig]
        setConnectors(updated)
        sessionStorage.setItem("dashboard_connectors", JSON.stringify(updated))
        handleSetActive(newConfig.metadata.id)
    }

    const handleUpdate = (updatedConfig: ConnectorConfig) => {
        const updated = connectors.map(c => c.metadata.id === updatedConfig.metadata.id ? updatedConfig : c)
        setConnectors(updated)
        sessionStorage.setItem("dashboard_connectors", JSON.stringify(updated))
        // Refresh active if we updated the active one
        if (activeId === updatedConfig.metadata.id) {
            sessionStorage.setItem("active_dashboard_connector_id", updatedConfig.metadata.id)
        }
        window.dispatchEvent(new Event("dashboard_connector_changed"))
    }

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)]">
            <PageHeader
                title="Data Sources"
                description="Manage external connections and schemas."
            >
                <div className="flex items-center gap-2">
                    <NewConnectorDialog onConnectorCreated={handleCreate} />
                </div>
            </PageHeader>

            <div className="flex-1 p-2 max-w-[1600px] mx-auto w-full overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 h-full">
                    {/* Left: Connector List */}
                    <Card className="lg:col-span-1 h-full flex flex-col border-0 shadow-sm ring-1 ring-slate-200 overflow-hidden py-0 gap-0">
                        <div className="px-4 h-18 border-b bg-slate-50/50 flex items-center justify-between shrink-0">
                            <h2 className="font-semibold text-sm">Active Connections</h2>
                            <Badge variant="outline" className="bg-white">
                                {connectors.length} Source{connectors.length !== 1 ? 's' : ''}
                            </Badge>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-slate-50/30">
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
                                        className={`group relative rounded-xl border transition-all hover:shadow-md cursor-pointer overflow-hidden ${activeId === connector.metadata.id
                                            ? 'bg-white border-[#006fcf] ring-1 ring-[#006fcf] shadow-sm'
                                            : 'bg-white border-slate-200 hover:border-[#006fcf]/30'
                                            }`}
                                    >
                                        {/* Header / Main Info */}
                                        <div className="p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${activeId === connector.metadata.id ? 'bg-[#006fcf]/10 text-[#006fcf]' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        <Server className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-semibold text-sm text-slate-900 leading-none mb-1.5">{connector.metadata.name}</h3>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <span className="capitalize">{connector.metadata.provider}</span>
                                                            <span className="text-slate-300">•</span>
                                                            <span className="font-mono">{connector.metadata.project}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Actions - Top Right */}
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <div onClick={e => e.stopPropagation()}>
                                                        <NewConnectorDialog
                                                            initialData={connector}
                                                            onConnectorCreated={handleUpdate}
                                                        >
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-slate-400 hover:text-[#006fcf] hover:bg-[#006fcf]/10"
                                                                title="Edit Connection"
                                                            >
                                                                <Pencil className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </NewConnectorDialog>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                        title="Delete Connection"
                                                        onClick={(e) => handleDelete(e, connector.metadata.id)}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* Status Badge - Absolute or In Flow? In flow looks better for fit */}
                                            <div className="mt-3 flex items-center justify-between">
                                                <div className="flex gap-1.5">
                                                    {activeId === connector.metadata.id && handshake ? (
                                                        <Badge variant="outline" className={`text-[10px] h-5 px-1.5 uppercase bg-white ${handshake.ok ? 'text-emerald-600 border-emerald-200' : 'text-red-600 border-red-200'}`}>
                                                            {handshake.ok ? 'Healthy' : 'Error'}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 uppercase bg-slate-50 text-slate-500 border-slate-200">Configured</Badge>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                                                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {connector.metadata.defaultLocation}</span>
                                                    <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {connector.auth.type === 'service_account' ? 'SA' : 'OAUTH'}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions Footer - Visible on Hover or Active */}
                                        {/* Metrics Footer - Replaces Actions */}
                                        <div className={`border-t bg-slate-50/50 transition-all ${activeId === connector.metadata.id ? 'opacity-100' : 'opacity-100'}`}>
                                            <div className="grid grid-cols-3 divide-x divide-slate-200/50">
                                                <div className="p-3 flex flex-col items-center justify-center text-center">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                                        <Database className="h-3 w-3" />
                                                        <span className="sr-only">Datasets</span>
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-700">
                                                        {activeId === connector.metadata.id ? totalDatasets : '-'}
                                                    </span>
                                                </div>
                                                <div className="p-3 flex flex-col items-center justify-center text-center">
                                                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                                        <TableIcon className="h-3 w-3" />
                                                        <span className="sr-only">Tables</span>
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-700">
                                                        {activeId === connector.metadata.id ? totalTables : '-'}
                                                    </span>
                                                </div>
                                                <div className="p-3 flex flex-col items-center justify-center text-center relative group/actions">
                                                    {/* Show Time normally, but Actions on Hover? User said remove Actions text. 
                                                        I will show Last Refreshed here. 
                                                        But where do Actions (Edit/Delete) go? 
                                                        Maybe floating top right of the card is better? 
                                                        I'll add the actions buttons to the top-right header area in a separate edit if needed. 
                                                        For now, I'll place the Refreshed metric here. */}
                                                    <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                                        {(activeId === connector.metadata.id && isLoading) ? (
                                                            <Loader2 className="h-3 w-3 animate-spin text-[#006fcf]" />
                                                        ) : (
                                                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                                        )}
                                                        <span className="sr-only">Refreshed</span>
                                                    </div>
                                                    <span className="text-xs font-medium text-slate-700 truncate max-w-full px-1">
                                                        {activeId === connector.metadata.id ? (realDiscovery ? 'Just now' : 'Never') : '-'}
                                                    </span>

                                                    {/* Overlay Actions on this cell on hover? or just add them to header? 
                                                    I will add them to the Header section in the next chunk/edit to ensure they are accessible. */}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </Card>

                    {/* Right: Detailed View */}
                    <Card className="lg:col-span-2 h-full flex flex-col border-0 shadow-sm ring-1 ring-slate-200 overflow-hidden py-0 gap-0">
                        {activeConnector ? (
                            <Tabs defaultValue="schema" className="flex-1 flex flex-col gap-0">
                                <div className="px-4 h-18 flex items-center border-b shrink-0">
                                    <TabsList>
                                        <TabsTrigger value="schema">Schema & Governance</TabsTrigger>
                                        <TabsTrigger value="validation">Validation Checks</TabsTrigger>
                                        <TabsTrigger value="json">JSON Config</TabsTrigger>
                                    </TabsList>
                                </div>

                                <div className="flex-1 bg-slate-50/50 relative overflow-hidden">
                                    <div className="absolute inset-0 overflow-y-auto p-4">

                                        <TabsContent value="schema" className="mt-0">
                                            {/* Show Real Discovery */}
                                            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                                                {realDiscovery?.datasets?.length > 0 ? (
                                                    <div className="p-0">
                                                        {realDiscovery.datasets.map((ds: any) => (
                                                            <div key={ds.id || ds.datasetId} className="border-b last:border-0">
                                                                <div className="bg-slate-50/50 px-4 py-3 flex items-center font-medium text-sm gap-2">
                                                                    <Database className="h-3.5 w-3.5 text-slate-500" />
                                                                    {ds.id || ds.datasetId}
                                                                    <span className="text-xs text-muted-foreground font-normal ml-auto">Region: {ds.location || 'Unknown'}</span>
                                                                </div>
                                                                <Table className="w-full border border-slate-200 [&_th]:border [&_td]:border [&_th]:border-slate-200 [&_td]:border-slate-200 [&_th]:bg-slate-50/50 [&_th]:text-xs [&_th]:uppercase [&_td]:align-top">
                                                                    <TableHeader>
                                                                        <TableRow className="border-b-0">
                                                                            <TableHead className="w-[200px]">Table Name</TableHead>
                                                                            <TableHead>Type</TableHead>
                                                                            <TableHead className="text-right">Rows</TableHead>
                                                                            <TableHead>Schema</TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {ds.tables?.map((tbl: any) => (
                                                                            <TableRow key={tbl.id || tbl.tableId} className="border-b-0">
                                                                                <TableCell className="font-medium text-sm">
                                                                                    {tbl.id || tbl.tableId}
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
                                                                            <TableRow className="border-b-0"><TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-4">No tables found.</TableCell></TableRow>
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
                                    </div>
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
                </div >
            </div >
        </div >
    )
}
