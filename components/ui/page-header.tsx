import * as React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string
    description?: React.ReactNode
    children?: React.ReactNode
}

export function PageHeader({ title, description, children, className, ...props }: PageHeaderProps) {
    return (
        <div className={cn("border-b px-6 flex items-center justify-between bg-card text-card-foreground h-16 shrink-0", className)} {...props}>
            <div className="flex items-center gap-4">
                <h1 className="text-lg font-semibold tracking-tight text-foreground/90">
                    {title}
                </h1>
                {description && (
                    <span className="text-sm text-muted-foreground border-l pl-4">
                        {description}
                    </span>
                )}
            </div>
            {children && (
                <div className="flex items-center gap-4">
                    {children}
                </div>
            )}
        </div>
    )
}
