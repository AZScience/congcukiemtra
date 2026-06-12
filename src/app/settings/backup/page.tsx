"use client";

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { db as firestore } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, writeBatch } from 'firebase/firestore';
import { Download, Loader2, FileJson, History, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef } from 'react';

const COLLECTIONS = [
    'schedules', 'activity-logs', 'messages', 'discussion_sections', 
    'incident-categories', 'recognitions', 'external_checkins', 'employees', 
    'asset-receptions', 'building-blocks', 'gifts', 'document_records', 
    'document_types', 'departments', 'requests', 'petitions', 
    'student-violations', 'online_checkins', 'classrooms', 'lecturers', 
    'positions', 'roles', 'students', 'online_presence', 'visits',
    'exams', 'polls', 'system-parameters', 'users'
];

export default function BackupRestorePage() {
    const [isExporting, setIsExporting] = useState(false);
    const [importingFile, setImportingFile] = useState<string | null>(null);
    const [importProgress, setImportProgress] = useState<string>('');
    const [deletingFile, setDeletingFile] = useState<string | null>(null);
    const [serverFiles, setServerFiles] = useState<{name: string, size: number, createdAt: string}[]>([]);
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchServerFiles = () => {
        fetch('/api/backup-list')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setServerFiles(data.files);
                }
            })
            .catch(err => console.error("Error fetching backup list:", err));
    };

    useEffect(() => {
        fetchServerFiles();
    }, []);

    const handleExport = async () => {
        if (!firestore) {
            toast({ title: "Lỗi", description: "Chưa kết nối CSDL", variant: "destructive" });
            return;
        }

        setIsExporting(true);
        try {
            const backupData: Record<string, any> = {};
            
            for (const collName of COLLECTIONS) {
                console.log(`Đang sao lưu: ${collName}...`);
                
                // Add a 10s timeout to prevent infinite hanging when Firebase is offline/quota exceeded
                const fetchPromise = getDocs(collection(firestore, collName));
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Yêu cầu hết thời gian chờ. Có thể do mạng hoặc Google khóa truy cập (Quota Exceeded).')), 10000)
                );
                
                const querySnapshot = await Promise.race([fetchPromise, timeoutPromise]) as any;

                const docs: Record<string, any> = {};
                querySnapshot.forEach((docSnap: any) => {
                    docs[docSnap.id] = docSnap.data();
                });
                if (Object.keys(docs).length > 0) {
                    backupData[collName] = docs;
                }
            }

            const now = new Date();
            const dd = String(now.getDate()).padStart(2, '0');
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const yyyy = now.getFullYear();
            const hh = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            const filename = `backup_${dd}-${mm}-${yyyy}_${hh}-${min}.json`;

            // 1. Luôn tải file về máy người dùng trước để đảm bảo an toàn dữ liệu
            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // 2. Thử lưu file lên server (Có thể thất bại trên Vercel do Payload Too Large > 4.5MB)
            let serverSaved = false;
            try {
                const response = await fetch('/api/backup-save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data: backupData, filename })
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result.success) {
                        serverSaved = true;
                        fetchServerFiles();
                    }
                }
            } catch (err) {
                console.warn("Không thể lưu bản sao lưu lên server (giới hạn Vercel).", err);
            }
            
            if (serverSaved) {
                toast({ title: "Thành công", description: `Đã lưu bản sao lưu tại server và tải về máy.` });
            } else {
                toast({ title: "Thành công", description: `Đã tải bản sao lưu về máy (Không lưu trên server do giới hạn Vercel).` });
            }
        } catch (error: any) {
            console.error(error);
            toast({ 
                title: "Lỗi sao lưu", 
                description: error.message?.includes('Quota') ? 'Google đã khóa truy cập (Quota Exceeded). Vui lòng đợi mở khóa.' : error.message, 
                variant: "destructive" 
            });
        } finally {
            setIsExporting(false);
        }
    };

    const handleDeleteServerFile = async (fileName: string) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa bản sao lưu ${fileName} này không? Hành động này không thể hoàn tác!`)) return;
        setDeletingFile(fileName);
        try {
            const res = await fetch('/api/backup-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName })
            });
            const data = await res.json();
            if (data.success) {
                toast({ title: 'Thành công', description: 'Đã xóa bản sao lưu thành công.' });
                fetchServerFiles();
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Lỗi', description: error.message || 'Đã xảy ra lỗi khi xóa file.' });
        } finally {
            setDeletingFile(null);
        }
    };

    const handleImport = async (targetFilename?: string) => {
        if (!targetFilename) return;
        if (!firestore) {
            toast({ title: "Lỗi", description: "Chưa kết nối CSDL", variant: "destructive" });
            return;
        }

        setImportingFile(targetFilename);
        try {
            let backupData;
            
            if (targetFilename) {
                const response = await fetch(`/backups/${targetFilename}`);
                if (!response.ok) throw new Error('Không thể đọc file backup từ server');
                backupData = await response.json();
            }
            
            await executeRestore(backupData);
            
        } catch (error: any) {
            console.error(error);
            toast({ 
                title: "Lỗi phục hồi", 
                description: error.message?.includes('Quota') ? 'Google đã khóa truy cập (Quota Exceeded).' : error.message, 
                variant: "destructive" 
            });
        } finally {
            setImportingFile(null);
            setImportProgress('');
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImportingFile('Tải từ máy tính...');
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const jsonContent = event.target?.result as string;
                const backupData = JSON.parse(jsonContent);
                await executeRestore(backupData);
            } catch (error: any) {
                console.error(error);
                toast({ 
                    title: "Lỗi phục hồi", 
                    description: "File backup không hợp lệ hoặc " + (error.message?.includes('Quota') ? 'Google đã khóa truy cập (Quota Exceeded).' : error.message), 
                    variant: "destructive" 
                });
            } finally {
                setImportingFile(null);
                setImportProgress('');
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.onerror = () => {
            toast({ title: "Lỗi", description: "Không thể đọc file", variant: "destructive" });
            setImportingFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const executeRestore = async (backupData: any) => {
        let batch = writeBatch(firestore);
        let operationCount = 0;
        let totalOperations = 0;
        
        let totalToRestore = 0;
        for (const docs of Object.values(backupData)) {
            totalToRestore += Object.keys(docs as object).length;
        }

        for (const [collName, docs] of Object.entries(backupData)) {
            const docRecords = docs as Record<string, any>;
            for (const [docId, docData] of Object.entries(docRecords)) {
                const docRef = doc(firestore, collName, docId);
                batch.set(docRef, docData);
                operationCount++;
                totalOperations++;

                if (operationCount >= 400) {
                    const commitPromise = batch.commit();
                    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Quota Exceeded hoặc mất mạng')), 15000));
                    await Promise.race([commitPromise, timeoutPromise]);
                    
                    batch = writeBatch(firestore);
                    operationCount = 0;
                    const pct = Math.round((totalOperations / totalToRestore) * 100);
                    setImportProgress(`${pct}%`);
                }
            }
        }

        if (operationCount > 0) {
            const commitPromise = batch.commit();
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Quota Exceeded hoặc mất mạng')), 15000));
            await Promise.race([commitPromise, timeoutPromise]);
        }

        toast({ title: "Thành công", description: `Đã phục hồi ${totalOperations} bản ghi dữ liệu.` });
    };
            


    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Sao lưu & Phục hồi dữ liệu</h1>
                <p className="text-muted-foreground mt-2">
                    Tải toàn bộ dữ liệu hệ thống về máy tính để bảo vệ, hoặc phục hồi dữ liệu từ bản sao lưu cũ.
                </p>
            </div>

            <div className="max-w-2xl mx-auto">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Download className="w-5 h-5" /> Xuất dữ liệu (Backup)</CardTitle>
                        <CardDescription>
                            Gom toàn bộ dữ liệu từ tất cả các danh mục và tải về thành 1 file JSON duy nhất.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Button 
                            onClick={handleExport} 
                            disabled={isExporting}
                            className="w-full"
                        >
                            {isExporting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang xử lý...</> : 'Tải Bản Sao Lưu Về Máy'}
                        </Button>

                        <div className="mt-6 pt-6 border-t">
                            <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><Upload className="w-4 h-4" /> Phục hồi từ máy tính</h3>
                            <input 
                                type="file" 
                                accept=".json" 
                                className="hidden" 
                                ref={fileInputRef}
                                onChange={handleFileUpload}
                            />
                            <Button 
                                variant="outline" 
                                className="w-full" 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={importingFile !== null}
                            >
                                {importingFile === 'Tải từ máy tính...' ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang nạp {importProgress}</> : 'Chọn file backup (.json)'}
                            </Button>
                        </div>

                        {serverFiles.length > 0 && (
                            <div className="mt-6 pt-6 border-t">
                                <h3 className="text-sm font-medium mb-3 flex items-center gap-2"><History className="w-4 h-4" /> Các bản sao lưu trên Server</h3>
                                <div className="space-y-2">
                                    {serverFiles.map((file) => (
                                        <div key={file.name} className="flex items-center justify-between p-3 bg-muted/50 rounded-md border text-sm">
                                            <div className="flex items-center gap-2 overflow-hidden mr-2">
                                                <FileJson className="w-4 h-4 text-blue-500 shrink-0" />
                                                <span className="truncate font-mono text-xs" title={file.name}>{file.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="text-muted-foreground text-xs hidden sm:inline-block">{(file.size / 1024).toFixed(1)} KB</span>
                                                <Button size="sm" variant="outline" disabled={importingFile !== null || deletingFile !== null} onClick={() => handleImport(file.name)}>
                                                    {importingFile === file.name ? <><Loader2 className="w-3 h-3 animate-spin mr-1" /> {importProgress || 'Đang nạp'}</> : 'Phục hồi'}
                                                </Button>
                                                <Button size="sm" variant="destructive" className="px-2" disabled={importingFile !== null || deletingFile !== null} onClick={() => handleDeleteServerFile(file.name)}>
                                                    {deletingFile === file.name ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
