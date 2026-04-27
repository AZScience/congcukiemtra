
"use client";

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  PlusCircle, Trash2, Edit, Cog, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, Copy, ArrowUpDown, ArrowUp, 
  ArrowDown, Filter, X, EllipsisVertical, Save, FolderArchive, Eye, FileDown, FileUp, CheckCircle2, Undo2, Ban, ListFilter,
  StickyNote, FilePenLine, FileText
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/page-header";
import { ClientOnly } from "@/components/client-only";
import { useLanguage } from "@/hooks/use-language";
import { useCollection, useFirestore } from "@/firebase";
import { collection, doc, setDoc, deleteDoc, writeBatch } from "firebase/firestore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import * as XLSX from 'xlsx';
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePermissions } from "@/hooks/use-permissions";
import type { IncidentCategory, Recognition } from '@/lib/types';
import { DataTableEmptyState } from "@/components/data-table-empty-state";

type DialogMode = 'add' | 'edit' | 'copy' | 'view';
interface RenderCat extends IncidentCategory { renderId: string; }

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
                        <Input placeholder={`${t('Lọc')}...`} value={filters[columnKey] || ''} onChange={(e) => handleFilterChange(columnKey, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') setOpenPopover(null); }} className="h-8 pl-8 text-xs" />
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

const AdvancedFilterDialog = ({ open, onOpenChange, filters, setFilters, recognitions, t }: any) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Bộ lọc nâng cao</DialogTitle><VisuallyHidden><DialogDescription>Lọc danh sách việc phát sinh</DialogDescription></VisuallyHidden></DialogHeader>
            <div className="grid gap-4 p-4">
                <div className="space-y-2"><Label className="flex items-center gap-2"><FolderArchive className="h-4 w-4 text-primary" /> Tên việc phát sinh</Label><Input value={filters.name || ''} onChange={e => setFilters({...filters, name: e.target.value})} placeholder="Nhập tên..." /></div>
                <div className="space-y-2">
                    <Label className="flex items-center gap-2"><FilePenLine className="h-4 w-4 text-primary" /> Việc ghi nhận</Label>
                    <Select value={filters.recognitionId || 'all'} onValueChange={v => setFilters({...filters, recognitionId: v === 'all' ? '' : v})}>
                        <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
                        <SelectContent><SelectItem value="all">Tất cả</SelectItem>{recognitions?.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setFilters({})}>Xóa tất cả</Button><Button onClick={() => onOpenChange(false)}>Áp dụng</Button></DialogFooter>
        </DialogContent>
    </Dialog>
);

const IncidentEditDialog = ({ open, onOpenChange, mode, formData, setFormData, recognitions, onSave, onUndo, isChanged, t }: any) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>{mode === 'view' ? t('Chi tiết') : (mode === 'add' ? t('Thêm mới') : t('Chỉnh sửa'))} {t('Việc phát sinh')}</DialogTitle>
                <VisuallyHidden><DialogDescription>Cấu hình việc phát sinh</DialogDescription></VisuallyHidden>
            </DialogHeader>
            <div className="grid gap-4 p-4">
                <div className="space-y-2"><Label className="flex items-center gap-2"><FilePenLine className="h-4 w-4 text-primary" />{t('Việc ghi nhận')} *</Label><Select value={formData.recognitionId || 'none'} onValueChange={v => setFormData({...formData, recognitionId: v === 'none' ? '' : v})} disabled={mode === 'view'}><SelectTrigger><SelectValue placeholder={t('Chọn việc ghi nhận...')} /></SelectTrigger><SelectContent><SelectItem value="none">---</SelectItem>{recognitions?.map((r: any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select></div>
                <div className="space-y-2"><Label className="flex items-center gap-2"><FolderArchive className="h-4 w-4 text-primary" />{t('Tên việc phát sinh')} *</Label><Input value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} disabled={mode === 'view'} /></div>
                <div className="space-y-2"><Label className="flex items-center gap-2"><StickyNote className="h-4 w-4 text-primary" />{t('Ghi chú')}</Label><Input value={formData.note || ''} onChange={e => setFormData({...formData, note: e.target.value})} disabled={mode === 'view'} /></div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={onUndo} disabled={!isChanged || mode === 'view'}><Undo2 className="mr-2 h-4 w-4" />{t('Hoàn tác')}</Button>
                {mode !== 'view' ? (
                    <Button onClick={onSave} disabled={!isChanged}><Save className="mr-2 h-4 w-4" /> {t('Lưu lại')}</Button>
                ) : (
                    <Button onClick={() => onOpenChange(false)}>{t('Đóng')}</Button>
                )}
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

export default function IncidentCategoriesPage() {
    const { t } = useLanguage();
    const firestore = useFirestore();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const catsRef = useMemo(() => (firestore ? collection(firestore, 'incident-categories') : null), [firestore]);
    const { data: rawCats, loading } = useCollection<IncidentCategory>(catsRef);
    const recognitionsRef = useMemo(() => (firestore ? collection(firestore, 'recognitions') : null), [firestore]);
    const { data: recognitions } = useCollection<Recognition>(recognitionsRef);
    
    const recognitionMap = useMemo(() => new Map((recognitions || []).map(r => [r.id, r.name])), [recognitions]);
    const permissions = usePermissions('/personnel/incident-categories');
    const data = useMemo(() => (rawCats || []).map((item, idx) => ({ ...item, renderId: `${item.id}-${idx}` })), [rawCats]);

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<RenderCat | null>(null);
    const [formData, setFormData] = useState<Partial<IncidentCategory>>({});
    const [initialFormState, setInitialFormState] = useState<Partial<IncidentCategory>>({});
    const [dialogMode, setDialogMode] = useState<DialogMode>('add');
    
    const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
    const [importingData, setImportingData] = useState<any[]>([]);
    const [isProcessingImport, setIsProcessingImport] = useState(false);

    const [currentPage, setCurrentPage] = useLocalStorage('inc_cat_page_v27', 1);
    const [rowsPerPage, setRowsPerPage] = useLocalStorage('inc_cat_rows_v27', 10);
    const [filters, setFilters] = useLocalStorage<any>('inc_cat_filters_v27', {});
    const [sortConfig, setSortConfig] = useLocalStorage<any[]>('inc_cat_sort_v27', []);
    const [openPopover, setOpenPopover] = useState<string | null>(null);
    const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>('inc_cat_colVis_v27', { recognitionId: true, name: true, note: true });

    const [selectedRowIds, setSelectedRowIds] = useLocalStorage<string[]>('inc_cat_selected_ids_v27', []);
    const selectedSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);

    const isChanged = useMemo(() => JSON.stringify(formData) !== JSON.stringify(initialFormState), [formData, initialFormState]);

    const filteredItems = useMemo(() => data.filter(item => Object.entries(filters).every(([k, v]) => {
        const val = k === 'recognitionId' ? (recognitionMap.get(item[k as keyof IncidentCategory] || '') || '') : String(item[k as keyof IncidentCategory] || '');
        return val.toLowerCase().includes(String(v).toLowerCase());
    })), [data, filters, recognitionMap]);

    const sortedItems = useMemo(() => {
        let items = [...filteredItems];
        if (sortConfig.length > 0) {
            const { key, direction } = sortConfig[0];
        items.sort((a: any, b: any) => {
            const aVal = (a as any)[key];
            const bVal = (b as any)[key];
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
        const data = item ? (mode === 'copy' ? { ...item, id: undefined } : { ...item }) : { name: '', recognitionId: '', note: '' };
        setFormData(data); setInitialFormState(data); setIsEditDialogOpen(true);
    };

    const handleSave = async () => {
        if (!firestore) return;
        const id = (dialogMode === 'edit' || dialogMode === 'view') && selectedItem ? selectedItem.id : (formData.id || doc(collection(firestore, 'incident-categories')).id);
        await setDoc(doc(firestore, "incident-categories", id), { ...formData, id }, { merge: true });
        setIsEditDialogOpen(false); toast({ title: t("Thành công") });
    };

    const handleImportFile = (e: any) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result; const wb = XLSX.read(bstr, { type: 'binary' });
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { range: 7 }); 
            setImportingData(data); setIsImportPreviewOpen(true);
        };
        reader.readAsBinaryString(file); e.target.value = '';
    };

    const processImport = async () => {
        if (!firestore) return; setIsProcessingImport(true);
        const batch = writeBatch(firestore);
        for (const row of importingData) {
            const getVal = (synonyms: string[]) => {
                const foundKey = Object.keys(row).find(x => synonyms.some(s => x.toLowerCase().replace(/\s+/g, '').includes(s.toLowerCase().replace(/\s+/g, ''))));
                return foundKey ? String((row as any)[foundKey] || '').trim() : '';
            };
            const recName = getVal(['Việc ghi nhận', 'Recognition']);
            const rec = recognitions?.find(r => r.name === recName);
            if (!rec) continue;
            const id = doc(collection(firestore, 'incident-categories')).id;
            batch.set(doc(firestore, 'incident-categories', id), { id, name: getVal(['Tên việc phát sinh', 'Tên', 'Category']), recognitionId: rec.id, note: getVal(['Ghi chú', 'Note']) }, { merge: true });
        }
        await batch.commit(); setIsProcessingImport(false); setIsImportPreviewOpen(false); toast({ title: "Import thành công" });
    };

    const handleExport = () => {
        const ws = XLSX.utils.json_to_sheet(sortedItems.map(item => ({ ...item, recognitionName: recognitionMap.get(item.recognitionId) }))); 
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "IncidentCats"); 
        XLSX.writeFile(wb, `DS_ViecPhatSinh_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    };

    const columnDefs: any = { recognitionId: 'Việc ghi nhận', name: 'Tên việc phát sinh', note: 'Ghi chú' };
    const colIcons: Record<string, any> = {
        recognitionId: FilePenLine,
        name: FolderArchive,
        note: FileText
    };
    const allColumns = Object.keys(columnDefs);
    const orderedColumns = allColumns.filter(k => columnVisibility[k]);

    return (
        <ClientOnly>
            <TooltipProvider>
                <PageHeader title={t("Bộ danh mục")} description={t("Quản lý việc phát sinh")} icon={FolderArchive} />
                <div className="p-4 md:p-6">
                    <Card>
                        <CardHeader className="py-3 border-b">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xl flex items-center gap-2"><FolderArchive className="h-6 w-6 text-primary" />{t('Việc phát sinh')}</CardTitle>
                                <div className="flex items-center gap-2">
                                    <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".xlsx,.xls" />
                                    <Tooltip><TooltipTrigger asChild><Button onClick={() => setIsAdvancedFilterOpen(true)} variant="ghost" size="icon" className="text-orange-500"><ListFilter className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Bộ lọc nâng cao')}</p></TooltipContent></Tooltip>
                                    
                                    {permissions.import && (
                                        <Tooltip><TooltipTrigger asChild><Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="icon" className="text-blue-600"><FileUp className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Nhập file Excel')}</p></TooltipContent></Tooltip>
                                    )}
                                    
                                    {permissions.export && (
                                        <Tooltip><TooltipTrigger asChild><Button onClick={handleExport} variant="ghost" size="icon" className="text-green-600"><FileDown className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Xuất file Excel')}</p></TooltipContent></Tooltip>
                                    )}
                                    
                                    {permissions.add && (
                                        <Tooltip><TooltipTrigger asChild><Button onClick={() => openDialog('add')} variant="ghost" size="icon" className="text-primary"><PlusCircle className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Thêm mới')}</p></TooltipContent></Tooltip>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-[#1877F2] hover:bg-[#1877F2]/90">
                                            <TableHead className="w-[80px] text-white font-bold text-base text-center border-r border-blue-300">#</TableHead>
                                            {orderedColumns.map(k => (
                                                <TableHead key={k} className="p-0 border-r border-blue-300 h-auto">
                                                    <ColumnHeader columnKey={k} title={columnDefs[k]} t={t} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={(k:any,d:any)=>setSortConfig([{key:k,direction:d}])} clearSort={() => setSortConfig([])} filters={filters} handleFilterChange={(k:any,v:any)=>{setFilters((p:any)=>({...p,[k]:v})); setCurrentPage(1);}} icon={colIcons[k]} />
                                                </TableHead>
                                            ))}
                                            <TableHead className="w-16 sticky right-0 z-20 bg-[#1877F2] shadow-[-2px_0_5px_rgba(0,0,0,0.1)] border-l border-blue-300 p-0 text-center">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-white hover:bg-white/20 rounded-none transition-colors"><Cog className="h-5 w-5" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                                                        <DropdownMenuLabel>{t('Hiển thị cột')}</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        {allColumns.map(k => (
                                                            <DropdownMenuCheckboxItem key={k} checked={columnVisibility[k]} onCheckedChange={(v) => setColumnVisibility(p => ({ ...p, [k]: !!v }))}>
                                                                {t(columnDefs[k])}
                                                            </DropdownMenuCheckboxItem>
                                                        ))}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow><TableCell colSpan={orderedColumns.length + 2} className="text-center h-24">{t('Đang tải...')}</TableCell></TableRow>
                                        ) : currentItems.length > 0 ? currentItems.map((item, idx) => {
                                            const isSelected = selectedSet.has(item.renderId);
                                            return (
                                                <TableRow 
                                                    key={item.renderId} 
                                                    onClick={() => handleRowClick(item.renderId)}
                                                    data-state={isSelected ? "selected" : ""}
                                                    className={cn(
                                                        "cursor-pointer transition-colors hover:bg-slate-50",
                                                        isSelected && "bg-blue-50/50"
                                                    )}
                                                >
                                                    <TableCell className="text-center font-medium text-slate-600 border-r">{startIndex + idx + 1}</TableCell>
                                                    {orderedColumns.map(columnKey => (
                                                        <TableCell key={columnKey} className="border-r max-w-[300px]">
                                                            {columnKey === 'recognitionId' ? (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                                                        <FilePenLine className="h-4 w-4" />
                                                                    </div>
                                                                    <span className="font-medium text-slate-700">{recognitionMap.get(item.recognitionId) || item.recognitionId || '---'}</span>
                                                                </div>
                                                            ) : columnKey === 'name' ? (
                                                                <span className="font-bold text-slate-800">{item.name}</span>
                                                            ) : (
                                                                <span className="text-slate-600 line-clamp-2">{(item as any)[columnKey] || '---'}</span>
                                                            )}
                                                        </TableCell>
                                                    ))}
                                                    <TableCell className="sticky right-0 z-10 bg-white/80 backdrop-blur-sm shadow-[-2px_0_5px_rgba(0,0,0,0.05)] border-l p-0 text-center">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary transition-colors"><EllipsisVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDialog('view', item); }}><Eye className="mr-2 h-4 w-4" /> Xem chi tiết</DropdownMenuItem>
                                                                {permissions.edit && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDialog('edit', item); }}><Edit className="mr-2 h-4 w-4" /> Chỉnh sửa</DropdownMenuItem>}
                                                                {permissions.add && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDialog('copy', item); }}><Copy className="mr-2 h-4 w-4" /> Nhân bản</DropdownMenuItem>}
                                                                {permissions.delete && <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedItem(item); setIsDeleteDialogOpen(true); }} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Xoá</DropdownMenuItem>}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        }) : (
                                            <DataTableEmptyState 
                                                colSpan={orderedColumns.length + 2} 
                                                icon={FolderArchive}
                                                title={t('Không tìm thấy việc phát sinh')}
                                                filters={filters}
                                                onClearFilters={() => {
                                                    setFilters({});
                                                    setCurrentPage(1);
                                                }}
                                            />
                                        )}

                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t">
                            <div className="text-sm text-muted-foreground">{t('Tổng cộng')} {sortedItems.length} {t('bản ghi')}. {selectedSet.size > 0 && `${t('Đã chọn')} ${selectedSet.size} ${t('dòng')}.`}</div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm text-muted-foreground">{t('Số dòng')}</p>
                                    <Select value={`${safeRowsPerPage}`} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                                        <SelectTrigger className="h-8 w-[70px]"><SelectValue placeholder={safeRowsPerPage} /></SelectTrigger>
                                        <SelectContent side="top">
                                            {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map(s => <SelectItem key={s} value={`${s}`}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-1">
                                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 p-0" onClick={()=>setCurrentPage(1)} disabled={safeCurrentPage===1}><ChevronsLeft className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent><p>{t('Trang đầu')}</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 p-0" onClick={()=>setCurrentPage(Math.max(1, safeCurrentPage-1))} disabled={safeCurrentPage===1}><ChevronLeft className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent><p>{t('Trang trước')}</p></TooltipContent></Tooltip>
                                    <div className="flex items-center gap-1 font-medium text-sm">
                                        <Tooltip><TooltipTrigger asChild><Input type="number" className="h-8 w-12 text-center" value={safeCurrentPage} onChange={e => { const p = parseInt(e.target.value); if(p > 0 && p <= totalPages) setCurrentPage(p); }} /></TooltipTrigger><TooltipContent><p>{t('Nhập số trang')}</p></TooltipContent></Tooltip>
                                        / {totalPages}
                                    </div>
                                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 p-0" onClick={()=>setCurrentPage(Math.min(totalPages, safeCurrentPage+1))} disabled={safeCurrentPage===totalPages}><ChevronRight className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent><p>{t('Trang sau')}</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 p-0" onClick={()=>setCurrentPage(totalPages)} disabled={safeCurrentPage===totalPages}><ChevronsRight className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent><p>{t('Trang cuối')}</p></TooltipContent></Tooltip>
                                </div>
                            </div>
                        </CardFooter>
                    </Card>
                </div>

                <AdvancedFilterDialog open={isAdvancedFilterOpen} onOpenChange={setIsAdvancedFilterOpen} filters={filters} setFilters={setFilters} recognitions={recognitions} t={t} />
                <IncidentEditDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} mode={dialogMode} formData={formData} setFormData={setFormData} recognitions={recognitions} onSave={handleSave} onUndo={() => setFormData(initialFormState)} isChanged={isChanged} t={t} />

                <Dialog open={isImportPreviewOpen} onOpenChange={setIsImportPreviewOpen}>
                    <DialogContent className="sm:max-w-4xl">
                        <DialogHeader><DialogTitle>{t('Xem trước Import')}</DialogTitle><VisuallyHidden><DialogDescription>Dữ liệu chuẩn bị nạp vào hệ thống</DialogDescription></VisuallyHidden></DialogHeader>
                        <ScrollArea className="max-h-[60vh] border rounded-md">
                            <Table><TableHeader><TableRow className="bg-muted/50"><TableHead className="w-[50px] text-center">STT</TableHead><TableHead>Việc ghi nhận</TableHead><TableHead>Tên việc phát sinh</TableHead></TableRow></TableHeader>
                            <TableBody>{importingData.map((r, i) => (
                                <TableRow key={i}>
                                    <TableCell className="text-center">{i+1}</TableCell>
                                    <TableCell>{String(r['Việc ghi nhận'] || '')}</TableCell>
                                    <TableCell className="font-bold">{String(r['Tên việc phát sinh'] || r['Tên'] || '')}</TableCell>
                                </TableRow>
                            ))}</TableBody></Table>
                        </ScrollArea>
                        <DialogFooter><Button variant="ghost" onClick={()=>setIsImportPreviewOpen(false)}>{t('Hủy bỏ')}</Button><Button onClick={processImport} disabled={isProcessingImport}>{isProcessingImport ? <Cog className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}{t('Xác nhận Import')}</Button></DialogFooter>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('Xác nhận xóa?')}</AlertDialogTitle><AlertDialogDescription>{t('Hành động này không thể hoàn tác.')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel><Ban className="mr-2 h-4 w-4" />{t('Bỏ qua')}</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={async ()=>{ if(selectedItem && firestore){ await deleteDoc(doc(firestore, "incident-categories", selectedItem.id)); toast({title: t("Thành công")}); } setIsDeleteDialogOpen(false);}}>{t('Xóa')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                </AlertDialog>
            </TooltipProvider>
        </ClientOnly>
    );
}
