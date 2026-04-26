"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState, useMemo, useCallback } from 'react';
import { format } from "date-fns";
import { 
  PlusCircle, Trash2, Edit, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, Copy, ArrowUpDown, ArrowUp, 
  ArrowDown, Filter, X, EllipsisVertical, Save, Undo2, 
  CheckCircle2, Eye, MapPin, Image as ImageIcon, Map, CalendarClock,
  Library, User, Clock, ChevronDown, ChevronUp, Activity, Cog, Hash, GraduationCap, Users, FileText, MessageSquare
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/page-header";
import { ClientOnly } from "@/components/client-only";
import { useLanguage } from "@/hooks/use-language";
import { useCollection, useFirestore } from "@/firebase";
import { collection, doc, setDoc, deleteDoc, query, where, getDocs, updateDoc } from "firebase/firestore";
import { VisuallyHidden } from "@/components/ui/visually-hidden";

type DialogMode = 'view' | 'edit';

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

export default function ExternalCheckinsPage() {
    const { t } = useLanguage();
    const { toast } = useToast();
    const firestore = useFirestore();

    // Lấy dữ liệu từ collection external_checkins
    const checkinsRef = useMemo(() => firestore ? collection(firestore, 'external_checkins') : null, [firestore]);
    const { data: rawData, loading } = useCollection(checkinsRef);
    const records = useMemo(() => {
        return rawData?.map((item: any) => ({
            ...item,
            renderId: item.id || Math.random().toString()
        })) || [];
    }, [rawData]);

    const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
    const [dialogMode, setDialogMode] = useState<DialogMode>('view');
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    
    // Form state để duyệt
    const [reviewStatus, setReviewStatus] = useState<string>('pending_review');
    const [isDetailCollapsed, setIsDetailCollapsed] = useState(true);
    const [fullImage, setFullImage] = useState<string | null>(null);

    // Table settings
    const [sortConfig, setSortConfig] = useLocalStorage<{ key: string, direction: 'ascending' | 'descending' }[]>('checkins_sort_v1', []);
    const [rowsPerPage, setRowsPerPage] = useLocalStorage('checkins_rowsPerPage_v1', '10');
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useLocalStorage<Record<string, string>>('checkins_filters_v1', {});
    const [openPopover, setOpenPopover] = useState<string | null>(null);
    const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>('checkins_col_vis_v1', {
        timestamp: true, room: true, period: true, classId: true, studentCount: true, 
        actualStudentCount: true, submittedBy: true, className: true, status: true, incident: true, isNotification: true, incidentDetail: true
    });

    const columnDefs: Record<string, string> = {
        timestamp: 'Thời gian',
        room: 'Phòng',
        period: 'Tiết',
        classId: 'Lớp',
        studentCount: 'Sĩ số',
        actualStudentCount: 'SV tham gia',
        submittedBy: 'Giảng viên',
        className: 'Môn học',
        incident: 'Việc phát sinh',
        isNotification: 'Thông báo',
        incidentDetail: 'Chi tiết sự việc',
        status: 'Tình trạng',
    };

    const colIcons: Record<string, any> = {
        timestamp: CalendarClock,
        room: MapPin,
        period: Hash,
        classId: GraduationCap,
        studentCount: Users,
        actualStudentCount: Users,
        submittedBy: User,
        className: Library,
        incident: Activity,
        isNotification: MessageSquare,
        incidentDetail: FileText,
        status: CheckCircle2,
    };

    const allColumns = Object.keys(columnDefs);
    const orderedColumns = allColumns.filter(key => columnVisibility[key]);

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => value ? { ...prev, [key]: value } : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)));
        setCurrentPage(1);
    };

    const requestSort = (key: string, direction: 'ascending' | 'descending') => {
        setSortConfig([{ key, direction }]);
        setOpenPopover(null);
    };

    const filteredItems = useMemo(() => {
        return records.filter((item: any) => {
            return Object.entries(filters).every(([key, value]) => String((item as any)[key] ?? '').toLowerCase().includes(String(value).toLowerCase()));
        });
    }, [records, filters]);

    const sortedItems = useMemo(() => {
        let items = [...filteredItems];
        if (sortConfig.length > 0) {
            const { key, direction } = sortConfig[0];
            items.sort((a: any, b: any) => {
                const aVal = a[key]; const bVal = b[key];
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;
                if (String(aVal) < String(bVal)) return direction === 'ascending' ? -1 : 1;
                if (String(aVal) > String(bVal)) return direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [filteredItems, sortConfig]);

    const safeRowsPerPage = Math.max(1, Number(rowsPerPage));
    const totalPages = Math.max(1, Math.ceil(sortedItems.length / safeRowsPerPage));
    const safeCurrentPage = Math.min(Math.max(1, Number(currentPage)), totalPages);
    const startIndex = (safeCurrentPage - 1) * safeRowsPerPage;
    const currentItems = sortedItems.slice(startIndex, startIndex + safeRowsPerPage);

    const openDialog = (item: any) => {
        setDialogMode('view');
        setSelectedItem(item);
        setReviewStatus(item.status || 'pending_review');
        setIsEditDialogOpen(true);
    };

    const handleSaveReview = async () => {
        if (!firestore || !selectedItem) return;
        try {
            // 1. Cập nhật trạng thái của bản check-in
            await setDoc(doc(firestore, "external_checkins", selectedItem.id), { status: reviewStatus }, { merge: true });

            // 2. Nếu được duyệt (approved), đồng bộ dữ liệu sang bảng schedules (Thực hành ngoài)
            if (reviewStatus === 'approved') {
                const schedulesRef = collection(firestore, 'schedules');
                // Tìm schedule khớp với mã lớp và ngày
                const q = query(
                    schedulesRef, 
                    where('class', '==', selectedItem.classId),
                    where('date', '==', selectedItem.scheduleDate)
                );
                
                const querySnapshot = await getDocs(q);
                
                if (!querySnapshot.empty) {
                    const scheduleDoc = querySnapshot.docs[0];
                    await updateDoc(doc(firestore, 'schedules', scheduleDoc.id), {
                        recognitionDate: format(new Date(), 'yyyy-MM-dd'),
                        employee: 'Hệ thống (Duyệt Check-in)', // Hoặc tên người duyệt nếu có auth
                        incident: selectedItem.incident || '',
                        isNotification: selectedItem.isNotification || false,
                        incidentDetail: selectedItem.incidentDetail || '',
                        actualStudentCount: selectedItem.actualStudentCount || '',
                        photoUrls: selectedItem.photoUrls || (selectedItem.photoUrl ? [selectedItem.photoUrl] : []),
                        note: `Đã duyệt từ tọa độ: ${selectedItem.location?.latitude}, ${selectedItem.location?.longitude}`
                    });
                }
            }

            setIsEditDialogOpen(false);
            toast({ title: t('Đã lưu kết quả và đồng bộ dữ liệu!') });
        } catch (error: any) {
            console.error("Sync Error:", error);
            toast({ title: t('Lỗi đồng bộ'), description: error.message, variant: 'destructive' });
        }
    };

    const handleDelete = async (items: string[]) => {
        if (!firestore || items.length === 0) return;
        if (confirm(t('Bạn có chắc chắn muốn xóa bản ghi này?'))) {
            try {
                await Promise.all(items.map(id => deleteDoc(doc(firestore, "external_checkins", id))));
                setSelectedRowIds([]);
                toast({ title: t('Xóa thành công') });
            } catch (error: any) {
                toast({ title: t('Lỗi'), description: error.message, variant: 'destructive' });
            }
        }
    };

    const formatTimestamp = (ts: any) => {
        if (!ts) return 'N/A';
        // Xử lý object timestamp của Firebase
        if (ts.seconds) {
            return new Date(ts.seconds * 1000).toLocaleString('vi-VN');
        }
        return new Date(ts).toLocaleString('vi-VN');
    };

    const renderStatus = (status: string) => {
        switch (status) {
            case 'approved': return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Đã duyệt</Badge>;
            case 'rejected': return <Badge variant="destructive">Từ chối</Badge>;
            default: return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Chờ duyệt</Badge>;
        }
    };

    return (
        <ClientOnly>
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <PageHeader 
                    title={t("Giám sát thực hành")} 
                    description={t("Kiểm duyệt minh chứng vị trí và hình ảnh từ cổng check-in của Giảng viên")} 
                />

                <Card className="border-t-4 border-t-blue-600 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-semibold">{t('Danh sách Minh chứng Check-in')}</CardTitle>
                        <div className="flex items-center gap-2">
                            {selectedRowIds.length > 0 && (
                                <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedRowIds)}>
                                    <Trash2 className="mr-2 h-4 w-4" /> {t('Xóa')} ({selectedRowIds.length})
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border border-blue-200 overflow-x-auto shadow-sm">
                            <Table className="min-w-[1400px]">
                                <TableHeader className="bg-[#1877F2]">
                                    <TableRow className="hover:bg-[#1877F2]">
                                        <TableHead className="w-[50px] text-center text-white font-bold p-2">#</TableHead>
                                        <TableHead className="w-[40px] text-center text-white font-bold p-2">
                                            <input type="checkbox" onChange={(e) => setSelectedRowIds(e.target.checked ? currentItems.map((i: any) => i.renderId) : [])} checked={currentItems.length > 0 && selectedRowIds.length === currentItems.length} className="w-4 h-4 rounded border-white" />
                                        </TableHead>
                                        {orderedColumns.map(key => (
                                            <TableHead key={key} className="p-0 border-l border-blue-400">
                                                <ColumnHeader columnKey={key} title={columnDefs[key]} t={t} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={() => setSortConfig([])} filters={filters} handleFilterChange={handleFilterChange} icon={colIcons[key]} />
                                            </TableHead>
                                        ))}
                                        <TableHead className="w-16 sticky right-0 z-20 bg-[#1877F2] shadow-[-2px_0_5px_rgba(0,0,0,0.1)] border-l border-blue-400 p-0 text-center">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-10 w-10 text-white hover:bg-white/20 rounded-none transition-colors">
                                                        <Cog className="h-5 w-5" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                                                    <div className="p-2 font-bold text-xs uppercase text-slate-500">Hiển thị cột</div>
                                                    <DropdownMenuSeparator />
                                                    {allColumns.map(key => (
                                                        <DropdownMenuCheckboxItem 
                                                            key={key} 
                                                            checked={columnVisibility[key]} 
                                                            onCheckedChange={(v) => setColumnVisibility(p => ({...p, [key]: !!v}))}
                                                        >
                                                            {t(columnDefs[key])}
                                                        </DropdownMenuCheckboxItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={8} className="h-32 text-center">{t('Đang tải dữ liệu...')}</TableCell></TableRow>
                                    ) : currentItems.length === 0 ? (
                                        <TableRow><TableCell colSpan={8} className="h-32 text-center text-muted-foreground">{t('Không tìm thấy bản ghi nào')}</TableCell></TableRow>
                                    ) : (
                                        currentItems.map((item: any, index: number) => (
                                            <TableRow key={item.renderId} className={cn("hover:bg-blue-50 transition-colors", selectedRowIds.includes(item.renderId) && "bg-blue-50")}>
                                                <TableCell className="text-center font-medium border-r border-slate-200">{startIndex + index + 1}</TableCell>
                                                <TableCell className="text-center border-r border-slate-200">
                                                    <input type="checkbox" checked={selectedRowIds.includes(item.renderId)} onChange={(e) => setSelectedRowIds(prev => e.target.checked ? [...prev, item.renderId] : prev.filter(id => id !== item.renderId))} className="w-4 h-4 rounded border-gray-300" />
                                                </TableCell>
                                                
                                                {orderedColumns.map(key => {
                                                    if (key === 'timestamp') return <TableCell key={key} className="border-r border-slate-200 text-center">{formatTimestamp(item.timestamp)}</TableCell>;
                                                    if (key === 'room') return <TableCell key={key} className="border-r border-slate-200 text-center font-bold">{item.room}</TableCell>;
                                                    if (key === 'period') return <TableCell key={key} className="border-r border-slate-200 text-center">{item.period}</TableCell>;
                                                    if (key === 'classId') return <TableCell key={key} className="border-r border-slate-200 text-center font-bold text-blue-700">{item.classId}</TableCell>;
                                                    if (key === 'studentCount') return <TableCell key={key} className="border-r border-slate-200 text-center font-medium">{item.studentCount}</TableCell>;
                                                    if (key === 'actualStudentCount') return <TableCell key={key} className="border-r border-slate-200 text-center font-bold text-green-700">{item.actualStudentCount}</TableCell>;
                                                    if (key === 'submittedBy') return (
                                                        <TableCell key={key} className="border-r border-slate-200 font-medium">
                                                            {item.submittedBy}
                                                            <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                                                                <MapPin className="h-2.5 w-2.5" /> Lat: {item.location?.latitude?.toFixed(4)}, Lng: {item.location?.longitude?.toFixed(4)}
                                                            </div>
                                                        </TableCell>
                                                    );
                                                    if (key === 'className') return <TableCell key={key} className="border-r border-slate-200 font-medium">{item.className}</TableCell>;
                                                    if (key === 'status') return <TableCell key={key} className="text-center border-r border-slate-200">{renderStatus(item.status)}</TableCell>;
                                                    if (key === 'incident') return (
                                                        <TableCell key={key} className="border-r border-slate-200 text-center">
                                                            {item.incident && item.incident !== 'none' && <Badge variant="destructive" className="text-[10px]">{item.incident}</Badge>}
                                                        </TableCell>
                                                    );
                                                    if (key === 'isNotification') return (
                                                        <TableCell key={key} className="border-r border-slate-200 text-center">
                                                            {item.isNotification ? <Badge className="bg-blue-600 text-[10px] h-5">Có</Badge> : <Badge variant="outline" className="text-[10px] h-5">Không</Badge>}
                                                        </TableCell>
                                                    );
                                                    if (key === 'incidentDetail') return (
                                                        <TableCell key={key} className="border-r border-slate-200 text-xs text-slate-600 max-w-[150px] truncate" title={item.incidentDetail}>
                                                            {item.incidentDetail}
                                                        </TableCell>
                                                    );
                                                    return <TableCell key={key} className="border-r border-slate-200">{(item as any)[key]}</TableCell>;
                                                })}

                                                <TableCell className="sticky right-0 z-20 bg-inherit shadow-[-2px_0_5px_rgba(0,0,0,0.05)] border-l text-center p-2">
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" onClick={() => openDialog(item)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100">
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent><p>{t('Xem & Duyệt')}</p></TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        
                        {/* Pagination Footer */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <span>{t('Hiển thị')}</span>
                                <Select value={rowsPerPage} onValueChange={setRowsPerPage}>
                                    <SelectTrigger className="h-8 w-[70px] bg-white"><SelectValue placeholder="10" /></SelectTrigger>
                                    <SelectContent>
                                        {[10, 20, 50, 100].map(v => <SelectItem key={v} value={v.toString()}>{v}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                                <span>{t('dòng / trang')}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="hidden sm:inline-block">Trang {safeCurrentPage} / {totalPages} ({sortedItems.length} bản ghi)</span>
                                <div className="flex items-center gap-1">
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safeCurrentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safeCurrentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages}><ChevronsRight className="h-4 w-4" /></Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Xem & Duyệt Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="sm:max-w-2xl bg-slate-50">
                    <DialogHeader>
                        <DialogTitle className="text-xl text-blue-800 flex items-center gap-2">
                            <MapPin className="h-5 w-5" /> Minh chứng Check-in Thực hành
                        </DialogTitle>
                        <VisuallyHidden><DialogDescription>Duyệt minh chứng</DialogDescription></VisuallyHidden>
                    </DialogHeader>

                    {selectedItem && (
                        <div className="space-y-4 py-2">
                            {/* Thông tin chính - Luôn hiện */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                                <div className="md:col-span-2">
                                    <Label className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1 mb-1">
                                        <Library className="h-3 w-3 text-blue-600" /> Lớp học
                                    </Label>
                                    <p className="font-semibold text-sm leading-tight text-blue-900">{selectedItem.className}</p>
                                </div>
                                <div>
                                    <Label className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1 mb-1">
                                        <User className="h-3 w-3 text-indigo-600" /> Giảng viên / Người gửi
                                    </Label>
                                    <p className="font-semibold text-sm">{selectedItem.submittedBy}</p>
                                </div>
                                <div className="pt-2 border-t md:border-t-0">
                                    <Label className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1 mb-1">
                                        <Clock className="h-3 w-3 text-amber-600" /> Thời gian gửi
                                    </Label>
                                    <p className="font-semibold text-sm flex items-center gap-1">
                                        <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                                        {formatTimestamp(selectedItem.timestamp)}
                                    </p>
                                </div>
                                <div className="pt-2 border-t md:border-t-0">
                                    <Label className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1 mb-1">
                                        <Activity className="h-3 w-3 text-purple-600" /> Việc phát sinh
                                    </Label>
                                    <Badge variant={selectedItem.incident ? "destructive" : "outline"} className="text-[10px] py-0 h-5">
                                        {selectedItem.incident || "Không có"}
                                    </Badge>
                                </div>
                            </div>

                            {/* Minh chứng & Vị trí - Mặc định thu gọn */}
                            <div className={cn("border rounded-lg overflow-hidden transition-all duration-300", 
                                isDetailCollapsed ? "bg-slate-100/50 border-slate-200" : "bg-white border-blue-200 shadow-md")}>
                                <div 
                                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-100 transition-colors"
                                    onClick={() => setIsDetailCollapsed(!isDetailCollapsed)}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={cn("p-1.5 rounded-full", isDetailCollapsed ? "bg-slate-200" : "bg-blue-100 text-blue-600")}>
                                            <ImageIcon className="h-4 w-4" />
                                        </div>
                                        <span className={cn("font-bold text-sm", isDetailCollapsed ? "text-slate-600" : "text-blue-700")}>
                                            Vị trí & Hình ảnh minh chứng
                                        </span>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-8 px-2">
                                        {isDetailCollapsed ? (
                                            <><span className="text-xs mr-1">Xem chi tiết</span> <ChevronDown className="h-4 w-4" /></>
                                        ) : (
                                            <><span className="text-xs mr-1">Thu gọn</span> <ChevronUp className="h-4 w-4" /></>
                                        )}
                                    </Button>
                                </div>
                                
                                {!isDetailCollapsed && (
                                    <div className="p-4 pt-0 space-y-4 animate-in slide-in-from-top-2 duration-300">
                                        <Separator className="bg-blue-100 mb-4" />
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {/* GPS Section */}
                                            <div className="space-y-2">
                                                <Label className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1">
                                                    <MapPin className="h-3 w-3 text-red-600" /> Tọa độ xác thực
                                                </Label>
                                                <div className="bg-slate-50 border rounded p-3">
                                                    <p className="font-mono text-sm font-bold text-slate-700">
                                                        {selectedItem.location?.latitude?.toFixed(6)}, {selectedItem.location?.longitude?.toFixed(6)}
                                                    </p>
                                                    <a 
                                                        href={`https://www.google.com/maps/search/?api=1&query=${selectedItem.location?.latitude},${selectedItem.location?.longitude}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-blue-600 hover:underline flex items-center mt-2 font-semibold"
                                                    >
                                                        <Map className="h-3.5 w-3.5 mr-1" /> Mở trong Google Maps
                                                    </a>
                                                </div>
                                            </div>

                                            {/* Image Section */}
                                            <div className="space-y-2">
                                                <Label className="text-slate-500 text-[10px] uppercase font-bold flex items-center gap-1">
                                                    <ImageIcon className="h-3 w-3 text-blue-600" /> Ảnh chụp hiện trường
                                                </Label>
                                                <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 flex justify-center">
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full">
                                                        {selectedItem.photoUrls && selectedItem.photoUrls.length > 0 ? (
                                                            selectedItem.photoUrls.map((url: string, idx: number) => (
                                                                <div key={idx} className="relative group cursor-zoom-in border border-blue-100 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all" onClick={() => setFullImage(url)}>
                                                                    <img src={url} alt={`Evidence ${idx + 1}`} className="w-full h-40 object-cover" />
                                                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                                        <Eye className="text-white h-6 w-6 shadow-sm" />
                                                                    </div>
                                                                    <div className="absolute bottom-1 right-1 bg-black/50 text-[10px] text-white px-1.5 py-0.5 rounded-sm">
                                                                        #{idx + 1}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : selectedItem.photoUrl ? (
                                                            // Hỗ trợ bản ghi cũ chỉ có 1 ảnh
                                                            <div className="relative group cursor-zoom-in border border-blue-100 rounded-lg overflow-hidden shadow-sm" onClick={() => setFullImage(selectedItem.photoUrl)}>
                                                                <img src={selectedItem.photoUrl} alt="Evidence" className="w-full h-40 object-cover" />
                                                                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                                    <Eye className="text-white h-6 w-6" />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="col-span-full py-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-lg text-slate-400">
                                                                <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                                                <p className="text-xs italic">Không có hình ảnh minh chứng</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 mt-4 border-t pt-4">
                                <Label className="text-base font-semibold">Quyết định phê duyệt</Label>
                                <Select value={reviewStatus} onValueChange={setReviewStatus}>
                                    <SelectTrigger className={cn("h-12 text-base font-medium", 
                                        reviewStatus === 'approved' ? 'text-green-700 bg-green-50 border-green-200' : 
                                        reviewStatus === 'rejected' ? 'text-red-700 bg-red-50 border-red-200' : 'text-amber-700 bg-amber-50 border-amber-200'
                                    )}>
                                        <SelectValue placeholder="Chọn kết quả" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending_review">Chờ duyệt (Chưa có kết quả)</SelectItem>
                                        <SelectItem value="approved" className="text-green-700 focus:bg-green-100 font-semibold">Chấp nhận (Đã kiểm tra đúng)</SelectItem>
                                        <SelectItem value="rejected" className="text-red-700 focus:bg-red-100 font-semibold">Từ chối (Sai vị trí / Hình mờ)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="mt-4">
                        <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Đóng</Button>
                        <Button onClick={handleSaveReview} className="bg-blue-600 hover:bg-blue-700">Lưu kết quả duyệt</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Lightbox Dialog cho ảnh Fullsize */}
            <Dialog open={!!fullImage} onOpenChange={() => setFullImage(null)}>
                <DialogContent className="max-w-[95vw] w-auto h-auto max-h-[95vh] p-1 bg-black/90 border-none overflow-hidden flex items-center justify-center">
                    <DialogHeader>
                        <VisuallyHidden><DialogTitle>Xem ảnh lớn</DialogTitle></VisuallyHidden>
                    </DialogHeader>
                    {fullImage && (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <img 
                                src={fullImage} 
                                alt="Full size" 
                                className="max-w-full max-h-[90vh] object-contain rounded-sm shadow-2xl" 
                            />
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setFullImage(null)}
                                className="absolute top-2 right-2 text-white hover:bg-white/20"
                            >
                                <X className="h-6 w-6" />
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </ClientOnly>
    );
}
