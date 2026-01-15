"use client"

import { Customer } from "@/lib/data"
import { RawDataTable } from "./raw-data-table"
import { columns } from "./columns"

interface DataExplorerProps {
    data: Customer[];
}

export function DataExplorer({ data }: DataExplorerProps) {
    return (
        <div className="w-full h-full p-6 animate-in fade-in duration-500">
            <div className="mb-6 space-y-1">
                <h2 className="text-2xl font-semibold tracking-tight">Data Explorer</h2>
                <p className="text-sm text-muted-foreground">
                    Raw dataset • {data.length} records • read-only
                </p>
            </div>
            <RawDataTable columns={columns} data={data} />
        </div>
    )
}
