'use client';

import React from 'react';
import PageHeader from "@/components/page-header";
import { Settings, Languages, Moon, Sun, Monitor, Bell, Shield, Palette } from "lucide-react";
import { ClientOnly } from "@/components/client-only";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/components/theme-provider";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";

export default function SettingsPage() {
    const { t, language, setLanguage } = useLanguage();
    const { theme, setTheme } = useTheme();

    return (
        <ClientOnly>
            <PageHeader 
                title={t('Cài đặt hệ thống')}
                description={t('Tùy chỉnh giao diện và cách thức hoạt động của ứng dụng.')}
                icon={Settings}
            />
            <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
                {/* Visual Settings */}
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                            <Palette className="h-6 w-6 text-orange-500" />
                        </div>
                        <div>
                            <CardTitle>{t('Giao diện & Ngôn ngữ')}</CardTitle>
                            <CardDescription>{t('Tùy chỉnh cách ứng dụng hiển thị với bạn.')}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Language */}
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border">
                            <div className="flex items-center gap-3">
                                <Languages className="h-5 w-5 text-primary" />
                                <div>
                                    <p className="font-bold text-sm">{t('Ngôn ngữ hiển thị')}</p>
                                    <p className="text-xs text-muted-foreground">{t('Chọn ngôn ngữ ưu tiên cho giao diện.')}</p>
                                </div>
                            </div>
                            <Select value={language} onValueChange={(val: any) => setLanguage(val)}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="vi">{t('Tiếng Việt')}</SelectItem>
                                    <SelectItem value="en">{t('English')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Theme */}
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border">
                            <div className="flex items-center gap-3">
                                <Moon className="h-5 w-5 text-purple-500" />
                                <div>
                                    <p className="font-bold text-sm">{t('Chế độ tối')}</p>
                                    <p className="text-xs text-muted-foreground">{t('Sử dụng giao diện tối để bảo vệ mắt.')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                                <Button 
                                    variant={theme === 'light' ? 'secondary' : 'ghost'} 
                                    size="sm" 
                                    className="h-8 gap-2"
                                    onClick={() => setTheme('light')}
                                >
                                    <Sun className="h-4 w-4" />
                                    {t('Sáng')}
                                </Button>
                                <Button 
                                    variant={theme === 'dark' ? 'secondary' : 'ghost'} 
                                    size="sm" 
                                    className="h-8 gap-2"
                                    onClick={() => setTheme('dark')}
                                >
                                    <Moon className="h-4 w-4" />
                                    {t('Tối')}
                                </Button>
                                <Button 
                                    variant={theme === 'system' ? 'secondary' : 'ghost'} 
                                    size="sm" 
                                    className="h-8 gap-2"
                                    onClick={() => setTheme('system')}
                                >
                                    <Monitor className="h-4 w-4" />
                                    {t('Hệ thống')}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Notifications Settings */}
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            <Bell className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                            <CardTitle>{t('Thông báo')}</CardTitle>
                            <CardDescription>{t('Quản lý cách bạn nhận thông báo từ hệ thống.')}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between py-2">
                            <div className="space-y-0.5">
                                <p className="text-sm font-bold">{t('Thông báo trình duyệt')}</p>
                                <p className="text-xs text-muted-foreground">{t('Hiển thị thông báo khi có tin nhắn mới hoặc sự cố.')}</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                        <div className="flex items-center justify-between py-2 border-t">
                            <div className="space-y-0.5">
                                <p className="text-sm font-bold">{t('Âm thanh thông báo')}</p>
                                <p className="text-xs text-muted-foreground">{t('Phát âm thanh khi có thông báo mới.')}</p>
                            </div>
                            <Switch defaultChecked />
                        </div>
                    </CardContent>
                </Card>

                {/* Security Settings (Placeholder for more complex logic) */}
                <Card className="shadow-sm opacity-60 grayscale-[0.5]">
                    <CardHeader className="flex flex-row items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                            <Shield className="h-6 w-6 text-red-500" />
                        </div>
                        <div>
                            <CardTitle>{t('Bảo mật nâng cao')}</CardTitle>
                            <CardDescription>{t('Các thiết lập bảo mật cấp cao cho tài khoản của bạn.')}</CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="text-center p-8 bg-muted/10">
                        <p className="text-sm italic">{t('Các chức năng bảo mật đang được phát triển...')}</p>
                    </CardContent>
                </Card>
            </div>
        </ClientOnly>
    );
}
