
"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CalendarDays, 
  ListFilter, 
  FileDown, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Filter, 
  X, 
  Cog, 
  Check, 
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Undo2,
  CheckCircle2,
  Clock,
  Activity,
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from '@/hooks/use-local-storage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DailySchedule, BuildingBlock, Department, Classroom, Lecturer } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { DatePickerField } from '@/components/ui/date-picker-field';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Separator } from "@/components/ui/separator";
import { useCollection, useFirestore } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { format } from 'date-fns';
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useLanguage } from "@/hooks/use-language";
import * as XLSX from 'xlsx';

interface MultiSelectProps {
    options: { label: string; value: string }[];
    selected: string[];
    onChange: (value: string[]) => void;
    placeholder: string;
    emptyText: string;
}

const MultiSelect = ({ options, selected, onChange, placeholder, emptyText }: MultiSelectProps) => {
    const [open, setOpen] = useState(false);
    const handleSelect = (value: string) => {
        const newSelected = selected.includes(value) ? selected.filter(i => i !== value) : [...selected, value];
        onChange(newSelected);
    };
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto min-h-10 py-2 px-3 text-left font-normal flex items-center gap-2 overflow-hidden">
                    <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                        {selected.length === 0 && <span className="text-muted-foreground truncate">{placeholder}</span>}
                        {selected.map(val => (
                            <Badge key={val} variant="secondary" className="max-w-[150px] inline-flex items-center gap-1 px-2 shrink-0">
                                <span className="truncate flex-1">{options.find(o => o.value === val)?.label || val}</span>
                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer" onClick={(e) => { e.stopPropagation(); handleSelect(val); }} />
                            </Badge>
                        ))}
                    </div>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={placeholder} />
                    <CommandList>
                        <CommandEmpty>{emptyText}</CommandEmpty>
                        <CommandGroup>
                            {options.map(option => (
                                <CommandItem key={option.value} onSelect={() => handleSelect(option.value)}>
                                    <div className={cn("mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary", selected.includes(option.value) ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible")}>
                                        <Check className="h-4 w-4" />
                                    </div>
                                    <span>{option.label}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

const ColumnHeader = ({ columnKey, title, t, sortConfig, openPopover, setOpenPopover, requestSort, clearSort, filters, handleFilterChange, titleClassName }: any) => {
    const sortState = sortConfig?.find((s: any) => s.key === columnKey);
    const isFiltered = !!filters[columnKey];

    return (
        <Popover open={openPopover === columnKey} onOpenChange={(isOpen) => setOpenPopover(isOpen ? columnKey : null)}>
            <PopoverTrigger asChild>
                <Button variant="ghost" className="text-white hover:text-white hover:bg-blue-700 h-auto p-2 group w-full justify-start">
                    <span className={cn("font-bold text-base text-left truncate", titleClassName)}>{t(title)}</span>
                    {sortState ? (
                        sortState.direction === 'ascending' ? <ArrowUp className={cn("ml-2 h-4 w-4 shrink-0", isFiltered && "text-red-500")} /> : <ArrowDown className={cn("ml-2 h-4 w-4 shrink-0", isFiltered && "text-red-500")} />
                    ) : (
                        <ArrowUpDown className={cn("ml-2 h-4 w-4 shrink-0", isFiltered ? "text-red-500" : "opacity-50 group-hover:opacity-100")} />
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
                    {isFiltered && <Button variant="ghost" onClick={() => handleFilterChange(columnKey, '')} className="w-full justify-start text-destructive hover:text-destructive h-8 px-2 mt-1"><X className="mr-2 h-4 w-4" /> {t('Xóa bộ lọc')}</Button>}
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default function ScheduleViewer() {
    const { t } = useLanguage();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [advancedFilters, setAdvancedFilters] = useState<any>({
        date: format(new Date(), 'yyyy-MM-dd'), 
        buildings: [], 
        departments: [],
        rooms: [],
        lecturers: [],
        periodSession: 'all',
        periodStart: '',
        periodEnd: '',
        statuses: []
    });

    // Optimize: Fetch by date using a query
    const schedulesRef = useMemo(() => {
        if (!firestore) return null;
        const dateISO = advancedFilters.date;
        if (!dateISO) return collection(firestore, 'schedules'); // Fallback if no date (might be slow)
        
        let dateDMY = dateISO;
        if (dateISO.includes('-')) {
            const [y, m, d] = dateISO.split('-');
            dateDMY = `${d}/${m}/${y}`;
        }
        
        return query(
            collection(firestore, 'schedules'),
            where('date', 'in', [dateISO, dateDMY])
        );
    }, [firestore, advancedFilters.date]);

    const { data: rawSchedules, loading } = useCollection<DailySchedule>(schedulesRef);
    const { data: allBlocks } = useCollection<BuildingBlock>(useMemo(() => (firestore ? collection(firestore, 'building-blocks') : null), [firestore]));
    const { data: allDepts } = useCollection<Department>(useMemo(() => (firestore ? collection(firestore, 'departments') : null), [firestore]));
    const { data: allRooms } = useCollection<Classroom>(useMemo(() => (firestore ? collection(firestore, 'classrooms') : null), [firestore]));
    const { data: allLecturers } = useCollection<Lecturer>(useMemo(() => (firestore ? collection(firestore, 'lecturers') : null), [firestore]));

    const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
    const schedules = useMemo(() => rawSchedules ? rawSchedules.map((item, idx) => ({ ...item, renderId: `${item.id}-${idx}` })) as any[] : [], [rawSchedules]);

    const [currentPage, setCurrentPage] = useLocalStorage('dash_schedules_currentPage_v1', 1);
    const [rowsPerPage, setRowsPerPage] = useLocalStorage('dash_schedules_rowsPerPage_v1', 10);
    
    const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>('dash_schedules_columnVisibility_v1', { 
        date: true, period: true, type: true, department: true, class: true, studentCount: true, 
        content: true, status: true, isNotification: false, note: false
    });
    
    const [filters, setFilters] = useLocalStorage<Partial<Record<keyof DailySchedule, string>>>('dash_schedules_filters_v1', {});
    const [openPopover, setOpenPopover] = useState<string | null>(null);
    const [selectedRowIds, setSelectedRowIds] = useLocalStorage<string[]>('dash_schedules_selected_ids_v1', []);
    const selectedSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);

    const filteredItems = useMemo(() => {
        return schedules.filter(item => {
            const matchesColumnFilters = Object.entries(filters).every(([key, value]) => String(item[key as keyof DailySchedule] ?? '').toLowerCase().includes(String(value).toLowerCase()));
            if (!matchesColumnFilters) return false;

            if (advancedFilters.date) {
                const sDate = item.date;
                let formattedFilterDate = advancedFilters.date;
                if (advancedFilters.date.includes('-')) {
                    const [y, m, d] = advancedFilters.date.split('-');
                    formattedFilterDate = `${d}/${m}/${y}`;
                }
                if (sDate !== formattedFilterDate) return false;
            }
            if (advancedFilters.buildings.length > 0 && !advancedFilters.buildings.includes(item.building)) return false;
            if (advancedFilters.departments.length > 0 && !advancedFilters.departments.includes(item.department)) return false;
            if (advancedFilters.rooms.length > 0 && !advancedFilters.rooms.includes(item.room)) return false;
            if (advancedFilters.lecturers.length > 0 && !advancedFilters.lecturers.includes(item.lecturer)) return false;
            
            if (advancedFilters.periodSession !== 'all') {
                const itemPeriodStr = String(item.period ?? '');
                const itemParts = itemPeriodStr.split('->').map(p => parseInt(p.trim(), 10));
                const itemStart = itemParts[0];
                
                if (!isNaN(itemStart)) {
                    if (advancedFilters.periodSession === 'morning') {
                        if (!(itemStart >= 1 && itemStart <= 6)) return false;
                    } else if (advancedFilters.periodSession === 'afternoon') {
                        if (!(itemStart >= 7 && itemStart <= 12)) return false;
                    } else if (advancedFilters.periodSession === 'evening') {
                        if (!(itemStart >= 13 && itemStart <= 17)) return false;
                    } else if (advancedFilters.periodSession === 'custom') {
                        const filterStart = parseInt(advancedFilters.periodStart, 10);
                        const filterEnd = parseInt(advancedFilters.periodEnd, 10);
                        if (!isNaN(filterStart) && itemStart < filterStart) return false;
                        if (!isNaN(filterEnd) && itemStart > filterEnd) return false;
                    }
                }
            }

            if (advancedFilters.statuses.length > 0 && !advancedFilters.statuses.includes(item.status)) return false;
            
            return true;
        });
    }, [schedules, filters, advancedFilters]);

    const [sortConfig, setSortConfig] = useLocalStorage<any[]>('dash_schedules_sortConfig_v1', []);
    const sortedItems = useMemo(() => {
        let sortableItems = [...filteredItems];
        if (sortConfig.length > 0) {
            sortableItems.sort((a, b) => {
                const config = sortConfig[0];
                const aValue = a[config.key];
                const bValue = b[config.key];
                if (aValue === null || aValue === undefined) return 1;
                if (bValue === null || bValue === undefined) return -1;
                if (String(aValue) < String(bValue)) return config.direction === 'ascending' ? -1 : 1;
                if (String(aValue) > String(bValue)) return config.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [filteredItems, sortConfig]);

    const safeRowsPerPage = Math.max(1, Number(rowsPerPage) || 10);
    const totalPages = Math.max(1, Math.ceil(sortedItems.length / safeRowsPerPage));
    const safeCurrentPage = Math.min(Math.max(1, Number(currentPage) || 1), totalPages);
    const startIndex = Math.max(0, (safeCurrentPage - 1) * safeRowsPerPage);
    const currentItems = sortedItems.slice(startIndex, startIndex + safeRowsPerPage);

    const handleRowClick = useCallback((renderId: string) => {
        setSelectedRowIds(prev => {
            const next = new Set(prev);
            if (next.has(renderId)) next.delete(renderId); else next.add(renderId);
            return Array.from(next);
        });
    }, [setSelectedRowIds]);

    const handleExport = () => {
        const ws = XLSX.utils.json_to_sheet(sortedItems);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Schedule");
        XLSX.writeFile(wb, `LichHoc_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    };

    const columnDefs: Record<string, { title: string, titleClassName?: string }> = { 
        date: { title: 'Ngày' }, 
        period: { title: 'Tiết' }, 
        type: { title: 'LT/TH' },
        department: { title: 'Khoa sử dụng' }, 
        class: { title: 'Lớp' }, 
        studentCount: { title: 'Sĩ số' }, 
        content: { title: 'Nội dung' }, 
        status: { title: 'Trạng thái' },
        isNotification: { title: 'Thông báo' },
        note: { title: 'Ghi chú' }
    };
    const allColumns = Object.keys(columnDefs);
    const orderedColumns = allColumns.filter(key => columnVisibility[key]);

    return (
        <Card className="shadow-md">
            <CardHeader className="py-3 border-b">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <CalendarDays className="h-6 w-6 text-primary" />
                        {t('Tra cứu Lịch học')}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button onClick={() => setIsAdvancedFilterOpen(true)} variant="ghost" size="icon" className="text-orange-500">
                                        <ListFilter className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{t('Bộ lọc nâng cao')}</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button onClick={handleExport} variant="ghost" size="icon" className="text-green-600">
                                        <FileDown className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>{t('Xuất file Excel')}</p></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
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
                                        <ColumnHeader 
                                            columnKey={key} 
                                            title={columnDefs[key].title} 
                                            titleClassName={columnDefs[key].titleClassName}
                                            t={t} 
                                            sortConfig={sortConfig} 
                                            openPopover={openPopover} 
                                            setOpenPopover={setOpenPopover} 
                                            requestSort={(k:any, d:any) => setSortConfig([{key:k, direction:d}])} 
                                            clearSort={() => setSortConfig([])} 
                                            filters={filters} 
                                            handleFilterChange={(k:any, v:string) => { setFilters(p => ({...p,[k]:v})); setCurrentPage(1); }} 
                                        />
                                    </TableHead>
                                ))}
                                <TableHead className="w-16 text-center text-white font-bold text-base">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-blue-700"><Cog className="h-5 w-5" /></Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="max-h-[400px] overflow-y-auto">
                                            <DropdownMenuLabel>Hiển thị cột</DropdownMenuLabel>
                                            <DropdownMenuSeparator />
                                            {allColumns.map(key => (
                                                <DropdownMenuCheckboxItem key={key} checked={columnVisibility[key]} onCheckedChange={v => setColumnVisibility(prev => ({...prev, [key]: !!v}))}>{t(columnDefs[key].title)}</DropdownMenuCheckboxItem>
                                            ))}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? <TableRow><TableCell colSpan={orderedColumns.length + 2} className="h-24 text-center">Đang tải...</TableCell></TableRow> : currentItems.length > 0 ? currentItems.map((item, index) => {
                                const isSelected = selectedSet.has(item.renderId);
                                return (
                                    <TableRow 
                                        key={item.renderId} 
                                        onClick={() => handleRowClick(item.renderId)} 
                                        data-state={isSelected ? "selected" : ""} 
                                        className={cn(
                                            "cursor-pointer odd:bg-white even:bg-muted/30 transition-all hover:bg-yellow-300 hover:text-black",
                                            "data-[state=selected]:bg-red-800 data-[state=selected]:text-white"
                                        )}
                                    >
                                        <TableCell className="font-medium text-center border-r text-inherit align-middle py-3">{startIndex + index + 1}</TableCell>
                                        {orderedColumns.map(key => (
                                            <TableCell key={key} className={cn("font-medium border-r text-inherit align-middle py-3")}>
                                                {key === 'room' ? <span className={cn("font-bold", !isSelected && "text-blue-600")}>{(item as any)[key]}</span> :
                                                 key === 'period' ? <Badge variant="outline" className="font-mono">{(item as any)[key]}</Badge> :
                                                 key === 'status' ? (
                                                     <div className="flex flex-col gap-1">
                                                         <span>{item.status}</span>
                                                         {item.incident && <Badge variant="destructive" className="text-[10px] h-4 px-1 w-fit">{item.incident}</Badge>}
                                                     </div>
                                                 ) : key === 'isNotification' ? (
                                                     item.isNotification ? <Badge className="bg-blue-600">Có</Badge> : <Badge variant="outline">Không</Badge>
                                                 ) : String((item as any)[key] ?? '')}
                                            </TableCell>
                                        ))}
                                        <TableCell className="text-center py-3 text-inherit align-middle">-</TableCell>
                                    </TableRow>
                                );
                            }) : <TableRow><TableCell colSpan={orderedColumns.length + 2} className="h-24 text-center">Không có dữ liệu phù hợp.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t">
                <div className="text-sm text-muted-foreground">Tổng cộng {sortedItems.length} bản ghi. {selectedSet.size > 0 && `Đã chọn ${selectedSet.size} dòng.`}</div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">Số dòng</p>
                        <Select value={`${safeRowsPerPage}`} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                            <SelectTrigger className="h-8 w-[70px]"><SelectValue placeholder={safeRowsPerPage} /></SelectTrigger>
                            <SelectContent side="top">
                                {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((s) => (<SelectItem key={s} value={`${s}`}>{s}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={safeCurrentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                        <div className="flex items-center gap-1 font-medium text-sm"><Input type="number" className="h-8 w-12 text-center" value={safeCurrentPage} onChange={e => { const p = parseInt(e.target.value, 10); if (p > 0 && p <= totalPages) setCurrentPage(p); }} />/ {totalPages}</div>
                        <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={safeCurrentPage === totalPages || totalPages === 0}><ChevronRight className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 p-0" onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages || totalPages === 0}><ChevronsRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            </CardFooter>

            <Dialog open={isAdvancedFilterOpen} onOpenChange={setIsAdvancedFilterOpen}>
                <DialogContent className="sm:max-w-3xl">
                    <DialogHeader><DialogTitle>Bộ lọc nâng cao</DialogTitle><VisuallyHidden><DialogDescription>Lọc lịch học.</DialogDescription></VisuallyHidden></DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Ngày lọc</Label>
                            <DatePickerField value={advancedFilters.date} onChange={val => setAdvancedFilters({...advancedFilters, date: val || ''})} className="h-9" />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><Clock className="h-4 w-4 text-orange-500" /> Ca học</Label>
                            <Select 
                                value={advancedFilters.periodSession} 
                                onValueChange={v => setAdvancedFilters({...advancedFilters, periodSession: v})}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn ca học..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả</SelectItem>
                                    <SelectItem value="morning">Ca sáng (1-6)</SelectItem>
                                    <SelectItem value="afternoon">Ca chiều (7-12)</SelectItem>
                                    <SelectItem value="evening">Ca tối (13-17)</SelectItem>
                                    <SelectItem value="custom">Tùy chọn...</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {advancedFilters.periodSession === 'custom' && (
                            <div className="md:col-span-2 grid grid-cols-2 gap-4 border p-3 rounded-lg bg-muted/20">
                                <div className="space-y-2">
                                    <Label>Từ tiết</Label>
                                    <Input type="number" min={1} max={17} value={advancedFilters.periodStart} onChange={e => setAdvancedFilters({...advancedFilters, periodStart: e.target.value})} placeholder="Ví dụ: 1" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Đến tiết</Label>
                                    <Input type="number" min={1} max={17} value={advancedFilters.periodEnd} onChange={e => setAdvancedFilters({...advancedFilters, periodEnd: e.target.value})} placeholder="Ví dụ: 10" />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><Activity className="h-4 w-4 text-green-500" /> Trạng thái (Chọn nhiều)</Label>
                            <MultiSelect 
                                options={[
                                    { label: 'Phòng học', value: 'Phòng học' },
                                    { label: 'Phòng thi', value: 'Phòng thi' },
                                    { label: 'Phòng tự do', value: 'Phòng tự do' }
                                ]} 
                                selected={advancedFilters.statuses} 
                                onChange={v => setAdvancedFilters({...advancedFilters, statuses: v})} 
                                placeholder="Chọn trạng thái..." 
                                emptyText="Không tìm thấy" 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Khoa/Đơn vị (Chọn nhiều)</Label>
                            <MultiSelect options={allDepts?.map(d => ({ label: d.name, value: d.name })) || []} selected={advancedFilters.departments} onChange={v => setAdvancedFilters({...advancedFilters, departments: v})} placeholder="Chọn khoa..." emptyText="Không có dữ liệu" />
                        </div>
                        <div className="space-y-2">
                            <Label>Giảng viên (Chọn nhiều)</Label>
                            <MultiSelect options={allLecturers?.map(l => ({ label: l.name, value: l.name })) || []} selected={advancedFilters.lecturers} onChange={v => setAdvancedFilters({...advancedFilters, lecturers: v})} placeholder="Chọn giảng viên..." emptyText="Không có dữ liệu" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAdvancedFilters({ date: format(new Date(), 'yyyy-MM-dd'), buildings: [], departments: [], rooms: [], lecturers: [], periodSession: 'all', periodStart: '', periodEnd: '', statuses: [] })}>
                            <Undo2 className="mr-2 h-4 w-4" />Xóa tất cả
                        </Button>
                        <Button onClick={() => setIsAdvancedFilterOpen(false)}>
                            <CheckCircle2 className="mr-2 h-4 w-4" />Áp dụng
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
