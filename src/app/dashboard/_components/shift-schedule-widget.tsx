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
import { useSystemParameters } from '@/providers/system-parameters-provider';
import { uploadToGoogleDrive } from '@/ai/flows/google-drive-upload';
import { uploadToFirebaseServer } from '@/ai/flows/firebase-upload';
import { firebaseConfig } from '@/firebase/config';

export default function ShiftScheduleWidget() {
    const { t } = useLanguage();
    const firestore = useFirestore();
    const storage = useStorage();
    const { user } = useUser();
    const { employees } = useMasterData();
    const { params } = useSystemParameters();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [scheduleData, setScheduleData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [isExpanded, setIsExpanded] = useState(false);

    // Lưới an toàn: Tự động reset trạng thái tải lên nếu bị treo quá 2 phút
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isUploading) {
            timer = setTimeout(() => {
                setIsUploading(false);
                setUploadProgress(0);
                toast({ 
                    variant: 'destructive', 
                    title: t('Quá thời gian'), 
                    description: t('Quá trình tải lên mất quá nhiều thời gian và đã được dừng lại.') 
                });
            }, 120000); // 2 phút
        }
        return () => clearTimeout(timer);
    }, [isUploading, t]);

    const getEmbedUrl = (url: string) => {
        if (!url) return '';
        if (url.includes('drive.google.com')) {
            // Chuyển đổi link Google Drive sang định dạng preview để có thể nhúng vào iframe
            return url.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview');
        }
        return url;
    };

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
                throw new Error(t('Hệ thống chưa sẵn sàng. Vui lòng thử lại sau.'));
            }

            console.log("ShiftSchedule: Starting upload for", file.name);
            const storagePath = `system/shift_schedule_${Date.now()}.pdf`;
            const storageRef = ref(storage, storagePath);
            
            let downloadUrl = '';
            
            const withTimeout = (promise: Promise<any>, timeoutMs: number, errorMessage: string) => {
                return Promise.race([
                    promise,
                    new Promise((_, reject) => setTimeout(() => reject(new Error(errorMessage)), timeoutMs))
                ]);
            };

            // --- 1. TRY CLIENT-SIDE FIREBASE UPLOAD ---
            try {
                toast({ title: t("Đang thử tải lên..."), description: t("Cố gắng tải trực tiếp lên Firebase Storage.") });
                const clientUploadPromise = (async () => {
                    const uploadResult = await uploadBytes(storageRef, file);
                    console.log("ShiftSchedule: Client-side Firebase Upload successful");
                    return await getDownloadURL(uploadResult.ref);
                })();
                
                downloadUrl = await withTimeout(clientUploadPromise, 20000, "Firebase client-side timeout");
            } catch (firebaseErr: any) {
                console.warn("ShiftSchedule: Client-side upload failed or timed out, trying Server-side Firebase...", firebaseErr.message);
                toast({ title: t("Đang chuyển hướng..."), description: t("Mạng nội bộ có thể bị chặn, đang thử tải qua Server.") });
                
                // --- 2. TRY SERVER-SIDE FIREBASE UPLOAD (Bypasses local network blocks) ---
                const serviceAccountEmail = (params.evidenceServiceAccountEmail || params.googleServiceAccountEmail || "").trim();
                const privateKey = (params.evidencePrivateKey || params.googlePrivateKey || "");
                
                if (serviceAccountEmail && privateKey) {
                    try {
                        const serverFormData = new FormData();
                        serverFormData.append('file', file);
                        serverFormData.append('clientEmail', serviceAccountEmail);
                        serverFormData.append('privateKey', privateKey);
                        serverFormData.append('projectId', firebaseConfig.projectId || '');
                        serverFormData.append('storageBucket', firebaseConfig.storageBucket || '');

                        const serverResult = await withTimeout(uploadToFirebaseServer(serverFormData), 30000, "Firebase server-side timeout");
                        if (serverResult.success && serverResult.url) {
                            downloadUrl = serverResult.url;
                            console.log("ShiftSchedule: Server-side Firebase upload successful.");
                        }
                    } catch (serverErr: any) {
                        console.warn("ShiftSchedule: Server-side upload failed or timed out:", serverErr.message);
                    }
                }

                // --- 3. TRY GOOGLE DRIVE FALLBACK (If Firebase still fails) ---
                if (!downloadUrl) {
                    toast({ title: t("Đang dùng dự phòng..."), description: t("Đang tải lên Google Drive.") });
                    console.log("ShiftSchedule: Firebase failed, trying Google Drive fallback...");
                    const folderId = (params.evidenceGoogleDriveFolderId || params.googleDriveFolderId || "").trim();

                    if (!serviceAccountEmail || !privateKey || !folderId) {
                        throw new Error(t("Lỗi kết nối và chưa cấu hình Google Drive dự phòng (vui lòng kiểm tra tab Minh chứng)."));
                    }

                    const gdriveFormData = new FormData();
                    gdriveFormData.append('file', file);
                    gdriveFormData.append('folderId', folderId);
                    gdriveFormData.append('serviceAccountEmail', serviceAccountEmail);
                    gdriveFormData.append('privateKey', privateKey);

                    try {
                        const result = await withTimeout(uploadToGoogleDrive(gdriveFormData), 40000, "Google Drive timeout");
                        if (result.success && result.url) {
                            downloadUrl = result.url;
                            console.log("ShiftSchedule: Google Drive fallback successful.");
                        } else {
                            throw new Error(result.error || t("Google Drive upload failed."));
                        }
                    } catch (driveErr: any) {
                        throw new Error(driveErr.message || t("Tất cả các phương thức tải lên đều thất bại hoặc quá thời gian."));
                    }
                }
            }

            if (!downloadUrl) throw new Error(t("Không thể lấy liên kết tệp tin."));

            console.log("ShiftSchedule: Updating Firestore metadata...");
            await setDoc(doc(firestore, 'system_settings', 'shift_schedule'), {
                url: downloadUrl,
                name: file.name,
                updatedAt: new Date().toISOString(),
                updatedBy: user.uid
            });

            toast({ title: t('Thành công'), description: t('Đã cập nhật lịch trực mới.') });
        } catch (error: any) {
            console.error('ShiftSchedule upload error:', error);
            toast({ 
                variant: 'destructive', 
                title: t('Lỗi tải lên'), 
                description: error.message || t('Đã xảy ra lỗi không xác định.')
            });
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
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
                        {isUploading ? t('Đang tải...') : (scheduleData?.url ? t('Cập nhật lịch mới') : t('Tải lên lịch trực'))}
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
                        <div className="w-full h-[600px] md:h-[800px] bg-muted/10 relative">
                            <iframe 
                                src={`${getEmbedUrl(scheduleData.url)}${scheduleData.url.includes('drive.google.com') ? '' : '#view=FitH'}`}
                                className="w-full h-full border-0 rounded-b-lg"
                                title="Lịch trực"
                            />
                            {scheduleData.url.includes('drive.google.com') && (
                                <div className="absolute top-2 right-2 flex gap-2">
                                    <Button size="sm" variant="secondary" className="opacity-80 hover:opacity-100" asChild>
                                        <a href={scheduleData.url} target="_blank" rel="noopener noreferrer">
                                            <Eye className="h-4 w-4 mr-1" />
                                            Xem trực tiếp
                                        </a>
                                    </Button>
                                </div>
                            )}
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
