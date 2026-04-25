
"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useCollection, useFirestore } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { DailySchedule } from '@/lib/types';
import { useLanguage } from '@/hooks/use-language';
import { format } from 'date-fns';
import { AlertCircle, Users, GraduationCap } from 'lucide-react';

export default function IncidentChart() {
    const { t } = useLanguage();
    const firestore = useFirestore();
    const [today, setToday] = useState('');

    useEffect(() => {
        setToday(format(new Date(), 'dd/MM/yyyy'));
    }, []);

    const schedulesRef = useMemo(() => (firestore ? collection(firestore, 'schedules') : null), [firestore]);
    const { data: schedules, loading } = useCollection<DailySchedule>(schedulesRef);

    const chartData = useMemo(() => {
        if (!schedules || !today) return { lecturers: [], classes: [] };

        // Filter schedules for today that have an incident recorded
        const todaySchedules = schedules.filter(s => s.date === today && s.incident);

        const byLecturer: Record<string, number> = {};
        const byClass: Record<string, number> = {};

        todaySchedules.forEach(s => {
            if (s.lecturer) byLecturer[s.lecturer] = (byLecturer[s.lecturer] || 0) + 1;
            if (s.class) byClass[s.class] = (byClass[s.class] || 0) + 1;
        });

        const lecturersData = Object.entries(byLecturer)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        const classesData = Object.entries(byClass)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return { lecturers: lecturersData, classes: classesData };
    }, [schedules, today]);

    if (loading) {
        return (
            <Card className="h-[450px] flex items-center justify-center border-dashed">
                <div className="flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">{t('Đang tải dữ liệu thực tế...')}</p>
                </div>
            </Card>
        );
    }

    const hasData = chartData.lecturers.length > 0 || chartData.classes.length > 0;

    return (
        <Card className="shadow-lg border-t-4 border-t-red-500">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-xl flex items-center gap-2 text-red-600">
                            <AlertCircle className="h-6 w-6" />
                            {t('Các phát sinh việc không phù hợp')}
                        </CardTitle>
                        <CardDescription className="text-sm">
                            {t('Số liệu thực tế được ghi nhận trong ngày')} <span className="font-bold text-foreground">{today}</span>
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {!hasData ? (
                    <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground bg-muted/10 rounded-xl border-2 border-dashed mt-4">
                        <AlertCircle className="h-12 w-12 mb-3 opacity-20" />
                        <p className="font-medium text-base">{t('Không có sự cố nào được ghi nhận trong hôm nay.')}</p>
                        <p className="text-xs mt-1">{t('Hệ thống sẽ cập nhật ngay khi có dữ liệu mới.')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mt-6">
                        {/* Lecturer Chart */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 px-2 border-l-4 border-blue-500">
                                <GraduationCap className="h-5 w-5 text-blue-500" />
                                <h3 className="font-bold text-sm uppercase tracking-tight">{t('Sự cố theo Giảng viên')}</h3>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData.lecturers} layout="vertical" margin={{ left: 20, right: 30, top: 5, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                                        <XAxis type="number" hide />
                                        <YAxis 
                                            dataKey="name" 
                                            type="category" 
                                            width={120} 
                                            fontSize={11} 
                                            tickLine={false} 
                                            axisLine={false}
                                            className="font-medium"
                                        />
                                        <Tooltip 
                                            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                                            contentStyle={{ 
                                                backgroundColor: 'white', 
                                                borderRadius: '8px', 
                                                border: '1px solid #e2e8f0',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                            }}
                                        />
                                        <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} barSize={24} name={t('Số sự cố')}>
                                            {chartData.lecturers.map((entry, index) => (
                                                <Cell key={`cell-l-${index}`} fill={index === 0 ? '#ef4444' : '#3b82f6'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Class Chart */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 px-2 border-l-4 border-orange-500">
                                <Users className="h-5 w-5 text-orange-500" />
                                <h3 className="font-bold text-sm uppercase tracking-tight">{t('Sự cố theo Lớp (Sinh viên)')}</h3>
                            </div>
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData.classes} layout="vertical" margin={{ left: 20, right: 30, top: 5, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                                        <XAxis type="number" hide />
                                        <YAxis 
                                            dataKey="name" 
                                            type="category" 
                                            width={120} 
                                            fontSize={11} 
                                            tickLine={false} 
                                            axisLine={false}
                                            className="font-medium"
                                        />
                                        <Tooltip 
                                            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.2 }}
                                            contentStyle={{ 
                                                backgroundColor: 'white', 
                                                borderRadius: '8px', 
                                                border: '1px solid #e2e8f0',
                                                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                            }}
                                        />
                                        <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} barSize={24} name={t('Số sự cố')}>
                                            {chartData.classes.map((entry, index) => (
                                                <Cell key={`cell-c-${index}`} fill={index === 0 ? '#f97316' : '#8b5cf6'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
