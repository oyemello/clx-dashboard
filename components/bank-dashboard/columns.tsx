"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Customer } from "@/lib/data"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export const columns: ColumnDef<Customer>[] = [
    {
        accessorKey: "customerId",
        header: "Customer ID",
        cell: ({ row }) => <div className="font-mono text-xs">{row.getValue("customerId")}</div>,
    },
    {
        accessorKey: "segment",
        header: ({ column }) => {
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Segment
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            )
        },
        cell: ({ row }) => <Badge variant="outline">{row.getValue("segment")}</Badge>,
    },
    {
        accessorKey: "riskTier",
        header: "Risk Tier",
        cell: ({ row }) => {
            const tier = row.getValue("riskTier") as string
            return (
                <Badge
                    variant={tier === 'high' ? 'destructive' : tier === 'medium' ? 'secondary' : 'outline'}
                    className="uppercase text-[10px]"
                >
                    {tier}
                </Badge>
            )
        },
    },
    {
        accessorKey: "lifecycleState",
        header: "Lifecycle",
        cell: ({ row }) => <span className="capitalize text-sm text-muted-foreground">{row.getValue("lifecycleState")}</span>,
    },
    {
        accessorKey: "revenue.netContribution",
        header: ({ column }) => (
            <Button
                variant="ghost"
                className="w-full justify-end"
                onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            >
                Net Contribution
                <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
        ),
        cell: ({ row }) => {
            const amount = parseFloat(row.original.revenue.netContribution.toString())
            const formatted = new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
            }).format(amount)

            return <div className="text-right font-medium font-mono">{formatted}</div>
        },
    },
    {
        accessorKey: "behavior.payInFullRate",
        header: "Pay in Full %",
        cell: ({ row }) => {
            const val = row.original.behavior.payInFullRate
            return <div className="text-right text-sm">{(val * 100).toFixed(0)}%</div>
        }
    },
    {
        accessorKey: "behavior.financialStressScore",
        header: "Stress Score",
        accessorFn: (row) => row.behavior.financialStressScore,
        cell: ({ row }) => <div className="text-right font-mono text-xs">{row.original.behavior.financialStressScore}</div>
    },
    {
        accessorKey: "risk.creditRiskScore",
        header: "Credit Score",
        cell: ({ row }) => <div className="text-right font-mono text-xs">{row.original.risk.creditRiskScore}</div>
    },
]
