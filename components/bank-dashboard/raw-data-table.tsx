"use client"

import * as React from "react"
import {
    ColumnDef,
    ColumnFiltersState,
    SortingState,
    VisibilityState,
    flexRender,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useReactTable,
} from "@tanstack/react-table"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings2, Database } from "lucide-react"
import useSWR from "swr"
import { fetcher } from "@/lib/api/fetcher"

interface DataTableProps<TData, TValue> {
    columns: ColumnDef<TData, TValue>[]
    projectId?: string | null
    datasetId?: string | null
}

export function RawDataTable<TData, TValue>({
    columns,
    projectId,
    datasetId
}: DataTableProps<TData, TValue>) {
    const [sorting, setSorting] = React.useState<SortingState>([])
    const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
    const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})

    // Pagination State (Server-Side)
    const [pagination, setPagination] = React.useState({
        pageIndex: 0,
        pageSize: 10, // Default limit
    })

    // SWR Fetch
    const offset = pagination.pageIndex * pagination.pageSize
    // TODO: Connect segment filter dynamically if needed. For now, fetch all.
    // If strict type safety is needed for 'columns', we cast the result.
    // The API returns Customer-like objects.
    const canQuery = !!projectId && !!datasetId
    const { data: apiData, isLoading } = useSWR(
        canQuery ? `/api/raw/customers?limit=${pagination.pageSize}&offset=${offset}&projectId=${projectId}&datasetId=${datasetId}` : null,
        fetcher,
        {
            keepPreviousData: true
        }
    )

    const defaultData = React.useMemo(() => [], [])

    // eslint-disable-next-line react-hooks/incompatible-library
    const table = useReactTable({
        data: (apiData as TData[]) || defaultData,
        columns,
        pageCount: -1, // Unknown total count
        manualPagination: true, // Server-side
        getCoreRowModel: getCoreRowModel(),
        onSortingChange: setSorting,
        getSortedRowModel: getSortedRowModel(),
        onColumnFiltersChange: setColumnFilters,
        getFilteredRowModel: getFilteredRowModel(),
        onColumnVisibilityChange: setColumnVisibility,
        onPaginationChange: setPagination,
        state: {
            sorting,
            columnFilters,
            columnVisibility,
            pagination,
        },
    })

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center py-4 gap-2">
                    {/* Filter input removed or needs debounced server-side search. 
                       Keeping client-side filtering on current page for now/disabled as API doesn't support text search yet.
                       Re-enabling placeholder input for UI consistency but it won't trigger API search unless wired.
                   */}
                    {(() => {
                        const filterKey = table.getColumn("customer_id") ? "customer_id" : (table.getColumn("customerId") ? "customerId" : null);
                        return (
                            <Input
                                placeholder="Filter customers (Client-side)"
                                value={filterKey ? (table.getColumn(filterKey)?.getFilterValue() as string) ?? "" : ""}
                                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                    filterKey && table.getColumn(filterKey)?.setFilterValue(event.target.value)
                                }
                                className="max-w-sm h-8"
                                disabled={!canQuery || !filterKey}
                            />
                        )
                    })()}
                    {isLoading && <span className="text-xs text-muted-foreground animate-pulse">Loading data...</span>}
                    {!isLoading && apiData && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-medium">
                            <Database className="w-3 h-3" />
                            Live: BigQuery
                        </div>
                    )}
                    {!canQuery && (
                        <span className="text-xs text-muted-foreground">Connect a data source to load customers.</span>
                    )}
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="ml-auto flex gap-2">
                            <Settings2 className="w-4 h-4" />
                            View
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {table
                            .getAllColumns()
                            .filter(
                                (column: any) => column.getCanHide()
                            )
                            .map((column: any) => {
                                return (
                                    <DropdownMenuCheckboxItem
                                        key={column.id}
                                        className="capitalize"
                                        checked={column.getIsVisible()}
                                        onCheckedChange={(value: boolean) =>
                                            column.toggleVisibility(!!value)
                                        }
                                    >
                                        {column.id}
                                    </DropdownMenuCheckboxItem>
                                )
                            })}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="rounded-md border bg-background">
                <Table>
                    <TableHeader>
                        {table.getHeaderGroups().map((headerGroup: any) => (
                            <TableRow key={headerGroup.id}>
                                {headerGroup.headers.map((header: any) => {
                                    return (
                                        <TableHead key={header.id}>
                                            {header.isPlaceholder
                                                ? null
                                                : flexRender(
                                                    header.column.columnDef.header,
                                                    header.getContext()
                                                )}
                                        </TableHead>
                                    )
                                })}
                            </TableRow>
                        ))}
                    </TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row: any) => (
                                <TableRow
                                    key={row.id}
                                    data-state={row.getIsSelected() && "selected"}
                                    className="hover:bg-muted/50"
                                    onClick={() => console.log("Row clicked", row.original)} // Placeholder for interaction
                                >
                                    {row.getVisibleCells().map((cell: any) => (
                                        <TableCell key={cell.id} className="py-2">
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell
                                    colSpan={columns.length}
                                    className="h-24 text-center"
                                >
                                    {isLoading ? "Loading..." : canQuery ? "No results." : "Connect a data source to view rows."}
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage() && (!apiData || apiData.length < pagination.pageSize)}
                >
                    Next
                </Button>
            </div>
        </div>
    )
}
