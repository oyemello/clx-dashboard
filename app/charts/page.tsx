"use client"

import { PageHeader } from "@/components/ui/page-header"
import { ChartStudio } from "@/components/chart-studio/chart-studio"

export default function ChartsPage() {
    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <PageHeader
                title="Chart Studio"
                description="Ask questions, explore metrics, visualize data"
            />
            <div className="flex-1 min-h-0">
                <ChartStudio />
            </div>
        </div>
    )
}
