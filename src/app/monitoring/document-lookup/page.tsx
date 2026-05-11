"use client";

import React, { useState, useMemo, useCallback, useRef } from 'react';
import { 
  Search, FileText, Calendar, User, Building, Clock, 
  Hash, Tags, Eye, FileDown, ListFilter, X, 
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Filter, History, RefreshCw, FolderArchive,
  Cog, EllipsisVertical, Shield, AlertTriangle, AlertCircle, Ban, Undo2, Check,
  FileSpreadsheet, FileImage, FileArchive, Link as LinkIcon, Maximize2, ExternalLink, Minimize2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/hooks/use-language";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import { ClientOnly } from "@/components/client-only";
import PageHeader from "@/components/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { DocumentRecord } from '@/lib/types';
import { format, isSameDay } from 'date-fns';
import { Skeleton } from "@/components/ui/skeleton";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import * as XLSX from 'xlsx';

const ColumnHeader = ({ columnKey, title, t, sortConfig, openPopover, setOpenPopover, requestSort, clearSort, filters, handleFilterChange, icon: Icon }: any) => {
    const sortState = sortConfig?.find((s: any) => s.key === columnKey);
    const isFiltered = !!filters[columnKey];
    return (
        <Popover open={openPopover === columnKey} onOpenChange={(isOpen) => setOpenPopover(isOpen ? columnKey : null)}>
            <PopoverTrigger asChild>
                <Button variant="ghost" className="text-white hover:text-white hover:bg-blue-700 h-10 px-3 group w-full justify-start font-bold text-[11px] uppercase tracking-wider rounded-none">
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

export default function DocumentLookupPage() {
    const { t } = useLanguage();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user: authUser } = useUser();

    const [openPopover, setOpenPopover] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useLocalStorage('doc_lookup_page_v1', 1);
    const [rowsPerPage, setRowsPerPage] = useLocalStorage('doc_lookup_rows_v1', 10);
    const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>('doc_lookup_colVis_v1', { 
        docCode: true, docNumber: true, title: true, docType: true, issueDate: true, signer: true, issuingBody: true, originalFile: true
    });
    const [filters, setFilters] = useLocalStorage<Record<string, string>>('doc_lookup_filters_v1', {});
    const [searchTerm, setSearchTerm] = useState(filters.title || '');
    const [searchScopes, setSearchScopes] = useLocalStorage<string[]>('doc_lookup_scopes_v1', ['title', 'docNumber']);
    const [selectedDocTypes, setSelectedDocTypes] = useLocalStorage<string[]>('doc_lookup_selected_types_v1', []);
    const [selectedDate, setSelectedDate] = useLocalStorage<string>('doc_lookup_date_v1', '');
    const [searchMode, setSearchMode] = useLocalStorage<'partial' | 'exact'>('doc_lookup_mode_v1', 'partial');
    const [searchLogic, setSearchLogic] = useLocalStorage<'and' | 'or'>('doc_lookup_logic_v1', 'and');
    const [sortConfig, setSortConfig] = useLocalStorage<any[]>('doc_lookup_sort_v1', [{ key: 'issueDate', direction: 'descending' }]);
    const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
    const [fullPreviewDoc, setFullPreviewDoc] = useState<DocumentRecord | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const docRef = useMemo(() => (firestore ? collection(firestore, "document_records") : null), [firestore]);
    const { data: rawData, loading, error } = useCollection<DocumentRecord>(docRef);

    const docTypesRef = useMemo(() => (firestore ? collection(firestore, "document_types") : null), [firestore]);
    const { data: docTypes } = useCollection<any>(docTypesRef);

    const deptsRef = useMemo(() => (firestore ? collection(firestore, "departments") : null), [firestore]);
    const { data: departments } = useCollection<any>(deptsRef);

    const employeesRef = useMemo(() => (firestore ? collection(firestore, "employees") : null), [firestore]);
    const { data: employees } = useCollection<any>(employeesRef);

    const columnDefs: Record<string, string> = {
        docCode: 'Mã văn bản', docNumber: 'Số hiệu', title: 'Tiêu đề văn bản', abstract: 'Trích yếu nội dung', docType: 'Loại văn bản',
        issueDate: 'Ngày ban hành', signer: 'Người ký', issuingBody: 'Cơ quan ban hành', extractedText: 'Nội dung', originalFile: 'File văn bản'
    };

    const colIcons: Record<string, any> = {
        docCode: Hash, docNumber: FileText, title: FileText, abstract: FileText, docType: Tags, 
        issueDate: Calendar, signer: User, issuingBody: Building, extractedText: FileText, originalFile: LinkIcon
    };

    const getFileInfo = (url: string) => {
        if (!url) return { icon: FileDown, name: 'None', isLink: false, color: 'text-slate-400', bgColor: 'bg-slate-100' };
        const isFirebase = url.includes('firebasestorage');
        const isDirectLink = !isFirebase && (url.startsWith('http') || url.startsWith('www'));
        
        let name = 'Tài liệu';
        try {
            if (isFirebase) {
                const decoded = decodeURIComponent(url);
                const parts = decoded.split('/');
                const lastPart = parts[parts.length - 1].split('?')[0];
                name = lastPart.split('_').slice(1).join('_') || lastPart;
            } else {
                const parts = url.split('/');
                name = parts[parts.length - 1] || url;
            }
        } catch (e) { name = url; }

        const ext = name.split('.').pop()?.toLowerCase() || '';
        let icon = FileText;
        let color = 'text-slate-500';
        let bgColor = 'bg-slate-100';

        if (ext === 'pdf') {
            icon = FileText;
            color = 'text-rose-600';
            bgColor = 'bg-rose-50';
        } else if (['doc', 'docx'].includes(ext)) {
            icon = FileText;
            color = 'text-blue-600';
            bgColor = 'bg-blue-50';
        } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
            icon = FileSpreadsheet;
            color = 'text-emerald-600';
            bgColor = 'bg-emerald-50';
        } else if (['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext)) {
            icon = FileImage;
            color = 'text-amber-600';
            bgColor = 'bg-amber-50';
        } else if (['zip', 'rar', '7z'].includes(ext)) {
            icon = FileArchive;
            color = 'text-purple-600';
            bgColor = 'bg-purple-50';
        } else if (isDirectLink) {
            icon = LinkIcon;
            color = 'text-primary';
            bgColor = 'bg-blue-50';
        }

        return { icon, name, isLink: isDirectLink, color, bgColor, ext: ext.toUpperCase() };
    };

    // Cloud Presets Logic
    const [filterPresets, setFilterPresets] = useState<any[]>([]);
    const loadPresets = useCallback(async () => {
        if (!firestore || !authUser) return;
        const snap = await getDoc(doc(firestore, "user_settings", authUser.uid));
        if (snap.exists() && snap.data().doc_lookup_presets) setFilterPresets(snap.data().doc_lookup_presets);
    }, [firestore, authUser]);

    React.useEffect(() => { if (authUser) loadPresets(); }, [loadPresets, authUser]);

    const handleSearch = useCallback(() => {
        setFilters(prev => ({ ...prev, title: searchTerm }));
        setCurrentPage(1);
    }, [searchTerm, setFilters, setCurrentPage]);

    const filteredItems = useMemo(() => {
        if (!rawData) return [];
        const searchTermLower = (searchTerm || '').toLowerCase();
        
        // Chỉ hiển thị kết quả nếu có ít nhất một bộ lọc đang hoạt động
        const hasActiveFilters = searchTermLower || selectedDocTypes.length > 0 || selectedDate;
        if (!hasActiveFilters) return [];

        return rawData.filter(item => {
            // Document Type Filter (Multi-select)
            if (selectedDocTypes.length > 0) {
                if (!selectedDocTypes.includes(item.docType)) return false;
            }

            // Date Filter
            if (selectedDate) {
                if (!item.issueDate) return false;
                try {
                    const itemDate = new Date(item.issueDate);
                    const filterDate = new Date(selectedDate);
                    if (!isSameDay(itemDate, filterDate)) return false;
                } catch (e) { return false; }
            }

            // General Keyword Search based on scopes
            if (searchTermLower) {
                if (searchTermLower.includes('|')) {
                    const parts = searchTermLower.split('|').map(p => p.trim());
                    const orderedPossibleScopes = ['docNumber', 'title', 'abstract', 'extractedText', 'signer', 'issuingBody'];
                    const activeOrderedScopes = orderedPossibleScopes.filter(s => searchScopes.includes(s));
                    
                    const checkPart = (scope: string, index: number) => {
                        const part = parts[index];
                        if (!part) return searchLogic === 'and';
                        
                        const value = String(item[scope as keyof DocumentRecord] || '').toLowerCase();
                        if (searchMode === 'exact') return value === part;
                        return value.includes(part);
                    };

                    const isMatch = searchLogic === 'and' 
                        ? activeOrderedScopes.every(checkPart)
                        : activeOrderedScopes.some(checkPart);
                    
                    if (!isMatch) return false;
                } else {
                    const matchesAnyScope = searchScopes.some(scope => {
                        const value = String(item[scope as keyof DocumentRecord] || '').toLowerCase();
                        if (searchMode === 'exact') return value === searchTermLower;
                        return value.includes(searchTermLower);
                    });
                    if (!matchesAnyScope) return false;
                }
            }

            // Other filters (from column headers)
            return Object.entries(filters).every(([k, v]) => {
                if (!v || k === 'title') return true;
                return String(item[k as keyof DocumentRecord] || '').toLowerCase().includes(String(v).toLowerCase());
            });
        });
    }, [rawData, searchTerm, selectedDocTypes, selectedDate, searchMode, searchLogic, searchScopes, filters]);

    const sortedItems = useMemo(() => {
        let items = [...filteredItems];
        if (sortConfig.length > 0) {
            const { key, direction } = sortConfig[0];
            items.sort((a, b) => {
                const aV = String(a[key as keyof DocumentRecord] || '');
                const bV = String(b[key as keyof DocumentRecord] || '');
                if (key === 'issueDate' || key === 'receivedDate') {
                    const da = new Date(aV).getTime();
                    const db = new Date(bV).getTime();
                    return direction === 'ascending' ? da - db : db - da;
                }
                return direction === 'ascending' ? aV.localeCompare(bV) : bV.localeCompare(aV);
            });
        }
        return items;
    }, [filteredItems, sortConfig]);

    const totalPages = Math.max(1, Math.ceil(sortedItems.length / rowsPerPage));
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
    const activeColumns = useMemo(() => {
        // Only include columns that are selected in searchScopes + originalFile
        const cols = [...searchScopes];
        if (!cols.includes('originalFile')) cols.push('originalFile');
        return cols;
    }, [searchScopes]);

    const paginatedItems = useMemo(() => {
        const start = (safeCurrentPage - 1) * rowsPerPage;
        return sortedItems.slice(start, start + rowsPerPage);
    }, [sortedItems, safeCurrentPage, rowsPerPage]);

    const handleExport = () => {
        const exportData = sortedItems.map(item => ({
            'Mã văn bản': item.docCode, 'Số hiệu': item.docNumber, 'Trích yếu': item.title,
            'Loại văn bản': item.docType, 'Ngày ban hành': item.issueDate, 'Người ký': item.signer,
            'Cơ quan ban hành': item.issuingBody
        }));
        const ws = XLSX.utils.json_to_sheet(exportData); const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Documents"); XLSX.writeFile(wb, `DS_TraCuuVanBan_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    };

    const dynamicPlaceholder = useMemo(() => {
        const orderedPossibleScopes = [
            { id: 'docNumber', label: 'Số hiệu' },
            { id: 'title', label: 'Tiêu đề' },
            { id: 'abstract', label: 'Trích yếu' },
            { id: 'extractedText', label: 'Nội dung' },
            { id: 'signer', label: 'Người ký' },
            { id: 'issuingBody', label: 'Cơ quan' }
        ];
        const activeLabels = orderedPossibleScopes
            .filter(s => searchScopes.includes(s.id))
            .map(s => s.label);
        
        if (activeLabels.length > 1) {
            return `Tìm theo ${activeLabels.join(' | ')}...`;
        }
        return "Nhập từ khóa tìm kiếm...";
    }, [searchScopes]);

    return (
        <ClientOnly>
            <TooltipProvider>
                <div className="flex flex-col bg-slate-50/50 min-h-screen">
                    <div className="px-6 py-6 shrink-0">
                        <PageHeader 
                            title="Tra cứu văn bản" 
                            description="Hệ thống tra cứu và tìm kiếm hồ sơ văn bản tập trung"
                            icon={Search}
                        />
                    </div>

                    <div className="px-6 pb-12 space-y-6 flex-1 flex flex-col">
                        <Card className="shadow-sm border-slate-200 shrink-0">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex flex-col md:flex-row gap-4 items-center">
                                    <div className="relative flex-1 w-full">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                        <Input 
                                            placeholder={dynamicPlaceholder} 
                                            className="pl-10 h-11 bg-white border-slate-200 focus:ring-primary/20 text-base"
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                        />
                                    </div>

                                    {/* Document Type Multi-select Combobox */}
                                    <div className="w-full md:w-64">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" className="w-full h-11 justify-between bg-white border-slate-200 text-slate-600 font-medium">
                                                    <div className="flex items-center gap-2 truncate">
                                                        <Tags className="h-4 w-4 text-primary" />
                                                        {selectedDocTypes.length === 0 ? "Tất cả loại văn bản" : `Đã chọn ${selectedDocTypes.length} loại`}
                                                    </div>
                                                    <ArrowUpDown className="h-4 w-4 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-64 p-0" align="start">
                                                <div className="p-2 border-b bg-slate-50">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Chọn loại văn bản</p>
                                                </div>
                                                <ScrollArea className="h-64">
                                                    <div className="p-2 space-y-1">
                                                        {docTypes?.map((type: any) => (
                                                            <div 
                                                                key={type.id} 
                                                                className="flex items-center space-x-2 p-2 hover:bg-slate-50 rounded-md cursor-pointer transition-colors"
                                                                onClick={() => {
                                                                    const val = type.name;
                                                                    setSelectedDocTypes(prev => prev.includes(val) ? prev.filter(i => i !== val) : [...prev, val]);
                                                                }}
                                                            >
                                                                <Checkbox 
                                                                    id={`type-${type.id}`} 
                                                                    checked={selectedDocTypes.includes(type.name)}
                                                                />
                                                                <Label className="text-xs font-medium cursor-pointer flex-1">{type.name}</Label>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </ScrollArea>
                                                {selectedDocTypes.length > 0 && (
                                                    <div className="p-2 border-t bg-slate-50 flex justify-center">
                                                        <Button variant="ghost" size="sm" className="text-[10px] h-7 font-bold text-red-500 hover:text-red-600" onClick={() => setSelectedDocTypes([])}>
                                                            <X className="h-3 w-3 mr-1" /> Xóa chọn
                                                        </Button>
                                                    </div>
                                                )}
                                            </PopoverContent>
                                        </Popover>
                                    </div>

                                    {/* Issue Date Picker (Synchronized with App Standard) */}
                                    <div className="w-full md:w-48">
                                        <DatePickerField 
                                            value={selectedDate}
                                            onChange={setSelectedDate}
                                            placeholder="Ngày ban hành"
                                            className="h-11"
                                        />
                                    </div>

                                    <Button 
                                        variant="default" 
                                        className="h-11 px-4 bg-primary hover:bg-primary/90 shadow-sm" 
                                        onClick={handleSearch}
                                        title="Tìm kiếm"
                                    >
                                        <Search className="h-5 w-5" />
                                    </Button>
                                </div>

                                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-1">
                                    {/* Search Mode Select */}
                                    <div className="flex items-center gap-3 mr-4 pr-6 border-r border-slate-200">
                                        <Select 
                                            value={searchMode} 
                                            onValueChange={(v: any) => setSearchMode(v)}
                                        >
                                            <SelectTrigger className="h-8 w-36 bg-white border-slate-200 text-xs font-bold text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <Filter className="h-3.5 w-3.5 text-primary" />
                                                    <SelectValue />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="partial" className="text-xs">Tìm tương tự</SelectItem>
                                                <SelectItem value="exact" className="text-xs">Tìm chính xác</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <Select 
                                            value={searchLogic} 
                                            onValueChange={(v: any) => setSearchLogic(v)}
                                        >
                                            <SelectTrigger className="h-8 w-56 bg-white border-slate-200 text-xs font-bold text-slate-600">
                                                <div className="flex items-center gap-2">
                                                    <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
                                                    <SelectValue />
                                                </div>
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="and" className="text-xs">Điều kiện và (and)</SelectItem>
                                                <SelectItem value="or" className="text-xs">Điều kiện hoặc (or)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="scope-number" checked={searchScopes.includes('docNumber')} onCheckedChange={(checked) => setSearchScopes(prev => checked ? [...prev, 'docNumber'] : prev.filter(s => s !== 'docNumber'))} />
                                        <Label htmlFor="scope-number" className="text-sm font-medium text-slate-600 cursor-pointer">Số hiệu văn bản</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="scope-title" checked={searchScopes.includes('title')} onCheckedChange={(checked) => setSearchScopes(prev => checked ? [...prev, 'title'] : prev.filter(s => s !== 'title'))} />
                                        <Label htmlFor="scope-title" className="text-sm font-medium text-slate-600 cursor-pointer">Tiêu đề văn bản</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="scope-abstract" checked={searchScopes.includes('abstract')} onCheckedChange={(checked) => setSearchScopes(prev => checked ? [...prev, 'abstract'] : prev.filter(s => s !== 'abstract'))} />
                                        <Label htmlFor="scope-abstract" className="text-sm font-medium text-slate-600 cursor-pointer">Trích yếu nội dung văn bản</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="scope-content" checked={searchScopes.includes('extractedText')} onCheckedChange={(checked) => setSearchScopes(prev => checked ? [...prev, 'extractedText'] : prev.filter(s => s !== 'extractedText'))} />
                                        <Label htmlFor="scope-content" className="text-sm font-medium text-slate-600 cursor-pointer">Nội dung văn bản</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="scope-signer" checked={searchScopes.includes('signer')} onCheckedChange={(checked) => setSearchScopes(prev => checked ? [...prev, 'signer'] : prev.filter(s => s !== 'signer'))} />
                                        <Label htmlFor="scope-signer" className="text-sm font-medium text-slate-600 cursor-pointer">Người ký</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="scope-body" checked={searchScopes.includes('issuingBody')} onCheckedChange={(checked) => setSearchScopes(prev => checked ? [...prev, 'issuingBody'] : prev.filter(s => s !== 'issuingBody'))} />
                                        <Label htmlFor="scope-body" className="text-sm font-medium text-slate-600 cursor-pointer">Cơ quan ban hành</Label>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* SPLIT VIEW CONTAINER */}
                        {(searchTerm || selectedDocTypes.length > 0 || selectedDate) && (
                            <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0 h-[750px] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* LEFT: RESULTS LIST */}
                                <div className="w-full md:w-[450px] flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="px-4 py-3 bg-slate-50/50 border-b flex items-center justify-between shrink-0">
                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Danh sách kết quả ({sortedItems.length})</span>
                                        <Select value={String(rowsPerPage)} onValueChange={v => {setRowsPerPage(Number(v)); setCurrentPage(1);}}>
                                            <SelectTrigger className="h-7 w-20 text-[10px] bg-white border-slate-200"><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem value="5">5 dòng</SelectItem><SelectItem value="10">10 dòng</SelectItem><SelectItem value="20">20 dòng</SelectItem><SelectItem value="50">50 dòng</SelectItem></SelectContent>
                                        </Select>
                                    </div>

                                    <ScrollArea className="flex-1">
                                        <div className="divide-y divide-slate-100">
                                            {loading ? (
                                                Array(5).fill(0).map((_, i) => (
                                                    <div key={i} className="p-4 space-y-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
                                                ))
                                            ) : paginatedItems.length > 0 ? (
                                                paginatedItems.map((item) => {
                                                    const fileInfo = getFileInfo(item.originalFile || '');
                                                    const Icon = fileInfo.icon;
                                                    const isActive = selectedDoc?.id === item.id;
                                                    return (
                                                        <div 
                                                            key={item.id} 
                                                            className={cn("p-4 cursor-pointer transition-all border-l-4", isActive ? "bg-blue-50 border-primary" : "hover:bg-slate-50 border-transparent")}
                                                            onClick={() => setSelectedDoc(item)}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0 shadow-sm transition-colors relative", isActive ? "bg-primary text-white" : cn(fileInfo.bgColor, fileInfo.color))}>
                                                                    <Icon className="h-5 w-5" />
                                                                    {!fileInfo.isLink && fileInfo.ext && (
                                                                        <span className={cn("absolute -bottom-1 -right-1 text-[8px] font-bold px-1 rounded-sm border shadow-sm", isActive ? "bg-white text-primary border-primary" : cn("bg-white", fileInfo.color, "border-current"))}>
                                                                            {fileInfo.ext}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className={cn("text-sm font-bold truncate", isActive ? "text-primary" : "text-slate-800")}>{fileInfo.name}</h4>
                                                                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{item.title}</p>
                                                                    <div className="flex items-center gap-3 mt-2 text-[10px] text-slate-400 font-medium">
                                                                        <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> {item.docNumber || 'N/A'}</span>
                                                                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {item.issueDate ? format(new Date(item.issueDate), 'dd/MM/yyyy') : '---'}</span>
                                                                        <Badge variant="outline" className="px-1 py-0 h-3.5 text-[9px] bg-slate-50 text-slate-400 border-slate-200">{item.docType}</Badge>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="p-12 text-center text-slate-400">
                                                    <div className="mx-auto w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                                        <X className="h-6 w-6 opacity-20" />
                                                    </div>
                                                    <p className="text-sm italic">Không tìm thấy văn bản phù hợp</p>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                    {/* PAGINATION FOOTER (LEFT PANEL) */}
                                    <div className="p-3 border-t bg-slate-50/50 flex items-center justify-between gap-2 shrink-0">
                                        <div className="flex items-center gap-1">
                                            <Button variant="outline" size="icon" className="h-8 w-8 bg-white border-slate-200" disabled={safeCurrentPage === 1} onClick={() => setCurrentPage(1)}><ChevronsLeft className="h-4 w-4" /></Button>
                                            <Button variant="outline" size="icon" className="h-8 w-8 bg-white border-slate-200" disabled={safeCurrentPage === 1} onClick={() => setCurrentPage(safeCurrentPage - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                                        </div>
                                        <div className="text-[11px] font-bold text-slate-500">Trang {safeCurrentPage}/{totalPages}</div>
                                        <div className="flex items-center gap-1">
                                            <Button variant="outline" size="icon" className="h-8 w-8 bg-white border-slate-200" disabled={safeCurrentPage === totalPages} onClick={() => setCurrentPage(safeCurrentPage + 1)}><ChevronRight className="h-4 w-4" /></Button>
                                            <Button variant="outline" size="icon" className="h-8 w-8 bg-white border-slate-200" disabled={safeCurrentPage === totalPages} onClick={() => setCurrentPage(totalPages)}><ChevronsRight className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT: DOCUMENT PREVIEW (Finder Style) */}
                                <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm relative">
                                    {selectedDoc ? (
                                        <div className="flex-1 flex flex-col">
                                            {/* PREVIEW HEADER */}
                                            <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50/30 shrink-0">
                                                <div className="flex items-center gap-4 min-w-0">
                                                    {(() => {
                                                        const info = getFileInfo(selectedDoc.originalFile || '');
                                                        const I = info.icon;
                                                        return (
                                                            <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shadow-inner shrink-0 relative", info.bgColor, info.color)}>
                                                                <I className="h-5 w-5" />
                                                                {!info.isLink && info.ext && (
                                                                    <span className={cn("absolute -bottom-1 -right-1 text-[8px] font-bold px-1 rounded-sm border shadow-sm bg-white border-current")}>
                                                                        {info.ext}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                    <div className="min-w-0">
                                                        <h3 className="text-base font-bold text-slate-800 truncate leading-tight" title={selectedDoc.title}>{selectedDoc.title}</h3>
                                                        <div className="flex items-center gap-4 mt-1">
                                                            <span className="text-xs text-slate-500 font-medium">{selectedDoc.issuingBody}</span>
                                                            <span className="text-[10px] text-slate-300">|</span>
                                                            <span className="text-xs text-slate-500 font-medium">Ký bởi: {selectedDoc.signer}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200 bg-white text-slate-500 hover:text-primary" onClick={() => setFullPreviewDoc(selectedDoc)}>
                                                                <Maximize2 className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Xem toàn màn hình</TooltipContent>
                                                    </Tooltip>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200 bg-white text-slate-500 hover:text-primary" onClick={() => window.open(selectedDoc.originalFile, '_blank')}>
                                                                <ExternalLink className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Mở trong cửa sổ mới</TooltipContent>
                                                    </Tooltip>
                                                    <Button variant="outline" size="sm" className="h-9 px-4 text-xs font-bold gap-2 border-slate-200 bg-white" onClick={() => window.open(selectedDoc.originalFile, '_blank')}>
                                                        <FileDown className="h-4 w-4" /> Tải về
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-slate-400" onClick={() => setSelectedDoc(null)}>
                                                        <X className="h-5 w-5" />
                                                    </Button>
                                                </div>
                                            </div>

                                            {/* PREVIEW CONTENT */}
                                            <div className="flex-1 bg-slate-100/50 p-6 flex flex-col overflow-hidden">
                                                {selectedDoc.originalFile ? (() => {
                                                    const url = selectedDoc.originalFile;
                                                    const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
                                                    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext || '');
                                                    const isPdf = ext === 'pdf';

                                                    return (
                                                        <div className="flex-1 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                                                            {isImage ? (
                                                                <ScrollArea className="w-full h-full">
                                                                    <div className="p-8 flex justify-center">
                                                                        <img src={url} alt="Preview" className="max-w-full shadow-2xl rounded" />
                                                                    </div>
                                                                </ScrollArea>
                                                            ) : isPdf ? (
                                                                <iframe src={`${url}#toolbar=0`} className="w-full h-full border-none" title="PDF Preview" />
                                                            ) : (
                                                                <ScrollArea className="w-full h-full">
                                                                    <div className="flex flex-col items-center gap-6 p-12 pt-[10vh] pb-24 text-center">
                                                                        <div className="h-24 w-24 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 shrink-0">
                                                                            <LinkIcon className="h-12 w-12" />
                                                                        </div>
                                                                        <div className="max-w-md space-y-2">
                                                                            <p className="text-lg font-bold text-slate-800">Không thể xem trực tiếp</p>
                                                                            <p className="text-sm text-slate-500">Văn bản này ở định dạng không hỗ trợ xem trực tiếp hoặc là một liên kết bên ngoài.</p>
                                                                        </div>
                                                                        <Button className="h-11 px-8 gap-2 shadow-lg shrink-0 mb-8" onClick={() => window.open(url, '_blank')}>
                                                                            <Eye className="h-4 w-4" /> Mở trong tab mới
                                                                        </Button>
                                                                    </div>
                                                                </ScrollArea>
                                                            )}
                                                        </div>
                                                    );
                                                })() : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-4">
                                                        <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center">
                                                            <FileDown className="h-10 w-10 opacity-20" />
                                                        </div>
                                                        <p className="text-sm italic">Văn bản này không có file đính kèm</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50/30">
                                            <div className="relative mb-8">
                                                <div className="h-32 w-32 bg-white rounded-full flex items-center justify-center shadow-xl border border-slate-100">
                                                    <FileText className="h-16 w-16 text-slate-100" />
                                                </div>
                                                <div className="absolute -bottom-2 -right-2 h-12 w-12 bg-primary rounded-full flex items-center justify-center text-white shadow-lg animate-bounce">
                                                    <ChevronLeft className="h-6 w-6 rotate-180" />
                                                </div>
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-800 mb-2">Chọn văn bản để xem nội dung</h3>
                                            <p className="text-slate-500 max-w-sm">Chọn một mục từ danh sách bên trái để xem trước nội dung văn bản trực tiếp tại đây.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                {/* FULL SCREEN PREVIEW DIALOG */}
                <Dialog open={!!fullPreviewDoc} onOpenChange={() => setFullPreviewDoc(null)}>
                    <DialogContent className="max-w-[95vw] w-[95vw] h-[92vh] p-0 overflow-hidden flex flex-col border-none shadow-2xl">
                        <VisuallyHidden>
                            <DialogTitle>Xem chi tiết văn bản</DialogTitle>
                            <DialogDescription>Hiển thị nội dung chi tiết của văn bản đang chọn</DialogDescription>
                        </VisuallyHidden>
                        {fullPreviewDoc && (
                            <div className="flex-1 flex flex-col bg-white">
                                <div className="px-6 py-3 border-b flex items-center justify-between bg-slate-50 shrink-0">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {(() => {
                                            const info = getFileInfo(fullPreviewDoc.originalFile || '');
                                            const I = info.icon;
                                            return (
                                                <div className={cn("h-8 w-8 rounded flex items-center justify-center shrink-0 relative", info.bgColor, info.color)}>
                                                    <I className="h-4 w-4" />
                                                    {!info.isLink && info.ext && (
                                                        <span className="absolute -bottom-1 -right-1 text-[7px] font-bold px-0.5 rounded-sm bg-white border border-current shadow-xs">
                                                            {info.ext}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                        <h3 className="text-sm font-bold text-slate-800 truncate">{fullPreviewDoc.title}</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" className="h-8 px-3 text-[11px] font-bold gap-2" onClick={() => window.open(fullPreviewDoc.originalFile, '_blank')}>
                                            <ExternalLink className="h-3.5 w-3.5" /> Mở tab mới
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFullPreviewDoc(null)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex-1 bg-slate-100 p-4 overflow-hidden">
                                    <div className="w-full h-full bg-white rounded-lg shadow-inner overflow-hidden border border-slate-200">
                                        {(() => {
                                            const url = fullPreviewDoc.originalFile || '';
                                            const ext = url.split('?')[0].split('.').pop()?.toLowerCase();
                                            const isImage = ['png', 'jpg', 'jpeg', 'gif', 'svg'].includes(ext || '');
                                            const isPdf = ext === 'pdf';

                                            if (isImage) {
                                                return <ScrollArea className="w-full h-full"><div className="p-4 flex justify-center"><img src={url} alt="Preview" className="max-w-full h-auto shadow-sm rounded border" /></div></ScrollArea>;
                                            } else if (isPdf) {
                                                return <iframe src={`${url}#toolbar=1`} className="w-full h-full border-none" title="PDF Preview" />;
                                            } else if (url.includes('firebasestorage.googleapis.com')) {
                                                return <iframe src={`https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`} className="w-full h-full border-none" title="Doc Preview" />;
                                            }
                                            return (
                                                <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center bg-white">
                                                    <div className="h-20 w-20 rounded-full bg-blue-50 flex items-center justify-center mb-6"><LinkIcon className="h-10 w-10 text-blue-500" /></div>
                                                    <h3 className="text-xl font-bold text-slate-800 mb-2">Không thể xem trực tiếp</h3>
                                                    <p className="text-slate-500 max-w-md mb-8 text-sm">Văn bản này ở định dạng không hỗ trợ xem trực tiếp hoặc là một liên kết bên ngoài.</p>
                                                    <Button size="lg" className="bg-primary hover:bg-primary/90 text-white rounded-xl px-8" onClick={() => window.open(url, '_blank')}><Eye className="mr-2 h-5 w-5" /> Mở trong tab mới</Button>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </TooltipProvider>
        </ClientOnly>
    );
}
