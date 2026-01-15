"use client"

import { getBankData } from "@/lib/data"
import { DashboardShell } from "@/components/bank-dashboard/dashboard-shell"

export default function Page() {
    const data = getBankData()

    return (
        <DashboardShell data={data.customers} />
    )
}