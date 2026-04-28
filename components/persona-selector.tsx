
"use client"

import * as React from "react"
import useSWR from "swr"
import { Users } from "lucide-react"
import { cn } from "@/lib/utils"
import { usePersona } from "@/components/persona-provider"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function PersonaSelector() {
    const { selectedPersona, setSelectedPersona } = usePersona()
    const { state } = useSidebar()
    const { data, error, isLoading } = useSWR("/api/personas", fetcher)
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    const personas = data?.personas || []
    const isCollapsed = state === "collapsed"

    if (!mounted) return (
        <SidebarMenu>
            <SidebarMenuItem className={cn("px-2 py-2", isCollapsed && "px-1")}>
                <div className="h-8 w-full bg-muted/50 rounded-md animate-pulse" />
            </SidebarMenuItem>
        </SidebarMenu>
    )

    const selector = (
        <Select
            value={selectedPersona || "all"}
            onValueChange={(val) => setSelectedPersona(val === "all" ? null : val)}
        >
            <SelectTrigger className={cn(
                "h-8 w-full bg-muted/50 border-none hover:bg-muted transition-colors px-2",
                isCollapsed && "justify-center px-0"
            )}>
                <div className="flex items-center gap-2 overflow-hidden">
                    <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    {!isCollapsed && <SelectValue placeholder="All Personas" />}
                </div>
            </SelectTrigger>
            <SelectContent side={isCollapsed ? "right" : "bottom"} align="start">
                <SelectItem value="all">All Personas</SelectItem>
                {personas.map((persona: string) => (
                    <SelectItem key={persona} value={persona}>
                        {persona}
                    </SelectItem>
                ))}
                {isLoading && <div className="p-2 text-xs text-muted-foreground">Loading...</div>}
                {error && <div className="p-2 text-xs text-destructive">Failed to load</div>}
            </SelectContent>
        </Select>
    )

    return (
        <SidebarMenu>
            <SidebarMenuItem className={cn("px-2 py-2", isCollapsed && "px-1")}>
                <div className="flex flex-col gap-2">
                    {!isCollapsed && (
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">
                            Select Persona
                        </label>
                    )}
                    {isCollapsed ? (
                        <Tooltip>
                            <TooltipTrigger asChild>
                                {selector}
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                {selectedPersona || "All Personas"}
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        selector
                    )}
                </div>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
