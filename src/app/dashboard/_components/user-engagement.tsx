
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Engagement } from '@/lib/types';
import { useLanguage } from '@/hooks/use-language';

import { useVisitStats } from '@/providers/visit-tracker';

export default function UserEngagement() {
    const { t } = useLanguage();
    const stats = useVisitStats();

    return (
        <Card className="overflow-hidden">
            <CardHeader>
                <CardTitle>{t('Thống kê truy cập')}</CardTitle>
                <CardDescription>{t('Thống kê số lượng truy cập và người dùng trực tuyến.')}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <p className="text-2xl font-bold">{stats.online}</p>
                    <p className="text-sm text-muted-foreground">{t('Đang online')}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <p className="text-2xl font-bold">{stats.today}</p>
                    <p className="text-sm text-muted-foreground">{t('Hôm nay')}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <p className="text-2xl font-bold">{stats.weekly}</p>
                    <p className="text-sm text-muted-foreground">{t('Tuần này')}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg text-center">
                    <p className="text-2xl font-bold">{stats.monthly}</p>
                    <p className="text-sm text-muted-foreground">{t('Tháng này')}</p>
                </div>
            </CardContent>
        </Card>
    );
}
