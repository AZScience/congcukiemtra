"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  PlusCircle, Trash2, Edit, Cog, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, Copy, ArrowUpDown, ArrowUp, 
  ArrowDown, Filter, X, EllipsisVertical, Save, 
  Undo2, Ban, Eye, FileDown, FileUp, CheckCircle2, ListFilter, ChevronDown,
  StickyNote, FileText, AlertTriangle, Calendar, User, Building, Shield, 
  AlertCircle, Clock, Link as LinkIcon, Sparkles, Hash, Tags, UploadCloud, Info, FolderArchive, RefreshCw,
  Check, ChevronsUpDown, CloudUpload, History
} from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { uploadToFirebaseServer } from "@/ai/flows/firebase-upload";
import { uploadToGoogleDrive } from "@/ai/flows/google-drive-upload";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/page-header";
import { ClientOnly } from "@/components/client-only";
import { useLanguage } from "@/hooks/use-language";
import { firebaseConfig } from "@/firebase/config";
import { useCollection, useFirestore, useUser, useFirebaseApp, useStorage } from "@/firebase";
import { collection, doc, setDoc, deleteDoc, getDoc, query, where, orderBy, limit } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as XLSX from 'xlsx';
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePermissions } from "@/hooks/use-permissions";
import { useSystemParameters } from "@/providers/system-parameters-provider";
import { Badge } from "@/components/ui/badge";
import type { DocumentRecord, DocumentType, Department, Employee } from '@/lib/types';
import { DataTableEmptyState } from "@/components/data-table-empty-state";

type DialogMode = 'add' | 'edit' | 'copy' | 'view';
interface RenderDocRecord extends DocumentRecord { renderId: string; }

const ColumnHeader = ({ columnKey, title, t, sortConfig, openPopover, setOpenPopover, requestSort, clearSort, filters, handleFilterChange, icon: Icon }: any) => {
    const sortState = sortConfig?.find((s: any) => s.key === columnKey);
    const isFiltered = !!filters[columnKey];
    return (
        <Popover open={openPopover === columnKey} onOpenChange={(isOpen) => setOpenPopover(isOpen ? columnKey : null)}>
            <PopoverTrigger asChild>
                <Button variant="ghost" className="text-white hover:text-white hover:bg-blue-700 h-10 px-3 group w-full justify-start font-bold text-[11px] uppercase tracking-wider">
                    {Icon && <Icon className="mr-2 h-3.5 w-3.5 opacity-80" />}
                    <span className="truncate">{t(title)}</span>
                    {sortState ? (
                        sortState.direction === 'ascending' ? <ArrowUp className={cn("ml-2 h-4 w-4", isFiltered && "text-red-500")} /> : <ArrowDown className={cn("ml-2 h-4 w-4", isFiltered && "text-red-500")} />
                    ) : (
                        <ArrowUpDown className={cn("ml-2 h-4 w-4 opacity-50", isFiltered ? "text-red-500" : "group-hover:opacity-100")} />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-0" align="start">
                <div className="p-1 space-y-1">
                    <Button variant="ghost" onClick={() => requestSort(columnKey, 'ascending')} className="w-full justify-start text-xs"><ArrowUp className="mr-2 h-4 w-4" /> Tăng dần</Button>
                    <Button variant="ghost" onClick={() => requestSort(columnKey, 'descending')} className="w-full justify-start text-xs"><ArrowDown className="mr-2 h-4 w-4" /> Giảm dần</Button>
                    {sortState && <><Separator /><Button variant="ghost" onClick={clearSort} className="w-full justify-start text-xs"><X className="mr-2 h-4 w-4" /> Xoá sắp xếp</Button></>}
                </div>
                <Separator />
                <div className="p-2">
                    <div className="relative">
                        <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input placeholder={`${t('Lọc')} ${t(title)}...`} value={filters[columnKey] || ''} onChange={(e) => handleFilterChange(columnKey, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setOpenPopover(null); }} className="h-8 pl-8 text-xs" />
                    </div>
                    {isFiltered && (
                        <Button variant="ghost" onClick={() => handleFilterChange(columnKey, '')} className="w-full justify-start text-destructive hover:text-destructive h-8 px-2 mt-1 text-xs">
                            <X className="mr-2 h-3.5 w-3.5" /> {t('Xóa bộ lọc')}
                        </Button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

const getStatusColor = (status: string) => {
    const colors: any = {
        'Đã duyệt': 'bg-emerald-100 text-emerald-700 border-emerald-200',
        'Chờ duyệt': 'bg-amber-100 text-amber-700 border-amber-200',
        'Cần bổ sung': 'bg-rose-100 text-rose-700 border-rose-200',
        'Ban hành': 'bg-blue-100 text-blue-700 border-blue-200'
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
};

const StatusBadge = ({ status, t }: { status: string, t: any }) => {
    return <Badge variant="outline" className={cn("font-medium", getStatusColor(status))}>{t(status)}</Badge>;
};

const UrgencyBadge = ({ urgency, t }: { urgency: string, t: any }) => {
    const colors: any = {
        'Thường': 'bg-slate-100 text-slate-700',
        'Khẩn': 'bg-orange-100 text-orange-700 border-orange-200',
        'Hỏa tốc': 'bg-red-100 text-red-700 border-red-200'
    };
    return <Badge variant="outline" className={cn("font-bold uppercase text-[10px]", colors[urgency] || 'bg-slate-100 text-slate-700')}>{t(urgency)}</Badge>;
};

const ConfidentialityBadge = ({ confidentiality, t }: { confidentiality: string, t: any }) => {
    const colors: any = {
        'Thường': 'bg-slate-100 text-slate-700',
        'Mật': 'bg-indigo-100 text-indigo-700 border-indigo-200',
        'Tối mật': 'bg-purple-100 text-purple-700 border-purple-200'
    };
    return <Badge variant="outline" className={cn("font-bold uppercase text-[10px]", colors[confidentiality] || 'bg-slate-100 text-slate-700')}>{t(confidentiality)}</Badge>;
};

const MultiSelectCombobox = ({ options, selected, onChange, placeholder, t }: { options: string[], selected: string[], onChange: (vals: string[]) => void, placeholder: string, t: any }) => {
    const [open, setOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");

    const handleUnselect = (item: string) => {
        onChange(selected.filter((i) => i !== item));
    };

    const handleSelect = (item: string) => {
        if (selected.includes(item)) {
            onChange(selected.filter((i) => i !== item));
        } else {
            onChange([...selected, item]);
        }
        setInputValue("");
    };

    const handleAddNew = () => {
        if (inputValue && !options.includes(inputValue) && !selected.includes(inputValue)) {
            onChange([...selected, inputValue]);
            setInputValue("");
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap gap-1 mb-1">
                {selected.map((item) => (
                    <Badge key={item} variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 gap-1 pr-1 border-blue-200">
                        {item}
                        <button className="rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2" onKeyDown={(e) => { if (e.key === "Enter") handleUnselect(item); }} onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={() => handleUnselect(item)}>
                            <X className="h-3 w-3 text-blue-400 hover:text-blue-600" />
                        </button>
                    </Badge>
                ))}
            </div>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-9 text-slate-500 font-normal border-slate-300">
                        {placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                    <Command className="w-full">
                        <CommandInput placeholder={t("Tìm hoặc thêm mới...")} value={inputValue} onValueChange={setInputValue} onKeyDown={(e) => { if (e.key === "Enter") handleAddNew(); }} />
                        <CommandList>
                            <CommandEmpty className="p-2">
                                <Button variant="ghost" className="w-full justify-start text-xs text-blue-600 h-8" onClick={handleAddNew}>
                                    <PlusCircle className="mr-2 h-3 w-3" /> Thêm mới: "{inputValue}"
                                </Button>
                            </CommandEmpty>
                            <CommandGroup className="max-h-60 overflow-y-auto">
                                {options.map((option) => (
                                    <CommandItem key={option} onSelect={() => handleSelect(option)} className="text-xs">
                                        <Check className={cn("mr-2 h-3 w-3", selected.includes(option) ? "opacity-100" : "opacity-0")} />
                                        {option}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
};

export default function DocumentRecordsPage() {
    const { t } = useLanguage();
    const { params: systemParams } = useSystemParameters();
    const firestore = useFirestore();
    const firebaseApp = useFirebaseApp();
    const storage = useStorage();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const [currentPage, setCurrentPage] = useLocalStorage('doc_records_page_v1', 1);
    const [rowsPerPage, setRowsPerPage] = useLocalStorage('doc_records_rows_v1', 10);
    const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>('doc_records_colVis_v1', { 
        docCode: true, docNumber: true, title: true, docType: true, issueDate: true, status: true, urgency: true 
    });
    const [filters, setFilters] = useLocalStorage<any>('doc_records_filters_v1', {});
    
    const hasActiveFilter = useMemo(() => {
        return Object.values(filters).some(v => v !== undefined && v !== '' && v !== null);
    }, [filters]);

    const collectionRef = useMemo(() => {
        if (!firestore) return null;
        let q = query(collection(firestore, 'document_records'));
        
        if (filters.startDate) {
            q = query(q, where('receivedDate', '>=', filters.startDate));
        }
        if (filters.endDate) {
            q = query(q, where('receivedDate', '<=', filters.endDate));
        }
        
        q = query(q, orderBy('receivedDate', 'desc'), limit(100));
        
        return q;
    }, [firestore, filters]);

    const docTypesRef = useMemo(() => (firestore ? collection(firestore, 'document_types') : null), [firestore]);
    const departmentsRef = useMemo(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);
    const employeesRef = useMemo(() => (firestore ? collection(firestore, 'employees') : null), [firestore]);
    
    const { permissions, isLoading: permsLoading } = usePermissions('/monitoring/document-records');
    const { data: recordsData, loading: dataLoading, error: dataError, isOffline } = useCollection<DocumentRecord>(collectionRef);
    const { data: docTypes } = useCollection<DocumentType>(docTypesRef);
    const { data: departmentsData } = useCollection<Department>(departmentsRef);
    const { data: employeesData } = useCollection<Employee>(employeesRef);
    
    const loading = permsLoading || dataLoading;
    const error = dataError;

    const data = useMemo(() => (recordsData || []).map((item, idx) => ({ ...item, renderId: `${item.id || 'no-id'}-${idx}` })) as RenderDocRecord[], [recordsData]);

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<RenderDocRecord | null>(null);
    const [formData, setFormData] = useState<Partial<DocumentRecord>>({});
    const [initialFormState, setInitialFormState] = useState<Partial<DocumentRecord>>({});
    const { toast } = useToast();
    const [dialogMode, setDialogMode] = useState<DialogMode>('add');
    
    const [sortConfig, setSortConfig] = useLocalStorage<any[]>('doc_records_sort_v1', [{ key: 'receivedDate', direction: 'descending' }]);
    const [openPopover, setOpenPopover] = useState<string | null>(null);
    const [selectedRowIds, setSelectedRowIds] = useLocalStorage<string[]>('doc_records_selected_ids_v1', []);
    const selectedSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);

    const isChanged = useMemo(() => JSON.stringify(formData) !== JSON.stringify(initialFormState), [formData, initialFormState]);

    // Cloud Filter Persistence
    const { user: authUser } = useUser();
    const [filterPresets, setFilterPresets] = useState<any[]>([]);
    const [isSavingFilters, setIsSavingFilters] = useState(false);

    const saveFiltersToCloud = useCallback(async (presetName: string) => {
        if (!firestore || !authUser) return;
        setIsSavingFilters(true);
        try {
            const newPreset = {
                name: presetName,
                filters: filters,
                createdAt: new Date().toISOString()
            };
            const updatedPresets = [...filterPresets.filter(p => p.name !== presetName), newPreset];
            await setDoc(doc(firestore, "user_settings", authUser.uid), {
                doc_records_presets: updatedPresets,
                updatedAt: new Date()
            }, { merge: true });
            setFilterPresets(updatedPresets);
            toast({ title: t("Đã lưu bộ lọc"), description: `Đã lưu "${presetName}"` });
        } catch (error) {
            toast({ title: t("Lỗi khi lưu bộ lọc"), variant: "destructive" });
        } finally { setIsSavingFilters(false); }
    }, [firestore, authUser, filters, filterPresets, toast, t]);

    const loadFiltersFromCloud = useCallback(async () => {
        if (!firestore || !authUser) return;
        try {
            const docSnap = await getDoc(doc(firestore, "user_settings", authUser.uid));
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.doc_records_presets) setFilterPresets(data.doc_records_presets);
            }
        } catch (error) { console.error("Error loading filters:", error); }
    }, [firestore, authUser]);

    const deleteFilterFromCloud = async (presetName: string) => {
        if (!authUser?.uid || !firestore) return;
        try {
            const updatedPresets = filterPresets.filter(p => p.name !== presetName);
            await setDoc(doc(firestore, 'user_settings', authUser.uid), {
                doc_records_presets: updatedPresets,
                updatedAt: new Date()
            }, { merge: true });
            setFilterPresets(updatedPresets);
            toast({ title: t("Đã xóa bộ lọc") });
        } catch (err) { toast({ title: t("Lỗi khi xóa"), variant: "destructive" }); }
    };

    React.useEffect(() => {
        if (authUser) loadFiltersFromCloud();
    }, [authUser, loadFiltersFromCloud]);

    const filteredItems = useMemo(() => {
        return data.filter(item => {
            return Object.entries(filters).every(([k, v]) => {
                if (!v) return true;
                if (k === 'startDate' || k === 'endDate' || k === 'dateType') return true; // Handled separately
                
                return String(item[k as keyof DocumentRecord] || '').toLowerCase().includes(String(v).toLowerCase());
            }) && (() => {
                const startDate = filters.startDate;
                const endDate = filters.endDate;
                const dateType = filters.dateType || 'issueDate'; // Default to issueDate
                
                if (!startDate && !endDate) return true;
                
                const itemDateStr = item[dateType as keyof DocumentRecord] as string;
                if (!itemDateStr) return false;
                
                const itemDate = new Date(itemDateStr);
                if (startDate && new Date(startDate) > itemDate) return false;
                if (endDate && new Date(endDate) < itemDate) return false;
                
                return true;
            })();
        });
    }, [data, filters]);
    const sortedItems = useMemo(() => {
        let items = [...filteredItems];
        if (sortConfig.length > 0) {
            const { key, direction } = sortConfig[0];
            items.sort((a: any, b: any) => {
                const aVal = (a as any)[key] || '';
                const bVal = (b as any)[key] || '';
                return direction === 'ascending' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
            });
        }
        return items;
    }, [filteredItems, sortConfig]);

    const safeRowsPerPage = Math.max(1, Number(rowsPerPage));
    const totalPages = Math.max(1, Math.ceil(sortedItems.length / safeRowsPerPage));
    const safeCurrentPage = Math.min(Math.max(1, Number(currentPage)), totalPages);
    const startIndex = (safeCurrentPage - 1) * safeRowsPerPage;
    const currentItems = sortedItems.slice(startIndex, startIndex + safeRowsPerPage);

    const handleRowClick = useCallback((renderId: string) => {
        setSelectedRowIds(prev => {
            const next = new Set(prev);
            if (next.has(renderId)) next.delete(renderId); else next.add(renderId);
            return Array.from(next);
        });
    }, [setSelectedRowIds]);

    const openDialog = (mode: DialogMode, item?: any) => {
        setDialogMode(mode); setSelectedItem(item || null);
        const defaultData: Partial<DocumentRecord> = {
            docCode: `CV-${format(new Date(), 'yyyy')}-${String(data.length + 1).padStart(3, '0')}`,
            receivedDate: format(new Date(), 'yyyy-MM-dd'),
            urgency: 'Thường',
            confidentiality: 'Thường',
            status: 'Mới'
        };
        const activeData = item ? (mode === 'copy' ? { ...item, id: undefined, docCode: `${item.docCode}-COPY` } : { ...item }) : defaultData;
        setFormData(activeData); setInitialFormState(activeData); setIsEditDialogOpen(true);
    };

    const [isUploading, setIsUploading] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);

    const triggerAIExtraction = useCallback(async (fileName: string) => {
        setIsExtracting(true);
        toast({ title: t("AI đang xử lý..."), description: t("Đang phân tích nội dung văn bản để trích xuất thông tin.") });
        await new Promise(resolve => setTimeout(resolve, 2500));
        const mockNumber = `SN-${Math.floor(1000 + Math.random() * 9000)}/QD-BGD`;
        const mockTitle = fileName.split('.')[0].replace(/[-_]/g, ' ').toUpperCase();
        setFormData(prev => ({
            ...prev,
            docNumber: prev.docNumber || mockNumber,
            title: prev.title || mockTitle,
            extractedText: "Nội dung giả lập được trích xuất từ AI OCR...\nCăn cứ vào điều lệ...\nQuyết định ban hành quy định về việc...",
            aiSummary: "Văn bản này quy định về việc triển khai hệ thống kiểm tra nội bộ tại đơn vị. Nội dung bao gồm các bước thực hiện, trách nhiệm của các phòng ban và thời hạn hoàn thành."
        }));
        setIsExtracting(false);
        toast({ title: t("Trích xuất thành công"), description: t("Đã tự động điền Số hiệu và Tiêu đề.") });
    }, [t, toast]);

    const generateDocCode = useCallback((type: string) => {
        if (!type) return '';
        const dateStr = format(new Date(), 'ddMMyyyy');
        const prefix = type.split(' ').map(word => word[0]).join('').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return `${prefix}${dateStr}001`;
    }, []);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !storage || !firebaseApp) return;
        const allowedExtensions = ['pdf', 'docx', 'doc', 'xlsx', 'txt', 'png', 'jpg', 'jpeg', 'zip', 'rar'];
        const extension = file.name.split('.').pop()?.toLowerCase() || '';
        if (!allowedExtensions.includes(extension)) {
            toast({ title: t("Lỗi định dạng"), description: t("Hỗ trợ: PDF, DOCX, XLSX, TXT, PNG, JPG, ZIP, RAR"), variant: "destructive" });
            return;
        }
        const serviceAccountEmail = (systemParams.evidenceServiceAccountEmail || systemParams.googleServiceAccountEmail || "").trim();
        const privateKey = (systemParams.evidencePrivateKey || systemParams.googlePrivateKey || "");
        const driveFolderId = (systemParams.evidenceGoogleDriveFolderId || systemParams.googleDriveFolderId || "").trim();
        if (!serviceAccountEmail || !privateKey) {
            toast({
                title: "Loi cau hinh",
                description: "Chua cau hinh Service Account trong tab Minh chung. He thong da dung fallback client de tranh loi timeout.",
                variant: "destructive"
            });
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        setIsUploading(true);
        console.log("Starting upload process for:", file.name);
        
        try {
            const uploadTimeout = 20000; // 20 seconds
            let url = '';

            // --- 1. TRY CLIENT-SIDE UPLOAD (with timeout) ---
            try {
                console.log("Attempting client-side Firebase upload...");
                const clientUploadPromise = (async () => {
                    const storageRef = ref(storage, `evidence/${Date.now()}_${file.name}`);
                    const uploadResult = await uploadBytes(storageRef, file);
                    return await getDownloadURL(uploadResult.ref);
                })();

                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Client-side upload timeout")), uploadTimeout)
                );

                url = await Promise.race([clientUploadPromise, timeoutPromise]) as string;
                console.log("Client-side upload successful:", url);
            } catch (clientError: any) {
                console.warn("Client-side upload failed or timed out:", clientError.message);
                
                // --- 2. FALLBACK TO SERVER-SIDE FIREBASE UPLOAD ---
                console.log("Attempting server-side Firebase upload...");
                const serverFormData = new FormData();
                serverFormData.append('file', file);
                serverFormData.append('clientEmail', serviceAccountEmail);
                serverFormData.append('privateKey', privateKey);
                serverFormData.append('projectId', firebaseConfig.projectId || '');
                serverFormData.append('storageBucket', firebaseConfig.storageBucket || '');

                const result = await uploadToFirebaseServer(serverFormData);
                if (result.success && result.url) {
                    url = result.url;
                    console.log("Server-side upload successful:", url);
                } else {
                    console.warn("Server-side upload failed:", result.error);
                    
                    // --- 3. FALLBACK TO GOOGLE DRIVE ---
                // Fallback to Drive if server-side upload fails for ANY reason
                if (driveFolderId && !result.success) {
                        console.log("Attempting Google Drive upload...");
                        const driveFormData = new FormData();
                        driveFormData.append('file', file);
                        driveFormData.append('folderId', driveFolderId);
                        driveFormData.append('serviceAccountEmail', serviceAccountEmail);
                        driveFormData.append('privateKey', privateKey);

                        const driveResult = await uploadToGoogleDrive(driveFormData);
                        if (driveResult.success && driveResult.url) {
                            url = driveResult.url;
                            console.log("Google Drive upload successful:", url);
                            toast({ title: t("Tải lên thành công"), description: `${file.name} (Google Drive)` });
                        } else {
                            console.error("Google Drive upload failed:", driveResult.error);
                            throw new Error(driveResult.error || result.error || 'All upload methods failed');
                        }
                    } else {
                        throw new Error(result.error || 'Server upload failed');
                    }
                }
            }

            if (url) {
                setFormData(prev => ({ ...prev, originalFile: url }));
                if (!url.includes('drive.google.com')) {
                    toast({ title: t("Tải lên thành công"), description: file.name });
                }
                triggerAIExtraction(file.name);
            }
        } catch (error: any) {
            console.error("Critical Upload Error:", error);
            toast({ 
                title: t("Lỗi tải lên"), 
                description: error?.message || t("Không thể tải file lên. Vui lòng kiểm tra lại cấu hình hoặc kết nối mạng."), 
                variant: "destructive" 
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSave = async () => {
        if (!firestore) return;
        try {
            const id = (dialogMode === 'edit' || dialogMode === 'view') && selectedItem ? selectedItem.id : (formData.id || doc(collection(firestore, 'document_records')).id);
            const finalData = { 
                ...formData, 
                id,
                updatedAt: new Date().toISOString(),
                createdAt: formData.createdAt || new Date().toISOString()
            };
            
            await setDoc(doc(firestore, "document_records", id), finalData, { merge: true });
            
            setIsEditDialogOpen(false);
            toast({ 
                title: t("Thành công"), 
                description: dialogMode === 'add' ? t("Đã thêm hồ sơ mới") : t("Đã cập nhật hồ sơ") 
            });

            // Nếu thêm mới, tự động xóa bộ lọc để người dùng thấy ngay hồ sơ vừa tạo
            if (dialogMode === 'add') {
                setFilters({});
                setCurrentPage(1);
            }
        } catch (error: any) {
            console.error("Save Error:", error);
            toast({ 
                title: t("Lỗi khi lưu"), 
                description: error.message || t("Không thể lưu hồ sơ. Vui lòng thử lại."), 
                variant: "destructive" 
            });
        }
    };

    const handleExport = () => {
        const exportData = sortedItems.map(item => ({
            'Mã văn bản': item.docCode, 'Số/ký hiệu': item.docNumber, 'Tiêu đề': item.title, 'Trích yếu': item.abstract,
            'Loại văn bản': item.docType, 'Ngày ban hành': item.issueDate, 'Ngày nhận': item.receivedDate,
            'Cơ quan ban hành': item.issuingBody, 'Người ký': item.signer, 'Phòng ban xử lý': item.department,
            'Người phụ trách': item.assignee, 'Độ khẩn': item.urgency, 'Độ mật': item.confidentiality, 'Trạng thái': item.status
        }));
        const ws = XLSX.utils.json_to_sheet(exportData); const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Documents"); XLSX.writeFile(wb, `DS_HoSoVanBan_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    };

    const columnDefs: any = { 
        docCode: 'Mã văn bản', docNumber: 'Số/ký hiệu', title: 'Tiêu đề', docType: 'Loại văn bản', 
        issueDate: 'Ngày ban hành', receivedDate: 'Ngày nhận', issuingBody: 'Cơ quan ban hành',
        status: 'Trạng thái', urgency: 'Độ khẩn', confidentiality: 'Độ mật', department: 'Phòng ban xử lý', assignee: 'Người phụ trách'
    };

    const colIcons: Record<string, any> = {
        docCode: Hash, docNumber: FileText, title: StickyNote, docType: Tags, 
        issueDate: Calendar, receivedDate: Clock, issuingBody: Building, 
        status: AlertCircle, urgency: AlertTriangle, confidentiality: Shield,
        department: Building, assignee: User
    };

    const shouldShowField = useCallback((fieldName: keyof DocumentRecord) => {
        const type = formData.docType || '';
        const alwaysShow: (keyof DocumentRecord)[] = ['docType', 'title', 'abstract', 'originalFile', 'status', 'aiSummary', 'extractedText'];
        if (alwaysShow.includes(fieldName)) return true;
        if (fieldName === 'docCode') return false;
        if (type.includes('Công văn')) return !['confidentiality'].includes(fieldName);
        if (type.includes('Quyết định') || type.includes('Chỉ thị')) return !['receivedDate', 'issuingBody', 'department'].includes(fieldName);
        if (type.includes('Thông báo') || type.includes('Lời mời')) return !['docNumber', 'signer', 'confidentiality', 'issuingBody'].includes(fieldName);
        if (type.includes('Báo cáo') || type.includes('Tờ trình')) return !['docNumber', 'issuingBody', 'signer', 'urgency', 'confidentiality'].includes(fieldName);
        return true;
    }, [formData.docType]);

    return (
        <ClientOnly>
            <TooltipProvider>
                <PageHeader title={t("Công cụ hỗ trợ")} description={t("Quản lý hồ sơ văn bản")} icon={FolderArchive} />
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileUpload}
                    accept=".pdf,.docx,.doc,.xlsx,.txt,.png,.jpg,.jpeg,.zip,.rar"
                />
                <div className="p-4 md:p-6">
                    {isOffline && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3 text-amber-800 text-sm animate-in fade-in slide-in-from-top-2">
                            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                            <p><b>Đang hiển thị dữ liệu ngoại tuyến (Offline):</b> Hệ thống không thể kết nối tới máy chủ. Dữ liệu có thể chưa được cập nhật mới nhất.</p>
                        </div>
                    )}
                    <Card>
                        <CardHeader className="py-3 border-b">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xl flex items-center gap-2"><FolderArchive className="h-6 w-6 text-primary" />{t('Quản lý hồ sơ')}</CardTitle>
                                <div className="flex items-center gap-2">
                                    {hasActiveFilter && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button 
                                                    onClick={() => { setFilters({}); setCurrentPage(1); }} 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="text-red-500 hover:bg-red-50"
                                                >
                                                    <X className="h-5 w-5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>{t('Xóa tất cả tìm kiếm')}</p></TooltipContent>
                                        </Tooltip>
                                    )}
                                    <Tooltip><TooltipTrigger asChild><Button onClick={() => setIsAdvancedFilterOpen(true)} variant="ghost" size="icon" className="text-orange-500"><ListFilter className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Bộ lọc nâng cao')}</p></TooltipContent></Tooltip>
                                    {permissions.export && (
                                        <Tooltip><TooltipTrigger asChild><Button onClick={handleExport} variant="ghost" size="icon" className="text-green-600"><FileDown className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Xuất file Excel')}</p></TooltipContent></Tooltip>
                                    )}
                                    {permissions.add && (
                                        <Tooltip><TooltipTrigger asChild><Button onClick={() => openDialog('add')} variant="ghost" size="icon" className="text-primary"><PlusCircle className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Thêm hồ sơ mới')}</p></TooltipContent></Tooltip>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-[#1877F2] hover:bg-[#1877F2]/90">
                                            <TableHead className="w-[60px] text-white font-bold text-base text-center border-r border-blue-300">#</TableHead>
                                            {Object.keys(columnDefs).filter(k => columnVisibility[k]).map(k => (
                                                <TableHead key={k} className="p-0 border-r border-blue-300 h-auto">
                                                    <ColumnHeader columnKey={k} title={columnDefs[k]} t={t} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={(k:any,d:any)=>setSortConfig([{key:k,direction:d}])} clearSort={() => setSortConfig([])} filters={filters} handleFilterChange={(k:any,v:any)=>{setFilters((p:any)=>({...p,[k]:v})); setCurrentPage(1);}} icon={colIcons[k]} />
                                                </TableHead>
                                            ))}
                                            <TableHead className="w-16 sticky right-0 z-20 bg-[#1877F2] shadow-[-2px_0_5px_rgba(0,0,0,0.1)] border-l border-blue-300 p-0 text-center">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10 text-white hover:bg-white/20 rounded-none transition-colors"><Cog className="h-5 w-5" /></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                                                        <DropdownMenuLabel>{t('Hiển thị cột')}</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        {Object.keys(columnDefs).map(k => <DropdownMenuCheckboxItem key={k} checked={columnVisibility[k]} onCheckedChange={(v) => setColumnVisibility(p => ({...p, [k]: !!v}))}>{t(columnDefs[k])}</DropdownMenuCheckboxItem>)}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow><TableCell colSpan={15} className="text-center h-40"><div className="flex flex-col items-center justify-center gap-2"><Cog className="h-8 w-8 animate-spin text-primary opacity-50" /><p className="text-muted-foreground">{t('Đang tải dữ liệu...')}</p></div></TableCell></TableRow>
                                        ) : error ? (
                                            <TableRow><TableCell colSpan={15} className="text-center h-40"><div className="flex flex-col items-center justify-center gap-2 text-destructive"><Ban className="h-8 w-8 opacity-50" /><p className="font-bold">{t('Lỗi truy cập dữ liệu')}</p><Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-2"><Undo2 className="mr-2 h-4 w-4" /> {t('Thử lại')}</Button></div></TableCell></TableRow>
                                        ) : currentItems.length === 0 ? (
                                            <DataTableEmptyState 
                                                colSpan={15}
                                                title={t('Không có dữ liệu')} 
                                                description={t('Chưa có hồ sơ văn bản nào được ghi nhận hoặc không tìm thấy kết quả phù hợp.')}
                                                filters={filters}
                                                onClearFilters={() => setFilters({})}
                                            />
                                        ) : (
                                            currentItems.map((item, idx) => (
                                                <TableRow key={item.renderId} className={cn("cursor-pointer transition-colors hover:bg-slate-50", selectedSet.has(item.renderId) && "bg-blue-50/50")} onClick={() => handleRowClick(item.renderId)}>
                                                    <TableCell className="text-center font-medium text-slate-600 border-r">{startIndex + idx + 1}</TableCell>
                                                    {Object.keys(columnDefs).filter(k => columnVisibility[k]).map(columnKey => (
                                                        <TableCell key={columnKey} className="border-r">
                                                            {columnKey === 'status' ? <StatusBadge status={item.status} t={t} /> : 
                                                             columnKey === 'urgency' ? <UrgencyBadge urgency={item.urgency} t={t} /> :
                                                             columnKey === 'confidentiality' ? <ConfidentialityBadge confidentiality={item.confidentiality} t={t} /> :
                                                             columnKey === 'title' ? <span className="font-bold text-slate-800 line-clamp-2">{item.title}</span> :
                                                             columnKey === 'docCode' ? <code className="bg-slate-100 px-1.5 py-0.5 rounded text-blue-700 font-mono text-[11px]">{item.docCode}</code> :
                                                             <span className="text-slate-600">{(item as any)[columnKey] || '---'}</span>}
                                                        </TableCell>
                                                    ))}
                                                    <TableCell className="sticky right-0 z-10 bg-white/80 backdrop-blur-sm border-l p-0 text-center">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary"><EllipsisVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDialog('view', item); }}><Eye className="mr-2 h-4 w-4" /> Xem chi tiết</DropdownMenuItem>
                                                                {permissions.edit && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDialog('edit', item); }}><Edit className="mr-2 h-4 w-4" /> Chỉnh sửa</DropdownMenuItem>}
                                                                {permissions.delete && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setIsDeleteDialogOpen(true); }} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Xoá</DropdownMenuItem>}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 border-t bg-slate-50/50">
                            <div className="text-xs text-muted-foreground font-medium">{t('Tổng cộng')} {sortedItems.length} {t('hồ sơ')}</div>
                            
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500 font-medium">{t('Số dòng')}</span>
                                    <Select value={String(rowsPerPage)} onValueChange={v => {setRowsPerPage(Number(v)); setCurrentPage(1);}}>
                                        <SelectTrigger className="h-8 w-[70px] bg-white border-slate-200 text-xs font-bold focus:ring-0"><SelectValue /></SelectTrigger>
                                        <SelectContent align="end">
                                            {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map(v => (
                                                <SelectItem key={v} value={String(v)} className="text-xs">{v}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex gap-1 items-center">
                                    <Button variant="outline" size="icon" className="h-8 w-8 bg-white" onClick={()=>setCurrentPage(1)} disabled={safeCurrentPage===1}><ChevronsLeft className="h-4 w-4"/></Button>
                                    <Button variant="outline" size="icon" className="h-8 w-8 bg-white" onClick={()=>setCurrentPage(safeCurrentPage-1)} disabled={safeCurrentPage===1}><ChevronLeft className="h-4 w-4"/></Button>
                                    <div className="flex items-center px-3 h-8 bg-white border rounded-md text-xs font-bold tabular-nums min-w-[60px] justify-center">
                                        {safeCurrentPage} <span className="mx-1 text-slate-300">/</span> {totalPages}
                                    </div>
                                    <Button variant="outline" size="icon" className="h-8 w-8 bg-white" onClick={()=>setCurrentPage(safeCurrentPage+1)} disabled={safeCurrentPage===totalPages}><ChevronRight className="h-4 w-4"/></Button>
                                    <Button variant="outline" size="icon" className="h-8 w-8 bg-white" onClick={()=>setCurrentPage(totalPages)} disabled={safeCurrentPage===totalPages}><ChevronsRight className="h-4 w-4"/></Button>
                                </div>
                            </div>
                        </CardFooter>
                    </Card>
                </div>

                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="max-w-6xl h-[90vh] p-0 overflow-hidden flex flex-col md:flex-row border-none shadow-2xl">
                        <DialogDescription className="sr-only">Biểu mẫu chi tiết hồ sơ văn bản</DialogDescription>
                        {/* LEFT SIDEBAR - Explorer Metadata Style */}
                        <div className="w-full md:w-[320px] bg-slate-50 border-r flex flex-col shrink-0">
                            <div className="p-6 border-b bg-white/50 backdrop-blur-sm sticky top-0 z-10">
                                <DialogHeader className="p-0">
                                    <DialogTitle className="flex items-center gap-3 text-lg">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            {dialogMode === 'view' ? <Eye className="h-5 w-5 text-primary" /> : dialogMode === 'add' ? <PlusCircle className="h-5 w-5 text-primary" /> : <Edit className="h-5 w-5 text-primary" />}
                                        </div>
                                        <div className="flex flex-col items-start leading-tight">
                                            <span className="font-bold">{dialogMode === 'view' ? t('Chi tiết hồ sơ') : dialogMode === 'add' ? t('Thêm hồ sơ mới') : t('Chỉnh sửa hồ sơ')}</span>
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mt-1">Document Explorer</span>
                                        </div>
                                    </DialogTitle>
                                </DialogHeader>
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="p-6 space-y-8">
                                    {/* Sidebar Section: Classification */}
                                    <div className="space-y-5">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-2">
                                            <Tags className="h-3.5 w-3.5" /> Phân loại văn bản
                                        </div>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label className="text-[11px] font-bold text-slate-500 uppercase">Loại văn bản *</Label>
                                                <Select value={formData.docType} onValueChange={(v:any)=>{
                                                    const newCode = dialogMode === 'add' ? generateDocCode(v) : formData.docCode;
                                                    setFormData({...formData, docType: v, docCode: newCode});
                                                }} disabled={dialogMode==='view'}>
                                                    <SelectTrigger className="h-10 border-slate-300 bg-white"><SelectValue placeholder="Chọn loại..." /></SelectTrigger>
                                                    <SelectContent>{docTypes?.map(t => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Sidebar Section: Metadata (MOVED FIELDS) */}
                                    <div className="space-y-5">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-2">
                                            <Info className="h-3.5 w-3.5" /> Thông tin gốc
                                        </div>
                                        <div className="space-y-5">
                                            {shouldShowField('issuingBody') && (
                                                <div className="space-y-2">
                                                    <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                                        <Building className="h-3 w-3" /> Cơ quan ban hành
                                                    </Label>
                                                    <Input 
                                                        value={formData.issuingBody || ''} 
                                                        onChange={e=>setFormData({...formData, issuingBody: e.target.value})} 
                                                        disabled={dialogMode==='view'} 
                                                        className="h-10 border-slate-300 bg-white focus:border-primary" 
                                                        placeholder="VD: UBND Thành phố" 
                                                    />
                                                </div>
                                            )}
                                            {shouldShowField('signer') && (
                                                <div className="space-y-2">
                                                    <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                                        <User className="h-3 w-3" /> Người ký văn bản
                                                    </Label>
                                                    <Input 
                                                        value={formData.signer || ''} 
                                                        onChange={e=>setFormData({...formData, signer: e.target.value})} 
                                                        disabled={dialogMode==='view'} 
                                                        className="h-10 border-slate-300 bg-white focus:border-primary" 
                                                        placeholder="Họ và tên người ký" 
                                                    />
                                                </div>
                                            )}
                                            {shouldShowField('issueDate') && (
                                                <div className="space-y-2">
                                                    <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                                        <Calendar className="h-3 w-3 text-blue-500" /> Ngày ban hành
                                                    </Label>
                                                    <Input 
                                                        type="date" 
                                                        value={formData.issueDate || ''} 
                                                        onChange={e=>setFormData({...formData, issueDate: e.target.value})} 
                                                        disabled={dialogMode==='view'} 
                                                        className="h-10 border-slate-300 bg-white" 
                                                    />
                                                </div>
                                            )}
                                            {shouldShowField('receivedDate') && (
                                                <div className="space-y-2">
                                                    <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2">
                                                        <Clock className="h-3 w-3 text-orange-500" /> Ngày nhận/nhập
                                                    </Label>
                                                    <Input 
                                                        type="date" 
                                                        value={formData.receivedDate || ''} 
                                                        onChange={e=>setFormData({...formData, receivedDate: e.target.value})} 
                                                        disabled={dialogMode==='view'} 
                                                        className="h-10 border-slate-300 bg-white" 
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Sidebar Section: Urgency/Confidentiality */}
                                    <div className="space-y-5 pt-4">
                                        <div className="flex flex-col gap-4 p-4 bg-white rounded-xl border shadow-sm">
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Độ khẩn</Label>
                                                <RadioGroup value={formData.urgency || 'Thường'} onValueChange={(v: any) => setFormData({...formData, urgency: v})} disabled={dialogMode === 'view'} className="flex flex-col gap-2">
                                                    {['Thường', 'Khẩn', 'Hỏa tốc'].map((opt) => (
                                                        <div key={opt} className="flex items-center space-x-2">
                                                            <RadioGroupItem value={opt} id={`side-urg-${opt}`} className="h-4 w-4 border-slate-300 text-orange-600 focus:ring-orange-500" />
                                                            <Label htmlFor={`side-urg-${opt}`} className={cn("text-[11px] font-semibold cursor-pointer", formData.urgency === opt ? "text-orange-600" : "text-slate-500")}>{opt}</Label>
                                                        </div>
                                                    ))}
                                                </RadioGroup>
                                            </div>
                                            <Separator />
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Độ mật</Label>
                                                <RadioGroup value={formData.confidentiality || 'Thường'} onValueChange={(v: any) => setFormData({...formData, confidentiality: v})} disabled={dialogMode === 'view'} className="flex flex-col gap-2">
                                                    {['Thường', 'Mật', 'Tối mật'].map((opt) => (
                                                        <div key={opt} className="flex items-center space-x-2">
                                                            <RadioGroupItem value={opt} id={`side-conf-${opt}`} className="h-4 w-4 border-slate-300 text-red-600 focus:ring-red-500" />
                                                            <Label htmlFor={`side-conf-${opt}`} className={cn("text-[11px] font-semibold cursor-pointer", formData.confidentiality === opt ? "text-red-600" : "text-slate-500")}>{opt}</Label>
                                                        </div>
                                                    ))}
                                                </RadioGroup>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>
                        </div>

                        {/* RIGHT MAIN CONTENT */}
                        <div className="flex-1 flex flex-col bg-white overflow-hidden">
                            <div className="px-8 py-4 border-b flex items-center justify-between bg-white shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Main Content Area</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    {formData.originalFile && <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 py-1 px-3"><CheckCircle2 className="h-3.5 w-3.5" /> File Ready</Badge>}
                                    {isExtracting && <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 animate-pulse gap-1.5 py-1 px-3"><RefreshCw className="h-3.5 w-3.5 animate-spin" /> AI Analyzing...</Badge>}
                                </div>
                            </div>

                            <ScrollArea className="flex-1">
                                <div className="p-8 space-y-10 pb-20">
                                    {/* 01. Upload & Files (MOVED TO TOP) */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest border-l-4 border-primary pl-4">Document Source & Upload</div>
                                        
                                        <div className={cn("mt-4 border-2 border-dashed rounded-2xl p-8 transition-all relative overflow-hidden group", formData.originalFile ? "border-emerald-200 bg-emerald-50/10" : "border-slate-200 hover:border-primary hover:bg-blue-50/10")}>
                                            {!formData.originalFile && <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity"><UploadCloud className="h-32 w-32 -rotate-12" /></div>}
                                            <div className="flex flex-col gap-8 relative z-10">
                                                <div className="flex flex-col md:flex-row items-center gap-8">
                                                    <div className={cn("h-20 w-20 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-105", formData.originalFile ? "bg-emerald-500 text-white" : "bg-primary text-white")}><UploadCloud className="h-10 w-10" /></div>
                                                    <div className="flex-1 text-center md:text-left space-y-1.5">
                                                        <h4 className="text-base font-bold text-slate-800">Tải lên hoặc nhập liên kết văn bản</h4>
                                                        <p className="text-sm text-slate-500">Hỗ trợ: PDF, DOCX, XLSX, TXT, PNG, JPG, ZIP, RAR...</p>
                                                        {formData.originalFile && <Badge variant="secondary" className="mt-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-emerald-200 font-bold uppercase text-[10px]">Tệp tin đã sẵn sàng</Badge>}
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <Button type="button" variant={formData.originalFile ? "outline" : "default"} onClick={() => fileInputRef.current?.click()} disabled={dialogMode==='view' || isUploading || !formData.docType} className="h-11 px-8 shadow-sm">
                                                            {isUploading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                                                            {formData.originalFile ? "Thay đổi tệp tin" : "Chọn tệp từ máy"}
                                                        </Button>
                                                        {formData.originalFile && <Button variant="ghost" className="text-blue-600 h-8" onClick={() => window.open(formData.originalFile, '_blank')}><Eye className="h-4 w-4 mr-2" /> Xem file/liên kết</Button>}
                                                    </div>
                                                </div>

                                                <div className="space-y-2 mt-4 pt-4 border-t border-dashed border-slate-200">
                                                    <Label className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-2">
                                                        <LinkIcon className="h-3.5 w-3.5 text-blue-500" /> Hoặc nhập liên kết (URL) trực tiếp {!formData.docType && <span className="text-red-400 normal-case">(Vui lòng chọn Loại văn bản trước)</span>}
                                                    </Label>
                                                    <div className="flex gap-2">
                                                        <Input 
                                                            value={formData.originalFile || ''} 
                                                            onChange={e=>setFormData({...formData, originalFile: e.target.value})} 
                                                            disabled={dialogMode==='view' || !formData.docType} 
                                                            placeholder={!formData.docType ? "Vui lòng chọn Loại văn bản trước khi nhập liên kết..." : "https://example.com/document.pdf"} 
                                                            className="h-11 border-slate-300 bg-white" 
                                                        />
                                                        {formData.originalFile && (
                                                            <Button variant="ghost" size="icon" onClick={() => setFormData({...formData, originalFile: ''})} disabled={dialogMode==='view'} className="h-11 w-11 text-slate-400 hover:text-red-500">
                                                                <X className="h-5 w-5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.xlsx,.txt,.jpg,.jpeg,.png,.zip,.rar" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* 02. Identification */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest border-l-4 border-primary pl-4">Identification & Title</div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                                            {shouldShowField('docNumber') && (
                                                <div className="md:col-span-4 space-y-2.5">
                                                    <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1.5">
                                                        <Hash className="h-3.5 w-3.5" /> Số / Ký hiệu hiệu {isExtracting && <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />}
                                                    </Label>
                                                    <Input 
                                                        value={formData.docNumber || ''} 
                                                        onChange={e=>setFormData({...formData, docNumber: e.target.value})} 
                                                        disabled={dialogMode==='view' || isExtracting} 
                                                        className={cn("h-11 border-slate-300 font-bold bg-slate-50/50", isExtracting && "animate-pulse bg-blue-50/50")} 
                                                        placeholder="VD: 123/QD-UBND" 
                                                    />
                                                </div>
                                            )}
                                            {shouldShowField('title') && (
                                                <div className="md:col-span-8 space-y-2.5">
                                                    <Label className="text-[11px] font-bold text-blue-700 uppercase flex items-center gap-1.5">
                                                        <Sparkles className="h-3.5 w-3.5" /> Tiêu đề chính văn bản *
                                                    </Label>
                                                    <Input 
                                                        value={formData.title || ''} 
                                                        onChange={e=>setFormData({...formData, title: e.target.value})} 
                                                        disabled={dialogMode==='view' || isExtracting} 
                                                        placeholder={isExtracting ? "AI đang trích xuất tiêu đề..." : "Nhập tên gọi chính thức của văn bản..."} 
                                                        className={cn("h-11 border-slate-300 font-bold px-4 shadow-sm text-lg", isExtracting && "animate-pulse bg-purple-50/50")} 
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 02. Content */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest border-l-4 border-primary pl-4">Content Summary</div>
                                        {shouldShowField('abstract') && (
                                            <div className="space-y-3">
                                                <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2"><FileText className="h-3.5 w-3.5" /> Trích yếu nội dung văn bản</Label>
                                                <Textarea 
                                                    value={formData.abstract || ''} 
                                                    onChange={e=>setFormData({...formData, abstract: e.target.value})} 
                                                    disabled={dialogMode==='view'} 
                                                    className="h-40 resize-none border-slate-300 p-6 leading-relaxed text-base shadow-inner bg-slate-50/30" 
                                                    placeholder="Tóm tắt ngắn gọn các nội dung chính, mục tiêu của văn bản..." 
                                                />
                                            </div>
                                        )}
                                    </div>

                                    {/* 03. Workflow */}
                                    <div className="space-y-6">
                                        <div className="flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest border-l-4 border-primary pl-4">Workflow & Assignee</div>
                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                                            {shouldShowField('department') && (
                                                <div className="md:col-span-4 space-y-3">
                                                    <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2"><Building className="h-3.5 w-3.5" /> Đơn vị xử lý chính</Label>
                                                    <MultiSelectCombobox 
                                                        options={(departmentsData || []).map(d => d.name)} 
                                                        selected={(formData.department || "").split(',').filter(Boolean)} 
                                                        onChange={(vals) => setFormData({...formData, department: vals.join(',')})} 
                                                        placeholder="Chọn phòng ban..." 
                                                        t={t} 
                                                    />
                                                </div>
                                            )}
                                            {shouldShowField('assignee') && (
                                                <div className="md:col-span-4 space-y-3">
                                                    <Label className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-2"><User className="h-3.5 w-3.5" /> Nhân sự phụ trách</Label>
                                                    <MultiSelectCombobox 
                                                        options={(employeesData || []).map(e => e.name)} 
                                                        selected={(formData.assignee || "").split(',').filter(Boolean)} 
                                                        onChange={(vals) => setFormData({...formData, assignee: vals.join(',')})} 
                                                        placeholder="Chọn người xử lý..." 
                                                        t={t} 
                                                    />
                                                </div>
                                            )}
                                            {shouldShowField('status') && (
                                                <div className="md:col-span-4 space-y-3">
                                                    <Label className="text-[11px] font-bold text-blue-700 uppercase">Trạng thái hiện tại</Label>
                                                    <Select value={formData.status} onValueChange={(v:any)=>setFormData({...formData, status: v})} disabled={dialogMode==='view'}>
                                                        <SelectTrigger className={cn("h-11 font-bold border-2 shadow-sm text-base", getStatusColor(formData.status || ''))}><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Mới">Mới</SelectItem>
                                                            <SelectItem value="Chờ duyệt">Chờ duyệt</SelectItem>
                                                            <SelectItem value="Đã duyệt">Đã duyệt</SelectItem>
                                                            <SelectItem value="Cần bổ sung">Cần bổ sung</SelectItem>
                                                            <SelectItem value="Ban hành">Ban hành</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* 04. AI Insights */}
                                    <div className="p-8 bg-purple-50/30 border-2 border-purple-100 rounded-3xl space-y-6 relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity"><Sparkles className="h-24 w-24 text-purple-600 rotate-12" /></div>
                                        <div className="flex items-center justify-between relative z-10">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-purple-100 rounded-lg"><Sparkles className="h-5 w-5 text-purple-700" /></div>
                                                <div className="flex flex-col">
                                                    <span className="text-purple-900 font-bold text-sm uppercase tracking-widest">AI Intelligence Insights</span>
                                                    <span className="text-[10px] text-purple-500 font-bold uppercase tracking-tighter">Automatic Extraction & Summary</span>
                                                </div>
                                            </div>
                                            <Badge className="bg-purple-600 text-white border-none px-4 py-1">GEN-AI ACTIVE</Badge>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                                            <div className="space-y-3">
                                                <Label className="text-[11px] font-bold text-purple-600 uppercase tracking-widest">Tóm lược nội dung AI</Label>
                                                <div className="relative">
                                                    <Textarea value={formData.aiSummary || ''} readOnly className="h-40 bg-white/80 backdrop-blur-sm text-sm border-purple-200 resize-none leading-relaxed p-4 shadow-sm italic text-slate-600" placeholder="Bản tóm tắt tự động từ AI sẽ xuất hiện tại đây sau khi phân tích tệp tin..." />
                                                    {!formData.aiSummary && <div className="absolute inset-0 flex flex-col items-center justify-center text-purple-300 gap-2"><Sparkles className="h-8 w-8 opacity-20" /><span className="text-[10px] uppercase font-bold tracking-widest opacity-40">Waiting for data</span></div>}
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <Label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Dữ liệu thô trích xuất (OCR)</Label>
                                                <Textarea value={formData.extractedText || ''} readOnly className="h-40 bg-slate-900/5 text-[10px] font-mono border-slate-200 resize-none p-4 leading-normal text-slate-500" placeholder="Raw OCR data stream..." />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </ScrollArea>

                            {/* FOOTER ACTIONS */}
                            <div className="px-8 py-6 border-t bg-white flex items-center justify-between shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                                <div className="flex items-center gap-4 text-slate-400">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Document ID</span>
                                        <code className="text-xs font-mono font-bold text-slate-600">{formData.docCode || 'PENDING'}</code>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button variant="outline" onClick={() => setFormData(initialFormState)} disabled={!isChanged || dialogMode === 'view'} className="h-11 px-6 border-2 border-slate-200 font-bold hover:bg-slate-50"><Undo2 className="mr-2 h-4 w-4" /> {t('Hoàn tác')}</Button>
                                    {dialogMode !== 'view' ? (
                                        <Button 
                                            onClick={handleSave} 
                                            disabled={!isChanged || !formData.title || isExtracting || isUploading} 
                                            className="h-11 px-10 shadow-lg bg-[#1877F2] hover:bg-[#1877F2]/90 font-bold text-base"
                                        >
                                            {(isExtracting || isUploading) ? <Cog className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                                            {isUploading ? t('Đang tải file...') : isExtracting ? t('AI đang xử lý...') : t('Lưu hồ sơ')}
                                        </Button>
                                    ) : (
                                        <Button onClick={() => setIsEditDialogOpen(false)} className="h-11 px-10 font-bold">{t('Đóng')}</Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận xóa hồ sơ?</AlertDialogTitle><AlertDialogDescription>Hành động này không thể hoàn tác. Mọi thông tin và file liên quan sẽ bị xóa khỏi hệ thống.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={async ()=>{ if(selectedItem && firestore){ await deleteDoc(doc(firestore, "document_records", selectedItem.id)); toast({title: t("Đã xóa hồ sơ")}); } setIsDeleteDialogOpen(false);}}>Xóa ngay</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                
                <AdvancedFilterDialog 
                    open={isAdvancedFilterOpen} 
                    onOpenChange={setIsAdvancedFilterOpen} 
                    filters={filters} 
                    setFilters={setFilters} 
                    t={t} 
                    docTypes={docTypes}
                    departments={departmentsData}
                    employees={employeesData}
                    onSaveCloud={saveFiltersToCloud}
                    onDeleteCloud={deleteFilterFromCloud}
                    isSaving={isSavingFilters}
                    presets={filterPresets}
                />
            </TooltipProvider>
        </ClientOnly>
    );
}

const AdvancedFilterDialog = ({ open, onOpenChange, filters, setFilters, t, docTypes, departments, employees, onSaveCloud, onDeleteCloud, isSaving, presets }: any) => {
    const [newPresetName, setNewPresetName] = useState('');
    const [isNamingPreset, setIsNamingPreset] = useState(false);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-xl p-0 overflow-hidden">
                <DialogDescription className="sr-only">Bộ lọc nâng cao cho hồ sơ văn bản</DialogDescription>
                <div className="flex items-center justify-between border-b pl-4 pr-12 py-3 bg-muted/30">
                    <div className="flex items-center gap-3">
                        <ListFilter className="h-5 w-5 text-primary" />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <div className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity group">
                                    <DialogTitle className="text-lg font-bold">Lọc hồ sơ nâng cao</DialogTitle>
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

                <ScrollArea className="max-h-[70vh] pr-4">
                    <div className="p-8 space-y-6">
                        {/* Date Range Section */}
                        <div className="space-y-3 p-4 bg-slate-50 rounded-lg border">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Khoảng thời gian</Label>
                            <RadioGroup 
                                value={filters.dateType || 'issueDate'} 
                                onValueChange={v => setFilters({...filters, dateType: v})}
                                className="flex gap-4 mb-3"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="issueDate" id="filter-issue" />
                                    <Label htmlFor="filter-issue" className="text-xs">Theo ngày ban hành</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="receivedDate" id="filter-receive" />
                                    <Label htmlFor="filter-receive" className="text-xs">Theo ngày nhập</Label>
                                </div>
                            </RadioGroup>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs">Từ ngày</Label>
                                    <Input type="date" value={filters.startDate || ''} onChange={e=>setFilters({...filters, startDate: e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs">Đến ngày</Label>
                                    <Input type="date" value={filters.endDate || ''} onChange={e=>setFilters({...filters, endDate: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        {/* Metadata Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold">Loại văn bản</Label>
                                <Select value={filters.docType || 'all'} onValueChange={v => setFilters({...filters, docType: v === 'all' ? undefined : v})}>
                                    <SelectTrigger><SelectValue placeholder="Tất cả loại..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tất cả loại</SelectItem>
                                        {docTypes?.map((dt: any) => <SelectItem key={dt.id} value={dt.name}>{dt.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold">Tiêu đề/Trích yếu</Label>
                                <Input placeholder="Tìm trong tiêu đề..." value={filters.title || ''} onChange={e=>setFilters({...filters, title: e.target.value})} />
                            </div>
                        </div>

                        {/* People Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold">Đơn vị xử lý chính</Label>
                                <Select value={filters.department || 'all'} onValueChange={v => setFilters({...filters, department: v === 'all' ? undefined : v})}>
                                    <SelectTrigger><SelectValue placeholder="Tất cả đơn vị..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tất cả đơn vị</SelectItem>
                                        {departments?.map((d: any) => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold">Nhân sự phụ trách</Label>
                                <Select value={filters.assignee || 'all'} onValueChange={v => setFilters({...filters, assignee: v === 'all' ? undefined : v})}>
                                    <SelectTrigger><SelectValue placeholder="Tất cả nhân sự..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tất cả nhân sự</SelectItem>
                                        {employees?.map((emp: any) => <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold">Cơ quan ban hành</Label>
                                <Input placeholder="Tên cơ quan..." value={filters.issuingBody || ''} onChange={e=>setFilters({...filters, issuingBody: e.target.value})} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold">Người ký văn bản</Label>
                                <Input placeholder="Họ tên người ký..." value={filters.signer || ''} onChange={e=>setFilters({...filters, signer: e.target.value})} />
                            </div>
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter className="p-4 border-t bg-muted/20 flex items-center justify-end gap-2">
                    <Button variant="ghost" onClick={() => setFilters({})} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <X className="mr-2 h-4 w-4" /> Xóa tất cả bộ lọc
                    </Button>
                    <Button onClick={() => onOpenChange(false)} className="bg-primary text-primary-foreground shadow-sm">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Áp dụng bộ lọc
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

