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
        
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            toast({ variant: 'destructive', title: t('Lỗi'), description: t('Chỉ hỗ trợ file ảnh hoặc PDF.') });
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

            // --- 0. TRY BASE64 FOR IMAGES (BYPASS STORAGE ON VERCEL) ---
            if (file.type.startsWith('image/')) {
                try {
                    console.log("ShiftSchedule: Compressing image to base64...");
                    const base64Url = await new Promise<string>((resolve, reject) => {
                        const img = new Image();
                        const objectUrl = URL.createObjectURL(file);
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            const MAX_SIZE = 1200;
                            let width = img.width;
                            let height = img.height;

                            if (width > height) {
                                if (width > MAX_SIZE) {
                                    height *= MAX_SIZE / width;
                                    width = MAX_SIZE;
                                }
                            } else {
                                if (height > MAX_SIZE) {
                                    width *= MAX_SIZE / height;
                                    height = MAX_SIZE;
                                }
                            }
                            canvas.width = width;
                            canvas.height = height;
                            const ctx = canvas.getContext('2d');
                            ctx?.drawImage(img, 0, 0, width, height);
                            URL.revokeObjectURL(objectUrl);
                            resolve(canvas.toDataURL('image/jpeg', 0.6));
                        };
                        img.onerror = reject;
                        img.src = objectUrl;
                    });
                    
                    if (base64Url.length < 900000) {
                        downloadUrl = base64Url;
                        console.log("ShiftSchedule: Base64 compression successful.");
                    } else {
                        console.log("ShiftSchedule: Base64 too large, falling back to storage upload.");
                    }
                } catch (e) {
                    console.warn("ShiftSchedule: Base64 compression failed, falling back...", e);
                }
            }

            // --- 0.5. TRY BASE64 FOR SMALL PDFS (BYPASS STORAGE ON VERCEL) ---
            if (!downloadUrl && file.type === 'application/pdf' && file.size < 700000) {
                try {
                    console.log("ShiftSchedule: Converting small PDF to base64...");
                    const base64Url = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                    
                    if (base64Url.length < 900000) {
                        downloadUrl = base64Url;
                        console.log("ShiftSchedule: PDF Base64 conversion successful.");
                    } else {
                        console.log("ShiftSchedule: PDF Base64 too large, falling back to storage upload.");
                    }
                } catch (e) {
                    console.warn("ShiftSchedule: PDF Base64 conversion failed, falling back...", e);
                }
            }
            
            if (!downloadUrl && file.type === 'application/pdf') {
                    const firebaseUploadPromise = (async () => {
                        const snapshot = await uploadBytes(storageRef, file, { contentType: file.type });
                        return await getDownloadURL(snapshot.ref);
                    })();
                    
                    try {
                        const url = await withTimeout(firebaseUploadPromise, 60000, "Firebase Upload Timeout");
                        console.log("ShiftSchedule: Firebase upload successful.");
                        downloadUrl = url;
                    } catch (fbErr: any) {
                        console.warn("ShiftSchedule: Firebase client upload failed, falling back...", fbErr.message);
                    }
            }

            // --- 1. TRY LOCAL UPLOAD FIRST (IF NOT BASE64) ---
            if (!downloadUrl) {
            try {
                toast({ title: t("Đang tải lên..."), description: t("Đang tải file vào hệ thống nội bộ.") });
                const localFormData = new FormData();
                localFormData.append('file', file);
                const localRes = await fetch('/api/upload', { method: 'POST', body: localFormData });
                const localData = await localRes.json();
                if (localData.success && localData.url) {
                    console.log("ShiftSchedule: Local upload successful.");
                    downloadUrl = localData.url;
                } else {
                    throw new Error(localData.error || "Lỗi tải file nội bộ");
                }
            } catch (localErr: any) {
                console.warn("ShiftSchedule: Local upload failed, falling back to cloud...", localErr.message);
                
                // --- 2. TRY SERVER-SIDE CLOUD UPLOADS (DRIVE / FIREBASE) ---
                const serviceAccountEmail = (params.evidenceServiceAccountEmail || params.googleServiceAccountEmail || "").trim();
                const privateKey = (params.evidencePrivateKey || params.googlePrivateKey || "");
                const folderId = (params.evidenceGoogleDriveFolderId || params.googleDriveFolderId || "").trim();
                
                if (serviceAccountEmail && privateKey) {
                        const serverFormData = new FormData();
                        serverFormData.append('file', file);
                        serverFormData.append('clientEmail', serviceAccountEmail);
                        serverFormData.append('privateKey', privateKey);
                        serverFormData.append('projectId', firebaseConfig.projectId || '');
                        serverFormData.append('storageBucket', firebaseConfig.storageBucket || '');

                        const firebaseUploadPromise = uploadToFirebaseServer(serverFormData).catch(e => ({ success: false, error: e.message }));

                        let driveUploadPromise: Promise<any> = Promise.resolve({ success: false, error: 'Chưa cấu hình Drive' });
                        if (folderId) {
                            const driveFormData = new FormData();
                            driveFormData.append('file', file);
                            driveFormData.append('folderId', folderId);
                            driveFormData.append('serviceAccountEmail', serviceAccountEmail);
                            driveFormData.append('privateKey', privateKey);
                            driveUploadPromise = uploadToGoogleDrive(driveFormData).catch(e => ({ success: false, error: e.message }));
                        }

                        const [firebaseResult, driveResult] = await Promise.all([
                            withTimeout(firebaseUploadPromise, 30000, "Firebase timeout"),
                            withTimeout(driveUploadPromise, 40000, "Drive timeout")
                        ]);

                        if (driveResult && driveResult.success && driveResult.url) {
                            downloadUrl = driveResult.url;
                        } else if (firebaseResult && firebaseResult.success && firebaseResult.url) {
                            downloadUrl = firebaseResult.url;
                        } else {
                            let errorMsg = "Tải file thất bại.\n";
                            if (folderId) errorMsg += `- Google Drive: ${driveResult?.error || 'Lỗi không xác định'}\n`;
                            errorMsg += `- Firebase: ${firebaseResult?.error || 'Lỗi không xác định'}`;
                            throw new Error(errorMsg);
                        }
                    } else {
                        throw new Error("Không thể tải tệp. Vui lòng cấu hình Private Key trong phần Cài đặt hệ thống để tải lên Cloud, hoặc kiểm tra lại quyền ghi Local Storage.");
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
        <Card className="w-full shadow-md border-blue-200 dark:border-blue-800 transition-all duration-300 overflow-hidden">
            <CardHeader 
                className="py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    <CardTitle className="text-xl flex items-center gap-2">
                        {t('Lịch trực')}
                        {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                    </CardTitle>
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end" onClick={(e) => e.stopPropagation()}>
                    {scheduleData && scheduleData.url && (
                        <div className="text-xs text-muted-foreground mr-2 hidden sm:block w-full sm:w-auto text-right sm:text-left mb-2 sm:mb-0">
                            Cập nhật: {formatTimeAgo(scheduleData.updatedAt)} {updater ? `bởi ${updater.name}` : ''}
                        </div>
                    )}
                    <input 
                        type="file" 
                        accept=".pdf,image/*" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 shadow-sm shrink-0"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                    >
                        {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin shrink-0" /> : <Upload className="h-4 w-4 mr-2 shrink-0" />}
                        {isUploading ? t('Đang tải...') : (scheduleData?.url ? t('Cập nhật') : t('Tải lên lịch'))}
                    </Button>
                    {scheduleData && scheduleData.url && (
                        <Button size="sm" variant="default" asChild className="h-8 shrink-0">
                            <a href={scheduleData.url} target="_blank" rel="noopener noreferrer">
                                <Download className="h-4 w-4 mr-2 shrink-0" />
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
                        <div className="w-full h-[600px] md:h-[800px] bg-muted/10 relative flex justify-center items-center overflow-auto">
                            {scheduleData.url.startsWith('data:image') || scheduleData.url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                <img 
                                    src={scheduleData.url} 
                                    alt="Lịch trực" 
                                    className="max-w-full h-auto object-contain border-0 rounded-b-lg"
                                />
                            ) : (
                                <iframe 
                                    src={`${getEmbedUrl(scheduleData.url)}${scheduleData.url.includes('drive.google.com') ? '' : '#view=FitH'}`}
                                    className="w-full h-full border-0 rounded-b-lg"
                                    title="Lịch trực"
                                />
                            )}
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
