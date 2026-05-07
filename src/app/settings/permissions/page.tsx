"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import React, { useState, useMemo, useCallback, Fragment } from 'react';
import { 
  ShieldCheck, PlusCircle, Trash2, Edit, Cog, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, 
  ArrowDown, Filter, X, Save, Undo2, ListFilter, Check,
  Search, RefreshCw, ChevronDown, LayoutDashboard, UserCircle,
  Building2, Network, GraduationCap, Users, School, Gift,
  Users2, Shield, Trophy, AlertTriangle, UserCheck, Video,
  Presentation, ClipboardList, Briefcase, UserX, Package,
  FileQuestion, FileText, CalendarDays, BarChart3, Heart,
  FileStack, AlertCircle, Calendar, Settings2, Key, History,
  IdCard, FileType, Camera, Hash, Edit3, Plus, 
  FileUp, FileDown, CheckSquare, QrCode, MonitorPlay, MessageSquareQuote,
  Bot, MessagesSquare, Mail, Eye, LayoutGrid
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { logActivity } from "@/lib/activity-logger";
import { collection, doc, setDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import PageHeader from "@/components/page-header";
import { ClientOnly } from "@/components/client-only";
import { useLanguage } from "@/hooks/use-language";
import { STAFF_PERMISSIONS, CONTROLLER_PERMISSIONS, ADMIN_PERMISSIONS, LECTURER_PERMISSIONS, ADVISOR_PERMISSIONS } from '@/lib/permissions-defaults';
import type { Role, Permissions } from '@/lib/types';

const MODULE_CATEGORIES = [
    {
        title: 'Tổng quan',
        modules: [
            { id: '/dashboard', label: 'Bảng điều khiển (Dashboard)', icon: LayoutDashboard }
        ]
    },
    {
        title: 'Bộ danh mục',
        modules: [
            { id: '/personnel/positions', label: 'Danh mục Chức vụ', icon: UserCircle },
            { id: '/personnel/building-blocks', label: 'Danh mục Dãy nhà', icon: Building2 },
            { id: '/personnel/departments', label: 'Danh mục Đơn vị', icon: Network },
            { id: '/personnel/lecturers', label: 'Danh mục Giảng viên', icon: GraduationCap },
            { id: '/personnel/employees', label: 'Danh mục Nhân viên', icon: Users },
            { id: '/personnel/classrooms', label: 'Danh mục Phòng học', icon: School },
            { id: '/personnel/gifts', label: 'Danh mục Quà tặng', icon: Gift },
            { id: '/personnel/students', label: 'Danh mục Sinh viên', icon: Users2 },
            { id: '/personnel/roles', label: 'Danh mục Vai trò', icon: Shield },
            { id: '/personnel/recognitions', label: 'Việc ghi nhận', icon: Trophy },
            { id: '/personnel/incident-categories', label: 'Việc phát sinh', icon: AlertTriangle },
            { id: '/personnel/document-types', label: 'Loại văn bản', icon: FileType }
        ]
    },
    {
        title: 'Công cụ kiểm tra',
        modules: [
            { id: '/monitoring/homeroom', label: 'Cố vấn học tập', icon: UserCheck },
            { id: '/monitoring/online', label: 'Lớp học online', icon: Video },
            { id: '/monitoring/in-person', label: 'Lớp học trực tiếp', icon: Presentation },
            { id: '/monitoring/exams', label: 'Thi kết thúc môn', icon: ClipboardList },
            { id: '/monitoring/external-practice', label: 'Thực hành ngoài', icon: Briefcase },
            { id: '/monitoring/student-violations', label: 'Sinh viên vi phạm', icon: UserX },
            { id: '/monitoring/asset-check', label: 'Nhận - Trả tài sản', icon: Package },
            { id: '/monitoring/requests', label: 'Tiếp nhận yêu cầu', icon: FileQuestion },
            { id: '/monitoring/petitions', label: 'Tiếp nhận đơn thư', icon: FileText },
            { id: '/monitoring/document-records', label: 'Quản lý hồ sơ', icon: FileStack }
        ]
    },
    {
        title: 'Báo cáo thống kê',
        modules: [
            { id: '/reports/daily', label: 'Báo cáo cuối ngày', icon: CalendarDays },
            { id: '/reports/comprehensive', label: 'Việc không phù hợp', icon: BarChart3 },
            { id: '/reports/student-violations', label: 'Báo cáo Sinh viên vi phạm', icon: UserX },
            { id: '/reports/good-deeds', label: 'Người tốt việc tốt', icon: Heart },
            { id: '/reports/request-reports', label: 'Báo cáo Tiếp nhận yêu cầu', icon: FileStack },
            { id: '/reports/incident-reports', label: 'Báo cáo Tiếp nhận đơn thư', icon: AlertCircle }
        ]
    },
    {
        title: 'Thiết lập hệ thống',
        modules: [
            { id: '/settings/schedule', label: 'Lịch học theo ngày', icon: Calendar },
            { id: '/settings/parameters', label: 'Tham số hệ thống', icon: Settings2 },
            { id: '/settings/permissions', label: 'Phân quyền truy cập', icon: Key },
            { id: '/settings/access-log', label: 'Nhật ký truy cập', icon: History }
        ]
    },
    {
        title: 'Công cụ hỗ trợ',
        modules: [
            { id: '/monitoring/external-checkins', label: 'Giám sát thực hành', icon: QrCode },
            { id: '/monitoring/online-classes', label: 'Giám sát Online', icon: MonitorPlay },
            { id: '/feedback', label: 'Minh chứng ca trực', icon: MessageSquareQuote },
            { id: '/monitoring/evidence', label: 'Kho minh chứng', icon: Camera },
            { id: '/ai/assistant', label: 'Tra cứu thông tin', icon: Search },
            { id: '/monitoring/document-lookup', label: 'Tra cứu văn bản', icon: Search },
            { id: '/discussion', label: 'Bảng thảo luận', icon: MessagesSquare },
            { id: '/messaging', label: 'Hộp thư nội bộ', icon: Mail },
            { id: '/lecturer-portal', label: 'Portal Giảng viên', icon: UserCircle }
        ]
    }
];

const ALL_MODULES = MODULE_CATEGORIES.flatMap(cat => cat.modules);

const PERMISSION_KEYS = ['access', 'view', 'add', 'edit', 'delete', 'import', 'export'] as const;
const PERMISSION_LABELS: Record<string, { label: string, icon: any }> = {
    access: { label: 'Truy cập', icon: Shield },
    view: { label: 'Xem', icon: Eye },
    add: { label: 'Thêm', icon: Plus },
    edit: { label: 'Sửa', icon: Edit3 },
    delete: { label: 'Xóa', icon: Trash2 },
    import: { label: 'Import', icon: FileUp },
    export: { label: 'Export', icon: FileDown }
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


export default function PermissionsPage() {
    const { t } = useLanguage();
    const firestore = useFirestore();
    const { user: authUser } = useUser();
    const { toast } = useToast();

    const rolesRef = useMemo(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'roles'), orderBy('name', 'asc'));
    }, [firestore]);

    const { data: rawRoles, loading } = useCollection<Role>(rolesRef as any);

    const roles = useMemo(() => {
        if (!rawRoles) return [];
        return rawRoles.map((role, idx) => ({
            ...role,
            renderId: `${role.id}-${idx}`
        }));
    }, [rawRoles]);

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [formData, setFormData] = useState<Partial<Role>>({ name: '', note: '', permissions: {} });
    const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (title: string) => {
        setExpandedGroups(prev => ({ ...prev, [title]: !prev[title] }));
    };

    const [currentPage, setCurrentPage] = useLocalStorage('permissions_currentPage_v1', 1);
    const [rowsPerPage, setRowsPerPage] = useLocalStorage('permissions_rowsPerPage_v1', 20);
    const [sortConfig, setSortConfig] = useLocalStorage<any[]>('permissions_sortConfig_v1', []);
    
    const columnDefs: any = { 
        name: 'Tên vai trò', 
        note: 'Ghi chú'
    };
    
    const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>('permissions_colVis_v1', { 
        name: true, note: true
    });
    const colIcons: Record<string, any> = {
        name: IdCard,
        note: FileType
    };
    const allColumns = Object.keys(columnDefs);
    const orderedColumns = allColumns.filter(key => columnVisibility[key]);

    const [filters, setFilters] = useLocalStorage<Partial<Record<keyof Role, string>>>('permissions_filters_v1', {});
    const [openPopover, setOpenPopover] = useState<string | null>(null);

    const filteredItems = useMemo(() => {
        return roles.filter(item => {
            const matchesColumnFilters = Object.entries(filters).every(([key, value]) => String((item as any)[key] ?? '').toLowerCase().includes(String(value).toLowerCase()));
            if (!matchesColumnFilters) return false;
            return true;
        });
    }, [roles, filters]);

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

    const openDialog = (mode: 'add' | 'edit', item?: any) => {
        setDialogMode(mode); 
        setSelectedItem(item || null);
        
        let initialData: Partial<Role> = { name: '', note: '', permissions: {} };
        if (item) {
            initialData = JSON.parse(JSON.stringify(item));
        } else {
            const emptyPerms: Permissions = {};
            ALL_MODULES.forEach(m => {
                emptyPerms[m.id] = { access: false, view: false, add: false, edit: false, delete: false, import: false, export: false };
            });
            initialData.permissions = emptyPerms;
        }

        setFormData(initialData);
        
        // Collapsed by default
        setExpandedGroups({});
        
        setIsEditDialogOpen(true);
    };

    const handleSave = async () => {
        if (!firestore) return;
        try {
            const id = (dialogMode === 'edit' && selectedItem) ? selectedItem.id : doc(collection(firestore, 'roles')).id;
            const dataToSave = { ...formData, id };
            
            await setDoc(doc(firestore, "roles", id), dataToSave, { merge: true });
            
            if (authUser?.uid) {
                await logActivity(
                    authUser.uid,
                    dialogMode === 'edit' ? 'update' : 'create',
                    'Role',
                    `${dialogMode === 'edit' ? 'Cập nhật' : 'Thêm mới'} vai trò: ${dataToSave.name}`,
                    { 
                        userEmail: authUser.email || undefined,
                        previousData: dialogMode === 'edit' ? selectedItem : null,
                        newData: dataToSave
                    }
                );
            }

            setIsEditDialogOpen(false); 
            toast({ title: "Thành công", description: "Đã lưu thông tin vai trò." });
        } catch (error) {
            console.error("Error saving role:", error);
            toast({ title: "Lỗi", description: "Có lỗi xảy ra khi lưu.", variant: "destructive" });
        }
    };

    const confirmDelete = async () => { 
        if (firestore && selectedItem) { 
            try {
                await deleteDoc(doc(firestore, "roles", selectedItem.id)); 
                
                if (authUser?.uid) {
                    await logActivity(
                        authUser.uid,
                        'delete',
                        'Role',
                        `Xóa vai trò: ${selectedItem.name}`,
                        { 
                            userEmail: authUser.email || undefined,
                            previousData: selectedItem
                        }
                    );
                }

                toast({ title: "Thành công", description: "Đã xóa vai trò." }); 
            } catch (error) {
                console.error("Error deleting role:", error);
                toast({ title: "Lỗi", description: "Có lỗi xảy ra khi xóa.", variant: "destructive" });
            }
        } 
        setIsDeleteDialogOpen(false); 
    };

    const togglePermission = (moduleId: string, key: keyof Permissions[string], value: boolean) => {
        setFormData(prev => {
            const currentPerms = prev.permissions || {};
            const modulePerms = currentPerms[moduleId] || {};
            
            const updatedModulePerms = { ...modulePerms, [key]: value };
            
            if (value && key !== 'access') {
                updatedModulePerms.access = true;
                if (key !== 'view') updatedModulePerms.view = true;
            }

            return {
                ...prev,
                permissions: {
                    ...currentPerms,
                    [moduleId]: updatedModulePerms
                }
            };
        });
    };

    const toggleRowPermissions = (moduleId: string, value: boolean) => {
        setFormData(prev => {
            const currentPerms = prev.permissions || {};
            const modulePerms: any = {};
            PERMISSION_KEYS.forEach(k => {
                modulePerms[k] = value;
            });
            return {
                ...prev,
                permissions: {
                    ...currentPerms,
                    [moduleId]: modulePerms
                }
            };
        });
    };

    const toggleColumnPermissions = (key: keyof Permissions[string], value: boolean) => {
        setFormData(prev => {
            const currentPerms = { ...(prev.permissions || {}) };
            ALL_MODULES.forEach(m => {
                const mp = currentPerms[m.id] || {};
                const updated = { ...mp, [key]: value };
                if (value && key !== 'access') {
                    updated.access = true;
                    if (key !== 'view') updated.view = true;
                }
                currentPerms[m.id] = updated;
            });
            return {
                ...prev,
                permissions: currentPerms
            };
        });
    };

    return (
        <ClientOnly>
            <TooltipProvider>
                <PageHeader title="Phân quyền truy cập" icon={ShieldCheck} />
                <div className="p-4 md:p-6">
                    <Card>
                        <CardHeader className="py-3 border-b">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xl flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-primary" />Danh sách Vai trò</CardTitle>
                                <div className="flex items-center gap-2">
                                    <Tooltip><TooltipTrigger asChild><Button onClick={() => openDialog('add')} variant="ghost" size="icon" className="text-primary"><PlusCircle className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Thêm mới')}</p></TooltipContent></Tooltip>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-[#1877F2] hover:bg-[#1877F2]/90">
                                            <TableHead className="w-[80px] font-bold text-base text-white text-center border-r border-blue-300">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Hash className="h-4 w-4 opacity-80" />
                                                    <span>#</span>
                                                </div>
                                            </TableHead>
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
                                                return (
                                                    <TableRow key={item.renderId} className="odd:bg-white even:bg-muted/30 transition-all hover:bg-yellow-100">
                                                        <TableCell className="font-medium text-center align-middle py-3 border-r text-inherit">
                                                            {startIndex + idx + 1}
                                                        </TableCell>
                                                        {orderedColumns.map(key => (
                                                            <TableCell key={key} className="border-r text-inherit align-middle py-3">
                                                                {key === 'name' ? (
                                                                    <div className="font-bold text-primary flex items-center gap-2">
                                                                        <ShieldCheck className="h-4 w-4 text-blue-600" />
                                                                        {String((item as any)[key] ?? '')}
                                                                    </div>
                                                                ) : (
                                                                    String((item as any)[key] ?? '')
                                                                )}
                                                            </TableCell>
                                                        ))}
                                                        <TableCell className="text-center py-3 text-inherit align-middle">
                                                            <div className="flex items-center justify-center gap-2">
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-100" onClick={() => openDialog('edit', item)}>
                                                                            <Edit className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>{t('Chỉnh sửa / Phân quyền')}</p></TooltipContent>
                                                                </Tooltip>
                                                                
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-100" onClick={() => { setSelectedItem(item); setIsDeleteDialogOpen(true); }}>
                                                                            <Trash2 className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent><p>{t('Xóa')}</p></TooltipContent>
                                                                </Tooltip>
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
                            <div className="text-sm text-muted-foreground">{t('Tổng cộng')} {sortedItems.length} {t('vai trò')}</div>
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

                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col p-0">
                        <DialogHeader className="p-6 pb-2 border-b">
                            <DialogTitle className="text-xl flex items-center gap-2">
                                <ShieldCheck className="h-6 w-6 text-primary" />
                                {dialogMode === 'edit' ? 'Cập nhật phân quyền Vai trò' : 'Thêm mới Vai trò'}
                            </DialogTitle>
                            <VisuallyHidden><DialogDescription>Cấu hình thông tin.</DialogDescription></VisuallyHidden>
                        </DialogHeader>
                        
                        <ScrollArea className="flex-1 overflow-y-auto">
                            <div className="p-6 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-4 rounded-lg border">
                                    <div className="space-y-2">
                                        <Label className="font-bold text-primary">Tên vai trò <span className="text-red-500">*</span></Label>
                                        <Input 
                                            value={formData.name || ''} 
                                            onChange={e => setFormData({...formData, name: e.target.value})} 
                                            placeholder="Nhập tên vai trò (VD: Giảng viên, Quản trị viên...)"
                                            className="font-semibold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="font-bold text-muted-foreground">Ghi chú</Label>
                                        <Input 
                                            value={formData.note || ''} 
                                            onChange={e => setFormData({...formData, note: e.target.value})} 
                                            placeholder="Nhập mô tả cho vai trò này"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-lg border-l-4 border-primary pl-3">Ma trận phân quyền</h3>
                                        <div className="flex items-center gap-2">
                                            <Button variant="outline" size="sm" onClick={() => {
                                                const allChecked = ALL_MODULES.every(m => PERMISSION_KEYS.every(k => formData.permissions?.[m.id]?.[k]));
                                                ALL_MODULES.forEach(m => toggleRowPermissions(m.id, !allChecked));
                                            }}>
                                                <Check className="h-4 w-4 mr-2" />
                                                Chọn / Bỏ chọn tất cả
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="border rounded-md overflow-hidden">
                                        <Table>
                                            <TableHeader className="bg-slate-100 sticky top-0 z-10">
                                                <TableRow>
                                                    <TableHead className="font-bold text-black border-r border-slate-300 bg-slate-200">
                                                        <div className="flex items-center gap-2">
                                                            <Package className="h-4 w-4 text-primary" />
                                                            <span>Chức năng (Module)</span>
                                                        </div>
                                                    </TableHead>
                                                    {PERMISSION_KEYS.map(key => (
                                                        <TableHead key={key} className="text-center font-bold text-black border-r border-slate-300 w-24">
                                                            <div className="flex flex-col items-center gap-2">
                                                                <div className="flex items-center gap-1 text-[10px] uppercase tracking-tighter text-slate-500">
                                                                    {React.createElement(PERMISSION_LABELS[key].icon, { className: "h-3 w-3" })}
                                                                    <span>{PERMISSION_LABELS[key].label}</span>
                                                                </div>
                                                                <Checkbox 
                                                                    checked={ALL_MODULES.every(m => formData.permissions?.[m.id]?.[key])}
                                                                    onCheckedChange={(checked) => toggleColumnPermissions(key, !!checked)}
                                                                />
                                                            </div>
                                                        </TableHead>
                                                    ))}
                                                    <TableHead className="w-24 text-center font-bold text-black">
                                                        <div className="flex flex-col items-center gap-2">
                                                            <div className="flex items-center gap-1 text-[10px] uppercase tracking-tighter text-slate-500">
                                                                <CheckSquare className="h-3 w-3" />
                                                                <span>Tất cả</span>
                                                            </div>
                                                        </div>
                                                    </TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {MODULE_CATEGORIES.map(category => {
                                                    const isExpanded = expandedGroups[category.title];
                                                    return (
                                                        <Fragment key={category.title}>
                                                            <TableRow 
                                                                className="bg-slate-100/50 cursor-pointer hover:bg-slate-200/50 transition-colors group"
                                                                onClick={() => toggleGroup(category.title)}
                                                            >
                                                                <TableCell colSpan={PERMISSION_KEYS.length + 2} className="py-2.5 px-4 bg-blue-50/50">
                                                                    <div className="flex items-center gap-2">
                                                                        {isExpanded ? (
                                                                            <ChevronDown className="h-4 w-4 text-primary" />
                                                                        ) : (
                                                                            <ChevronRight className="h-4 w-4 text-primary" />
                                                                        )}
                                                                        <span className="font-bold text-primary text-sm uppercase tracking-wider">{category.title}</span>
                                                                        <Badge variant="secondary" className="ml-2 text-[10px] py-0 h-4 px-1.5 opacity-70 group-hover:opacity-100">
                                                                            {category.modules.length} chức năng
                                                                        </Badge>
                                                                    </div>
                                                                </TableCell>
                                                            </TableRow>
                                                            {isExpanded && category.modules.map(module => {
                                                                const isAllChecked = PERMISSION_KEYS.every(k => formData.permissions?.[module.id]?.[k]);
                                                                const Icon = module.icon;
                                                                return (
                                                                    <TableRow key={module.id} className="hover:bg-blue-50/30 transition-colors">
                                                                        <TableCell className="font-medium border-r border-slate-200 pl-8 text-sm">
                                                                            <div className="flex items-center gap-3">
                                                                                <div className="p-1.5 rounded-md bg-slate-100 text-slate-600">
                                                                                    <Icon className="h-4 w-4" />
                                                                                </div>
                                                                                {module.label}
                                                                            </div>
                                                                        </TableCell>
                                                                        {PERMISSION_KEYS.map(key => (
                                                                            <TableCell key={key} className="text-center border-r border-slate-200">
                                                                                <Checkbox 
                                                                                    checked={!!formData.permissions?.[module.id]?.[key]}
                                                                                    onCheckedChange={(checked) => togglePermission(module.id, key, !!checked)}
                                                                                    className={cn(
                                                                                        key === 'access' ? 'data-[state=checked]:bg-blue-600' : 
                                                                                        key === 'delete' ? 'data-[state=checked]:bg-red-600' :
                                                                                        'data-[state=checked]:bg-green-600'
                                                                                    )}
                                                                                />
                                                                            </TableCell>
                                                                        ))}
                                                                        <TableCell className="text-center bg-slate-50/30 border-l border-slate-200">
                                                                            <Checkbox 
                                                                                checked={isAllChecked}
                                                                                onCheckedChange={(checked) => toggleRowPermissions(module.id, !!checked)}
                                                                            />
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </Fragment>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        </ScrollArea>
                        
                        <div className="p-4 border-t bg-slate-50 flex justify-end gap-3 mt-auto">
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Hủy bỏ</Button>
                            <Button onClick={handleSave} disabled={!formData.name?.trim()} className="min-w-32">
                                <Save className="mr-2 h-4 w-4" /> Lưu lại
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Xác nhận xóa vai trò?</AlertDialogTitle>
                            <AlertDialogDescription>
                                Hành động này không thể hoàn tác. Bạn có chắc chắn muốn xóa vai trò <span className="font-bold text-destructive">"{selectedItem?.name}"</span>?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Hủy</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={confirmDelete}>Xóa</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </TooltipProvider>
        </ClientOnly>
    );
}
