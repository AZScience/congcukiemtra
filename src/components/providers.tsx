"use client";

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FirebaseClientProvider, useUser } from "@/firebase";
import { ThemeProvider } from "@/components/theme-provider";
import { LanguageProvider } from "@/hooks/use-language";
import { MasterDataProvider } from "@/providers/master-data-provider";
import { SystemParametersProvider, useSystemParameters } from "@/providers/system-parameters-provider";
import { VisitTrackerProvider } from "@/providers/visit-tracker";
import { Toaster } from "@/components/ui/toaster";
import { ClientOnly } from '@/components/client-only';
import { SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarRail } from "@/components/ui/sidebar";
import { SidebarNav, UserFooter } from "@/components/layout/sidebar-nav";
import { Header } from "@/components/layout/header";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function AuthGuard({ children }: { children: React.ReactNode }) {
    const { user, loading } = useUser();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background" suppressHydrationWarning>
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (user) {
        return <>{children}</>;
    }

    return null;
}

function AppShell({ children }: { children: React.ReactNode }) {
    const { params } = useSystemParameters();

    return (
        <SidebarProvider>
            <div className="flex h-screen w-full overflow-hidden bg-background" suppressHydrationWarning>
            <Sidebar suppressHydrationWarning>
                <SidebarHeader className="p-2 h-16 flex items-center justify-center border-b bg-card overflow-hidden" suppressHydrationWarning>
                    <div className="flex items-center justify-center w-full group-data-[collapsible=icon]:hidden">
                        {params.bannerUrl && params.bannerUrl.trim() !== "" ? (
                            <img 
                                src={params.bannerUrl} 
                                alt="Logo" 
                                className="object-contain max-w-full"
                                style={{
                                    height: params.bannerHeight ? `${params.bannerHeight}px` : '40px',
                                }}
                            />
                        ) : (
                            <span className="font-bold text-primary text-sm whitespace-nowrap uppercase tracking-tighter">NTTU INTERNAL</span>
                        )}
                    </div>
                    <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center">
                         <span className="font-bold text-primary text-xl">N</span>
                    </div>
                </SidebarHeader>
                <SidebarContent className="bg-card">
                    <SidebarNav />
                </SidebarContent>
                <SidebarFooter className="p-2 h-[55px] flex items-center justify-center border-t bg-card">
                    <UserFooter />
                </SidebarFooter>
                <SidebarRail />
            </Sidebar>
            <div className="flex flex-col flex-1 h-screen overflow-hidden" suppressHydrationWarning>
                <Header />
                <main className="flex-1 overflow-y-auto bg-muted/20 relative" suppressHydrationWarning>
                    {children}
                </main>
                <footer className="h-[55px] flex items-center justify-center text-[10px] md:text-xs text-muted-foreground border-t bg-card px-4 shrink-0 text-center">
                    Bản quyền © 2026 thuộc về Đại học Nguyễn Tất Thành - Phòng Kiểm tra Nội bộ (Nguyễn Vĩnh Phúc - ngviphuc@gmail.com - 0937 382 399). All rights reserved.
                </footer>
            </div>
            </div>
        </SidebarProvider>
    );
}

function RootLayoutContent({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isStandalonePage, setIsStandalonePage] = useState<boolean>(
        pathname?.startsWith('/login') || 
        pathname?.startsWith('/lecturer-portal') || 
        pathname?.startsWith('/poll') || 
        pathname?.startsWith('/exam') || 
        false
    );

    useEffect(() => {
        setIsStandalonePage(
            pathname?.startsWith('/login') || 
            pathname?.startsWith('/lecturer-portal') || 
            pathname?.startsWith('/poll') || 
            pathname?.startsWith('/exam') || 
            false
        );
    }, [pathname]);

    if (isStandalonePage) {
        const isLecturerPortal = pathname?.startsWith('/lecturer-portal');
        const isPublicTool = pathname?.startsWith('/poll') || pathname?.startsWith('/exam');

        if (isPublicTool) {
            return <main className="min-h-screen bg-slate-100">{children}</main>;
        }

        if (isLecturerPortal) {
            return (
                <main className={cn("flex min-h-screen items-start md:items-center justify-center bg-slate-100 p-0 md:p-8")}>
                    <div className={cn("w-full max-w-2xl mx-auto md:rounded-xl md:shadow-2xl bg-card overflow-hidden h-auto")}>
                        {children}
                    </div>
                </main>
            );
        }
        return (
            <main className={cn("flex min-h-screen items-center justify-center bg-muted/40 p-4")} suppressHydrationWarning>
                <div className={cn("w-full mx-auto rounded-xl shadow-2xl bg-card overflow-hidden max-w-4xl")} suppressHydrationWarning>
                    {children}
                </div>
            </main>
        );
    }

    return (
        <AuthGuard>
            <MasterDataProvider>
                <VisitTrackerProvider>
                    <AppShell>{children}</AppShell>
                </VisitTrackerProvider>
            </MasterDataProvider>
        </AuthGuard>
    );
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <FirebaseClientProvider>
            <SystemParametersProvider>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="light"
                    enableSystem
                    disableTransitionOnChange
                >
                    <LanguageProvider>
                        <ClientOnly>
                            <RootLayoutContent>{children}</RootLayoutContent>
                            <Toaster />
                        </ClientOnly>
                    </LanguageProvider>
                </ThemeProvider>
            </SystemParametersProvider>
        </FirebaseClientProvider>
    );
}
