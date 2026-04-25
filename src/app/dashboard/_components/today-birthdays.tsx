
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Employee } from '@/lib/types';
import { format, parse, isValid } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Gift } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/hooks/use-language';
import { useMasterData } from '@/providers/master-data-provider';
import { RichTextEditor } from "@/components/rich-text-editor";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';

export default function TodayBirthdays() {
    const { t } = useLanguage();
    const { employees, positions, loading } = useMasterData();

    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    
    const [todayString, setTodayString] = useState<string | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [greetingMessage, setGreetingMessage] = useState('');
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        setTodayString(format(new Date(), 'dd/MM'));
    }, []);

    const birthdayEmployees = useMemo(() => {
        if (!todayString || !employees) return [];
        return employees.filter(employee => {
            if (!employee.birthDate) return false;
            try {
                if (employee.birthDate.includes('-')) {
                    const parsed = parse(employee.birthDate, 'yyyy-MM-dd', new Date());
                    if (isValid(parsed)) return format(parsed, 'dd/MM') === todayString;
                }
                if (employee.birthDate.includes('/')) {
                    const parsed = parse(employee.birthDate, 'dd/MM/yyyy', new Date());
                    if (isValid(parsed)) return format(parsed, 'dd/MM') === todayString;
                }
                return employee.birthDate.slice(0, 5) === todayString;
            } catch (error) {
                return false;
            }
        });
    }, [employees, todayString]);

    const handleSendGreeting = async () => {
        if (!selectedEmployee || !firestore || !user || !greetingMessage.trim()) return;
        setIsSending(true);
        try {
            await addDoc(collection(firestore, 'messages'), {
                senderId: user.uid,
                recipientIds: [selectedEmployee.id],
                subject: `🎉 ${t('Chúc mừng sinh nhật')} ${selectedEmployee.name}!`,
                body: greetingMessage,
                attachments: [],
                timestamp: new Date().toISOString(),
                isRead: false
            });
            toast({ title: t('Thành công'), description: t('Đã gửi lời chúc sinh nhật thành công!') });
            setSelectedEmployee(null);
        } catch (error) {
            toast({ variant: 'destructive', title: t('Lỗi'), description: t('Không thể gửi lời chúc lúc này.') });
        } finally {
            setIsSending(false);
        }
    };

    if (birthdayEmployees.length === 0) return null;

    return (
        <Card className="bg-gradient-to-r from-pink-100 via-fuchsia-50 to-purple-100 dark:from-pink-900/30 dark:via-fuchsia-900/20 dark:to-purple-900/30 border-pink-200 dark:border-pink-800/50">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg text-pink-700 dark:text-pink-300">
                    <Gift className="h-6 w-6" />
                    {t('Chúc mừng sinh nhật!')}
                </CardTitle>
                <CardDescription className="text-pink-600 dark:text-pink-400">
                    {t('Gửi lời chúc tốt đẹp nhất đến các thành viên có sinh nhật trong ngày hôm nay.')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <TooltipProvider>
                    {birthdayEmployees.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-pink-600/50 dark:text-pink-400/30">
                            <Gift className="h-10 w-10 mb-2 opacity-20" />
                            <p className="text-sm italic">{t('Hôm nay không có sinh nhật thành viên nào.')}</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {birthdayEmployees.map(employee => (
                                <div key={employee.id} className="flex items-center gap-4 rounded-lg bg-background/50 p-4 border shadow-sm hover:shadow-md transition-shadow">
                                    <Avatar className="h-14 w-14 border-2 border-pink-300">
                                        <AvatarImage src={employee.avatarUrl} alt={employee.name} />
                                        <AvatarFallback>{employee.name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-base text-foreground truncate">{employee.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {positions?.find(p => p.id === employee.position)?.name || employee.position || t('Chưa có chức vụ')}
                                        </p>
                                    </div>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button 
                                                onClick={() => {
                                                    setSelectedEmployee(employee);
                                                    setGreetingMessage(`<p>${t('Chúc mừng sinh nhật')} <b>${employee.name}</b>!</p><p>${t('Chúc bạn tuổi mới nhiều sức khỏe, niềm vui và thành công.')}</p>`);
                                                }}
                                                variant="ghost" 
                                                size="icon" 
                                                className="rounded-full hover:bg-pink-100 dark:hover:bg-pink-900/40"
                                            >
                                                <Gift className="h-5 w-5 text-pink-500" />
                                                <span className="sr-only">{t('Gửi lời chúc')}</span>
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                            <p>{t('Gửi lời chúc tới')} {employee.name}</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </div>
                            ))}
                        </div>
                    )}
                </TooltipProvider>
            </CardContent>

            <Dialog open={!!selectedEmployee} onOpenChange={(open) => !open && setSelectedEmployee(null)}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Gift className="h-5 w-5 text-pink-500" />
                            {t('Gửi lời chúc sinh nhật')}
                        </DialogTitle>
                        <DialogDescription>
                            {t('Gửi lời chúc đến')} <span className="font-bold text-foreground">{selectedEmployee?.name}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2">
                        <RichTextEditor
                            value={greetingMessage}
                            onChange={setGreetingMessage}
                            className="min-h-[200px]"
                            placeholder={t('Nhập lời chúc của bạn...')}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setSelectedEmployee(null)} disabled={isSending}>
                            {t('Hủy')}
                        </Button>
                        <Button 
                            onClick={handleSendGreeting} 
                            disabled={isSending || !greetingMessage.trim()} 
                            className="bg-pink-600 hover:bg-pink-700 text-white"
                        >
                            {isSending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                            {t('Gửi lời chúc')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
