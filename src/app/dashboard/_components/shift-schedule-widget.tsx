'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Calendar, Loader2, Download, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/hooks/use-language';
import { useFirestore, useStorage, useUser } from '@/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from '@/hooks/use-toast';
import { formatTimeAgo } from '@/lib/utils';
import { useMasterData } from '@/providers/master-data-provider';

export default function ShiftScheduleWidget() {
    const { t } = useLanguage();
    const firestore = useFirestore();
    const storage = useStorage();
    const { user } = useUser();
    const { employees } = useMasterData();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [scheduleData, setScheduleData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        if (!firestore) return;
        const scheduleRef = doc(firestore, 'system_settings', 'shift_schedule');
        const unsubscribe = onSnapshot(scheduleRef, (docSnap) => {
            if (docSnap.exists()) {
                setScheduleData(docSnap.data());
            } else {
                setScheduleData(null);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching schedule:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [firestore]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !firestore || !storage || !user) return;
        
        if (file.type !== 'application/pdf') {
            toast({ variant: 'destructive', title: t('Lỗi'), description: t('Chỉ hỗ trợ file PDF.') });
            return;
        }

        if (file.size > 10 * 1024 * 1024) { 
            toast({ variant: 'destructive', title: t('Lỗi'), description: t('Kích thước file PDF quá lớn (tối đa 10MB).') });
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setIsExpanded(true);
        
        try {
            if (!storage || !firestore || !user) {
                toast({ variant: 'destructive', title: t('Lỗi'), description: t('Hệ thống chưa sẵn sàng. Vui lòng thử lại sau.') });
                setIsUploading(false);
                return;
            }

            const storagePath = `system/shift_schedule_${Date.now()}.pdf`;
            const storageRef = ref(storage, storagePath);
            const uploadTask = uploadBytesResumable(storageRef, file);

            // Timeout mechanism to detect network blocks (60 seconds)
            const timeoutId = setTimeout(() => {
                uploadTask.cancel();
                toast({ 
                    variant: 'destructive', 
                    title: t('Lỗi kết nối'), 
                    description: t('Quá thời gian kết nối (60s). Mạng của bạn có thể đang chặn dịch vụ Firebase Storage.') 
                });
                setIsUploading(false);
            }, 60000);

            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                }, 
                (error) => {
                    clearTimeout(timeoutId);
                    if (error.code !== 'storage/canceled') {
                        console.error('Upload error:', error);
                        toast({ 
                            variant: 'destructive', 
                            title: t('Lỗi tải lên'), 
                            description: `${error.message} (${error.code})` 
                        });
                    }
                    setIsUploading(false);
                }, 
                async () => {
                    clearTimeout(timeoutId);
                    try {
                        const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);

                        await setDoc(doc(firestore, 'system_settings', 'shift_schedule'), {
                            url: downloadUrl,
                            name: file.name,
                            updatedAt: new Date().toISOString(),
                            updatedBy: user.uid
                        });

                        toast({ title: t('Thành công'), description: t('Đã cập nhật lịch trực mới.') });
                    } catch (err: any) {
                        console.error('Firestore update error:', err);
                        toast({ variant: 'destructive', title: t('Lỗi lưu dữ liệu'), description: err.message });
                    } finally {
                        setIsUploading(false);
                        setUploadProgress(0);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                    }
                }
            );
        } catch (error: any) {
            console.error('Initialization error:', error);
            toast({ variant: 'destructive', title: t('Lỗi'), description: error.message });
            setIsUploading(false);
        }
    };

    const updater = scheduleData ? employees.find(e => e.id === scheduleData.updatedBy) : null;

    return (
        <Card className="w-full shadow-md border-blue-200 dark:border-blue-800 transition-all duration-300">
            <CardHeader 
                className="py-3 flex flex-row items-center justify-between border-b bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl flex items-center gap-2">
                        {t('Lịch trực')}
                        {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                    </CardTitle>
                </div>
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {scheduleData && scheduleData.url && (
                        <div className="text-xs text-muted-foreground mr-2 hidden sm:block">
                            Cập nhật: {formatTimeAgo(scheduleData.updatedAt)} {updater ? `bởi ${updater.name}` : ''}
                        </div>
                    )}
                    <input 
                        type="file" 
                        accept=".pdf" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 shadow-sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                    >
                        {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                        {isUploading ? `${Math.round(uploadProgress)}%` : (scheduleData ? t('Cập nhật lịch mới') : t('Tải lên lịch trực'))}
                    </Button>
                    {scheduleData && scheduleData.url && (
                        <Button size="sm" variant="default" asChild className="h-8">
                            <a href={scheduleData.url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4 mr-2" />
                                {t('Tải về')}
                            </a>
                        </Button>
                    )}
                </div>
            </CardHeader>
            {isExpanded && (
                <CardContent className="p-0 animate-in slide-in-from-top-2 duration-300">
                    {loading ? (
                        <div className="flex justify-center items-center h-[500px]">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : scheduleData && scheduleData.url ? (
                        <div className="w-full h-[600px] md:h-[800px] bg-muted/10">
                            <iframe 
                                src={`${scheduleData.url}#view=FitH`}
                                className="w-full h-full border-0 rounded-b-lg"
                                title="Lịch trực"
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[300px] bg-muted/5">
                            <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                            <p className="text-muted-foreground mb-4">{t('Chưa có file lịch trực nào được tải lên.')}</p>
                            <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                                {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                                {t('Tải lên ngay')}
                            </Button>
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}
