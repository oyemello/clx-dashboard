"use client"

import { useTheme } from "next-themes"
import { Moon, Sun, Monitor } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/ui/page-header"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useColorTheme } from "@/components/color-theme-provider"
import { useState, useEffect } from "react"
import { Check, Loader2 } from "lucide-react"
import { useCardSettings } from "@/components/card-settings-provider"

export function SettingsPanel() {
    const { setTheme, theme } = useTheme()
    const { colorTheme, setColorTheme } = useColorTheme()
    const [pendingColorTheme, setPendingColorTheme] = useState<"amex" | "slate">(colorTheme)
    const [isSaving, setIsSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const [mounted, setMounted] = useState(false)

    // Sync local state with global state initially
    useEffect(() => {
        setPendingColorTheme(colorTheme)
        setMounted(true)
    }, [colorTheme])

    if (!mounted) {
        return null // or a loading spinner
    }

    const handleSave = () => {
        setIsSaving(true)
        // Simulate network delay or just show satisfying loading state
        setTimeout(() => {
            setColorTheme(pendingColorTheme)
            setIsSaving(false)
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        }, 600)
    }

    return (
        <div className="flex flex-col h-full bg-background">
            <PageHeader
                title="Settings"
                description="Customize the look and feel of the platform."
            />

            <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
                <Tabs defaultValue="appearance" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="appearance">Appearance</TabsTrigger>
                        <TabsTrigger value="card-metrics">Card Metrics</TabsTrigger>
                    </TabsList>



                    <TabsContent value="appearance" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Appearance</CardTitle>
                                <CardDescription>Customize the look and feel of the platform.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Active Theme</Label>
                                    <div className="flex items-center gap-4">
                                        <Select value={pendingColorTheme} onValueChange={(v: string) => setPendingColorTheme(v as "amex" | "slate")}>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Select theme" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="amex">AMEX Blue</SelectItem>
                                                <SelectItem value="slate">Default (Slate)</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Button
                                            onClick={handleSave}
                                            disabled={isSaving || pendingColorTheme === colorTheme}
                                            className="min-w-[100px]"
                                        >
                                            {isSaving ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : saved ? (
                                                <Check className="mr-2 h-4 w-4" />
                                            ) : null}
                                            {saved ? "Saved" : "Save"}
                                        </Button>
                                    </div>
                                    <p className="text-[0.8rem] text-muted-foreground">
                                        Choose your preferred color branding.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    <Label>Mode</Label>
                                    <div className="grid grid-cols-3 gap-2 max-w-md">
                                        <Button
                                            variant={theme === "light" ? "default" : "outline"}
                                            className="justify-start gap-2"
                                            onClick={() => setTheme("light")}
                                        >
                                            <Sun className="h-4 w-4" /> Light
                                        </Button>
                                        <Button
                                            variant={theme === "dark" ? "default" : "outline"}
                                            className="justify-start gap-2"
                                            onClick={() => setTheme("dark")}
                                        >
                                            <Moon className="h-4 w-4" /> Dark
                                        </Button>
                                        <Button
                                            variant={theme === "system" ? "default" : "outline"}
                                            className="justify-start gap-2"
                                            onClick={() => setTheme("system")}
                                        >
                                            <Monitor className="h-4 w-4" /> System
                                        </Button>
                                    </div>
                                    <p className="text-[0.8rem] text-muted-foreground">
                                        Select your preferred interface theme.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="card-metrics" className="space-y-4">
                        <CardMetricsSettings />
                    </TabsContent>


                </Tabs>
            </div>
        </div >
    )
}

function CardMetricsSettings() {
    const { showLabels, setShowLabels, showTrend, setShowTrend, showSubtext, setShowSubtext } = useCardSettings()

    return (
        <Card>
            <CardHeader>
                <CardTitle>Card Metrics</CardTitle>
                <CardDescription>Control the display of KPI cards on the dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="show-labels" className="flex flex-col space-y-1 text-left items-start">
                        <span>Show Labels</span>
                        <span className="font-normal text-xs text-muted-foreground">
                            Extract tags from titles and show as badges (e.g. "customer_finance Count" → Label: "Customer Finance").
                        </span>
                    </Label>
                    <Switch
                        id="show-labels"
                        checked={showLabels}
                        onCheckedChange={setShowLabels}
                    />
                </div>
                <Separator />
                <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="show-trend" className="flex flex-col space-y-1 text-left items-start">
                        <span>Show Trend Indicator</span>
                        <span className="font-normal text-xs text-muted-foreground">
                            Display the percentage change arrow and value.
                        </span>
                    </Label>
                    <Switch
                        id="show-trend"
                        checked={showTrend}
                        onCheckedChange={setShowTrend}
                    />
                </div>
                <Separator />
                <div className="flex items-center justify-between space-x-2">
                    <Label htmlFor="show-subtext" className="flex flex-col space-y-1 text-left items-start">
                        <span>Show Subtext</span>
                        <span className="font-normal text-xs text-muted-foreground">
                            Display the "from last period" text.
                        </span>
                    </Label>
                    <Switch
                        id="show-subtext"
                        checked={showSubtext}
                        onCheckedChange={setShowSubtext}
                    />
                </div>
            </CardContent>
        </Card>
    )
}
