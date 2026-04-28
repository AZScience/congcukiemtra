"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  PlusCircle, Trash2, Edit, Cog, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, Copy, ArrowUpDown, ArrowUp, 
  ArrowDown, Filter, X, EllipsisVertical, Save, Undo2, 
  BookUser, Eye, Ban, FileUp, FileDown, CheckCircle2, 
  ListFilter, Check, ChevronsUpDown, Library, Clock, CalendarDays, Camera, RefreshCw,
  Landmark, Users, Hash, Layers, GraduationCap, AlertCircle, 
  MessageSquare, User, Map, School, FileText, StickyNote, DoorOpen, Activity,
  ShieldAlert, UserCheck, FilePenLine, UserSquare, IdCard, Image as ImageIcon, Move, Search, ScanFace, CloudUpload, CloudDownload,
  ChevronUp, ChevronDown, History
} from 'lucide-react';
import { logActivity } from "@/lib/activity-logger";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { usePermissions } from "@/hooks/use-permissions";
import * as XLSX from 'xlsx';
import { format } from "date-fns";
import { SignaturePad } from "@/components/ui/signature-pad";
import PageHeader from "@/components/page-header";
import { ClientOnly } from "@/components/client-only";
import { useLanguage } from "@/hooks/use-language";
import { DataTableEmptyState } from "@/components/data-table-empty-state";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { useMasterData } from "@/providers/master-data-provider";
import { collection, doc, setDoc, deleteDoc, writeBatch, query, orderBy, limit } from "firebase/firestore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Separator } from "@/components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuCheckboxItem,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import type { StudentViolation, Employee, Student } from '@/lib/types';
import { compareFaces } from '@/ai/flows/face-comparison-flow';
import { useSystemParameters } from "@/providers/system-parameters-provider";

type DialogMode = 'add' | 'edit' | 'copy' | 'view';

const ColumnHeader = ({ columnKey, title, icon: Icon, t, sortConfig, openPopover, setOpenPopover, requestSort, clearSort, filters, handleFilterChange }: any) => {
    const sortState = sortConfig?.find((s: any) => s.key === columnKey);
    const isFiltered = !!filters[columnKey];
    return (
        <Popover open={openPopover === columnKey} onOpenChange={(isOpen) => setOpenPopover(isOpen ? columnKey : null)}>
            <PopoverTrigger asChild>
                <Button variant="ghost" className="text-white hover:text-white hover:bg-blue-700 h-10 px-3 group w-full justify-start font-bold text-[11px] uppercase tracking-wider">
                    {Icon && <Icon className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-80" />}
                    <span className="truncate">{t(title)}</span>
                    {sortState ? (
                        sortState.direction === 'ascending' ? <ArrowUp className={cn("ml-2 h-4 w-4", isFiltered && "text-red-500")} /> : <ArrowDown className={cn("ml-2 h-4 w-4", isFiltered && "text-red-500")} />
                    ) : (
                        <ArrowUpDown className={cn("ml-2 h-4 w-4", isFiltered ? "text-red-500" : "opacity-50 group-hover:opacity-100")} />
                    )}

                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-0" align="start">
                <div className="p-1 space-y-1">
                    <Button variant="ghost" onClick={() => requestSort(columnKey, 'ascending')} className="w-full justify-start"><ArrowUp className="mr-2 h-4 w-4" /> Tăng dần</Button>
                    <Button variant="ghost" onClick={() => requestSort(columnKey, 'descending')} className="w-full justify-start"><ArrowDown className="mr-2 h-4 w-4" /> Giảm dần</Button>
                    {sortState && <><Separator /><Button variant="ghost" onClick={clearSort} className="w-full justify-start"><X className="mr-2 h-4 w-4" /> Xoá sắp xếp</Button></>}
                </div>
                <Separator />
                <div className="p-2">
                    <div className="relative">
                        <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder={`${t('Lọc')} ${t(title)}...`} value={filters[columnKey] || ''} onChange={(e) => handleFilterChange(columnKey, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setOpenPopover(null); }} className="h-9 pl-8" />
                    </div>
                    {isFiltered && (
                        <Button variant="ghost" onClick={() => handleFilterChange(columnKey, '')} className="w-full justify-start text-destructive hover:text-destructive h-8 px-2 mt-1"><X className="mr-2 h-4 w-4" /> {t('Xóa bộ lọc')}</Button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

const QRScannerDialog = ({ open, onOpenChange, onScan, t }: any) => {
    const { toast } = useToast();
    const [error, setError] = useState<string | null>(null);
    const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
    const [scanMode, setScanMode] = useState<'qr' | 'barcode'>('qr');
    const [scanSuccess, setScanSuccess] = useState(false);
    const scannerRef = useRef<any>(null);
    const isTransitioning = useRef(false);

    useEffect(() => {
        if (!open) return;

        let isMounted = true;

        const initScanner = async () => {
            if (isTransitioning.current) return;
            isTransitioning.current = true;

            try {
                if (!(window as any).Html5Qrcode) {
                    await new Promise((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = "https://unpkg.com/html5-qrcode";
                        script.onload = resolve;
                        script.onerror = reject;
                        document.body.appendChild(script);
                    });
                }

                if (!isMounted) return;

                const element = document.getElementById("qr-reader");
                if (!element) {
                    isTransitioning.current = false;
                    return;
                }

                if (scannerRef.current) {
                    try { if (scannerRef.current.isScanning) await scannerRef.current.stop(); } catch (e) {}
                }
                element.innerHTML = "";

                const scanner = new (window as any).Html5Qrcode("qr-reader", {
                    formatsToSupport: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
                    experimentalFeatures: {
                        useBarCodeDetectorIfSupported: true
                    }
                });
                scannerRef.current = scanner;

                const config = { 
                    fps: 20, 
                    qrbox: (viewW: number, viewH: number) => {
                        if (scanMode === 'barcode') {
                            const w = Math.min(viewW * 0.9, 380);
                            const h = Math.min(w * 0.4, 160);
                            return { width: Math.round(w), height: Math.round(h) };
                        } else {
                            const side = Math.min(viewW, viewH) * 0.75;
                            return { width: Math.round(side), height: Math.round(side) };
                        }
                    },
                    aspectRatio: scanMode === 'barcode' ? 1.777778 : 1.0,
                    showTorchButtonIfSupported: true,
                };

                await new Promise(r => setTimeout(r, 600));
                if (!isMounted) return;

                const successCallback = (decodedText: string) => {
                    if (isMounted) {
                        if (navigator.vibrate) navigator.vibrate([80, 50, 80]);
                        setScanSuccess(true);
                        setTimeout(() => {
                            onScan(decodedText);
                            onOpenChange(false);
                        }, 300);
                    }
                };

                let cameraIdOrConstraint: any = { facingMode: { ideal: facingMode } };
                try {
                    const cameras = await (window as any).Html5Qrcode.getCameras();
                    if (cameras && cameras.length > 1) {
                        if (facingMode === 'environment') {
                            const backCamera = cameras.find((c: any) =>
                                /back|rear|environment|sau|0\s*,\s*0/i.test(c.label)
                            ) || cameras[cameras.length - 1];
                            cameraIdOrConstraint = backCamera.id;
                        } else {
                            const frontCamera = cameras.find((c: any) =>
                                /front|user|selfie|trước/i.test(c.label)
                            ) || cameras[0];
                            cameraIdOrConstraint = frontCamera.id;
                        }
                    }
                } catch (_) {}

                await scanner.start(cameraIdOrConstraint, config, successCallback, () => {});

                const turboScanInterval = setInterval(async () => {
                    if (!isMounted || scanSuccess || !scannerRef.current?.isScanning) return;
                    
                    try {
                        const videoEl = document.querySelector("#qr-reader video") as HTMLVideoElement;
                        if (!videoEl || videoEl.paused || videoEl.ended) return;

                        const canvas = document.createElement("canvas");
                        canvas.width = videoEl.videoWidth;
                        canvas.height = videoEl.videoHeight;
                        const ctx = canvas.getContext("2d");
                        if (!ctx) return;
                        
                        const scanAndProcess = async (isProcessed: boolean) => {
                            if (isProcessed) {
                                ctx.filter = 'contrast(1.4) grayscale(1)';
                                ctx.drawImage(videoEl, 0, 0);
                            } else {
                                ctx.drawImage(videoEl, 0, 0);
                            }
                            
                            return new Promise<void>((resolve) => {
                                canvas.toBlob(async (blob) => {
                                    if (!blob || !isMounted || scanSuccess) return resolve();
                                    try {
                                        const file = new File([blob], "scan.jpg", { type: "image/jpeg" });
                                        const decodedText = await scannerRef.current.scanFile(file, true);
                                        if (decodedText && isMounted && !scanSuccess) {
                                            successCallback(decodedText);
                                        }
                                    } catch (e) {}
                                    resolve();
                                }, "image/jpeg", 0.9);
                            });
                        };

                        await scanAndProcess(false);
                        if (!scanSuccess) await scanAndProcess(true);
                    } catch (e) {}
                }, 1500);

                (scanner as any)._turboInterval = turboScanInterval;

            } catch (err: any) {
                if (isMounted) {
                    setError("Không thể khởi động Camera hoặc độ phân giải không hỗ trợ.");
                    console.error(err);
                }
            } finally {
                isTransitioning.current = false;
            }
        };

        const timer = setTimeout(initScanner, 500);

        return () => {
            clearTimeout(timer);
            isMounted = false;
            
            const cleanup = async () => {
                if (scannerRef.current) {
                    if ((scannerRef.current as any)._turboInterval) {
                        clearInterval((scannerRef.current as any)._turboInterval);
                    }
                    try {
                        if (scannerRef.current.isScanning) {
                            await scannerRef.current.stop();
                        }
                    } catch (e) {}
                    scannerRef.current = null;
                }
                const el = document.getElementById("qr-reader");
                if (el) el.innerHTML = "";
            };
            cleanup();
        };
    }, [open, facingMode, scanMode]);

    const handleSettingsClick = () => {
        toast({
            title: "Cài đặt Camera",
            description: "Hãy cấp quyền 'Máy ảnh' và đảm bảo bạn đang sử dụng trình duyệt Chrome hoặc Safari bản mới nhất.",
            duration: 5000,
        });
    };

    const handleFileSelect = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file || !scannerRef.current) return;

        try {
            const decodedText = await scannerRef.current.scanFile(file, true);
            onScan(decodedText);
            onOpenChange(false);
            if (navigator.vibrate) navigator.vibrate(100);
        } catch (err) {
            toast({
                title: "Không đọc được mã",
                description: "Ảnh chụp chưa rõ mã QR/Barcode. Vui lòng chụp lại ảnh rõ nét và đủ sáng hơn.",
                variant: "destructive"
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none bg-transparent shadow-none" onPointerDownOutside={(e) => e.preventDefault()}>
                <VisuallyHidden><DialogTitle>Quét mã QR</DialogTitle><DialogDescription>Sử dụng camera hoặc tải ảnh để quét mã.</DialogDescription></VisuallyHidden>
                <div className={cn(
                    "relative w-full max-w-sm mx-auto bg-black rounded-3xl overflow-hidden border-4 shadow-2xl transition-all duration-300",
                    scanMode === 'barcode' ? 'aspect-video' : 'aspect-square',
                    scanSuccess ? 'border-green-400' : 'border-white/20'
                )}>
                    <div id="qr-reader" className={cn(
                        "w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full",
                        "[&>div]:hidden",
                        facingMode === 'user' && "[&>video]:scale-x-[-1]"
                    )} />
                    
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        <div className={cn(
                            "relative transition-all duration-500",
                            scanMode === 'barcode' ? 'w-[85%] h-[32%]' : 'w-[72%] h-[72%]'
                        )}>
                            <div className={cn(
                                "absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 transition-colors",
                                scanSuccess ? 'border-green-400' : 'border-white',
                                scanMode === 'barcode' ? 'rounded-tl-xl' : 'rounded-tl-2xl'
                            )} />
                            <div className={cn(
                                "absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 transition-colors",
                                scanSuccess ? 'border-green-400' : 'border-white',
                                scanMode === 'barcode' ? 'rounded-tr-xl' : 'rounded-tr-2xl'
                            )} />
                            <div className={cn(
                                "absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 transition-colors",
                                scanSuccess ? 'border-green-400' : 'border-white',
                                scanMode === 'barcode' ? 'rounded-bl-xl' : 'rounded-bl-2xl'
                            )} />
                            <div className={cn(
                                "absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 transition-colors",
                                scanSuccess ? 'border-green-400' : 'border-white',
                                scanMode === 'barcode' ? 'rounded-br-xl' : 'rounded-br-2xl'
                            )} />

                            {!scanSuccess && (
                                <div className="absolute inset-x-0 top-0 h-0.5 animate-[scan-line_2s_ease-in-out_infinite]" style={{
                                    background: 'linear-gradient(to right, transparent, #22c55e, transparent)',
                                    boxShadow: '0 0 8px #22c55e, 0 0 20px #22c55e55',
                                    animation: 'scanLine 2s ease-in-out infinite'
                                }} />
                            )}
                            
                            {scanSuccess && (
                                <div className="absolute inset-0 bg-green-400/30 rounded-lg flex items-center justify-center">
                                    <CheckCircle2 className="h-12 w-12 text-green-400" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1 z-20 bg-black/40 backdrop-blur-sm rounded-full p-1">
                        <button onClick={() => setScanMode('qr')} className={cn("text-[10px] font-bold px-3 py-1 rounded-full transition-all", scanMode === 'qr' ? 'bg-white text-black' : 'text-white/60 hover:text-white')}>■ QR</button>
                        <button onClick={() => setScanMode('barcode')} className={cn("text-[10px] font-bold px-3 py-1 rounded-full transition-all", scanMode === 'barcode' ? 'bg-white text-black' : 'text-white/60 hover:text-white')}>≡ Barcode</button>
                    </div>

                    {error && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 text-center text-white z-20">
                            <AlertCircle className="h-12 w-12 text-rose-500 mb-4" />
                            <p className="text-sm font-medium">{error}</p>
                            <Button onClick={() => onOpenChange(false)} variant="outline" className="mt-6 border-white/20 text-white hover:bg-white/10">Đóng</Button>
                        </div>
                    )}
                    
                    <div className="absolute bottom-16 left-0 right-0 text-center text-white/80 text-[10px] font-medium drop-shadow-md z-10 px-4">Đưa mã vào khung xanh ở giữa để quét trực tiếp</div>
                    
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
                        <label className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs px-4 py-2 rounded-full cursor-pointer transition-all border border-white/20">
                            <Camera className="h-4 w-4" />
                            <span>Chụp hoặc Tải ảnh thẻ</span>
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />
                        </label>
                    </div>
                    
                    <Button variant="ghost" size="icon" onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')} className="absolute top-4 left-4 text-white hover:bg-white/20 rounded-full z-20"><RefreshCw className="h-6 w-6" /></Button>
                    <div className="absolute top-4 right-4 flex gap-1 z-20">
                        <Button variant="ghost" size="icon" onClick={handleSettingsClick} className="text-white hover:bg-white/20 rounded-full"><Cog className="h-6 w-6" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-white hover:bg-white/20 rounded-full"><X className="h-6 w-6" /></Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

const CreatableCombobox = ({ options, value, onChange, placeholder, disabled }: any) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const displayValue = options.find((o: any) => o.value === value)?.label || value;
    const exactMatch = options.some((o: any) => o.label.toLowerCase() === search.toLowerCase() || o.value.toLowerCase() === search.toLowerCase());

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-8 text-sm px-3" disabled={disabled}>
                    <span className="truncate">{value ? displayValue : placeholder}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command shouldFilter={true}>
                    <CommandInput placeholder="Tìm hoặc nhập mới..." value={search} onValueChange={setSearch} />
                    <CommandList>
                        <CommandEmpty className="p-2 text-center text-xs text-muted-foreground">Không tìm thấy kết quả.</CommandEmpty>
                        {search && !exactMatch && (
                            <CommandGroup heading="Hành động">
                                <CommandItem value={search} onSelect={() => { onChange(search); setOpen(false); setSearch(""); }} className="text-primary font-medium"><PlusCircle className="mr-2 h-4 w-4" />Thêm mới: "{search}"</CommandItem>
                            </CommandGroup>
                        )}
                        <CommandGroup heading="Danh sách gợi ý">
                            {options.map((option: any) => (
                                <CommandItem key={option.value} value={option.label} onSelect={() => { onChange(option.value); setOpen(false); setSearch(""); }}>
                                    <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

const CameraCaptureDialog = ({ open, onOpenChange, onCapture, label }: any) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const [zoom, setZoom] = useState(1);
    const { toast } = useToast();
    const isPortrait = label.toLowerCase().includes('chân dung');
    const [frameW, setFrameW] = useState(isPortrait ? 0.35 : 0.6);
    const [frameH, setFrameH] = useState(isPortrait ? 0.75 : 0.45);
    const [frameX, setFrameX] = useState(0.5);
    const [frameY, setFrameY] = useState(0.5);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (open) {
            setFrameW(isPortrait ? 0.35 : 0.6); setFrameH(isPortrait ? 0.75 : 0.45); setFrameX(0.5); setFrameY(0.5);
            const initCamera = async () => {
                try {
                    if (stream) stream.getTracks().forEach(t => t.stop());
                    const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } } });
                    setStream(s); if (videoRef.current) videoRef.current.srcObject = s;
                } catch (err) {
                    toast({ title: "Lỗi camera", description: "Không thể truy cập camera.", variant: "destructive" });
                    if (facingMode === 'environment') setFacingMode('user');
                }
            };
            initCamera();
        } else if (stream) {
            stream.getTracks().forEach(t => t.stop()); setStream(null);
        }
        return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
    }, [open, facingMode]);

    useEffect(() => {
        if (stream) {
            const track = stream.getVideoTracks()[0];
            const caps = track.getCapabilities() as any;
            if (caps.zoom) track.applyConstraints({ advanced: [{ zoom: Math.min(Math.max(zoom, caps.zoom.min), caps.zoom.max) }] as any });
        }
    }, [zoom, stream]);

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        setFrameX(Math.min(Math.max(x, frameW/2), 1 - frameW/2));
        setFrameY(Math.min(Math.max(y, frameH/2), 1 - frameH/2));
    };

    const handleCapture = () => {
        if (videoRef.current) {
            const video = videoRef.current; const canvas = document.createElement('canvas');
            const vW = video.videoWidth; const vH = video.videoHeight;
            const cropW = vW * frameW; const cropH = vH * frameH;
            const startX = vW * frameX - cropW / 2; const startY = vH * frameY - cropH / 2;
            canvas.width = cropW; canvas.height = cropH;
            const ctx = canvas.getContext('2d');
            if (ctx) ctx.drawImage(video, startX, startY, cropW, cropH, 0, 0, cropW, cropH);
            onCapture(canvas.toDataURL('image/jpeg', 0.85)); onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-none select-none">
                <DialogHeader><VisuallyHidden><DialogTitle>{label}</DialogTitle></VisuallyHidden></DialogHeader>
                <div ref={containerRef} className="relative aspect-square md:aspect-video w-full bg-slate-900 flex items-center justify-center overflow-hidden touch-none" onPointerMove={handlePointerMove} onPointerUp={() => setIsDragging(false)} onPointerLeave={() => setIsDragging(false)}>
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover transition-transform" style={{ transform: `scale(${zoom > 1 ? zoom/1.5 : 1})` }} />
                    <div className={cn("absolute border-2 border-dashed border-white/80 shadow-[0_0_0_1000px_rgba(0,0,0,0.5)] cursor-move transition-shadow", isPortrait ? "rounded-[50%]" : "rounded-lg", isDragging && "border-rose-500 border-solid ring-2 ring-rose-500/50")} style={{ width: `${frameW * 100}%`, height: `${frameH * 100}%`, left: `${(frameX - frameW/2) * 100}%`, top: `${(frameY - frameH/2) * 100}%` }} onPointerDown={(e) => { e.stopPropagation(); setIsDragging(true); }}>
                        <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-rose-500 rounded-tl-sm"></div>
                        <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-rose-500 rounded-tr-sm"></div>
                        <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-rose-500 rounded-bl-sm"></div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-rose-500 rounded-br-sm"></div>
                        <div className="absolute inset-0 flex items-center justify-center"><Move className="h-4 w-4 text-white/40" /></div>
                    </div>
                    <div className="absolute top-4 left-4 flex gap-2"><Badge variant="secondary" className="bg-black/50 text-white border-none">{label}</Badge><Badge variant="secondary" className="bg-primary/50 text-white border-none">{facingMode === 'user' ? 'Trước' : 'Sau'}</Badge></div>
                    <Button variant="ghost" size="icon" onClick={() => setFacingMode(facingMode === 'user' ? 'environment' : 'user')} className="absolute top-4 right-4 text-white bg-black/30 rounded-full h-10 w-10"><RefreshCw className="h-5 w-5" /></Button>
                    <div className="absolute bottom-4 left-0 right-0 px-4 flex flex-col gap-2 pointer-events-none">
                        <div className="flex gap-2 justify-center">
                            <div className="bg-black/60 backdrop-blur-md p-2 rounded-xl pointer-events-auto border border-white/10 flex flex-col gap-1 w-32"><div className="flex justify-between text-[8px] text-white/50 font-bold uppercase"><span>Rộng</span><span>{Math.round(frameW*100)}%</span></div><input type="range" min="0.2" max="0.9" step="0.01" value={frameW} onChange={(e) => setFrameW(parseFloat(e.target.value))} className="w-full h-1 accent-blue-500" /></div>
                            <div className="bg-black/60 backdrop-blur-md p-2 rounded-xl pointer-events-auto border border-white/10 flex flex-col gap-1 w-32"><div className="flex justify-between text-[8px] text-white/50 font-bold uppercase"><span>Cao</span><span>{Math.round(frameH*100)}%</span></div><input type="range" min="0.2" max="0.9" step="0.01" value={frameH} onChange={(e) => setFrameH(parseFloat(e.target.value))} className="w-full h-1 accent-green-500" /></div>
                            <div className="bg-black/60 backdrop-blur-md p-2 rounded-xl pointer-events-auto border border-white/10 flex flex-col gap-1 w-24"><div className="flex justify-between text-[8px] text-white/50 font-bold uppercase"><span>Zoom</span><span>{zoom}x</span></div><input type="range" min="1" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-full h-1 accent-rose-500" /></div>
                        </div>
                    </div>
                </div>
                <div className="p-6 flex justify-end gap-3 bg-slate-900 border-t border-white/5"><Button onClick={() => onOpenChange(false)} className="bg-transparent border border-white/20 text-white hover:bg-white/10 hover:text-white"><X className="mr-2 h-4 w-4" />Hủy bỏ</Button><Button onClick={handleCapture} className="bg-rose-600 hover:bg-rose-700 text-white"><Camera className="mr-2 h-4 w-4" />Chụp ảnh</Button></div>
            </DialogContent>
        </Dialog>
    );
};

const CollapsibleSection = ({ title, icon: Icon, children, defaultOpen = false }: any) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-3">
            <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between gap-2 border-l-4 border-rose-500 pl-3 cursor-pointer hover:bg-slate-50 py-1 transition-colors group rounded-r-md">
                    <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-rose-500" /><h3 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider">{title}</h3></div>
                    {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400 group-hover:text-rose-500" /> : <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-rose-500" />}
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down overflow-hidden">{children}</CollapsibleContent>
        </Collapsible>
    );
};

const PhotoUpload = ({ value, onChange, disabled, label }: any) => {
    const fileInputRef = useRef<HTMLInputElement>(null); const [isCameraOpen, setIsCameraOpen] = useState(false); const { toast } = useToast();
    const handleFileChange = (e: any) => {
        const file = e.target.files?.[0]; if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast({ title: "Ảnh quá lớn", description: "Vui lòng chọn ảnh dưới 2MB", variant: "destructive" }); return; }
        const reader = new FileReader(); reader.onloadend = () => onChange(reader.result as string); reader.readAsDataURL(file);
    };
    return (
        <div className="flex flex-col gap-2">
            <div className={cn("relative h-[100px] w-full rounded-lg border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all", value ? "border-primary/50 bg-primary/5" : "border-muted-foreground/20 hover:border-primary/30", disabled && "opacity-60 cursor-not-allowed")}>
                {value ? (<><img src={value} alt="Preview" className="w-full h-full object-cover" />{!disabled && <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 rounded-full shadow-lg" onClick={(e) => { e.stopPropagation(); onChange(''); }}><X className="h-3 w-3" /></Button>}</>) : (
                    <div className="flex flex-col items-center gap-1 text-muted-foreground p-2 text-center h-full w-full justify-center"><div className="flex gap-2"><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-muted" onClick={() => !disabled && setIsCameraOpen(true)}><Camera className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-muted" onClick={() => !disabled && fileInputRef.current?.click()}><ImageIcon className="h-4 w-4" /></Button></div><span className="text-[9px] font-medium leading-tight">{label}</span></div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            </div>
            <CameraCaptureDialog open={isCameraOpen} onOpenChange={setIsCameraOpen} onCapture={onChange} label={label} />
        </div>
    );
};

const EditDialog = ({ open, onOpenChange, mode, formData: initialFormData, onSave, t, employees, students, studentsMap, lecturers, filteredIncidents, blocks, departments }: any) => {
    const [formData, setFormData] = useState<any>(initialFormData);
    const { toast } = useToast();
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [searchStatus, setSearchStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [compareStatus, setCompareStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [confidence, setConfidence] = useState<number | null>(null);
    const { params: systemParams } = useSystemParameters();

    useEffect(() => { if (open) setFormData(initialFormData); }, [open, initialFormData]);

    const handleCompareFaces = async () => {
        if (!formData.portraitPhoto || !formData.documentPhoto) {
            toast({ title: "Thiếu dữ liệu", description: "Vui lòng chụp cả ảnh chân dung và giấy tờ trước khi đối soát.", variant: "destructive" });
            return;
        }
        if (!systemParams.aiApiKey) {
            toast({ title: "Chưa cấu hình AI", description: "Vui lòng vào mục 'Tham số hệ thống' để nhập và LƯU API Key trước khi sử dụng tính năng này.", variant: "destructive" });
            return;
        }
        setCompareStatus('loading');
        try {
            const result = await compareFaces({ portraitPhoto: formData.portraitPhoto, documentPhoto: formData.documentPhoto, aiApiKey: systemParams.aiApiKey });
            setCompareStatus(result.isMatch ? 'success' : 'error'); setConfidence(result.confidence);
            toast({ title: result.isMatch ? "Đối soát thành công" : "Cảnh báo đối soát", description: result.message, variant: result.isMatch ? "default" : "destructive" });
        } catch (err: any) {
            setCompareStatus('error'); setConfidence(0);
            toast({ title: "Lỗi đối soát", description: "Không thể kết nối với dịch vụ AI. Vui lòng thử lại sau.", variant: "destructive" });
        }
    };

    const handleSearchStudent = () => {
        const code = (formData.studentId || formData.identifier || '').trim().toLowerCase();
        if (!code) { toast({ title: "Thông báo", description: "Vui lòng nhập MSSV hoặc CCCD trước khi tìm.", variant: "destructive" }); return; }
        const student = studentsMap.get(code);
        if (student) {
            setSearchStatus('success');
            setFormData({ ...formData, fullName: student.name, studentId: student.id, identifier: student.identifier || code, class: student.class, building: student.building || formData.building, department: student.department || formData.department });
            toast({ title: "Đã tìm thấy sinh viên", description: `${student.name} (${student.id})` });
            setTimeout(() => setSearchStatus('idle'), 2000);
        } else {
            setSearchStatus('error'); toast({ title: "Không tìm thấy", description: "Không có thông tin sinh viên này trong hệ thống.", variant: "destructive" });
            setTimeout(() => setSearchStatus('idle'), 3000);
        }
    };

    const handleScan = (code: string) => {
        let searchCode = code.trim().toLowerCase(); let scannedName = ""; let isCCCD = false;
        if (code.includes('|')) {
            const parts = code.split('|');
            if (parts.length >= 3) { searchCode = parts[0].toLowerCase(); scannedName = parts[2]; isCCCD = true; }
        }
        const student = studentsMap.get(searchCode);
        if (student) {
            setFormData({ ...formData, fullName: student.name, studentId: student.id, identifier: student.identifier || (isCCCD ? searchCode : formData.identifier), class: student.class, building: student.building || formData.building, department: student.department || formData.department });
            setSearchStatus('success'); toast({ title: "Đã tìm thấy sinh viên", description: `${student.name} (${student.id})` }); setTimeout(() => setSearchStatus('idle'), 2000);
        } else {
            if (isCCCD) {
                setFormData({ ...formData, fullName: scannedName, identifier: searchCode, studentId: '' });
                toast({ title: "Đã lấy thông tin từ CCCD", description: `Họ tên: ${scannedName}. Lưu ý: Sinh viên chưa có trong hệ thống.` });
            } else {
                setFormData({ ...formData, studentId: searchCode, identifier: searchCode });
                toast({ title: "Quét thành công", description: `Mã số: ${searchCode}. Không tìm thấy trong hệ thống.` });
            }
            setSearchStatus('error'); setTimeout(() => setSearchStatus('idle'), 3000);
        }
    };

    const isChanged = useMemo(() => JSON.stringify(formData) !== JSON.stringify(initialFormData), [formData, initialFormData]);
    const onUndo = () => setFormData(initialFormData);
    const handleLocalSave = () => { const shouldSyncStudent = searchStatus === 'error' && compareStatus === 'success'; onSave(formData, shouldSyncStudent); };
    
    const blockOptions = useMemo(() => (blocks || []).map((b: any) => ({ label: b.name, value: b.name })), [blocks]);
    const deptOptions = useMemo(() => (departments || []).map((d: any) => ({ label: d.name, value: d.name })), [departments]);
    const studentOptions = useMemo(() => (students || []).map((s: any) => ({ label: `${s.name} (${s.id})`, value: s.name, id: s.id, class: s.class })), [students]);
    const classOptions = useMemo(() => Array.from(new Set((students || []).map((s: any) => s.class))).filter(Boolean).sort().map(c => ({ label: c as string, value: c as string })), [students]);
    const officerOptions = useMemo(() => (employees || []).filter((e: any) => e.nickname).map((e: any) => ({ label: e.nickname, value: e.nickname })).sort((a: any, b: any) => a.label.localeCompare(b.label)), [employees]);
    const incidentOptions = useMemo(() => (filteredIncidents || []).map((i: any) => ({ label: i.name, value: i.name })), [filteredIncidents]);

    const handleStudentChange = (val: string) => {
        const student = studentOptions.find((s: any) => s.value === val);
        if (student) setFormData({ ...formData, fullName: student.value, studentId: student.id, class: student.class });
        else setFormData({ ...formData, fullName: val });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <div className="flex justify-between items-center pr-8">
                        <DialogTitle>{mode === 'view' ? 'Chi tiết' : (mode === 'edit' ? 'Cập nhật' : 'Thêm mới')} vi phạm của sinh viên</DialogTitle>
                        {mode !== 'view' && (
                            <Button variant="outline" size="sm" onClick={() => setIsScannerOpen(true)} className="text-primary border-primary hover:bg-primary/5 h-8">
                                <Camera className="mr-2 h-4 w-4" /> Quét thẻ (TSV/CCCD)
                            </Button>
                        )}
                    </div>
                    <VisuallyHidden><DialogDescription>Cấu hình thông tin vi phạm.</DialogDescription></VisuallyHidden>
                </DialogHeader>
                <ScrollArea className="max-h-[75vh]">
                    <div className="p-6 space-y-8">
                        <CollapsibleSection title="Thông tin sinh viên" icon={User} defaultOpen={true}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-muted/20 p-4 rounded-xl border border-slate-100">
                                <div className="space-y-1">
                                    <Label className="text-muted-foreground flex items-center gap-2 text-[10px] uppercase font-bold tracking-tight"><Hash className="h-3.5 w-3.5 text-rose-500" /> Mã số SV / CCCD</Label>
                                    {(mode === 'add' || mode === 'copy' || mode === 'edit') ? (
                                        <div className="relative flex items-center">
                                            <Input className={cn("h-9 font-mono pr-8 transition-colors text-sm", searchStatus === 'error' && "border-red-500 focus-visible:ring-red-500 bg-red-50/50", searchStatus === 'success' && "border-green-500 focus-visible:ring-green-500 bg-green-50/50")} value={formData.studentId || formData.identifier || ''} onChange={e => { setFormData({...formData, studentId: e.target.value, identifier: e.target.value}); if (searchStatus !== 'idle') setSearchStatus('idle'); }} placeholder="MSSV hoặc CCCD..." onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchStudent(); } }} />
                                            <Button type="button" variant="ghost" size="icon" className="absolute right-0 h-9 w-9 text-slate-400 hover:text-rose-500" onClick={handleSearchStudent}><Search className="h-4 w-4" /></Button>
                                        </div>
                                    ) : <p className="font-bold text-sm h-9 flex items-center">{formData.studentId || formData.identifier}</p>}
                                </div>
                                <div className="space-y-1"><Label className="text-muted-foreground flex items-center gap-2 text-[10px] uppercase font-bold tracking-tight"><User className="h-3.5 w-3.5 text-rose-500" /> Họ tên sinh viên</Label>{(mode === 'add' || mode === 'copy') ? <CreatableCombobox options={studentOptions} value={formData.fullName} onChange={handleStudentChange} placeholder="Chọn sinh viên..." /> : <p className="font-bold text-sm h-9 flex items-center">{formData.fullName}</p>}</div>
                                <div className="space-y-1"><Label className="text-muted-foreground flex items-center gap-2 text-[10px] uppercase font-bold tracking-tight"><Library className="h-3.5 w-3.5 text-rose-500" /> Lớp</Label>{mode !== 'view' ? <CreatableCombobox options={classOptions} value={formData.class} onChange={(v: string) => setFormData({...formData, class: v})} placeholder="Chọn hoặc nhập lớp..." /> : <p className="font-bold text-sm h-9 flex items-center">{formData.class}</p>}</div>
                                <div className="space-y-1"><Label className="text-muted-foreground flex items-center gap-2 text-[10px] uppercase font-bold tracking-tight"><Map className="h-3.5 w-3.5 text-rose-500" /> Dãy nhà</Label>{mode !== 'view' ? <CreatableCombobox options={blockOptions} value={formData.building} onChange={(v: string) => setFormData({...formData, building: v})} placeholder="Chọn dãy nhà..." /> : <p className="font-bold text-sm h-9 flex items-center">{formData.building}</p>}</div>
                                <div className="space-y-1"><Label className="text-muted-foreground flex items-center gap-2 text-[10px] uppercase font-bold tracking-tight"><Landmark className="h-3.5 w-3.5 text-rose-500" /> Khoa</Label>{mode !== 'view' ? <CreatableCombobox options={deptOptions} value={formData.department} onChange={(v: string) => setFormData({...formData, department: v})} placeholder="Chọn khoa..." /> : <p className="font-bold text-sm h-9 flex items-center">{formData.department}</p>}</div>
                            </div>
                        </CollapsibleSection>
                        <CollapsibleSection title="Chi tiết vi phạm" icon={AlertCircle} defaultOpen={false}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-slate-100">
                                <div className="space-y-1"><Label className="text-muted-foreground flex items-center gap-2 text-[10px] uppercase font-bold tracking-tight"><AlertCircle className="h-3.5 w-3.5 text-rose-500" /> Lỗi vi phạm</Label>{mode !== 'view' ? <CreatableCombobox options={incidentOptions} value={formData.violationType} onChange={(v: string) => setFormData({...formData, violationType: v})} placeholder="Chọn hoặc nhập lỗi vi phạm..." /> : <p className="font-bold text-sm">{formData.violationType}</p>}</div>
                                {mode !== 'add' && (<div className="space-y-1"><Label className="text-muted-foreground flex items-center gap-2 text-[10px] uppercase font-bold tracking-tight"><CalendarDays className="h-3.5 w-3.5 text-rose-500" /> Ngày vi phạm</Label>{mode !== 'view' ? <DatePickerField className="h-9" value={formData.violationDate} onChange={v => setFormData({...formData, violationDate: v})} /> : <p className="font-bold text-sm">{formData.violationDate}</p>}</div>)}
                                <div className="md:col-span-2 space-y-1"><Label className="text-muted-foreground flex items-center gap-2 text-[10px] uppercase font-bold tracking-tight"><StickyNote className="h-3.5 w-3.5 text-rose-500" /> Ghi chú thêm</Label><Input className="h-10 text-sm" value={formData.note || ''} onChange={e => setFormData({...formData, note: e.target.value})} disabled={mode === 'view'} placeholder="Nhập ghi chú thêm nếu có..." /></div>
                            </div>
                        </CollapsibleSection>
                        <CollapsibleSection title="Xác minh & Hình ảnh" icon={ShieldAlert} defaultOpen={false}>
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-muted/20 p-4 rounded-xl border border-slate-100">
                                <div className="md:col-span-4 space-y-1"><Label className="text-muted-foreground flex items-center gap-2 text-[10px] uppercase font-bold tracking-tight"><FilePenLine className="h-3.5 w-3.5 text-rose-500" /> Ký tên xác nhận</Label><SignaturePad value={formData.signatureBase64} onChange={(val: string | null) => setFormData({...formData, signatureBase64: val, signed: val ? 'Đã ký' : 'Chưa ký'})} disabled={mode === 'view'} />{mode !== 'add' && (<div className="mt-2 flex items-center gap-2 px-2 py-1 bg-white/50 rounded-md border border-slate-100"><Activity className="h-3.5 w-3.5 text-rose-500" /><span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Trạng thái: {formData.signed || 'Chưa ký'}</span></div>)}</div>
                                <div className="md:col-span-8 space-y-4">
                                    <div className="grid grid-cols-7 gap-2 items-center">
                                        <div className="col-span-3 space-y-1"><Label className="text-muted-foreground flex items-center gap-2 text-[10px] uppercase font-bold tracking-tight"><UserSquare className="h-3.5 w-3.5 text-rose-500" /> Ảnh chân dung</Label><PhotoUpload value={formData.portraitPhoto} onChange={(val: string | null) => { setFormData({...formData, portraitPhoto: val}); setCompareStatus('idle'); }} disabled={mode === 'view'} label="Chân dung" /></div>
                                        <div className="col-span-1 flex flex-col items-center justify-center pt-5"><Button type="button" variant="outline" size="icon" className={cn("h-10 w-10 rounded-full border-2 transition-all shadow-sm", compareStatus === 'idle' && "border-slate-200 text-slate-400 hover:border-primary", compareStatus === 'loading' && "border-blue-500 animate-pulse", compareStatus === 'success' && "border-green-500 bg-green-50 text-green-600", compareStatus === 'error' && "border-red-500 bg-red-50 text-red-600")} onClick={handleCompareFaces} disabled={mode === 'view' || compareStatus === 'loading'}>{compareStatus === 'loading' ? <RefreshCw className="h-5 w-5 animate-spin" /> : <ScanFace className="h-5 w-5" />}</Button>{confidence !== null && compareStatus !== 'loading' && compareStatus !== 'idle' && (<span className={cn("text-[9px] font-bold mt-1", compareStatus === 'success' ? "text-green-600" : "text-red-600")}>{confidence}%</span>)}</div>
                                        <div className="col-span-3 space-y-1"><Label className="text-muted-foreground flex items-center gap-2 text-[10px] uppercase font-bold tracking-tight"><IdCard className="h-3.5 w-3.5 text-rose-500" /> Ảnh giấy tờ</Label><PhotoUpload value={formData.documentPhoto} onChange={(val: string | null) => { setFormData({...formData, documentPhoto: val}); setCompareStatus('idle'); }} disabled={mode === 'view'} label="Giấy tờ" /></div>
                                    </div>
                                    {mode !== 'add' && (<div className="space-y-1 bg-white/50 p-2 rounded-md border border-slate-100"><Label className="text-muted-foreground flex items-center gap-2 text-[10px] uppercase font-bold tracking-tight"><UserCheck className="h-3.5 w-3.5 text-rose-500" /> Người ghi nhận</Label>{mode !== 'view' ? <CreatableCombobox options={officerOptions} value={formData.officer} onChange={(v: string) => setFormData({...formData, officer: v})} placeholder="Người ghi nhận..." /> : <p className="font-bold text-sm">{formData.officer}</p>}</div>)}
                                </div>
                            </div>
                        </CollapsibleSection>
                    </div>
                </ScrollArea>
                <QRScannerDialog open={isScannerOpen} onOpenChange={setIsScannerOpen} onScan={handleScan} t={t} />
                <DialogFooter className="px-6 pb-6 pt-4 border-t">
                    <Button variant="outline" onClick={onUndo} disabled={!isChanged || mode === 'view'}><Undo2 className="mr-2 h-4 w-4" />Hoàn tác</Button>
                    {mode !== 'view' ? <Button onClick={handleLocalSave} disabled={!isChanged} className="bg-blue-600 hover:bg-blue-700 text-white"><Save className="mr-2 h-4 w-4" />Lưu lại</Button> : <Button onClick={() => onOpenChange(false)}>Đóng</Button>}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const AdvancedFilterDialog = ({ open, onOpenChange, filters, setFilters, t, blocks, officers, students, onSaveCloud, onLoadCloud, isSaving, presets, onDeleteCloud }: any) => {
    const [newPresetName, setNewPresetName] = useState('');
    const [isNamingPreset, setIsNamingPreset] = useState(false);
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
                <div className="flex items-center justify-between border-b pl-4 pr-12 py-3 bg-muted/30">
                    <div className="flex items-center gap-3">
                        <ListFilter className="h-5 w-5 text-primary" />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <div className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity group">
                                    <DialogTitle className="text-lg font-bold">Bộ lọc nâng cao</DialogTitle>
                                    <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-64">
                                <DropdownMenuLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <History className="h-3.5 w-3.5" /> Bộ lọc đã lưu
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <ScrollArea className="h-[200px]">
                                    {presets?.length > 0 ? presets.map((preset: any, idx: number) => (
                                        <div key={idx} className="flex items-center group/item px-1">
                                            <DropdownMenuItem className="flex-1 cursor-pointer" onSelect={() => setFilters(preset.filters)}>
                                                <span className="truncate">{preset.name}</span>
                                            </DropdownMenuItem>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover/item:opacity-100 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); onDeleteCloud(preset.name); }}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )) : (
                                        <div className="px-2 py-4 text-center italic text-[10px] text-muted-foreground">Chưa có bộ lọc nào</div>
                                    )}
                                </ScrollArea>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-2">
                        {isNamingPreset ? (
                            <div className="flex items-center gap-1">
                                <Input placeholder="Tên bộ lọc..." className="h-8 w-32 text-xs" value={newPresetName} onChange={e => setNewPresetName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newPresetName.trim()) { onSaveCloud(newPresetName.trim()); setNewPresetName(''); setIsNamingPreset(false); } }} />
                                <Button size="sm" className="h-8 px-2" onClick={() => { if (newPresetName.trim()) { onSaveCloud(newPresetName.trim()); setNewPresetName(''); setIsNamingPreset(false); } }} disabled={isSaving}><Check className="h-3 w-3" /></Button>
                                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setIsNamingPreset(false)}><X className="h-3 w-3" /></Button>
                            </div>
                        ) : (
                            <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold text-primary hover:bg-primary/10" onClick={() => setIsNamingPreset(true)}>
                                <CloudUpload className="mr-1.5 h-3.5 w-3.5" /> Lưu hiện tại
                            </Button>
                        )}
                    </div>
                </div>

                <VisuallyHidden><DialogDescription>Cấu hình bộ lọc nâng cao cho danh sách vi phạm.</DialogDescription></VisuallyHidden>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-semibold">
                                <CalendarDays className="h-4 w-4 text-primary" /> Ngày lọc
                            </Label>
                            <DatePickerField value={filters.filterDate || ''} onChange={val => setFilters({...filters, filterDate: val || ''})} className="h-10" />
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-semibold">
                                <Map className="h-4 w-4 text-primary" /> Dãy nhà
                            </Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="w-full justify-between h-10 px-3 text-left font-normal border-slate-200">
                                        <div className="flex flex-wrap gap-1">
                                            {filters.buildings?.length > 0 ? (
                                                <div className="flex gap-1">
                                                    <Badge variant="secondary" className="px-1.5 py-0 h-6">{filters.buildings.length} đã chọn</Badge>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">Tất cả dãy nhà</span>
                                            )}
                                        </div>
                                        <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Tìm dãy nhà..." />
                                        <CommandList>
                                            <CommandEmpty>Không tìm thấy.</CommandEmpty>
                                            <CommandGroup>
                                                {blocks?.map((b: any) => (
                                                    <CommandItem key={b.id} onSelect={() => { const isSelected = filters.buildings?.includes(b.name); const newBuildings = isSelected ? (filters.buildings || []).filter((name: string) => name !== b.name) : [...(filters.buildings || []), b.name]; setFilters({...filters, buildings: newBuildings}); }}>
                                                        <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", filters.buildings?.includes(b.name) ? "bg-primary text-primary-foreground" : "opacity-50")}>
                                                            {filters.buildings?.includes(b.name) && <Check className="h-3 w-3" />}
                                                        </div>
                                                        {b.name}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-4 border-t bg-muted/20 flex items-center justify-end gap-2">
                    <Button variant="ghost" onClick={() => setFilters({ filterDate: format(new Date(), 'yyyy-MM-dd'), buildings: [] })} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <X className="mr-2 h-4 w-4" /> Xóa tất cả
                    </Button>
                    <Button onClick={() => onOpenChange(false)} className="bg-primary text-primary-foreground shadow-sm">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Áp dụng bộ lọc
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


export default function StudentViolationsPage() {
    const { t } = useLanguage(); 
    const firestore = useFirestore(); 
    const { user: authUser } = useUser(); 
    const { toast } = useToast(); 
    const { employees, students, lecturers, recognitions, incidentCategories, employeesMap, studentsMap, lecturersMap } = useMasterData();
    const { permissions, hasPermission, isSuperAdmin } = usePermissions('/monitoring/student-violations');
    const targetRecognition = useMemo(() => recognitions?.find(r => r.name === "Sinh viên vi phạm"), [recognitions]);
    const filteredIncidents = useMemo(() => { if (!incidentCategories) return []; const filtered = incidentCategories.filter(i => i.recognitionId === targetRecognition?.id); return filtered.length > 0 ? filtered : incidentCategories; }, [incidentCategories, targetRecognition]);
    const [refreshKey, setRefreshKey] = useState(0); const currentUserEmployee = useMemo(() => employees?.find(e => e.email === authUser?.email), [employees, authUser]);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false); const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false); const [selectedItem, setSelectedItem] = useState<any>(null); const [formData, setFormData] = useState<Partial<StudentViolation>>({}); const [initialFormState, setInitialFormState] = useState<Partial<StudentViolation>>({}); const [dialogMode, setDialogMode] = useState<DialogMode>('add');
    const [currentPage, setCurrentPage] = useLocalStorage('violations_currentPage', 1); const [rowsPerPage, setRowsPerPage] = useLocalStorage('violations_rowsPerPage', 10); const [sortConfig, setSortConfig] = useLocalStorage<any[]>('violations_sortConfig', []);
    const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>('violations_colVis_v5', { building: false, fullName: true, department: false, class: true, studentId: true, violationDate: true, violationType: true, signed: true, officer: true, note: true, identifier: false, portraitPhoto: true, documentPhoto: true });
    const violationsQuery = useMemo(() => firestore ? query(collection(firestore, 'student-violations'), orderBy('createdAt', 'desc'), limit(500)) : null, [firestore]);
    const { data: rawViolations, loading: isViolationsLoading } = useCollection<StudentViolation>(violationsQuery);
    const violations = useMemo(() => { if (!rawViolations) return []; return rawViolations.map(v => ({ ...v, violationDate: v.violationDate || ((v as any).createdAt?.toDate ? format((v as any).createdAt.toDate(), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')) })); }, [rawViolations]);
    const [filters, setFilters] = useLocalStorage<Partial<Record<keyof StudentViolation, string>>>('violations_filters', {}); const [openPopover, setOpenPopover] = useState<string | null>(null); const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false); const [advancedFilters, setAdvancedFilters] = useState<any>({ filterDate: format(new Date(), 'yyyy-MM-dd'), buildings: [] });

    const filteredItems = useMemo(() => {
        if (!violations) return [];
        return violations.filter(item => {
            // Filter by current user if not super admin
            if (!isSuperAdmin && currentUserEmployee?.nickname && item.officer !== currentUserEmployee.nickname) return false;

            const matchesColumnFilters = Object.entries(filters).every(([key, value]) => String((item as any)[key] ?? '').toLowerCase().includes(String(value).toLowerCase()));
            if (!matchesColumnFilters) return false;
            if (advancedFilters.signed && item.signed !== advancedFilters.signed) return false;

            if (advancedFilters.buildings?.length > 0 && (!item.building || !advancedFilters.buildings.includes(item.building))) return false;
            if (advancedFilters.filterDate) {
                const itemDateStr = item.violationDate; if (itemDateStr) {
                    let normalizedItemDate = itemDateStr; if (itemDateStr.includes('/') && itemDateStr.split('/').length === 3) { const [d, m, y] = itemDateStr.split('/'); normalizedItemDate = `${y}-${m}-${d}`; }
                    if (normalizedItemDate !== advancedFilters.filterDate) return false;
                }
            }
            return true;
        });
    }, [violations, filters, advancedFilters, isSuperAdmin, currentUserEmployee]);

    const sortedItems = useMemo(() => {
        let items = [...filteredItems];
        if (sortConfig.length > 0) {
            const { key, direction } = sortConfig[0];
            items.sort((a, b) => {
                const aVal = (a as any)[key]; const bVal = (b as any)[key];
                if (aVal === null || aVal === undefined) return 1; if (bVal === null || bVal === undefined) return -1;
                if (String(aVal) < String(bVal)) return direction === 'ascending' ? -1 : 1;
                if (String(aVal) > String(bVal)) return direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [filteredItems, sortConfig]);

    const safeRowsPerPage = Math.max(1, Number(rowsPerPage) || 10);
    const totalPages = Math.max(1, Math.ceil(sortedItems.length / safeRowsPerPage));
    const safeCurrentPage = Math.min(Math.max(1, Number(currentPage) || 1), totalPages);
    const startIndex = (safeCurrentPage - 1) * safeRowsPerPage;
    const currentItems = sortedItems.slice(startIndex, startIndex + safeRowsPerPage);

    const openDialog = (mode: DialogMode, item?: any) => {
        setDialogMode(mode); setSelectedItem(item || null);
        let data = item ? (mode === 'copy' ? { ...item, id: undefined } : { ...item }) : { fullName: '', class: '', studentId: '', violationDate: format(new Date(), 'yyyy-MM-dd'), violationType: '', signed: 'Chưa ký', officer: currentUserEmployee?.nickname || currentUserEmployee?.name || '', building: '', department: '', identifier: '', portraitPhoto: '', documentPhoto: '', signatureBase64: '' };
        setFormData(data); setInitialFormState(data); setIsEditDialogOpen(true);
    };

    const [isSavingFilters, setIsSavingFilters] = useState(false); const [filterPresets, setFilterPresets] = useState<any[]>([]);
    const saveFiltersToCloud = async (presetName: string) => {
        if (!authUser?.uid || !firestore) return; setIsSavingFilters(true);
        try {
            const newPreset = { name: presetName, filters: advancedFilters, createdAt: new Date().toISOString() };
            const updatedPresets = [...filterPresets.filter(p => p.name !== presetName), newPreset];
            await setDoc(doc(firestore, 'user_settings', authUser.uid), { student_violations_presets: updatedPresets, updatedAt: new Date().toISOString() }, { merge: true });
            setFilterPresets(updatedPresets); toast({ title: "Thành công", description: `Đã lưu bộ lọc "${presetName}"` });
        } catch (err) { toast({ title: "Lỗi", description: "Không thể lưu bộ lọc.", variant: "destructive" }); } finally { setIsSavingFilters(false); }
    };
    const loadFiltersFromCloud = useCallback(async () => {
        if (!authUser?.uid || !firestore) return;
        try {
            const snap = await (await import("firebase/firestore")).getDoc(doc(firestore, 'user_settings', authUser.uid));
            if (snap.exists()) {
                const data = snap.data();
                if (data.student_violations_presets) setFilterPresets(data.student_violations_presets);
                else if (data.student_violations_filters) setFilterPresets([{ name: "Bộ lọc cũ", filters: data.student_violations_filters, createdAt: data.updatedAt }]);
            }
        } catch (err) {}
    }, [authUser?.uid, firestore]);
    const deleteFilterFromCloud = async (presetName: string) => {
        if (!authUser?.uid || !firestore) return;
        try {
            const updatedPresets = filterPresets.filter(p => p.name !== presetName);
            await setDoc(doc(firestore, 'user_settings', authUser.uid), { student_violations_presets: updatedPresets, updatedAt: new Date().toISOString() }, { merge: true });
            setFilterPresets(updatedPresets); toast({ title: "Đã xóa", description: `Bộ lọc "${presetName}" đã được gỡ bỏ.` });
        } catch (err) { toast({ title: "Lỗi", description: "Không thể xóa bộ lọc.", variant: "destructive" }); }
    };

    useEffect(() => { if (authUser?.uid) loadFiltersFromCloud(); }, [authUser?.uid, loadFiltersFromCloud]);

    const handleSave = async (updatedData: any, shouldSyncStudent?: boolean) => {
        if (!firestore) { toast({ title: "Lỗi hệ thống", description: "Không thể kết nối với CSDL.", variant: "destructive" }); return; }
        try {
            const collectionName = "student-violations"; const colRef = collection(firestore, collectionName);
            const isUpdate = (dialogMode === 'edit' || dialogMode === 'view') && selectedItem?.id;
            const docRef = isUpdate ? doc(firestore, collectionName, selectedItem.id) : doc(colRef);
            const finalData = { ...updatedData, id: docRef.id, updatedAt: new Date().toISOString(), createdAt: isUpdate ? (selectedItem.createdAt || new Date().toISOString()) : new Date().toISOString() };
            await setDoc(docRef, finalData, { merge: true });
            if (authUser?.uid) await logActivity(authUser.uid, isUpdate ? 'update' : 'create', 'StudentViolation', `${isUpdate ? 'Cập nhật' : 'Thêm mới'} vi phạm cho SV: ${updatedData.fullName} (${updatedData.studentId})`, { userEmail: authUser.email || undefined, previousData: isUpdate ? selectedItem : null, newData: finalData });
            if (shouldSyncStudent) {
                const studentId = (updatedData.studentId || updatedData.identifier || '').trim();
                if (studentId) {
                    await setDoc(doc(firestore, 'students', studentId), { id: studentId, name: updatedData.fullName || '', class: updatedData.class || '', building: updatedData.building || '', department: updatedData.department || '', identifier: updatedData.identifier || studentId, updatedAt: new Date().toISOString() }, { merge: true });
                    toast({ title: "Đã đồng bộ", description: `Đã cập nhật thông tin sinh viên ${studentId} vào danh mục.` });
                }
            }
            setIsEditDialogOpen(false); toast({ title: "Thành công", description: "Dữ liệu vi phạm đã được lưu." }); setRefreshKey(k => k + 1);
        } catch (err: any) { toast({ title: "Lỗi lưu dữ liệu", description: err?.message || "Lỗi kết nối.", variant: "destructive" }); }
    };

    const fileInputRef = useRef<HTMLInputElement>(null); const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false); const [importingData, setImportingData] = useState<any[]>([]); const [isProcessingImport, setIsProcessingImport] = useState(false);
    const handleExport = () => { const ws = XLSX.utils.json_to_sheet(sortedItems); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Violations"); XLSX.writeFile(wb, `SV_ViPham_${format(new Date(), 'yyyyMMdd')}.xlsx`); };
    const handleImportFile = (e: any) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader(); reader.onload = (evt) => { const wb = XLSX.read(evt.target?.result, { type: 'binary' }); const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]); setImportingData(data); setIsImportPreviewOpen(true); };
        reader.readAsBinaryString(file); e.target.value = '';
    };
    const processImport = async () => {
        if (!firestore || importingData.length === 0) return; setIsProcessingImport(true); const batch = writeBatch(firestore);
        for (const row of importingData) {
            const id = doc(collection(firestore, 'student-violations')).id;
            batch.set(doc(firestore, 'student-violations', id), { id, fullName: String(row['Họ tên'] || ''), class: String(row['Lớp'] || ''), studentId: String(row['Mã số SV'] || ''), violationDate: String(row['Ngày vi phạm'] || format(new Date(), 'yyyy-MM-dd')), violationType: String(row['Lỗi vi phạm'] || ''), signed: String(row['Ký tên'] || 'Chưa ký'), officer: String(row['CB ghi nhận'] || ''), updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(), note: String(row['Ghi chú'] || ''), building: String(row['Dãy nhà'] || ''), department: String(row['Khoa'] || ''), identifier: String(row['Mã định danh'] || ''), }, { merge: true });
        }
        await batch.commit(); setIsProcessingImport(false); setIsImportPreviewOpen(false); toast({ title: `Import thành công ${importingData.length} bản ghi` });
    };

    const columnDefs: any = { building: 'Dãy nhà', fullName: 'Họ tên', department: 'Khoa', class: 'Lớp', studentId: 'Mã số SV / CCCD', violationDate: 'Ngày vi phạm', violationType: 'Lỗi vi phạm', signed: 'Ký tên', officer: 'Người ghi nhận', note: 'Ghi chú', portraitPhoto: 'Chân dung', documentPhoto: 'Giấy tờ' };
    const colIcons: Record<string, any> = { building: Map, fullName: User, department: Landmark, class: Library, studentId: IdCard, violationDate: CalendarDays, violationType: AlertCircle, signed: FilePenLine, officer: UserCheck, note: StickyNote, portraitPhoto: UserSquare, documentPhoto: IdCard };
    const allColumns = Object.keys(columnDefs); const orderedColumns = allColumns.filter(key => columnVisibility[key]);

    return (
        <ClientOnly>
            <TooltipProvider>
                <PageHeader title="Sinh viên vi phạm" icon={ShieldAlert} />
                <div className="p-4 md:p-6">
                    <Card>
                        <CardHeader className="py-3 border-b">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xl flex items-center gap-2"><ShieldAlert className="h-6 w-6 text-rose-500" />Danh sách vi phạm</CardTitle>
                                <div className="flex items-center gap-2">
                                    <Tooltip><TooltipTrigger asChild><Button onClick={() => setIsAdvancedFilterOpen(true)} variant="ghost" size="icon" className="text-orange-500"><ListFilter className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Bộ lọc nâng cao')}</p></TooltipContent></Tooltip>
                                    {permissions.import && <>
                                        <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".xlsx,.xls" />
                                        <Tooltip><TooltipTrigger asChild><Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="icon" className="text-blue-600"><FileUp className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Nhập file Excel')}</p></TooltipContent></Tooltip>
                                    </>}
                                    <Tooltip><TooltipTrigger asChild><Button onClick={handleExport} variant="ghost" size="icon" className="text-green-600" disabled={!permissions.export}><FileDown className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Xuất file Excel')}</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button onClick={() => openDialog('add')} variant="ghost" size="icon" className="text-primary" disabled={!permissions.add}><PlusCircle className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Thêm mới')}</p></TooltipContent></Tooltip>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-blue-600 hover:bg-blue-700">
                                            <TableHead className="w-[80px] font-bold text-base text-white text-center border-r border-blue-400">#</TableHead>
                                            {orderedColumns.map(key => (
                                                <TableHead key={key} className="text-white border-r border-blue-400 p-0 h-auto">
                                                    <ColumnHeader columnKey={key} title={columnDefs[key]} icon={colIcons[key]} t={t} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={(k:any, d:any) => setSortConfig([{key:k, direction:d}])} clearSort={() => setSortConfig([])} filters={filters} handleFilterChange={(k:any, v:string) => { setFilters(p => ({...p,[k]:v})); setCurrentPage(1); }} />
                                                </TableHead>
                                            ))}
                                            <TableHead className="w-16 sticky right-0 z-20 bg-[#1877F2] shadow-[-2px_0_5px_rgba(0,0,0,0.1)] border-l border-blue-300 p-0 text-center">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-white hover:bg-white/20 rounded-none transition-colors">
                                                            <Cog className="h-5 w-5" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                                                        <DropdownMenuLabel>{t('Hiển thị cột')}</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        {allColumns.map(key => <DropdownMenuCheckboxItem key={key} checked={!!columnVisibility[key]} onCheckedChange={(v) => setColumnVisibility(p => ({...p, [key]: !!v}))}>{t(columnDefs[key])}</DropdownMenuCheckboxItem>)}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isViolationsLoading ? (
                                            <TableRow><TableCell colSpan={orderedColumns.length + 2} className="h-24 text-center">Đang tải...</TableCell></TableRow>
                                        ) : currentItems.length > 0 ? currentItems.map((item, idx) => (
                                            <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50 transition-all group" onClick={() => openDialog('view', item)}>
                                                <TableCell className="font-medium text-center border-r align-middle py-3">{startIndex + idx + 1}</TableCell>
                                                {orderedColumns.map(key => (
                                                    <TableCell key={key} className="py-3 border-r font-medium">
                                                        {key === 'signed' ? (item.signatureBase64 ? (<img src={item.signatureBase64} alt="Sig" className="h-10 w-auto bg-white border rounded p-1 mx-auto" />) : (<Badge variant="destructive">Chưa ký</Badge>)) : (key === 'portraitPhoto' || key === 'documentPhoto') ? ((item as any)[key] ? (<div className="flex justify-center"><Popover><PopoverTrigger asChild><img src={(item as any)[key]} className="h-10 w-10 object-cover rounded-md border border-muted-foreground/20 cursor-pointer hover:scale-105 transition-transform" onClick={(e) => e.stopPropagation()} /></PopoverTrigger><PopoverContent className="w-64 p-1 border-primary/20 shadow-xl overflow-hidden rounded-xl"><img src={(item as any)[key]} className="w-full h-auto rounded-lg" /></PopoverContent></Popover></div>) : <span className="text-muted-foreground italic text-[10px]">N/A</span>) : String((item as any)[key] ?? '')}
                                                    </TableCell>
                                                ))}
                                                <TableCell className="sticky right-0 z-10 bg-white group-hover:bg-muted/50 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] border-l text-center py-3 text-inherit align-middle" onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenu modal={false}>
                                                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="text-primary hover:bg-muted"><EllipsisVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onSelect={() => openDialog('view', item)}><Eye className="mr-2 h-4 w-4" />Chi tiết</DropdownMenuItem>
                                                            {permissions.edit && <DropdownMenuItem onSelect={() => openDialog('edit', item)}><Edit className="mr-2 h-4 w-4" />Chỉnh sửa</DropdownMenuItem>}
                                                            {permissions.add && <DropdownMenuItem onSelect={() => openDialog('copy', item)}><Copy className="mr-2 h-4 w-4" />Sao chép</DropdownMenuItem>}
                                                            {permissions.delete && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onSelect={() => { setSelectedItem(item); setIsDeleteDialogOpen(true); }} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Xóa</DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        )) : (
                                            <DataTableEmptyState 
                                                colSpan={orderedColumns.length + 2} 
                                                icon={ShieldAlert}
                                                title="Không tìm thấy vi phạm của sinh viên"
                                                filters={{ ...filters, ...advancedFilters }}
                                                onClearFilters={() => {
                                                    setFilters({});
                                                    setAdvancedFilters({
                                                        filterDate: format(new Date(), 'yyyy-MM-dd'),
                                                        buildings: []
                                                    });
                                                    setCurrentPage(1);
                                                }}
                                            />
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t">
                            <div className="text-sm text-muted-foreground">Tổng cộng {sortedItems.length} bản ghi.</div>
                            <div className="flex items-center gap-4">
                                <Select value={`${safeRowsPerPage}`} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}><SelectTrigger className="h-8 w-[70px]"><SelectValue placeholder={safeRowsPerPage} /></SelectTrigger><SelectContent side="top">{[5, 10, 20, 50].map((s) => (<SelectItem key={s} value={`${s}`}>{s}</SelectItem>))}</SelectContent></Select>
                                <div className="flex gap-1">
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={()=>setCurrentPage(1)} disabled={safeCurrentPage===1}><ChevronsLeft className="h-4 w-4"/></Button><Button variant="outline" size="icon" className="h-8 w-8" onClick={()=>setCurrentPage(safeCurrentPage-1)} disabled={safeCurrentPage===1}><ChevronLeft className="h-4 w-4"/></Button><span className="flex items-center gap-1 text-sm">{safeCurrentPage} / {totalPages}</span><Button variant="outline" size="icon" className="h-8 w-8" onClick={()=>setCurrentPage(safeCurrentPage+1)} disabled={safeCurrentPage===totalPages}><ChevronRight className="h-4 w-4"/></Button><Button variant="outline" size="icon" className="h-8 w-8" onClick={()=>setCurrentPage(totalPages)} disabled={safeCurrentPage===totalPages}><ChevronsRight className="h-4 w-4"/></Button>
                                </div>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
                <AdvancedFilterDialog open={isAdvancedFilterOpen} onOpenChange={setIsAdvancedFilterOpen} filters={advancedFilters} setFilters={setAdvancedFilters} t={t} blocks={useMasterData().blocks} officers={employees} students={students} onSaveCloud={saveFiltersToCloud} onLoadCloud={loadFiltersFromCloud} onDeleteCloud={deleteFilterFromCloud} isSaving={isSavingFilters} presets={filterPresets} />
                <EditDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} mode={dialogMode} formData={formData} onSave={handleSave} t={t} employees={employees} students={students} studentsMap={studentsMap} lecturers={lecturers} filteredIncidents={filteredIncidents} blocks={useMasterData().blocks} departments={useMasterData().departments} />
                <Dialog open={isImportPreviewOpen} onOpenChange={setIsImportPreviewOpen}>
                    <DialogContent className="sm:max-w-4xl"><DialogHeader><DialogTitle>Xem trước Import</DialogTitle></DialogHeader>
                        <ScrollArea className="max-h-[60vh] border rounded-md">
                            <Table><TableHeader><TableRow className="bg-muted/50"><TableHead>Họ tên</TableHead><TableHead>Lớp</TableHead><TableHead>Mã số SV</TableHead><TableHead>Ngày vi phạm</TableHead><TableHead>Lỗi vi phạm</TableHead><TableHead>Ký tên</TableHead></TableRow></TableHeader>
                            <TableBody>{importingData.map((row, i) => (<TableRow key={i}><TableCell className="font-bold">{row['Họ tên']}</TableCell><TableCell>{row['Lớp']}</TableCell><TableCell>{row['Mã số SV']}</TableCell><TableCell>{row['Ngày vi phạm']}</TableCell><TableCell>{row['Lỗi vi phạm']}</TableCell><TableCell>{row['Ký tên']}</TableCell></TableRow>))}</TableBody></Table>
                        </ScrollArea>
                        <DialogFooter><Button variant="ghost" onClick={() => setIsImportPreviewOpen(false)}>Hủy</Button><Button onClick={processImport} disabled={isProcessingImport}>{isProcessingImport ? <Cog className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Xác nhận</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={async ()=>{ if(selectedItem && firestore){ await deleteDoc(doc(firestore, "student-violations", selectedItem.id)); toast({title: "Thành công"}); setRefreshKey(k => k + 1); } setIsDeleteDialogOpen(false);}}>Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
            </TooltipProvider>
        </ClientOnly>
    );
}
