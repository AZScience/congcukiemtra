
'use client';

import React from 'react';
import PageHeader from "@/components/page-header";
import { LayoutDashboard } from "lucide-react";
import { ClientOnly } from "@/components/client-only";
import DailyActivitySummary from "./_components/daily-summary";
import TodayBirthdays from "./_components/today-birthdays";
import ScheduleViewer from "./_components/schedule-viewer";
import ShiftScheduleWidget from "./_components/shift-schedule-widget";
import RecentActivity from "./_components/recent-activity";
import UserEngagement from "./_components/user-engagement";
import IncidentChart from "./_components/incident-chart";
import { useLanguage } from "@/hooks/use-language";

export default function DashboardPage() {
    const { t } = useLanguage();

    return (
        <ClientOnly>
            <PageHeader
                title={t('Tổng quan')}
                description={t('Chào mừng bạn quay trở lại hệ thống Kiểm tra nội bộ.')}
                icon={LayoutDashboard}
            />
            <div className="p-4 md:p-6 space-y-6">
                <TodayBirthdays />
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-12">
                    <div className="lg:col-span-8 space-y-6">
                        <DailyActivitySummary />
                        <ScheduleViewer />
                        <ShiftScheduleWidget />
                    </div>
                    <div className="lg:col-span-4 space-y-6">
                        <UserEngagement />
                        <RecentActivity />
                    </div>
                </div>

                <div className="w-full">
                    <IncidentChart />
                </div>
            </div>
        </ClientOnly>
    );
}
