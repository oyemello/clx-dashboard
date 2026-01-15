"use client"

import { useTheme } from "next-themes"
import { Moon, Sun, Monitor } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useColorTheme } from "@/components/color-theme-provider"
import { useState, useEffect } from "react"
import { Check, Loader2 } from "lucide-react"

export function SettingsPanel() {
    const { setTheme, theme } = useTheme()
    const { colorTheme, setColorTheme } = useColorTheme()
    const [pendingColorTheme, setPendingColorTheme] = useState<"amex" | "slate">(colorTheme)
    const [isSaving, setIsSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    // Sync local state with global state initially
    useEffect(() => {
        setPendingColorTheme(colorTheme)
    }, [colorTheme])

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
            <div className="border-b px-6 py-3 bg-card text-card-foreground">
                <h1 className="text-lg font-semibold tracking-tight text-foreground/90">
                    Settings
                </h1>
            </div>

            <div className="flex-1 p-6 max-w-4xl mx-auto w-full">
                <Tabs defaultValue="profile" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="profile">Profile</TabsTrigger>
                        <TabsTrigger value="appearance">Appearance</TabsTrigger>
                        <TabsTrigger value="notifications">Notifications</TabsTrigger>
                        <TabsTrigger value="security">Security</TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Profile Information</CardTitle>
                                <CardDescription>Update your personal details.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Display Name</Label>
                                    <Input id="name" defaultValue="Analyst User" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <Input id="email" defaultValue="analyst@amex-bench.com" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="role">Role</Label>
                                    <Input id="role" defaultValue="Senior Risk Analyst" disabled className="bg-muted" />
                                </div>
                                <div className="flex justify-end">
                                    <Button>Save Changes</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

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

                    <TabsContent value="notifications" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Alert Preferences</CardTitle>
                                <CardDescription>Manage how you receive alerts and reports.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between space-x-2">
                                    <Label htmlFor="email-alerts" className="flex flex-col space-y-1">
                                        <span>Email Alerts</span>
                                        <span className="font-normal text-xs text-muted-foreground">Receive daily summaries via email.</span>
                                    </Label>
                                    <Switch id="email-alerts" defaultChecked />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between space-x-2">
                                    <Label htmlFor="sms-alerts" className="flex flex-col space-y-1">
                                        <span>Critical SMS Alerts</span>
                                        <span className="font-normal text-xs text-muted-foreground">Receive immediate texts for high-risk anomalies.</span>
                                    </Label>
                                    <Switch id="sms-alerts" />
                                </div>
                                <Separator />
                                <div className="flex items-center justify-between space-x-2">
                                    <Label htmlFor="marketing" className="flex flex-col space-y-1">
                                        <span>Product Updates</span>
                                        <span className="font-normal text-xs text-muted-foreground">Receive news about platform features.</span>
                                    </Label>
                                    <Switch id="marketing" defaultChecked />
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="security" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Security Settings</CardTitle>
                                <CardDescription>Manage your password and session settings.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between space-x-2">
                                    <Label htmlFor="2fa" className="flex flex-col space-y-1">
                                        <span>Two-Factor Authentication</span>
                                        <span className="font-normal text-xs text-muted-foreground">Secure your account with 2FA.</span>
                                    </Label>
                                    <Switch id="2fa" defaultChecked disabled />
                                </div>
                                <div className="space-y-2">
                                    <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10">Reset Password</Button>
                                    <Button variant="outline" className="w-full">Sign out of all devices</Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
