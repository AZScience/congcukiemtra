"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState, useMemo, useCallback } from 'react';
import { 
  History, Eye, FileDown, Cog, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, 
  ArrowDown, Filter, X, ListFilter, Check, CalendarDays, Activity, FilePenLine,
  User, LayoutDashboard, Calendar, ChevronDown, Trash2, AlertCircle, EllipsisVertical,
  Mail, Globe, FileText
} from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { useLocalStorage } from "@/hooks/use-local-storage";
import * as XLSX from 'xlsx';
import { format } from "date-fns";
import PageHeader from "@/components/page-header";
import { ClientOnly } from "@/components/client-only";
import { useLanguage } from "@/hooks/use-language";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { useMasterData } from "@/providers/master-data-provider";
import { collection, query, orderBy, limit, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
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
import { DatePickerField } from "@/components/ui/date-picker-field";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Search } from 'lucide-react';


// Types
type ActionType = 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW';

interface AccessLog {
  id: string;
  renderId: string;
  timestamp: string | number | { seconds: number; nanoseconds: number };
  userId: string;
  userName: string;
  userEmail: string;
  action: ActionType;
  module: string;
  details: string;
  ipAddress?: string;
  previousData?: any;
  newData?: any;
  formattedTime?: string;
  dateOnly?: string;
  [key: string]: any; // Allow dynamic key access
}

const ACTION_MAP: Record<ActionType, { label: string, color: string }> = {
  LOGIN: { label: 'Đăng nhập', color: 'bg-green-100 text-green-800 border-green-300' },
  LOGOUT: { label: 'Đăng xuất', color: 'bg-gray-100 text-gray-800 border-gray-300' },
  CREATE: { label: 'Thêm mới', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  UPDATE: { label: 'Cập nhật', color: 'bg-orange-100 text-orange-800 border-orange-300' },
  DELETE: { label: 'Xóa', color: 'bg-red-100 text-red-800 border-red-300' },
  VIEW: { label: 'Xem', color: 'bg-purple-100 text-purple-800 border-purple-300' },
};

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

const TARGET_TYPE_MAP: Record<string, string> = {
  'monitoring_in_person': 'Theo dõi - Giảng dạy trực tiếp',
  'monitoring_online': 'Theo dõi - Giảng dạy trực tuyến',
  'monitoring_homeroom': 'Theo dõi - Cố vấn học tập (GVCN)',
  'monitoring_external_practice': 'Theo dõi - Thực tập/Thực tế',
  'monitoring_exams': 'Theo dõi - Thi kết thúc môn',
  'petitions_citizen': 'Đơn từ - Tiếp công dân',
  'petitions_student': 'Đơn từ - Yêu cầu sinh viên',
  'others_incidents': 'Khác - Sự cố phòng học',
  'others_warnings': 'Khác - Cảnh báo',
  'reports_daily': 'Báo cáo - Trực ban',
  'reports_logs': 'Báo cáo - Nhật ký',
  'reports_engagement': 'Báo cáo - Mức độ tương tác',
  'settings_master_data': 'Cài đặt - Danh mục',
  'settings_parameters': 'Cài đặt - Tham số hệ thống',
  'settings_roles': 'Cài đặt - Phân quyền',
  'settings_access_log': 'Cài đặt - Nhật ký truy cập',
  'utilities_statistics': 'Tiện ích - Thống kê',
  'utilities_asset_reception': 'Tiện ích - Tiếp nhận tài sản',
  'utilities_asset_gratitude': 'Tiện ích - Tri ân tài sản',
  'System': 'Hệ thống',
  'Nhân viên': 'Hồ sơ nhân viên',
  'Giảng viên': 'Danh mục - Giảng viên',
  'Sinh viên': 'Danh mục - Sinh viên',
  'Dãy nhà': 'Danh mục - Dãy nhà',
  'Đơn vị': 'Danh mục - Đơn vị',
  'Phòng học': 'Danh mục - Phòng học',
  'Chức vụ': 'Danh mục - Chức vụ',
  'Vai trò': 'Danh mục - Vai trò',
  'good-deeds': 'Người tốt việc tốt',
  'requests': 'Tiếp nhận yêu cầu',
  'petitions': 'Tiếp nhận đơn thư',
  'asset-check': 'Nhận - Trả tài sản',
  'Employee': 'Hồ sơ nhân viên',
  'Lecturer': 'Danh mục - Giảng viên',
  'Student': 'Danh mục - Sinh viên',
  'Department': 'Danh mục - Đơn vị',
  'Classroom': 'Danh mục - Phòng học',
  'BuildingBlock': 'Danh mục - Dãy nhà'
};



export default function AccessLogPage() {
    const { t } = useLanguage();
    const { toast } = useToast();
    const firestore = useFirestore();
    const { user: authUser } = useUser();
    const { employees, lecturers, students, employeesMap, lecturersMap, studentsMap } = useMasterData();

    const logsRef = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'activity-logs'), orderBy('timestamp', 'desc'), limit(1000));
    }, [firestore]);

    const { data: rawLogs, loading } = useCollection<AccessLog>(logsRef as any);

    const logs = useMemo(() => {
        if (!rawLogs) return [];
        return rawLogs.map((log, idx) => {
            let formattedTime = '';
            let dateObj = new Date();
            if (log.timestamp) {
                if (typeof log.timestamp === 'object' && 'seconds' in log.timestamp) {
                    dateObj = new Date(log.timestamp.seconds * 1000);
                } else if (typeof log.timestamp === 'string' || typeof log.timestamp === 'number') {
                    dateObj = new Date(log.timestamp);
                }
            }
            try {
                formattedTime = format(dateObj, 'dd/MM/yyyy HH:mm:ss');
            } catch (e) {
                formattedTime = String(log.timestamp);
            }
            
            const userId = (log.userId || '').trim().toLowerCase();
            
            // 1. Try to find in master data by ID or Email using optimized maps
            const emp = employeesMap.get(userId);
            const lec = lecturersMap.get(userId);
            const stu = studentsMap.get(userId);
            
            let personName = emp?.nickname || emp?.name || lec?.name || stu?.name || null;
            
            // 2. Try current user fallback if not found in master data
            if (!personName && (userId === authUser?.uid || userId === authUser?.email)) {
                personName = authUser?.displayName || null;
            }
            
            // 3. Resolve storedName and check if it's a UID
            let storedName = log.userName;
            // A more inclusive UID check: random-looking string, no spaces, length >= 10
            const isUid = (val: string) => {
                if (!val) return false;
                const v = val.trim();
                return v.length >= 10 && !v.includes(' ') && /[0-9]/.test(v) && /[a-z]/i.test(v);
            };
            
            if (storedName && (storedName === userId || isUid(storedName))) {
                storedName = "";
            }

            // 4. Final name resolution with fallback chain
            let finalName = personName || storedName || log.userEmail;
            
            if (!finalName || finalName === userId || isUid(finalName)) {
                if (userId && isUid(userId)) {
                    finalName = 'Quản trị viên';
                } else if (!userId || userId === 'system') {
                    finalName = 'Hệ thống';
                } else {
                    finalName = userId;
                }
            }

            // 5. Map targetType to friendly module name
            const rawModule = log.module || log.targetType || 'System';
            let friendlyModule = TARGET_TYPE_MAP[rawModule] || rawModule;
            
            // Context-aware module naming
            if (rawModule === 'Nhân viên' || rawModule === 'Employee' || rawModule === 'Hồ sơ nhân viên') {
                friendlyModule = 'Hồ sơ cá nhân';
            }


            // 6. Enrich missing email if possible
            const finalEmail = log.userEmail || emp?.email || lec?.email || stu?.email || '';
            const safeAction = (log.action || '').toUpperCase() as ActionType;

            return {
                ...log,
                action: safeAction as any,
                userName: finalName,
                userEmail: finalEmail,
                module: friendlyModule,
                formattedTime,
                dateOnly: format(dateObj, 'dd/MM/yyyy'),
                renderId: `${log.id}-${idx}`,
                // Store the employee reference if found for filtering
                employeeRefId: emp?.id || emp?.email || emp?.employeeId || null
            };
        });
    }, [rawLogs, employees, lecturers, students, authUser]);

    const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useLocalStorage<any>('accesslog_adv_filters_v1', {
        fromDate: '',
        toDate: '',
        users: [],
        action: 'ALL'
    });

    const allUserOptions = useMemo(() => {
        // 1. Get all employees as base options
        const options = employees.map(emp => ({
            id: emp.id || emp.email || emp.employeeId,
            name: emp.nickname || emp.name,
            email: emp.email,
            type: 'employee'
        }));

        // 2. Find users in logs who are NOT employees (e.g. system, students)
        const othersMap = new Map();
        logs.forEach(log => {
            const isEmployee = employees.some(e => 
                (e.id && e.id === log.userId) || 
                (e.employeeId && e.employeeId === log.userId) ||
                (e.email && log.userId && e.email.toLowerCase() === log.userId.toLowerCase())
            );
            
            if (!isEmployee && log.userId && !othersMap.has(log.userId)) {
                // If it looks like an email, it might be an employee not in master data yet
                // but if the user wants it strictly from Employee table, we should be careful.
                // However, 'Hệ thống' and 'Quản trị viên' should stay.
                const name = log.userName || log.userId;
                if (name !== log.userId || name === 'Hệ thống' || name === 'Quản trị viên') {
                    othersMap.set(log.userId, {
                        id: log.userId,
                        name: name,
                        email: log.userEmail,
                        type: 'other'
                    });
                }
            }
        });

        return [...options, ...Array.from(othersMap.values())].sort((a, b) => a.name.localeCompare(b.name));
    }, [logs, employees]);


    const toggleAdvancedFilter = (field: string, value: string) => {
        setAdvancedFilters((prev: any) => {
            const current = prev[field] || [];
            const next = current.includes(value) 
                ? current.filter((v: string) => v !== value)
                : [...current, value];
            return { ...prev, [field]: next };
        });
    };

    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState<AccessLog | null>(null);
    const [logToDelete, setLogToDelete] = useState<AccessLog | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const [currentPage, setCurrentPage] = useLocalStorage('accesslog_currentPage_v1', 1);
    const [rowsPerPage, setRowsPerPage] = useLocalStorage('accesslog_rowsPerPage_v1', 20);
    const [sortConfig, setSortConfig] = useLocalStorage<any[]>('accesslog_sortConfig_v1', []);
    
    // Column configuration definitions matching the existing standard
    const columnDefs: any = { 
        formattedTime: 'Thời gian', 
        userName: 'Người dùng', 
        userEmail: 'Email', 
        action: 'Hành động', 
        module: 'Chức năng (Module)', 
        details: 'Chi tiết',
        ipAddress: 'IP Address'
    };
    
    // Setup defaults for viewable columns
    const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>('accesslog_colVis_v1', { 
        formattedTime: true, userName: true, userEmail: true, action: true, module: true, details: true, ipAddress: true
    });
    const colIcons: Record<string, any> = {
        formattedTime: CalendarDays,
        userName: User,
        userEmail: Mail,
        action: Activity,
        module: LayoutDashboard,
        details: FileText,
        ipAddress: Globe
    };
    const allColumns = Object.keys(columnDefs);
    const orderedColumns = allColumns.filter(key => columnVisibility[key]);

    const [filters, setFilters] = useLocalStorage<Partial<Record<keyof AccessLog, string>>>('accesslog_filters_v1', {});
    const [openPopover, setOpenPopover] = useState<string | null>(null);
    const [selectedRowIds, setSelectedRowIds] = useLocalStorage<string[]>('accesslog_selected_ids_v1', []);
    const selectedSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);

    const filteredItems = useMemo(() => {
        return logs.filter(item => {
            // Apply column-level Popover filters
            const matchesColumnFilters = Object.entries(filters).every(([key, value]) => String((item as any)[key] ?? '').toLowerCase().includes(String(value).toLowerCase()));
            if (!matchesColumnFilters) return false;
            
            // Apply advanced filters
            if (advancedFilters.action !== 'ALL' && item.action !== advancedFilters.action) return false;
            
            if (advancedFilters.users?.length > 0) {
                const isMatch = advancedFilters.users.some((filterId: string) => 
                    item.userId === filterId || 
                    item.employeeRefId === filterId ||
                    (item.userEmail && item.userEmail.toLowerCase() === filterId.toLowerCase())
                );
                if (!isMatch) return false;
            }
            
            
            // Date range filter
            if (advancedFilters.fromDate || advancedFilters.toDate) {
                // item.dateOnly is in dd/MM/yyyy format, convert to YYYY-MM-DD for comparison
                const [d, m, y] = item.dateOnly.split('/');
                const itemDateStr = `${y}-${m}-${d}`;
                
                if (advancedFilters.fromDate && itemDateStr < advancedFilters.fromDate) return false;
                if (advancedFilters.toDate && itemDateStr > advancedFilters.toDate) return false;
            }
            
            return true;
        });
    }, [logs, filters, advancedFilters]);

    const sortedItems = useMemo(() => {
        let items = [...filteredItems];
        if (sortConfig.length > 0) {
            const { key, direction } = sortConfig[0];
            items.sort((a, b) => {
                const aVal = (a as any)[key];
                const bVal = (b as any)[key];
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;
                if (String(aVal) < String(bVal)) return direction === 'ascending' ? -1 : 1;
                if (String(aVal) > String(bVal)) return direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [filteredItems, sortConfig]);

    const safeRowsPerPage = Math.max(1, Number(rowsPerPage) || 20);
    const totalPages = Math.max(1, Math.ceil(sortedItems.length / safeRowsPerPage));
    const safeCurrentPage = Math.min(Math.max(1, Number(currentPage) || 1), totalPages);
    const startIndex = (safeCurrentPage - 1) * safeRowsPerPage;
    const currentItems = sortedItems.slice(startIndex, startIndex + safeRowsPerPage);

    const handleRowClick = useCallback((id: string) => { 
        setSelectedRowIds(prev => { 
            const n = new Set(prev); 
            if (n.has(id)) n.delete(id); else n.add(id); 
            return Array.from(n); 
        }); 
    }, [setSelectedRowIds]);

    const handleExport = () => {
        const ws = XLSX.utils.json_to_sheet(sortedItems.map((log, index) => ({
            STT: index + 1,
            'Thời gian': log.formattedTime,
            'Người dùng': log.userName,
            'Email': log.userEmail,
            'Hành động': ACTION_MAP[log.action as ActionType]?.label || log.action,
            'Chức năng': log.module,
            'Chi tiết': log.details,
            'IP': log.ipAddress || ''
        })));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "NhatKyTruyCap"); 
        XLSX.writeFile(wb, `DS_NhatKy_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    };

    const openViewDialog = (item: AccessLog) => {
        setSelectedLog(item);
        setIsViewOpen(true);
    };

    const formatJson = (data: any) => {
        if (!data) return 'Không có dữ liệu';
        if (typeof data === 'string') return data;
        try {
            return JSON.stringify(data, null, 2);
        } catch {
            return String(data);
        }
    };

    const handleDelete = async () => {
        if (!logToDelete || !firestore) return;
        setIsDeleting(true);
        try {
            await deleteDoc(doc(firestore, 'activity-logs', logToDelete.id));
            toast({
                title: "Thành công",
                description: "Đã xóa nhật ký truy cập.",
            });
            setIsDeleteDialogOpen(false);
            setLogToDelete(null);
        } catch (error) {
            console.error("Delete error:", error);
            toast({
                variant: "destructive",
                title: "Lỗi",
                description: "Không thể xóa nhật ký. Vui lòng thử lại.",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedRowIds.length === 0 || !firestore) return;
        setIsDeleting(true);
        try {
            const batch = writeBatch(firestore);
            // We need to find the actual Firestore IDs. 
            // In currentItems.renderId it's "id-idx", but item.id is the real one.
            // selectedRowIds stores renderId.
            
            const realIdsToDelete = logs
                .filter(log => selectedRowIds.includes(log.renderId))
                .map(log => log.id);

            realIdsToDelete.forEach(id => {
                batch.delete(doc(firestore, 'activity-logs', id));
            });

            await batch.commit();
            toast({
                title: "Thành công",
                description: `Đã xóa ${realIdsToDelete.length} nhật ký truy cập.`,
            });
            setSelectedRowIds([]);
            setIsBulkDeleteDialogOpen(false);
        } catch (error) {
            console.error("Bulk delete error:", error);
            toast({
                variant: "destructive",
                title: "Lỗi",
                description: "Không thể xóa các nhật ký đã chọn. Vui lòng thử lại.",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <ClientOnly>
            <TooltipProvider>
                <PageHeader title="Nhật ký truy cập" icon={History} />
                <div className="p-4 md:p-6">
                    <Card>
                        <CardHeader className="py-3 border-b">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xl flex items-center gap-2"><History className="h-6 w-6 text-primary" />Lịch sử hoạt động</CardTitle>
                                <div className="flex items-center gap-2">
                                    {selectedRowIds.length > 0 && (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button 
                                                    onClick={() => setIsBulkDeleteDialogOpen(true)} 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent><p>Xóa {selectedRowIds.length} mục đã chọn</p></TooltipContent>
                                        </Tooltip>
                                    )}
                                    <Tooltip><TooltipTrigger asChild><Button onClick={() => setIsAdvancedFilterOpen(true)} variant="ghost" size="icon" className="text-orange-500"><ListFilter className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Bộ lọc nâng cao')}</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button onClick={handleExport} variant="ghost" size="icon" className="text-green-600"><FileDown className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Xuất file Excel')}</p></TooltipContent></Tooltip>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-[#1877F2] hover:bg-[#1877F2]/90">
                                            <TableHead className="w-[80px] font-bold text-base text-white text-center border-r border-blue-300">#</TableHead>
                                            {orderedColumns.map(key => (
                                                <TableHead key={key} className="text-white border-r border-blue-300 p-0 h-auto">
                                                    <ColumnHeader columnKey={key} title={columnDefs[key]} t={t} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={(k:any, d:any) => setSortConfig([{key:k, direction:d}])} clearSort={() => setSortConfig([])} filters={filters} handleFilterChange={(k:any, v:string) => { setFilters(p => ({...p,[k]:v})); setCurrentPage(1); }} icon={colIcons[key]} />
                                                </TableHead>
                                            ))}
                                            <TableHead className="w-16 text-center text-white font-bold text-base">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:text-white hover:bg-blue-700"><Cog className="h-5 w-5" /></Button></DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                                                                <DropdownMenuLabel>{t('Hiển thị cột')}</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                {allColumns.map(key => (
                                                                    <DropdownMenuCheckboxItem key={key} checked={columnVisibility[key]} onCheckedChange={(v) => setColumnVisibility(p => ({...p, [key]: !!v}))}>
                                                                        {t(columnDefs[key])}
                                                                    </DropdownMenuCheckboxItem>
                                                                ))}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>{t('Hiển thị cột')}</p></TooltipContent>
                                                </Tooltip>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(loading && currentItems.length === 0) ? (
                                            <TableRow><TableCell colSpan={orderedColumns.length + 2} className="h-24 text-center">{t('Đang tải...')}</TableCell></TableRow>
                                        ) : currentItems.length > 0 ? (
                                            currentItems.map((item, idx) => {
                                                const isSelected = selectedSet.has(item.renderId);
                                                return (
                                                    <TableRow key={item.renderId} onClick={() => handleRowClick(item.renderId)} data-state={isSelected ? "selected" : ""} className={cn("cursor-pointer odd:bg-white even:bg-muted/30 transition-all hover:bg-yellow-300 hover:text-black", "data-[state=selected]:bg-red-800 data-[state=selected]:text-white")}>
                                                        <TableCell className="font-medium text-center align-middle py-3 border-r text-inherit">
                                                            {startIndex + idx + 1}
                                                        </TableCell>
                                                        {orderedColumns.map(key => (
                                                            <TableCell key={key} className="border-r text-inherit align-middle py-3">
                                                                {key === 'action' ? (
                                                                    <Badge variant="outline" className={cn("font-medium", ACTION_MAP[item.action as ActionType]?.color)}>
                                                                        {ACTION_MAP[item.action as ActionType]?.label || item.action}
                                                                    </Badge>
                                                                ) : key === 'details' ? (
                                                                    <div className="max-w-[300px] truncate" title={item.details}>{item.details}</div>
                                                                ) : (
                                                                    String((item as any)[key] ?? '')
                                                                )}
                                                            </TableCell>
                                                        ))}
                                                        <TableCell className="text-center py-3 text-inherit align-middle">
                                                            <div onClick={e => e.stopPropagation()}>
                                                                <DropdownMenu modal={false}>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="text-primary hover:bg-muted rounded-full">
                                                                            <EllipsisVertical className="h-5 w-5" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuItem onSelect={() => openViewDialog(item)}>
                                                                            <Eye className="mr-2 h-4 w-4" /> Chi tiết
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem 
                                                                            onSelect={() => {
                                                                                setLogToDelete(item);
                                                                                setIsDeleteDialogOpen(true);
                                                                            }} 
                                                                            className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                                        >
                                                                            <Trash2 className="mr-2 h-4 w-4" /> Xóa nhật ký
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        ) : (
                                            <TableRow><TableCell colSpan={orderedColumns.length + 2} className="text-center h-24">{t('Không có dữ liệu.')}</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t">
                            <div className="text-sm text-muted-foreground">{t('Tổng cộng')} {sortedItems.length} {t('bản ghi')} (Chỉ hiển thị 1000 bản ghi). {selectedSet.size > 0 && `${t('Đã chọn')} ${selectedSet.size} ${t('dòng')}.`}</div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm text-muted-foreground">{t('Số dòng')}</p>
                                    <Select value={`${safeRowsPerPage}`} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                                        <SelectTrigger className="h-8 w-[70px]"><SelectValue placeholder={safeRowsPerPage} /></SelectTrigger>
                                        <SelectContent side="top">
                                            {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 100].map((s) => (<SelectItem key={s} value={`${s}`}>{s}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-1">
                                    <Tooltip><TooltipTrigger asChild><span><Button variant="outline" size="icon" className="h-8 w-8 p-0" onClick={()=>setCurrentPage(1)} disabled={safeCurrentPage===1}><ChevronsLeft className="h-4 w-4"/></Button></span></TooltipTrigger><TooltipContent><p>{t('Trang đầu')}</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><span><Button variant="outline" size="icon" className="h-8 w-8 p-0" onClick={()=>setCurrentPage(Math.max(1, safeCurrentPage-1))} disabled={safeCurrentPage===1}><ChevronLeft className="h-4 w-4"/></Button></span></TooltipTrigger><TooltipContent><p>{t('Trang trước')}</p></TooltipContent></Tooltip>
                                    <div className="flex items-center gap-1 font-medium text-sm">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Input type="number" className="h-8 w-12 text-center" value={safeCurrentPage} onChange={e => { const p = parseInt(e.target.value); if(p > 0 && p <= totalPages) setCurrentPage(p); }} />
                                            </TooltipTrigger>
                                            <TooltipContent><p>{t('Nhập số trang')}</p></TooltipContent>
                                        </Tooltip>
                                        / {totalPages}
                                    </div>
                                    <Tooltip><TooltipTrigger asChild><span><Button variant="outline" size="icon" className="h-8 w-8 p-0" onClick={()=>setCurrentPage(Math.min(totalPages, safeCurrentPage+1))} disabled={safeCurrentPage===totalPages}><ChevronRight className="h-4 w-4"/></Button></span></TooltipTrigger><TooltipContent><p>{t('Trang sau')}</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><span><Button variant="outline" size="icon" className="h-8 w-8 p-0" onClick={()=>setCurrentPage(totalPages)} disabled={safeCurrentPage===totalPages}><ChevronsRight className="h-4 w-4"/></Button></span></TooltipTrigger><TooltipContent><p>{t('Trang cuối')}</p></TooltipContent></Tooltip>
                                </div>
                            </div>
                        </CardFooter>
                    </Card>
                </div>

                <Dialog open={isAdvancedFilterOpen} onOpenChange={setIsAdvancedFilterOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <ListFilter className="h-5 w-5 text-orange-500" />
                                Bộ lọc nâng cao
                            </DialogTitle>
                            <VisuallyHidden><DialogDescription>Lọc danh sách.</DialogDescription></VisuallyHidden>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><Calendar className="h-3 w-3" /> Từ ngày</Label>
                                    <DatePickerField 
                                        value={advancedFilters.fromDate || ''} 
                                        onChange={val => setAdvancedFilters({...advancedFilters, fromDate: val})} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><Calendar className="h-3 w-3" /> Đến ngày</Label>
                                    <DatePickerField 
                                        value={advancedFilters.toDate || ''} 
                                        onChange={val => setAdvancedFilters({...advancedFilters, toDate: val})} 
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><User className="h-3 w-3" /> Người dùng (Bí danh)</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between h-auto min-h-[40px] px-3 py-2 text-left font-normal border-slate-200">
                                            <div className="flex flex-wrap gap-1">
                                                {advancedFilters.users?.length > 0 ? (
                                                    advancedFilters.users.map((userId: string) => {
                                                        const user = allUserOptions.find(u => u.id === userId);
                                                        return (
                                                            <Badge key={userId} variant="secondary" className="text-[10px] h-5 px-1 bg-blue-100 text-blue-700 border-blue-200">
                                                                {user?.name || userId}
                                                            </Badge>
                                                        );
                                                    })
                                                ) : (
                                                    <span className="text-muted-foreground">Tất cả người dùng</span>
                                                )}
                                            </div>
                                            <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Tìm người dùng..." />
                                            <CommandList>
                                                <CommandEmpty>Không tìm thấy kết quả.</CommandEmpty>
                                                <CommandGroup>
                                                    {allUserOptions.map((user) => (
                                                        <CommandItem 
                                                            key={user.id} 
                                                            value={user.name + " " + user.email}
                                                            onSelect={() => toggleAdvancedFilter('users', user.id)}
                                                            className="flex items-center space-x-2"
                                                        >
                                                            <Checkbox checked={advancedFilters.users?.includes(user.id)} />
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-medium">{user.name}</span>
                                                                <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>


                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-xs font-bold uppercase text-muted-foreground"><Activity className="h-3 w-3" /> Thao tác</Label>
                                <Select value={advancedFilters.action} onValueChange={v => setAdvancedFilters({...advancedFilters, action: v})}>
                                    <SelectTrigger><SelectValue placeholder="Chọn thao tác..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ALL">Tất cả thao tác</SelectItem>
                                        {Object.entries(ACTION_MAP).map(([key, item]) => (
                                            <SelectItem key={key} value={key}>{item.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter className="border-t pt-4">
                            <Button variant="ghost" onClick={() => setAdvancedFilters({ fromDate: '', toDate: '', users: [], action: 'ALL' })} className="text-destructive">Xóa tất cả</Button>
                            <Button onClick={() => setIsAdvancedFilterOpen(false)} className="bg-primary hover:bg-primary/90"><Check className="mr-2 h-4 w-4" /> Áp dụng bộ lọc</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
                    <DialogContent className="sm:max-w-3xl">
                        <DialogHeader className="border-b pb-4">
                            <DialogTitle className="flex items-center gap-2 text-xl">
                                <History className="h-5 w-5 text-primary" />
                                Chi tiết nhật ký hoạt động
                            </DialogTitle>
                            <VisuallyHidden><DialogDescription>Cấu hình thông tin.</DialogDescription></VisuallyHidden>
                        </DialogHeader>
                        {selectedLog && (
                            <ScrollArea className="max-h-[70vh]">
                                <div className="p-1 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Thời gian</label>
                                            <p className="font-bold text-md">{selectedLog.formattedTime as string}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Hành động</label>
                                            <div>
                                                <Badge className={cn("px-2 py-1 text-xs", ACTION_MAP[selectedLog.action as ActionType]?.color)}>
                                                    {ACTION_MAP[selectedLog.action as ActionType]?.label || selectedLog.action}
                                                </Badge>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Người dùng</label>
                                            <p className="font-medium">{selectedLog.userName} <span className="text-muted-foreground font-normal">({selectedLog.userEmail})</span></p>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">IP Address</label>
                                            <p className="font-medium">{selectedLog.ipAddress || 'Không có thông tin'}</p>
                                        </div>
                                        <div className="space-y-1 md:col-span-2">
                                            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Chức năng (Module)</label>
                                            <p className="font-medium p-2 bg-muted/30 rounded-md border">{selectedLog.module}</p>
                                        </div>
                                        <div className="space-y-1 md:col-span-2">
                                            <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Chi tiết tổng quan</label>
                                            <p className="font-medium p-3 bg-muted/50 rounded-md border-l-4 border-l-primary leading-relaxed text-sm">
                                                {selectedLog.details}
                                            </p>
                                        </div>
                                    </div>

                                    {(selectedLog.previousData || selectedLog.newData) && (
                                        <div className="space-y-3 pt-4 border-t">
                                            <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                                                <FilePenLine className="h-4 w-4" /> Biến động dữ liệu
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {selectedLog.previousData && (
                                                    <div className="space-y-1">
                                                        <label className="text-xs text-destructive font-bold bg-destructive/10 px-2 py-1 rounded inline-block">Dữ liệu cũ (Trước khi sửa/xóa)</label>
                                                        <pre className="p-3 bg-slate-950 text-red-300 rounded-md text-xs overflow-x-auto border border-slate-800 shadow-inner max-h-[300px]">
                                                            <code>{formatJson(selectedLog.previousData)}</code>
                                                        </pre>
                                                    </div>
                                                )}
                                                
                                                {selectedLog.newData && (
                                                    <div className="space-y-1">
                                                        <label className="text-xs text-green-600 font-bold bg-green-600/10 px-2 py-1 rounded inline-block">Dữ liệu mới (Sau khi thêm/sửa)</label>
                                                        <pre className="p-3 bg-slate-950 text-green-300 rounded-md text-xs overflow-x-auto border border-slate-800 shadow-inner max-h-[300px]">
                                                            <code>{formatJson(selectedLog.newData)}</code>
                                                        </pre>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        )}
                        <DialogFooter><Button onClick={() => setIsViewOpen(false)}>Đóng</Button></DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Single Delete Confirmation */}
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent className="max-w-[400px]">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                                <AlertCircle className="h-5 w-5" />
                                Xác nhận xóa
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Bạn có chắc chắn muốn xóa nhật ký hoạt động này không? 
                                <br />
                                <span className="text-xs text-muted-foreground mt-2 block italic">
                                    Lưu ý: Hành động này không thể hoàn tác.
                                </span>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleDelete();
                                }} 
                                className="bg-red-600 hover:bg-red-700 text-white"
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Bulk Delete Confirmation */}
                <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                    <AlertDialogContent className="max-w-[400px]">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                                <AlertCircle className="h-5 w-5" />
                                Xác nhận xóa hàng loạt
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                                Bạn đã chọn **{selectedRowIds.length}** nhật ký để xóa.
                                Bạn có chắc chắn muốn xóa tất cả các mục đã chọn không?
                                <br />
                                <span className="text-xs text-muted-foreground mt-2 block italic">
                                    Lưu ý: Hành động này không thể hoàn tác.
                                </span>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={(e) => {
                                    e.preventDefault();
                                    handleBulkDelete();
                                }} 
                                className="bg-red-600 hover:bg-red-700 text-white"
                                disabled={isDeleting}
                            >
                                {isDeleting ? "Đang xóa..." : `Xóa ${selectedRowIds.length} mục`}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </TooltipProvider>
        </ClientOnly>
    );
}
