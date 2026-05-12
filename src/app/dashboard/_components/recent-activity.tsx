
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCollection, useFirestore } from '@/firebase';
import { useMasterData } from '@/providers/master-data-provider';
import { collection, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import type { ActivityLog, Employee } from '@/lib/types';
import { useLanguage } from '@/hooks/use-language';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface EnrichedActivityLog extends ActivityLog {
    userName: string;
    userAvatar?: string;
}

// Session cache to minimize Firestore reads
const userCache: Record<string, Employee> = {};
// Track in-flight requests to prevent duplicate parallel reads
const pendingRequests = new Map<string, Promise<Employee | null>>();

function RelativeTime({ timestamp }: { timestamp: string }) {
    const [mounted, setHasMounted] = useState(false);
    useEffect(() => {
        setHasMounted(true);
    }, []);

    if (!mounted) return <span className="text-sm text-muted-foreground">...</span>;

    try {
        return (
            <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale: vi })}
            </span>
        );
    } catch {
        return <span className="text-xs text-muted-foreground">vừa xong</span>;
    }
}

export default function RecentActivity() {
    const { t } = useLanguage();
    const firestore = useFirestore();
    const activityLogRef = useMemo(() => 
        (firestore ? query(collection(firestore, 'activity-logs'), orderBy('timestamp', 'desc'), limit(10)) : null), 
        [firestore]
    );
    const { data: activities, loading: activitiesLoading } = useCollection<ActivityLog>(activityLogRef);
    const activitiesData = useMemo(() => activities || [], [activities]);
    const { employeesMap } = useMasterData();

    const enrichedActivities = useMemo<EnrichedActivityLog[]>(() => {
        return activitiesData.map(activity => {
            const userId = activity.userId;
            if (!userId || userId === 'system') {
                return { ...activity, userName: 'Hệ thống', userAvatar: '' };
            }

            // Tra cứu thần tốc từ employeesMap của MasterData
            const userData = employeesMap.get(userId) || (activity.userEmail ? employeesMap.get(activity.userEmail.toLowerCase()) : null);
            
            if (userData) {
                return {
                    ...activity,
                    userName: userData.name || 'Thành viên',
                    userAvatar: userData.avatarUrl,
                };
            }

            // Fallback nếu không thấy trong master data
            const fallbackName = activity.userEmail 
                ? activity.userEmail.split('@')[0] 
                : `User ${userId.substring(0, 4)}...`;

            return { ...activity, userName: fallbackName, userAvatar: '' };
        });
    }, [activitiesData, employeesMap]);

    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">{t('Hoạt động gần đây')}</CardTitle>
                <CardDescription className="text-xs">{t('Các hoạt động mới nhất của nhân viên.')}</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {activitiesLoading ? (
                        <div className="text-center py-6">
                            <p className="text-xs text-muted-foreground animate-pulse">Đang tải...</p>
                        </div>
                    ) : enrichedActivities.length > 0 ? enrichedActivities.map(activity => (
                        <div key={activity.id} className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border shrink-0">
                                <AvatarImage src={activity.userAvatar} alt={activity.userName} />
                                <AvatarFallback className="text-[10px]">{activity.userName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-grow min-w-0">
                                <p className="text-xs font-bold truncate">{activity.userName}</p>
                                <p className="text-[10px] text-muted-foreground line-clamp-1 italic">{activity.details || activity.action}</p>
                            </div>
                            <div className="shrink-0">
                                <RelativeTime timestamp={activity.timestamp} />
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-6">
                            <p className="text-xs text-muted-foreground italic">{t('Không có hoạt động nào.')}</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
