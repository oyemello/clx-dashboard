"use client"

import * as React from "react"
import {
    LayoutDashboard,
    Settings2,
    Command,
    Database,
    SlidersHorizontal,
    LineChart,
    BarChart2,
} from "lucide-react"

import { usePathname } from "next/navigation"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuItem,
    SidebarMenuButton,
    SidebarGroup,
    SidebarGroupContent,
    SidebarTrigger,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { PersonaSelector } from "@/components/persona-selector"

// Simplified data
const data = {
    user: {
        name: "Analyst User",
        email: "analyst@amex-bench.com",
        avatar: "",
    },
    navMain: [
        {
            title: "Dashboard",
            url: "/",
            icon: LayoutDashboard,
        },
        {
            title: "Metrics Config",
            url: "/metrics-config",
            icon: SlidersHorizontal,
        },

        {
            title: "Connectors",
            url: "/connectors",
            icon: Database,
        },
        {
            title: "Insights",
            url: "/insights",
            icon: LineChart,
        },
        {
            title: "Chart Studio",
            url: "/charts",
            icon: BarChart2,
        }
    ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
    const pathname = usePathname()

    return (
        <Sidebar collapsible="icon" {...props} >
            <SidebarContent className="p-2">
                <SidebarMenu>
                    {data.navMain.map((item) => (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton tooltip={item.title} isActive={pathname === item.url} asChild>
                                <a href={item.url}>
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </a>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
                <div className="mt-auto flex flex-col gap-2">
                    <PersonaSelector />
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton tooltip="Settings" isActive={pathname === "/settings"} asChild>
                                <a href="/settings">
                                    <Settings2 />
                                    <span>Settings</span>
                                </a>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                        <SidebarMenuItem>
                            <SidebarTrigger />
                        </SidebarMenuItem>
                    </SidebarMenu>
                </div>
            </SidebarContent>
        </Sidebar>
    )
}
