
'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DailySchedule } from '@/lib/types';
import { format, parse } from 'date-fns';
import { vi, enUS } from 'date-fns/locale';
import { BookOpenCheck, MonitorCheck, Laptop, Truck, BookUser, Activity, Building } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useLanguage } from '@/hooks/use-language';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { cn } from '@/lib/utils';

type BuildingSummary = {
    [building: string]: number;
};

type DepartmentDetail = {
    total: number;
    buildings: BuildingSummary;
};

type DepartmentGroup = {
    [department: string]: DepartmentDetail;
};

type DailySummaryData = {
    inPerson: DepartmentGroup;
    online: DepartmentGroup;
    exam: DepartmentGroup;
    homeroom: DepartmentGroup;
    externalPractice: DepartmentGroup;
};

export default function DailyActivitySummary() {
    const { t, language } = useLanguage();
    const firestore = useFirestore();
    const [todayString, setTodayString] = useState<string>(format(new Date(), 'dd/MM/yyyy'));
    const [todayISO, setTodayISO] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        setTodayString(format(new Date(), 'dd/MM/yyyy'));
        setTodayISO(format(new Date(), 'yyyy-MM-dd'));
    }, [language]);

    // Optimize: Only fetch today's schedules using a query
    const schedulesRef = useMemo(() => {
        if (!firestore) return null;
        // In a real app, we should standardize date formats. 
        // For now, fetching everything might be slow, so we try to query for today.
        // If the user has both formats, we might need two queries or a standardized format.
        return query(
            collection(firestore, 'schedules'), 
            where('date', 'in', [todayString, todayISO])
        );
    }, [firestore, todayString, todayISO]);

    const { data: schedules } = useCollection<DailySchedule>(schedulesRef);

    const summary = useMemo<DailySummaryData>(() => {
        const initialData: DailySummaryData = { inPerson: {}, online: {}, exam: {}, homeroom: {}, externalPractice: {} };
        if (!todayString || !schedules) {
             return initialData;
        }
        
        const todaySchedules = schedules.filter(s => {
            if (!s.date) return false;
            try {
                let dateToCompare = s.date;
                if (s.date.includes('-')) {
                    dateToCompare = format(parse(s.date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy');
                }
                return dateToCompare === todayString;
            } catch {
                return false;
            }
        });

        const summaryData: DailySummaryData = { inPerson: {}, online: {}, exam: {}, homeroom: {}, externalPractice: {} };

        todaySchedules.forEach(schedule => {
            const department = schedule.department || 'Chưa xác định';
            const building = schedule.building || 'Chưa xác định';
            const status = (schedule.status || '').toLowerCase();
            const content = (schedule.content || '').toUpperCase();
            const buildingLower = building.toLowerCase();
            
            const increment = (summaryType: keyof DailySummaryData) => {
                if (!summaryData[summaryType][department]) {
                    summaryData[summaryType][department] = { total: 0, buildings: {} };
                }
                if (!summaryData[summaryType][department].buildings[building]) {
                    summaryData[summaryType][department].buildings[building] = 0;
                }
                summaryData[summaryType][department].total += 1;
                summaryData[summaryType][department].buildings[building] += 1;
            };

            // Logic phân loại chính xác theo yêu cầu mới
            if (status.includes('thi')) {
                // 1. Lớp thi
                increment('exam');
            } else if (content.includes('SHCN') || content.includes('CVHT')) {
                // 2. Sinh hoạt (SHCN hoặc CVHT)
                increment('homeroom');
            } else if (buildingLower.includes('trực tuyến')) {
                // 3. Học Online (Dãy nhà là Học trực tuyến)
                increment('online');
            } else if (buildingLower.includes('ngoài')) {
                // 4. Thực hành ngoài trường
                increment('externalPractice');
            } else {
                // 5. Còn lại: Học trực tiếp
                increment('inPerson');
            }
        });

        return summaryData;
    }, [schedules, todayString]);

    const calculateTotal = (group: DepartmentGroup) => Object.values(group).reduce((acc, dept) => acc + dept.total, 0);

    const summaryItems = [
        { title: t('Lớp học'), total: calculateTotal(summary.inPerson), data: summary.inPerson, icon: MonitorCheck, color: 'text-green-500', bgColor: 'bg-green-50' },
        { title: t('Online'), total: calculateTotal(summary.online), data: summary.online, icon: Laptop, color: 'text-blue-500', bgColor: 'bg-blue-50' },
        { title: t('Lớp thi'), total: calculateTotal(summary.exam), data: summary.exam, icon: BookOpenCheck, color: 'text-purple-500', bgColor: 'bg-purple-50' },
        { title: t('Sinh hoạt'), total: calculateTotal(summary.homeroom), data: summary.homeroom, icon: BookUser, color: 'text-orange-500', bgColor: 'bg-orange-50' },
        { title: t('Thực hành'), total: calculateTotal(summary.externalPractice), data: summary.externalPractice, icon: Truck, color: 'text-amber-500', bgColor: 'bg-amber-50' },
    ];
    
    if (!todayString) {
        return null; 
    }

    return (
        <Card className="shadow-md overflow-hidden" suppressHydrationWarning>
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Activity className="text-pink-500 h-6 w-6" />
                    {t('Tổng quan hoạt động trong ngày')}
                </CardTitle>
                <CardDescription className="text-sm">
                    {t('Thống kê các loại hình lớp học và hoạt động diễn ra hôm nay, ngày')} <span className="font-semibold text-primary">{todayString}</span>.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" className="w-full">
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
                    {summaryItems.map((item, index) => (
                        <AccordionItem 
                            value={`item-${index}`} 
                            key={item.title} 
                            className="border rounded-xl px-3 py-1 bg-card hover:shadow-sm transition-all"
                        >
                            <AccordionTrigger className="hover:no-underline py-3 px-1 [&[data-state=open]>svg]:rotate-180">
                                 <div className="flex items-center justify-between w-full pr-2 gap-2">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={cn("p-2 rounded-lg shrink-0", item.bgColor)}>
                                            <item.icon className={cn("h-5 w-5", item.color)} />
                                        </div>
                                        <span className="font-bold text-sm text-left leading-tight break-words overflow-hidden">
                                            {item.title}
                                        </span>
                                    </div>
                                    <Badge 
                                        variant="secondary" 
                                        className="h-7 min-w-[28px] flex items-center justify-center rounded-full bg-muted text-sm font-bold shrink-0"
                                    >
                                        {item.total}
                                    </Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <div className="pt-2 pb-1">
                                    {Object.keys(item.data).length > 0 ? (
                                        <ul className="space-y-3">
                                            {Object.entries(item.data).sort((a,b) => b[1].total - a[1].total).map(([dept, deptData]) => (
                                                <li key={dept} className="bg-muted/30 p-2 rounded-lg border border-border/50">
                                                    <div className="flex justify-between items-start gap-2 mb-1">
                                                        <span className="text-xs font-bold text-foreground leading-tight">{dept}</span>
                                                        <span className="text-xs font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">{deptData.total}</span>
                                                    </div>
                                                    <ul className="space-y-1">
                                                        {Object.entries(deptData.buildings).sort((a,b) => b[1] - a[1]).map(([building, count]) => (
                                                            <li key={building} className="flex justify-between items-center text-[10px] text-muted-foreground pl-1">
                                                                <span className='flex items-center italic'><Building className="mr-1 h-3 w-3 opacity-70" /> {building}</span>
                                                                <span className="font-mono font-semibold">{count}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-6 opacity-40 grayscale">
                                            <Activity className="h-8 w-8 mb-1" />
                                            <p className="text-[10px] font-medium">{t('Không có dữ liệu')}</p>
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                    </div>
                </Accordion>
            </CardContent>
        </Card>
    );
}
