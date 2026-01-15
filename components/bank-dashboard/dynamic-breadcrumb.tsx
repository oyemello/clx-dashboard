"use client"

import { usePathname } from "next/navigation"
import { BreadcrumbPage } from "@/components/ui/breadcrumb"

export function DynamicBreadcrumb() {
    const pathname = usePathname()
    const pageName = pathname === "/settings" ? "Settings" : "Dashboard"

    return <BreadcrumbPage>{pageName}</BreadcrumbPage>
}
