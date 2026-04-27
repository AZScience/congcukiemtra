
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
import { useState, useMemo, useCallback, useRef } from 'react';
import { 
  PlusCircle, Trash2, Edit, Cog, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, Copy, ArrowUpDown, ArrowUp, 
  ArrowDown, Filter, X, EllipsisVertical, Save, DoorOpen, 
  Ban, Undo2, Eye, FileDown, FileUp, CheckCircle2, ListFilter,
  Building, Layout, Users, Table2, Files, Zap, Monitor, StickyNote, Activity, FileText
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import * as XLSX from 'xlsx';
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { usePermissions } from "@/hooks/use-permissions";
import type { Classroom, BuildingBlock } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTableEmptyState } from "@/components/data-table-empty-state";

type DialogMode = 'add' | 'edit' | 'copy' | 'view';
interface RenderRoom extends Classroom { renderId: string; }

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

const RoomEditDialog = ({ open, onOpenChange, mode, formData, setFormData, onSave, onUndo, isChanged, t, allBlocks }: any) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader><DialogTitle>{mode === 'view' ? t('Chi tiết') : mode === 'add' ? t('Thêm mới') : t('Chỉnh sửa')} {t('Phòng học')}</DialogTitle><VisuallyHidden><DialogDescription>Thông tin chi tiết phòng học</DialogDescription></VisuallyHidden></DialogHeader>
            <ScrollArea className="max-h-[75vh] p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2"><Label className="flex items-center gap-2"><DoorOpen className="h-4 w-4 text-primary" /> {t('Tên phòng')} *</Label><Input value={formData.name || ''} onChange={e => setFormData((p:any) => ({ ...p, name: e.target.value }))} disabled={mode === 'view'} /></div>
                    <div className="space-y-2"><Label className="flex items-center gap-2"><Building className="h-4 w-4 text-primary" /> {t('Dãy nhà')} *</Label><Select value={formData.buildingBlockId || 'none'} onValueChange={v => setFormData((p:any) => ({ ...p, buildingBlockId: v === 'none' ? '' : v }))} disabled={mode === 'view'}><SelectTrigger><SelectValue placeholder={t('Chọn dãy nhà...')} /></SelectTrigger><SelectContent><SelectItem value="none">---</SelectItem>{(allBlocks || []).map((b:any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label className="flex items-center gap-2"><Layout className="h-4 w-4 text-primary" /> {t('Loại phòng')}</Label><Select value={formData.roomType || 'Lý thuyết'} onValueChange={v => setFormData((p:any) => ({ ...p, roomType: v }))} disabled={mode === 'view'}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Lý thuyết">Lý thuyết</SelectItem><SelectItem value="Thực hành">Thực hành</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2"><Label className="flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> {t('Số chỗ ngồi')}</Label><Input type="number" value={formData.seatingCapacity || ''} onChange={e => setFormData((p:any) => ({ ...p, seatingCapacity: Number(e.target.value) }))} disabled={mode === 'view'} /></div>
                    <div className="space-y-2"><Label className="flex items-center gap-2"><Table2 className="h-4 w-4 text-primary" /> {t('Số bàn')}</Label><Input type="number" value={formData.tableCount || ''} onChange={e => setFormData((p:any) => ({ ...p, tableCount: Number(e.target.value) }))} disabled={mode === 'view'} /></div>
                    <div className="space-y-2"><Label className="flex items-center gap-2"><Files className="h-4 w-4 text-primary" /> {t('Số chỗ thi')}</Label><Input type="number" value={formData.examCapacity || ''} onChange={e => setFormData((p:any) => ({ ...p, examCapacity: Number(e.target.value) }))} disabled={mode === 'view'} /></div>
                    <div className="space-y-2"><Label className="flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> {t('Tính chất môn học')}</Label><Input value={formData.subjectNature || ''} onChange={e => setFormData((p:any) => ({ ...p, subjectNature: e.target.value }))} disabled={mode === 'view'} /></div>
                    <div className="flex items-center justify-between p-2 border rounded-md h-10 mt-auto"><Label className="flex items-center gap-2"><Monitor className="h-4 w-4 text-primary" /> {t('Máy chiếu')}</Label><Switch checked={formData.hasProjector || false} onCheckedChange={v => setFormData((p:any) => ({...p, hasProjector: v}))} disabled={mode === 'view'} /></div>
                    <div className="flex items-center justify-between p-2 border rounded-md h-10 mt-auto"><Label className="flex items-center gap-2 text-destructive"><Ban className="h-4 w-4 text-destructive" /> {t('Ngưng sử dụng')}</Label><Switch checked={formData.isInactive || false} onCheckedChange={v => setFormData((p:any) => ({...p, isInactive: v}))} disabled={mode === 'view'} /></div>
                    <div className="md:col-span-2 lg:col-span-3 space-y-2"><Label className="flex items-center gap-2"><StickyNote className="h-4 w-4 text-primary" /> {t('Ghi chú')}</Label><Input value={formData.note || ''} onChange={e => setFormData((p:any) => ({ ...p, note: e.target.value }))} disabled={mode === 'view'} /></div>
                </div>
            </ScrollArea>
            <DialogFooter className="p-6 pt-0"><Button variant="outline" onClick={onUndo} disabled={!isChanged || mode === 'view'}><Undo2 className="mr-2 h-4 w-4" />{t('Hoàn tác')}</Button>{mode !== 'view' ? (<Button onClick={onSave} disabled={!isChanged}><Save className="mr-2 h-4 w-4" />{t('Lưu lại')}</Button>) : (<Button onClick={() => onOpenChange(false)}>{t('Đóng')}</Button>)}</DialogFooter>
        </DialogContent>
    </Dialog>
);

const AdvancedFilterDialog = ({ open, onOpenChange, filters, setFilters, t, allBlocks }: any) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Bộ lọc nâng cao</DialogTitle><VisuallyHidden><DialogDescription>Lọc danh sách phòng học</DialogDescription></VisuallyHidden></DialogHeader>
            <div className="grid gap-4 p-4">
                <div className="space-y-2"><Label className="flex items-center gap-2"><DoorOpen className="h-4 w-4 text-primary" /> Tên phòng</Label><Input value={filters.name || ''} onChange={e => setFilters({...filters, name: e.target.value})} placeholder="Nhập tên..." /></div>
                <div className="space-y-2">
                    <Label className="flex items-center gap-2"><Building className="h-4 w-4 text-primary" /> Dãy nhà</Label>
                    <Select value={filters.buildingBlockId || 'all'} onValueChange={v => setFilters({...filters, buildingBlockId: v === 'all' ? '' : v})}>
                        <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
                        <SelectContent><SelectItem value="all">Tất cả</SelectItem>{allBlocks?.map((b:any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setFilters({})}>Xóa tất cả</Button><Button onClick={() => onOpenChange(false)}>Áp dụng</Button></DialogFooter>
        </DialogContent>
    </Dialog>
);

export default function ClassroomsPage() {
    const { t } = useLanguage();
    const firestore = useFirestore();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const classroomsRef = useMemo(() => (firestore ? collection(firestore, 'classrooms') : null), [firestore]);
    const blocksRef = useMemo(() => (firestore ? collection(firestore, 'building-blocks') : null), [firestore]);
    const { permissions, loading: permsLoading, error: permsError } = usePermissions('/personnel/classrooms');
    const { data: classroomsData, loading: dataLoading, error: dataError } = useCollection<Classroom>(classroomsRef);
    const { data: allBuildingBlocks } = useCollection<BuildingBlock>(blocksRef);

    const blockMap = useMemo(() => {
        const map = new Map<string, string>();
        (allBuildingBlocks || []).forEach(b => map.set(b.id, b.name));
        return map;
    }, [allBuildingBlocks]);

    const loading = permsLoading || dataLoading;
    const error = permsError || dataError;

    const data = useMemo(() => (classroomsData || []).map((item: Classroom, idx: number) => ({ ...item, renderId: `${item.id || 'no-id'}-${idx}` })) as RenderRoom[], [classroomsData]);

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<RenderRoom | null>(null);
    const [formData, setFormData] = useState<Partial<Classroom>>({});
    const [initialFormState, setInitialFormState] = useState<Partial<Classroom>>({});
    const { toast } = useToast();
    const [dialogMode, setDialogMode] = useState<DialogMode>('add');
    
    const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
    const [importingData, setImportingData] = useState<any[]>([]);
    const [isProcessingImport, setIsProcessingImport] = useState(false);

    const [currentPage, setCurrentPage] = useLocalStorage('classrooms_page_v27', 1);
    const [rowsPerPage, setRowsPerPage] = useLocalStorage('classrooms_rows_v27', 10);
    const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>('classrooms_colVis_v27', { name: true, buildingBlockId: true, roomType: true, seatingCapacity: true, tableCount: false, examCapacity: false, isInactive: true, note: true });
    const [filters, setFilters] = useLocalStorage<any>('classrooms_filters_v27', {});
    const [sortConfig, setSortConfig] = useLocalStorage<any[]>('classrooms_sort_v27', []);
    const [openPopover, setOpenPopover] = useState<string | null>(null);
    const [selectedRowIds, setSelectedRowIds] = useLocalStorage<string[]>('classrooms_selected_ids_v27', []);
    const selectedSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);

    const isChanged = useMemo(() => JSON.stringify(formData) !== JSON.stringify(initialFormState), [formData, initialFormState]);

    const filteredItems = useMemo(() => data.filter(item => Object.entries(filters).every(([k, v]) => {
        const val = k === 'buildingBlockId' ? (blockMap.get(item.buildingBlockId) || item.buildingBlockId) : String(item[k as keyof Classroom] || '');
        return val.toLowerCase().includes(String(v).toLowerCase());
    })), [data, filters, blockMap]);

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
        const data = item ? (mode === 'copy' ? { ...item, id: undefined, name: `${item.name} (Copy)` } : { ...item }) : { name: '', isInactive: false, hasProjector: true, roomType: 'Lý thuyết' };
        setFormData(data); setInitialFormState(data); setIsEditDialogOpen(true);
    };

    const handleSave = async () => {
        if (!firestore) return;
        const id = (dialogMode === 'edit' || dialogMode === 'view') && selectedItem ? selectedItem.id : (formData.id || doc(collection(firestore, 'classrooms')).id);
        await setDoc(doc(firestore, "classrooms", id), { ...formData, id }, { merge: true });
        setIsEditDialogOpen(false); toast({ title: t("Thành công") });
    };

    const handleImportFile = (e: any) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const wb = XLSX.read(evt.target?.result, { type: 'binary' });
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { range: 7 }); 
            setImportingData(data); setIsImportPreviewOpen(true);
        };
        reader.readAsBinaryString(file); e.target.value = '';
    };

    const processImport = async () => {
        if (!firestore) return; setIsProcessingImport(true);
        const batch = writeBatch(firestore);
        for (const row of importingData) {
            const id = doc(collection(firestore, 'classrooms')).id;
            batch.set(doc(firestore, 'classrooms', id), { id, name: String(row['Tên phòng'] || ''), buildingBlockId: String(row['Dãy nhà'] || ''), roomType: String(row['Loại phòng'] || 'Lý thuyết'), seatingCapacity: Number(row['Số chỗ ngồi'] || 0), tableCount: Number(row['Số bàn'] || 0), examCapacity: Number(row['Số chỗ thi'] || 0), note: String(row['Ghi chú'] || ''), isInactive: false }, { merge: true });
        }
        await batch.commit(); setIsProcessingImport(false); setIsImportPreviewOpen(false); toast({ title: "Import thành công" });
    };

    const handleExport = () => {
        const ws = XLSX.utils.json_to_sheet(sortedItems.map(item => ({ ...item, buildingBlockName: blockMap.get(item.buildingBlockId) || item.buildingBlockId }))); 
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Classrooms"); 
        XLSX.writeFile(wb, `DS_PhongHoc_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    };

    const columnDefs: any = { name: 'Tên phòng', buildingBlockId: 'Dãy nhà', roomType: 'Loại phòng', seatingCapacity: 'Số chỗ ngồi', tableCount: 'Số bàn', examCapacity: 'Số chỗ thi', subjectNature: 'Tính chất môn', hasProjector: 'Máy chiếu', isInactive: 'Trạng thái', note: 'Ghi chú' };
    const colIcons: Record<string, any> = {
        name: DoorOpen,
        buildingBlockId: Building,
        roomType: Layout,
        seatingCapacity: Users,
        tableCount: Table2,
        examCapacity: Files,
        subjectNature: Zap,
        hasProjector: Monitor,
        isInactive: Activity,
        note: FileText
    };
    const allColumns = Object.keys(columnDefs);
    const orderedColumns = allColumns.filter(k => columnVisibility[k]);

    return (
        <ClientOnly>
            <TooltipProvider>
                <PageHeader title={t("Bộ danh mục")} description={t("Quản lý phòng học")} icon={DoorOpen} />
                <div className="p-4 md:p-6">
                    <Card>
                        <CardHeader className="py-3 border-b">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xl flex items-center gap-2"><DoorOpen className="h-6 w-6 text-primary" />{t('Danh sách Phòng học')}</CardTitle>
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
                                            <TableHead className="w-16 text-center text-white font-bold text-base">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:text-white hover:bg-blue-700"><Cog className="h-5 w-5" /></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                                                        <DropdownMenuLabel>{t('Hiển thị cột')}</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        {allColumns.map(k => <DropdownMenuCheckboxItem key={k} checked={columnVisibility[k]} onCheckedChange={(v) => setColumnVisibility(p => ({...p, [k]: !!v}))}>{t(columnDefs[k])}</DropdownMenuCheckboxItem>)}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow>
                                                <TableCell colSpan={orderedColumns.length + 2} className="text-center h-40">
                                                    <div className="flex flex-col items-center justify-center gap-2">
                                                        <Cog className="h-8 w-8 animate-spin text-primary opacity-50" />
                                                        <p className="text-muted-foreground animate-pulse">{t('Đang tải dữ liệu...')}</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : error ? (
                                            <TableRow>
                                                <TableCell colSpan={orderedColumns.length + 2} className="text-center h-40">
                                                    <div className="flex flex-col items-center justify-center gap-2 text-destructive">
                                                        <Ban className="h-8 w-8 opacity-50" />
                                                        <p className="font-bold">{t('Lỗi truy cập dữ liệu')}</p>
                                                        <p className="text-xs opacity-70">{error.message}</p>
                                                        <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-2">
                                                            <Undo2 className="mr-2 h-4 w-4" /> {t('Thử lại')}
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : !permissions.view ? (
                                            <TableRow>
                                                <TableCell colSpan={orderedColumns.length + 2} className="text-center h-40">
                                                    <div className="flex flex-col items-center justify-center gap-2 text-orange-500">
                                                        <Ban className="h-8 w-8 opacity-50" />
                                                        <p className="font-bold">{t('Hạn chế quyền truy cập')}</p>
                                                        <p className="text-sm opacity-70">{t('Bạn không có quyền xem dữ liệu trong danh mục này.')}</p>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : currentItems.length > 0 ? currentItems.map((item, idx) => (
                                            <TableRow 
                                                key={item.renderId} 
                                                className={cn("cursor-pointer transition-colors hover:bg-slate-50", selectedSet.has(item.renderId) && "bg-blue-50/50")}
                                                onClick={() => handleRowClick(item.renderId)}
                                            >
                                                <TableCell className="text-center font-medium text-slate-600 border-r">{startIndex + idx + 1}</TableCell>
                                                {orderedColumns.map(columnKey => (
                                                    <TableCell key={columnKey} className="border-r max-w-[300px]">
                                                        {columnKey === 'name' ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                                                    <DoorOpen className="h-4 w-4" />
                                                                </div>
                                                                <span className="font-bold text-slate-800">{item.name}</span>
                                                            </div>
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
                                        )) : (
                                            <DataTableEmptyState 
                                                colSpan={orderedColumns.length + 2} 
                                                icon={DoorOpen}
                                                title={t('Không tìm thấy phòng học')}
                                                filters={filters}
                                                onClearFilters={() => setFilters({})}
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
                                            {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((s) => (<SelectItem key={s} value={`${s}`}>{s}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={()=>setCurrentPage(1)} disabled={safeCurrentPage===1}><ChevronsLeft className="h-4 w-4"/></Button>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={()=>setCurrentPage(Math.max(1, safeCurrentPage-1))} disabled={safeCurrentPage===1}><ChevronLeft className="h-4 w-4"/></Button>
                                    <div className="flex items-center gap-1 font-medium text-sm"><Input type="number" className="h-8 w-12 text-center" value={safeCurrentPage} onChange={e => { const p = parseInt(e.target.value); if(p > 0 && p <= totalPages) setCurrentPage(p); }} />/ {totalPages}</div>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={()=>setCurrentPage(Math.min(totalPages, safeCurrentPage+1))} disabled={safeCurrentPage===totalPages}><ChevronRight className="h-4 w-4"/></Button>
                                    <Button variant="outline" size="icon" className="h-8 w-8 p-0" onClick={()=>setCurrentPage(totalPages)} disabled={safeCurrentPage===totalPages}><ChevronsRight className="h-4 w-4"/></Button>
                                </div>
                            </div>
                        </CardFooter>
                    </Card>
                </div>

                <AdvancedFilterDialog open={isAdvancedFilterOpen} onOpenChange={setIsAdvancedFilterOpen} filters={filters} setFilters={setFilters} t={t} allBlocks={allBuildingBlocks} />
                <RoomEditDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} mode={dialogMode} formData={formData} setFormData={setFormData} onSave={handleSave} onUndo={() => setFormData(initialFormState)} isChanged={isChanged} t={t} allBlocks={allBuildingBlocks} />

                <Dialog open={isImportPreviewOpen} onOpenChange={setIsImportPreviewOpen}>
                    <DialogContent className="sm:max-w-4xl"><DialogHeader><DialogTitle>Xem trước Import</DialogTitle></DialogHeader>
                        <ScrollArea className="max-h-[60vh] border rounded-md"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead>Tên phòng</TableHead><TableHead>Dãy nhà</TableHead></TableRow></TableHeader><TableBody>{importingData.map((r, i) => (<TableRow key={i}><TableCell className="font-bold">{String(r['Tên phòng'] || '')}</TableCell><TableCell>{String(r['Dãy nhà'] || '')}</TableCell></TableRow>))}</TableBody></Table></ScrollArea>
                        <DialogFooter><Button variant="ghost" onClick={()=>setIsImportPreviewOpen(false)}>Hủy</Button><Button onClick={processImport} disabled={isProcessingImport}>{isProcessingImport ? <Cog className="mr-2 h-4 w-4 animate-spin"/> : "Xác nhận"}</Button></DialogFooter>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={async ()=>{ if(selectedItem && firestore){ await deleteDoc(doc(firestore, "classrooms", selectedItem.id)); toast({title: t("Thành công")}); } setIsDeleteDialogOpen(false);}}>Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
            </TooltipProvider>
        </ClientOnly>
    );
}
