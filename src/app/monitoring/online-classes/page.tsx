"use client";

import { useState, useMemo, useCallback, useRef } from 'react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Video, Users, Clock, ExternalLink, 
  Search, Filter, Calendar as CalendarIcon,
  CheckCircle2, AlertCircle, Laptop, Camera,
  Trash2, Eye, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Cog, X,
  ArrowUpDown, ArrowUp, ArrowDown, EllipsisVertical,
  Save, Undo2, MapPin, Hash, GraduationCap, User, FileText, BookOpen
} from 'lucide-react';
import { useCollection, useFirestore } from '@/firebase';
import { collection, query, orderBy, deleteDoc, doc, writeBatch, setDoc, where, getDocs, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import PageHeader from "@/components/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientOnly } from "@/components/client-only";
import { useLanguage } from "@/hooks/use-language";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { usePermissions } from "@/hooks/use-permissions";
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

export default function OnlineClassesMonitoringPage() {
    const { t } = useLanguage();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { permissions } = usePermissions('/monitoring/online-classes');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    
    // Table Settings (Consistent with Check-in)
    const [sortConfig, setSortConfig] = useLocalStorage<{ key: string, direction: 'ascending' | 'descending' }[]>('online_checkins_sort_v1', []);
    const [rowsPerPage, setRowsPerPage] = useLocalStorage('online_checkins_rowsPerPage_v1', '10');
    const [currentPage, setCurrentPage] = useState(1);
    const [filters, setFilters] = useLocalStorage<Record<string, string>>('online_checkins_filters_v1', {});
    const [openPopover, setOpenPopover] = useState<string | null>(null);
    const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>('online_checkins_col_vis_v1', {
        serverTimestamp: true, period: true, classId: true, totalStudents: true, 
        studentCount: true, lecturer: true, className: true, status: true, evidence: true,
        incident: false, incidentDetail: false
    });

    const columnDefs: Record<string, string> = {
        serverTimestamp: 'Thời gian',
        period: 'Tiết',
        classId: 'Lớp',
        totalStudents: 'Sĩ số',
        studentCount: 'SV tham gia',
        lecturer: 'Giảng viên',
        className: 'Môn học',
        incident: 'Việc phát sinh',
        incidentDetail: 'Chi tiết sự việc',
        status: 'Tình trạng',
        evidence: 'Minh chứng'
    };
    const colIcons: Record<string, any> = {
        serverTimestamp: Clock,
        period: Hash,
        classId: GraduationCap,
        totalStudents: Users,
        studentCount: Users,
        lecturer: Laptop,
        className: BookOpen,
        incident: AlertCircle,
        incidentDetail: FileText,
        status: CheckCircle2,
        evidence: Camera
    };

    const allColumns = Object.keys(columnDefs);
    const orderedColumns = allColumns.filter(key => columnVisibility[key]);

    // Lấy dữ liệu từ collection online_checkins
    const onlineCheckinsRef = useMemo(() => 
        firestore ? query(collection(firestore, 'online_checkins'), orderBy('serverTimestamp', 'desc')) : null
    , [firestore]);
    
    const { data: checkins, loading } = useCollection<any>(onlineCheckinsRef);

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => value ? { ...prev, [key]: value } : Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)));
        setCurrentPage(1);
    };

    const requestSort = (key: string, direction: 'ascending' | 'descending') => {
        setSortConfig([{ key, direction }]);
        setOpenPopover(null);
    };

    const filteredData = useMemo(() => {
        if (!checkins) return [];
        return checkins.filter(item => {
            if (!item) return false;
            
            const className = String(item.className || "").toUpperCase();
            // LOẠI TRỪ DỮ LIỆU SINH HOẠT (SHCN)
            if (className.includes("SHCN") || className.includes("SINH HOẠT")) return false;

            const searchMatches = !searchTerm || [item.classId, item.className, item.lecturer].some(field => 
                String(field || "").toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (!searchMatches) return false;

            return Object.entries(filters).every(([key, value]) => 
                String((item as any)[key] ?? '').toLowerCase().includes(String(value).toLowerCase())
            );
        });
    }, [checkins, searchTerm, filters]);

    const sortedItems = useMemo(() => {
        let items = [...filteredData];
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
    }, [filteredData, sortConfig]);

    const totalPages = Math.max(1, Math.ceil(sortedItems.length / Number(rowsPerPage)));
    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
    const startIndex = (safeCurrentPage - 1) * Number(rowsPerPage);
    const currentItems = sortedItems.slice(startIndex, startIndex + Number(rowsPerPage));

    // Approval logic
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
    const [reviewStatus, setReviewStatus] = useState<string>('pending_review');

    const openReviewDialog = (item: any) => {
        setSelectedItem(item);
        setReviewStatus(item.status || 'pending_review');
        setIsReviewDialogOpen(true);
    };

    const handleSaveReview = async () => {
        if (!firestore || !selectedItem) return;
        try {
            await setDoc(doc(firestore, "online_checkins", selectedItem.id), { status: reviewStatus }, { merge: true });

            if (reviewStatus === 'approved') {
                const schedulesRef = collection(firestore, 'schedules');
                // Sync to schedules
                const q = query(
                    schedulesRef, 
                    where('class', '==', selectedItem.classId),
                    where('date', '==', selectedItem.scheduleDate || format(new Date(selectedItem.serverTimestamp), 'dd/MM/yyyy'))
                );
                
                const querySnapshot = await getDocs(q);
                if (!querySnapshot.empty) {
                    const scheduleDoc = querySnapshot.docs[0];
                    await updateDoc(doc(firestore, 'schedules', scheduleDoc.id), {
                        recognitionDate: format(new Date(), 'yyyy-MM-dd'),
                        employee: 'Hệ thống (Duyệt Online)',
                        incident: selectedItem.incident || '',
                        incidentDetail: selectedItem.incidentDetail || '',
                        actualStudentCount: selectedItem.studentCount || '',
                        evidence: selectedItem.evidence || '',
                        note: `Đã duyệt từ Giám sát Online. Link: ${selectedItem.meetingLink || 'N/A'}`
                    });
                }
            }

            setIsReviewDialogOpen(false);
            toast({ title: t('Đã lưu kết quả và đồng bộ dữ liệu!') });
        } catch (error: any) {
            toast({ title: t('Lỗi đồng bộ'), description: error.message, variant: 'destructive' });
        }
    };

    const handleBulkDelete = async () => {
        if (!firestore || selectedIds.length === 0) return;
        setIsDeleting(true);
        try {
            const batch = writeBatch(firestore);
            selectedIds.forEach(id => { batch.delete(doc(firestore, 'online_checkins', id)); });
            await batch.commit();
            toast({ title: "Thành công", description: `Đã xóa ${selectedIds.length} bản ghi.` });
            setSelectedIds([]);
        } catch (error) {
            toast({ title: "Lỗi", variant: "destructive" });
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    const formatTimestamp = (ts: any) => {
        if (!ts) return 'N/A';
        try {
            return format(new Date(ts), 'dd/MM HH:mm:ss');
        } catch (e) {
            return 'N/A';
        }
    };

    const renderStatus = (status: string) => {
        switch (status) {
            case 'approved': return <Badge className="bg-green-600 hover:bg-green-700">Đã duyệt</Badge>;
            case 'rejected': return <Badge variant="destructive">Từ chối</Badge>;
            case 'completed': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Hoàn thành</Badge>;
            default: return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-300">Chờ duyệt</Badge>;
        }
    };

    return (
        <ClientOnly>
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <PageHeader 
                    title="Giám sát Lớp học Online" 
                    description="Theo dõi thời gian và sự hiện diện của Giảng viên trên các nền tảng trực tuyến" 
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="bg-purple-50 border-l-4 border-l-purple-500 shadow-sm border-none">
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-purple-600 uppercase">Đang dạy</CardTitle></CardHeader>
                        <CardContent><div className="text-3xl font-black text-purple-900">{filteredData.filter(i => i.status !== 'completed' && i.status !== 'approved').length}</div></CardContent>
                    </Card>
                    <Card className="bg-blue-50 border-l-4 border-l-blue-500 shadow-sm border-none">
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-blue-600 uppercase">Tổng lượt dạy hôm nay</CardTitle></CardHeader>
                        <CardContent><div className="text-3xl font-black text-blue-900">{filteredData.length}</div></CardContent>
                    </Card>
                    <Card className="bg-green-50 border-l-4 border-l-green-500 shadow-sm border-none">
                        <CardHeader className="pb-2"><CardTitle className="text-sm font-bold text-green-600 uppercase">Đã duyệt</CardTitle></CardHeader>
                        <CardContent><div className="text-3xl font-black text-green-900">{filteredData.filter(i => i.status === 'approved').length}</div></CardContent>
                    </Card>
                </div>

                <Card className="border-t-4 border-t-blue-600 shadow-md">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-lg font-bold text-blue-900 uppercase tracking-tight">Danh sách Giám sát Online</CardTitle>
                        <div className="flex items-center gap-4">
                            {permissions.delete && selectedIds.length > 0 && (
                                <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}><Trash2 className="h-4 w-4 mr-2" /> Xóa ({selectedIds.length})</Button>
                            )}
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                <Input placeholder="Tìm mã lớp, tên GV..." className="pl-9 h-9 border-slate-200" value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border border-blue-200 overflow-x-auto shadow-sm">
                            <Table className="min-w-[1200px]">
                                <TableHeader className="bg-[#1877F2]">
                                    <TableRow className="hover:bg-[#1877F2] border-none">
                                        <TableHead className="w-[50px] text-center text-white font-bold p-2">#</TableHead>
                                        <TableHead className="w-[40px] text-center text-white font-bold p-2">
                                            <Checkbox 
                                                className="border-white data-[state=checked]:bg-white data-[state=checked]:text-blue-600"
                                                checked={currentItems.length > 0 && selectedIds.length === currentItems.length}
                                                onCheckedChange={() => setSelectedIds(selectedIds.length === currentItems.length ? [] : currentItems.map(i => i.id))}
                                            />
                                        </TableHead>
                                        {orderedColumns.map(key => (
                                            <TableHead key={key} className="p-0 border-l border-blue-400">
                                                <ColumnHeader columnKey={key} title={columnDefs[key]} t={t} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={() => setSortConfig([])} filters={filters} handleFilterChange={handleFilterChange} icon={colIcons[key]} />
                                            </TableHead>
                                        ))}
                                        <TableHead className="w-[60px] text-center text-white font-bold border-l border-blue-400 sticky right-0 bg-[#1877F2] z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.1)]">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-blue-700"><Cog className="h-5 w-5" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                                                    <div className="p-2 font-bold text-xs uppercase text-slate-500">Hiển thị cột</div>
                                                    <DropdownMenuSeparator />
                                                    {allColumns.map(key => (
                                                        <DropdownMenuCheckboxItem key={key} checked={columnVisibility[key]} onCheckedChange={(v) => setColumnVisibility(p => ({...p, [key]: !!v}))}>{t(columnDefs[key])}</DropdownMenuCheckboxItem>
                                                    ))}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow><TableCell colSpan={orderedColumns.length + 3} className="h-32 text-center text-slate-500 italic">Đang tải dữ liệu...</TableCell></TableRow>
                                    ) : currentItems.length === 0 ? (
                                        <TableRow><TableCell colSpan={orderedColumns.length + 3} className="h-32 text-center text-slate-500 italic">Không tìm thấy dữ liệu.</TableCell></TableRow>
                                    ) : (
                                        currentItems.map((item, index) => (
                                            <TableRow key={item.id} className={cn("hover:bg-blue-50/50 transition-colors border-b border-slate-100", selectedIds.includes(item.id) && "bg-blue-50")}>
                                                <TableCell className="text-center font-medium border-r border-slate-200">{startIndex + index + 1}</TableCell>
                                                <TableCell className="text-center border-r border-slate-200">
                                                    <Checkbox checked={selectedIds.includes(item.id)} onCheckedChange={(checked) => setSelectedIds(prev => checked ? [...prev, item.id] : prev.filter(i => i !== item.id))} />
                                                </TableCell>
                                                {orderedColumns.map(key => {
                                                    if (key === 'serverTimestamp') return <TableCell key={key} className="text-center border-r border-slate-200 text-xs font-medium">{formatTimestamp(item.serverTimestamp)}</TableCell>;
                                                    if (key === 'period') return <TableCell key={key} className="text-center font-bold text-blue-600 border-r border-slate-200 bg-slate-50/30">{item.period || 'N/A'}</TableCell>;
                                                    if (key === 'classId') return <TableCell key={key} className="font-black text-slate-900 border-r border-slate-200 uppercase">{item.classId}</TableCell>;
                                                    if (key === 'totalStudents') return <TableCell key={key} className="text-center font-bold text-slate-600 border-r border-slate-200">{item.totalStudents || '--'}</TableCell>;
                                                    if (key === 'status') return <TableCell key={key} className="text-center border-r border-slate-200">{renderStatus(item.status)}</TableCell>;
                                                    if (key === 'incident') return (
                                                        <TableCell key={key} className="border-r border-slate-200">
                                                            {item.incident ? <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-[10px]">{item.incident}</Badge> : <span className="text-slate-300 text-[10px] italic">Không có</span>}
                                                        </TableCell>
                                                    );
                                                    if (key === 'studentCount') return (
                                                        <TableCell key={key} className="text-center border-r border-slate-200">
                                                            <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded-full font-black text-xs border border-green-200 shadow-sm">
                                                                <Users className="h-3 w-3" /> 
                                                                {item.studentCount ?? item.actualStudentCount ?? 0}
                                                            </div>
                                                        </TableCell>
                                                    );
                                                    if (key === 'lecturer') return (
                                                        <TableCell key={key} className="border-r border-slate-200">
                                                            <div className="text-xs text-indigo-700 font-black flex items-center gap-1.5 bg-indigo-50 w-fit px-2 py-0.5 rounded border border-indigo-100 uppercase"><Laptop className="h-3 w-3" /> {item.lecturer}</div>
                                                        </TableCell>
                                                    );
                                                    if (key === 'evidence') return (
                                                        <TableCell key={key} className="text-center p-2">
                                                            {item.evidence ? (
                                                                <div className="flex justify-center group relative cursor-zoom-in" onClick={() => { const win = window.open(); win?.document.write(`<img src="${item.evidence}" style="width:100%">`); }}>
                                                                    <img src={item.evidence} className="h-8 w-12 object-cover rounded shadow-sm border border-slate-200 hover:scale-[4] transition-transform origin-right z-10" alt="Minh chứng" />
                                                                </div>
                                                            ) : <Badge variant="outline" className="text-[10px] font-normal text-slate-400 border-slate-100">N/A</Badge>}
                                                        </TableCell>
                                                    );
                                                    return <TableCell key={key} className="border-r border-slate-200 text-xs font-bold uppercase truncate max-w-[200px]" title={(item as any)[key]}>{(item as any)[key]}</TableCell>;
                                                })}
                                                <TableCell className="text-center p-2 sticky right-0 bg-white group-hover:bg-yellow-300 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">
                                                    <TooltipProvider><Tooltip><TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={() => openReviewDialog(item)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"><Eye className="h-4 w-4" /></Button>
                                                    </TooltipTrigger><TooltipContent><p>{t('Xem & Duyệt')}</p></TooltipContent></Tooltip></TooltipProvider>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 text-sm text-slate-500 font-medium">
                            <div className="flex items-center gap-2 font-bold">
                                <span>Hiển thị</span>
                                <Select value={rowsPerPage} onValueChange={(v) => { setRowsPerPage(v); setCurrentPage(1); }}>
                                    <SelectTrigger className="h-8 w-[70px] bg-white border-slate-200"><SelectValue placeholder="10" /></SelectTrigger>
                                    <SelectContent side="top">{[10, 20, 50, 100].map(v => <SelectItem key={v} value={v.toString()}>{v}</SelectItem>)}</SelectContent>
                                </Select>
                                <span>dòng / trang</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="hidden sm:inline-block font-bold">Trang {safeCurrentPage} / {totalPages} ({sortedItems.length} bản ghi)</span>
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

                {/* Review Dialog */}
                <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
                    <DialogContent className="sm:max-w-2xl bg-slate-50">
                        <DialogHeader>
                            <DialogTitle className="text-xl text-blue-800 flex items-center gap-2"><Laptop className="h-5 w-5" /> Duyệt minh chứng Online</DialogTitle>
                            <VisuallyHidden><DialogDescription>Chi tiết giám sát</DialogDescription></VisuallyHidden>
                        </DialogHeader>
                        {selectedItem && (
                            <div className="space-y-4 py-2">
                                <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-lg border shadow-sm">
                                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Giảng viên</p><p className="font-bold text-blue-700">{selectedItem.lecturer}</p></div>
                                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Lớp / Môn học</p><p className="font-bold">{selectedItem.classId} - {selectedItem.className}</p></div>
                                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Tiết học</p><p className="font-bold">{selectedItem.period}</p></div>
                                    <div><p className="text-[10px] font-bold text-slate-400 uppercase">Sĩ số / Tham gia</p><p className="font-bold text-green-600">{selectedItem.totalStudents} / {selectedItem.studentCount}</p></div>
                                    <div className="col-span-2"><p className="text-[10px] font-bold text-slate-400 uppercase">Link cuộc họp</p><a href={selectedItem.meetingLink} target="_blank" className="text-blue-500 hover:underline text-xs break-all">{selectedItem.meetingLink || 'N/A'}</a></div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase px-1">Hình ảnh minh chứng</p>
                                    {selectedItem.evidence ? (
                                        <div className="rounded-lg border overflow-hidden bg-black flex justify-center"><img src={selectedItem.evidence} className="max-h-60 object-contain" alt="Evidence" /></div>
                                    ) : <div className="h-32 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 italic">Không có hình ảnh</div>}
                                </div>
                                <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
                                    <p className="text-[10px] font-bold text-amber-700 uppercase mb-2">Quyết định phê duyệt</p>
                                    <Select value={reviewStatus} onValueChange={setReviewStatus}>
                                        <SelectTrigger className="bg-white"><SelectValue placeholder="Chọn trạng thái..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pending_review">Chờ duyệt</SelectItem>
                                            <SelectItem value="approved">Chấp nhận & Đồng bộ</SelectItem>
                                            <SelectItem value="rejected">Từ chối</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                        <DialogFooter className="border-t pt-4">
                            <Button variant="outline" onClick={() => setIsReviewDialogOpen(false)}>Hủy bỏ</Button>
                            <Button onClick={handleSaveReview} className="bg-blue-600 hover:bg-blue-700"><Save className="mr-2 h-4 w-4" /> Lưu & Hoàn tất</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-red-600"><Trash2 className="h-5 w-5" /> Xác nhận xóa</AlertDialogTitle>
                            <AlertDialogDescription>Bạn có chắc chắn muốn xóa <strong>{selectedIds.length}</strong> bản ghi này không?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter><AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel><AlertDialogAction onClick={(e) => { e.preventDefault(); handleBulkDelete(); }} className="bg-red-600 hover:bg-red-700" disabled={isDeleting}>{isDeleting ? "Đang xóa..." : "Xác nhận xóa"}</AlertDialogAction></AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <div className="text-[10px] text-slate-400 text-center mt-4">
                    Active Project: {process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'kiemtranoibo-ccks'}
                </div>
            </div>
        </ClientOnly>
    );
}
