"use client";

import { useState, useMemo } from "react";
import {
    ShieldAlert, Printer, FileDown,
    Search, CheckCircle2, ArrowUpDown, ArrowUp, ArrowDown,
    CalendarDays, Filter, ChevronDown, ChevronUp,
    Cog, ShieldCheck, Library, IdCard, AlertTriangle, StickyNote, User, PenTool, FilePenLine,
    ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, X
} from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { ScrollArea } from "@/components/ui/scroll-area";
import PageHeader from "@/components/page-header";
import { ClientOnly } from "@/components/client-only";
import { useLanguage } from "@/hooks/use-language";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useCollection, useFirestore } from "@/firebase";
import { useMasterData } from "@/providers/master-data-provider";
import { collection } from "firebase/firestore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import type { StudentViolation } from "@/lib/types";

const ColumnHeader = ({ columnKey, title, icon: Icon, sortConfig, openPopover, setOpenPopover, requestSort, clearSort, filters, handleFilterChange, className }: any) => {
    const sortState = sortConfig?.key === columnKey ? sortConfig : null;
    const isFiltered = !!filters[columnKey];

    return (
        <Popover open={openPopover === columnKey} onOpenChange={(isOpen) => setOpenPopover(isOpen ? columnKey : null)}>
            <PopoverTrigger asChild>
                <div className={cn("flex items-center justify-start gap-1.5 cursor-pointer hover:bg-red-700 h-10 px-3 rounded transition-colors w-full text-white font-bold text-[11px] uppercase tracking-wider whitespace-nowrap", className)}>
                    {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />}
                    <span>{title}</span>
                    {sortState ? (
                        sortState.direction === 'asc' ?
                            <ArrowUp className={cn("ml-1 h-3 w-3 shrink-0", isFiltered && "text-yellow-300")} /> :
                            <ArrowDown className={cn("ml-1 h-3 w-3 shrink-0", isFiltered && "text-yellow-300")} />
                    ) : (
                        <ArrowUpDown className={cn("ml-1 h-3 w-3 opacity-30", isFiltered ? "text-yellow-300" : "hover:opacity-100")} />
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-0" align="start">
                <div className="p-1 space-y-1">
                    <Button variant="ghost" onClick={() => requestSort(columnKey, 'asc')} className="w-full justify-start"><ArrowUp className="mr-2 h-4 w-4" /> Tăng dần</Button>
                    <Button variant="ghost" onClick={() => requestSort(columnKey, 'desc')} className="w-full justify-start"><ArrowDown className="mr-2 h-4 w-4" /> Giảm dần</Button>
                    {sortState && <div className="border-t my-1"></div>}
                    {sortState && <Button variant="ghost" onClick={clearSort} className="w-full justify-start text-red-500 hover:text-red-600"><X className="mr-2 h-4 w-4" /> Xoá sắp xếp</Button>}
                </div>
                <div className="border-t"></div>
                <div className="p-2">
                    <div className="relative">
                        <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            autoFocus
                            placeholder={`Lọc ${title}...`}
                            value={filters[columnKey] || ''}
                            onChange={(e) => handleFilterChange(columnKey, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') setOpenPopover(null); }}
                            className="h-9 pl-8"
                        />
                    </div>
                    {isFiltered && (
                        <Button
                            variant="ghost"
                            onClick={() => handleFilterChange(columnKey, '')}
                            className="w-full justify-start text-destructive hover:text-destructive hover:bg-red-50 h-8 px-2 mt-2"
                        >
                            <X className="mr-2 h-4 w-4" /> Xóa bộ lọc
                        </Button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

// MultiSelect Component
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
                <Button variant="outline" className="w-full justify-between h-auto min-h-9 py-1 px-3 text-left font-normal flex items-center gap-2 overflow-hidden bg-white">
                    <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                        {selected.length === 0 && <span className="text-muted-foreground truncate">{placeholder}</span>}
                        {selected.map((val: string) => (
                            <Badge key={val} variant="secondary" className="max-w-[150px] inline-flex items-center gap-1 px-2 shrink-0">
                                <span className="truncate flex-1">{options.find(o => o.value === val)?.label || val}</span>
                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer" onClick={(e) => { e.stopPropagation(); handleSelect(val); }} />
                            </Badge>
                        ))}
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-0" align="start">
                <div className="p-2 border-b bg-muted/20">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input placeholder="Tìm kiếm..." className="h-7 pl-7 text-[10px]" />
                    </div>
                </div>
                <ScrollArea className="max-h-[250px]">
                    <div className="p-1 space-y-0.5">
                        {options.length === 0 && <p className="p-2 text-center text-xs text-muted-foreground">{emptyText}</p>}
                        {options.map(option => (
                            <div
                                key={option.value}
                                className={cn(
                                    "flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-muted text-xs transition-colors",
                                    selected.includes(option.value) && "bg-blue-50 text-blue-700 font-medium"
                                )}
                                onClick={() => handleSelect(option.value)}
                            >
                                <div className={cn(
                                    "flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-primary",
                                    selected.includes(option.value) ? "bg-primary text-primary-foreground" : "opacity-50"
                                )}>
                                    {selected.includes(option.value) && <CheckCircle2 className="h-3 w-3" />}
                                </div>
                                <span className="truncate">{option.label}</span>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
};

function ViolationDataTable({ data, emptyMessage, loading }: { data: StudentViolation[], emptyMessage: string, loading: boolean }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [openPopover, setOpenPopover] = useState<string | null>(null);

    const columnDefs = [
        { key: 'fullName', label: 'Họ tên', width: 'min-w-[180px]', icon: User },
        { key: 'class', label: 'Lớp', width: 'min-w-[100px]', icon: Library },
        { key: 'studentId', label: 'Mã số SV', width: 'min-w-[120px]', icon: IdCard },
        { key: 'violationDate', label: 'Ngày vi phạm', width: 'min-w-[110px]', icon: CalendarDays },
        { key: 'violationType', label: 'Lỗi vi phạm', width: 'min-w-[200px]', icon: AlertTriangle },
        { key: 'signature', label: 'Ký tên', width: 'min-w-[100px]', nonSortable: true, icon: PenTool },
        { key: 'officer', label: 'CB ghi nhận', width: 'min-w-[160px]', icon: ShieldCheck },
        { key: 'note', label: 'Ghi chú', width: 'min-w-[200px]', icon: StickyNote },
    ];

    const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('violation-report-cols', columnDefs.map(c => c.key));
    const isVisible = (key: string) => visibleColumns.includes(key);

    const toggleColumn = (key: string) => {
        setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };

    const processedData = useMemo(() => {
        let result = [...data];
        Object.entries(columnFilters).forEach(([key, value]) => {
            if (value) {
                const lowerValue = value.toLowerCase();
                result = result.filter(item => String((item as any)[key] || '').toLowerCase().includes(lowerValue));
            }
        });
        if (sortConfig) {
            result.sort((a: any, b: any) => {
                const aVal = String(a[sortConfig.key as keyof StudentViolation] || '');
                const bVal = String(b[sortConfig.key as keyof StudentViolation] || '');
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [data, columnFilters, sortConfig]);

    const totalPages = Math.max(1, Math.ceil(processedData.length / rowsPerPage));
    const currentItems = processedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const requestSort = (key: string, direction: 'asc' | 'desc') => { setSortConfig({ key, direction }); setOpenPopover(null); };
    const handleFilterChange = (key: string, value: string) => { setColumnFilters(prev => ({ ...prev, [key]: value })); setCurrentPage(1); };
    const clearSort = () => { setSortConfig(null); setOpenPopover(null); };

    return (
        <div className="flex flex-col">
            <div className="overflow-x-auto rounded-t-md border border-b-0 border-red-200">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-[#dc2626] hover:bg-[#dc2626]/90">
                            <TableHead className="w-[60px] text-center font-bold text-base text-white border-r border-red-300 whitespace-nowrap">#</TableHead>
                            {columnDefs.filter(col => isVisible(col.key)).map(col => (
                                <TableHead key={col.key} className={cn("p-0 border-r border-red-300 h-auto", col.width)}>
                                    {!col.nonSortable ? (
                                        <ColumnHeader
                                            columnKey={col.key}
                                            title={col.label}
                                            icon={col.icon}
                                            sortConfig={sortConfig}
                                            openPopover={openPopover}
                                            setOpenPopover={setOpenPopover}
                                            requestSort={requestSort}
                                            clearSort={clearSort}
                                            filters={columnFilters}
                                            handleFilterChange={handleFilterChange}
                                        />
                                    ) : (
                                        <div className="p-2 text-white font-bold text-[11px] uppercase tracking-wider text-center whitespace-nowrap flex items-center justify-center gap-1.5">
                                            {col.icon && <col.icon className="h-3.5 w-3.5 opacity-80" />}
                                            {col.label}
                                        </div>
                                    )}
                                </TableHead>
                            ))}
                            <TableHead className="w-16 text-center text-white p-0 border-l border-red-300 bg-[#dc2626]/95">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-white hover:text-white hover:bg-red-700/50 transition-colors">
                                            <Cog className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 shadow-xl border-red-100">
                                        <DropdownMenuLabel className="font-bold text-red-700">Hiển thị cột</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {columnDefs.map(col => (
                                            <DropdownMenuCheckboxItem
                                                key={col.key}
                                                checked={isVisible(col.key)}
                                                onCheckedChange={() => toggleColumn(col.key)}
                                                className="py-2"
                                            >
                                                {col.label}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={visibleColumns.length + 1} className="h-32 text-center text-muted-foreground italic">Đang tải dữ liệu...</TableCell>
                            </TableRow>
                        ) : processedData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={visibleColumns.length + 1} className="h-32 text-center text-muted-foreground italic">{emptyMessage}</TableCell>
                            </TableRow>
                        ) : currentItems.map((item, idx) => (
                            <TableRow
                                key={item.id}
                                className={cn(
                                    "hover:bg-red-50/30 cursor-pointer transition-colors border-b border-red-50",
                                    selectedRowId === item.id && "bg-red-50 font-medium"
                                )}
                                onClick={() => setSelectedRowId(item.id)}
                            >
                                <TableCell className="text-center border-r border-red-50 p-2 font-medium">{(currentPage - 1) * rowsPerPage + idx + 1}</TableCell>
                                {isVisible('fullName') && <TableCell className="border-r border-red-50 p-2 font-bold text-red-700">{item.fullName}</TableCell>}
                                {isVisible('class') && <TableCell className="border-r border-red-50 p-2 text-blue-700 font-bold">{item.class}</TableCell>}
                                {isVisible('studentId') && <TableCell className="border-r border-red-50 p-2 font-mono text-xs">{item.studentId}</TableCell>}
                                {isVisible('violationDate') && <TableCell className="border-r border-red-50 p-2 text-center font-mono text-xs">{item.violationDate}</TableCell>}
                                {isVisible('violationType') && (
                                    <TableCell className="border-r border-red-50 p-2">
                                        <Badge variant="destructive" className="text-[10px] font-bold bg-rose-100 text-rose-700 border-rose-200">
                                            {item.violationType}
                                        </Badge>
                                    </TableCell>
                                )}
                                {isVisible('signature') && (
                                    <TableCell className="border-r border-red-50 p-2 text-center">
                                        {item.signatureBase64 ? (
                                            <img src={item.signatureBase64} alt="Ký tên" className="h-8 mx-auto bg-white border rounded shadow-sm" />
                                        ) : (
                                            <span className="text-[10px] text-gray-400 italic">Chưa ký</span>
                                        )}
                                    </TableCell>
                                )}
                                {isVisible('officer') && <TableCell className="border-r border-red-50 p-2 font-medium">{item.officer}</TableCell>}
                                {isVisible('note') && <TableCell className="p-2 text-xs text-gray-500 italic leading-snug">{item.note}</TableCell>}
                                <TableCell className="p-2 text-center border-l bg-rose-50/10"></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 border border-red-200 bg-red-50/20 rounded-b-md">
                <div className="text-sm text-muted-foreground">
                    Tổng cộng {processedData.length} bản ghi. {selectedRowId && "Đã chọn 1 dòng."}
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">Số dòng</p>
                        <Select value={`${rowsPerPage}`} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                            <SelectTrigger className="h-8 w-[70px] bg-white border-red-100"><SelectValue placeholder={rowsPerPage} /></SelectTrigger>
                            <SelectContent side="top">
                                {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((s) => (<SelectItem key={s} value={`${s}`}>{s}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8 p-0 bg-white border-red-100" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 p-0 bg-white border-red-100" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                        <div className="flex items-center gap-1 font-medium text-sm">
                            <Input type="number" className="h-8 w-12 text-center bg-white border-red-100" value={currentPage} onChange={e => { const p = parseInt(e.target.value); if (p > 0 && p <= totalPages) setCurrentPage(p); }} />/ {totalPages}
                        </div>
                        <Button variant="outline" size="icon" className="h-8 w-8 p-0 bg-white border-red-100" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0}><ChevronRight className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 p-0 bg-white border-red-100" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0}><ChevronsRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function DailyViolationDataTable({ data, loading, t }: { data: StudentViolation[], loading: boolean, t: any }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [openPopover, setOpenPopover] = useState<string | null>(null);

    const columnDefs = [
        { key: 'fullName', label: 'Họ tên', width: 'min-w-[180px]', icon: User },
        { key: 'class', label: 'Lớp', width: 'min-w-[100px]', icon: Library },
        { key: 'studentId', label: 'Mã số SV', width: 'min-w-[120px]', icon: IdCard },
        { key: 'violationDate', label: 'Ngày vi phạm', width: 'min-w-[110px]', icon: CalendarDays },
        { key: 'violationType', label: 'Lỗi vi phạm', width: 'min-w-[200px]', icon: AlertTriangle },
        { key: 'officer', label: 'CB ghi nhận', width: 'min-w-[160px]', icon: ShieldCheck },
        { key: 'note', label: 'Ghi chú', width: 'min-w-[200px]', icon: StickyNote },
    ];

    const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('daily-violation-cols', columnDefs.map(c => c.key));
    const isVisible = (key: string) => visibleColumns.includes(key);

    const toggleColumn = (key: string) => {
        setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };

    const processedData = useMemo(() => {
        let result = [...data];
        Object.entries(columnFilters).forEach(([key, value]) => {
            if (value) {
                const lowerValue = value.toLowerCase();
                result = result.filter(item => String((item as any)[key] || '').toLowerCase().includes(lowerValue));
            }
        });
        if (sortConfig) {
            result.sort((a: any, b: any) => {
                const aVal = String(a[sortConfig.key as keyof StudentViolation] || '');
                const bVal = String(b[sortConfig.key as keyof StudentViolation] || '');
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [data, columnFilters, sortConfig]);

    const totalPages = Math.max(1, Math.ceil(processedData.length / rowsPerPage));
    const currentItems = processedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const requestSort = (key: string, direction: 'asc' | 'desc') => { setSortConfig({ key, direction }); setOpenPopover(null); };
    const handleFilterChange = (key: string, value: string) => { setColumnFilters(prev => ({ ...prev, [key]: value })); setCurrentPage(1); };
    const clearSort = () => { setSortConfig(null); setOpenPopover(null); };

    return (
        <div className="flex flex-col">
            <div className="overflow-x-auto rounded-t-md border border-b-0 border-red-200">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-[#dc2626] hover:bg-[#dc2626]/90 h-12">
                            <TableHead className="w-[50px] text-center font-bold text-sm text-white border-r border-red-300">#</TableHead>
                            {columnDefs.filter(col => isVisible(col.key)).map(col => (
                                <TableHead key={col.key} className={cn("p-0 border-r border-red-300 h-auto", col.width)}>
                                    <ColumnHeader
                                        columnKey={col.key}
                                        title={col.label}
                                        icon={col.icon}
                                        sortConfig={sortConfig}
                                        openPopover={openPopover}
                                        setOpenPopover={setOpenPopover}
                                        requestSort={requestSort}
                                        clearSort={clearSort}
                                        filters={columnFilters}
                                        handleFilterChange={handleFilterChange}
                                        className="text-[11px] font-black uppercase tracking-wider"
                                    />
                                </TableHead>
                            ))}
                            <TableHead className="w-16 text-center text-white p-0 border-l border-red-300 bg-[#dc2626]/95">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-white hover:text-white hover:bg-red-700/50 transition-colors">
                                            <Cog className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 shadow-xl border-red-100">
                                        <DropdownMenuLabel className="font-bold text-red-700">Hiển thị cột</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {columnDefs.map(col => (
                                            <DropdownMenuCheckboxItem
                                                key={col.key}
                                                checked={isVisible(col.key)}
                                                onCheckedChange={() => toggleColumn(col.key)}
                                                className="py-2"
                                            >
                                                {col.label}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={visibleColumns.length + 2} className="h-32 text-center text-muted-foreground italic">Đang tải...</TableCell></TableRow>
                        ) : processedData.length === 0 ? (
                            <TableRow><TableCell colSpan={visibleColumns.length + 2} className="h-32 text-center text-muted-foreground italic">Không có dữ liệu.</TableCell></TableRow>
                        ) : currentItems.map((item, idx) => (
                            <TableRow key={item.id} className="hover:bg-rose-50/30 transition-colors border-b border-rose-50">
                                <TableCell className="text-center border-r border-rose-50 p-2 font-medium">{(currentPage - 1) * rowsPerPage + idx + 1}</TableCell>
                                {isVisible('fullName') && <TableCell className="border-r border-rose-50 p-2 font-bold text-red-700 whitespace-nowrap">{item.fullName}</TableCell>}
                                {isVisible('class') && <TableCell className="border-r border-rose-50 p-2 text-blue-700 font-bold text-xs">{item.class}</TableCell>}
                                {isVisible('studentId') && <TableCell className="border-r border-rose-50 p-2 font-mono text-xs">{item.studentId}</TableCell>}
                                {isVisible('violationDate') && <TableCell className="border-r border-rose-50 p-2 text-center font-mono text-[10px]">{item.violationDate}</TableCell>}
                                {isVisible('violationType') && (
                                    <TableCell className="border-r border-rose-50 p-2">
                                        <Badge variant="destructive" className="text-[10px] font-bold bg-rose-100 text-rose-700 border-rose-200">
                                            {item.violationType}
                                        </Badge>
                                    </TableCell>
                                )}
                                {isVisible('officer') && <TableCell className="border-r border-rose-50 p-2 text-gray-700 font-medium text-xs">{item.officer}</TableCell>}
                                {isVisible('note') && <TableCell className="p-2 text-[10px] text-gray-500 italic leading-snug">{item.note}</TableCell>}
                                <TableCell className="p-2 text-center border-l bg-rose-50/10"></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 border border-red-200 bg-red-50/20 rounded-b-md">
                <div className="text-xs text-muted-foreground">Tổng cộng {processedData.length} bản ghi.</div>
                <div className="flex items-center gap-4">
                    <Select value={`${rowsPerPage}`} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                        <SelectTrigger className="h-8 w-[65px] bg-white border-red-100 text-xs"><SelectValue placeholder={rowsPerPage} /></SelectTrigger>
                        <SelectContent side="top">
                            {[5, 10, 15, 20, 25, 50].map((s) => (<SelectItem key={s} value={`${s}`}>{s}</SelectItem>))}
                        </SelectContent>
                    </Select>
                    <div className="flex gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8 bg-white border-red-100" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 bg-white border-red-100" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                        <span className="flex items-center text-xs font-medium px-2">{currentPage} / {totalPages}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8 bg-white border-red-100" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0}><ChevronRight className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 bg-white border-red-100" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0}><ChevronsRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function StudentViolationsReportPage() {
    const { t } = useLanguage();
    const firestore = useFirestore();
    const { employees, blocks } = useMasterData();

    const [fromDate, setFromDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
    const [toDate, setToDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
    const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);
    const [selectedOfficers, setSelectedOfficers] = useState<string[]>([]);
    const [selectedViolationTypes, setSelectedViolationTypes] = useState<string[]>([]);

    const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(true);

    // Data Fetching
    const violationsRef = useMemo(() => (firestore ? collection(firestore, "student-violations") : null), [firestore]);
    const { data: violationsData, loading: violationsLoading } = useCollection<StudentViolation>(violationsRef);

    const uniqueOptions = useMemo(() => {
        const buildings = (blocks || []).map((b: any) => ({ label: String(b.name || ''), value: String(b.name || '') }));
        if (!violationsData) return { officers: [] as {label: string, value: string}[], violationTypes: [] as {label: string, value: string}[], buildings };
        const officers = new Set<string>();
        const types = new Set<string>();

        violationsData.forEach(v => {
            if (v.officer) officers.add(v.officer);
            if (v.violationType) types.add(v.violationType);
        });

        return {
            officers: Array.from(officers).sort().map(v => ({ label: v, value: v })),
            violationTypes: Array.from(types).sort().map(v => ({ label: v, value: v })),
            buildings: buildings
        };
    }, [violationsData, blocks]);

    const filteredData = useMemo(() => {
        if (!violationsData) return [];

        const start = new Date(fromDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);

        return violationsData.filter(v => {
            // Date range filter
            if (v.violationDate) {
                const parts = v.violationDate.split("-");
                if (parts.length === 3) {
                    const d = new Date(v.violationDate);
                    if (d < start || d > end) return false;
                }
            }

            // Building filter
            if (selectedBuildings.length > 0 && !selectedBuildings.includes(v.building || "")) return false;

            // Officer filter
            if (selectedOfficers.length > 0 && !selectedOfficers.includes(v.officer || "")) return false;

            // Violation type filter
            if (selectedViolationTypes.length > 0 && !selectedViolationTypes.includes(v.violationType || "")) return false;

            return true;
        });
    }, [violationsData, fromDate, toDate, selectedBuildings, selectedOfficers, selectedViolationTypes]);

    const handleExport = () => {
        if (filteredData.length === 0) {
            alert("Không có dữ liệu để xuất trong ngày này!");
            return;
        }
        const exportData = filteredData.map((item, index) => ({
            "STT": index + 1,
            "Họ tên": item.fullName,
            "Lớp": item.class,
            "MSSV": item.studentId,
            "Ngày vi phạm": item.violationDate,
            "Lỗi vi phạm": item.violationType,
            "Cán bộ ghi nhận": item.officer,
            "Ghi chú": item.note
        }));
        const XLSX = require("xlsx");
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sinh Viên Vi Phạm");
        XLSX.writeFile(wb, `BaoCao_SVViPham_${fromDate}_to_${toDate}.xlsx`);
    };

    const handlePrint = () => { window.print(); };

    return (
        <ClientOnly>
            <PageHeader title="Báo cáo Sinh viên vi phạm" icon={ShieldAlert} />

            <div className="p-4 md:p-6 space-y-6">
                <Card className="shadow-lg border-none bg-white/90 backdrop-blur-md sticky top-[64px] z-10 transition-all duration-300">
                    <CardContent className="p-4">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-5 w-5 text-red-600" />
                                    <span className="font-bold text-gray-700">Bộ lọc nâng cao</span>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                                        className="ml-2 h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                        {isFilterExpanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                                        {isFilterExpanded ? "Thu gọn" : "Mở rộng bộ lọc"}
                                    </Button>
                                </div>

                                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1">
                                    <Button variant="outline" onClick={handlePrint} className="border-red-200 text-red-700 hover:bg-red-50 shadow-sm transition-all">
                                        <Printer className="h-4 w-4 mr-2" /> In báo cáo
                                    </Button>
                                    <Button variant="outline" onClick={handleExport} className="border-red-200 text-red-700 hover:bg-red-50 shadow-sm transition-all">
                                        <FileDown className="h-4 w-4 mr-2" /> Xuất Excel
                                    </Button>
                                </div>
                            </div>

                            {isFilterExpanded && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100 animate-in slide-in-from-top-2 fade-in duration-200">
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-xs font-semibold text-gray-600">Từ ngày</Label>
                                        <DatePickerField
                                            value={fromDate}
                                            onChange={val => setFromDate(val || format(new Date(), "yyyy-MM-dd"))}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-xs font-semibold text-gray-600">Đến ngày</Label>
                                        <DatePickerField
                                            value={toDate}
                                            onChange={val => setToDate(val || format(new Date(), "yyyy-MM-dd"))}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-xs font-semibold text-gray-600">Dãy nhà</Label>
                                        <MultiSelect
                                            options={uniqueOptions.buildings}
                                            selected={selectedBuildings}
                                            onChange={setSelectedBuildings}
                                            placeholder="Tất cả dãy..."
                                            emptyText="Không có dãy nhà"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-xs font-semibold text-gray-600">CB ghi nhận</Label>
                                        <MultiSelect
                                            options={uniqueOptions.officers}
                                            selected={selectedOfficers}
                                            onChange={setSelectedOfficers}
                                            placeholder="Tất cả CB..."
                                            emptyText="Không có dữ liệu"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <Label className="text-xs font-semibold text-gray-600">Lỗi vi phạm</Label>
                                        <MultiSelect
                                            options={uniqueOptions.violationTypes}
                                            selected={selectedViolationTypes}
                                            onChange={setSelectedViolationTypes}
                                            placeholder="Tất cả lỗi..."
                                            emptyText="Không có dữ liệu"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-sm overflow-hidden border-rose-100">
                    <CardHeader className="bg-red-50/80 py-3 px-6 border-b border-red-100">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-[#dc2626] flex items-center gap-2">
                            <ShieldAlert className="h-5 w-5 text-red-500" /> BÁO CÁO GHI NHẬN SINH VIÊN VI PHẠM ({filteredData.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <ViolationDataTable
                            data={filteredData}
                            emptyMessage="Không có sinh viên vi phạm bị ghi nhận trong khoảng thời gian này."
                            loading={violationsLoading}
                        />
                    </CardContent>
                </Card>
            </div>
        </ClientOnly>
    );
}
