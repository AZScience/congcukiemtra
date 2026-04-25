"use client";

import { useState, useMemo } from "react";
import { 
  HeartHandshake, Printer, FileDown, 
  Search, CheckCircle2, ArrowUpDown, ArrowUp, ArrowDown,
  CalendarDays, Filter, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X,
  Package, Star, Cog, ShieldCheck, Landmark, IdCard, Library, Phone, Gift, User, StickyNote, Hash, Building
} from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import PageHeader from "@/components/page-header";
import { ClientOnly } from "@/components/client-only";
import { useLanguage } from "@/hooks/use-language";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useCollection, useFirestore } from "@/firebase";
import { useMasterData } from "@/providers/master-data-provider";
import { collection } from "firebase/firestore";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const ColumnHeader = ({ columnKey, title, icon: Icon, sortConfig, openPopover, setOpenPopover, requestSort, clearSort, filters, handleFilterChange, className }: any) => {
    const sortState = sortConfig?.key === columnKey ? sortConfig : null;
    const isFiltered = !!filters[columnKey];

    return (
        <Popover open={openPopover === columnKey} onOpenChange={(isOpen) => setOpenPopover(isOpen ? columnKey : null)}>
            <PopoverTrigger asChild>
                <div className={cn("flex items-center justify-start gap-1.5 cursor-pointer hover:bg-blue-700 h-10 px-3 rounded transition-colors w-full text-white font-bold text-[11px] uppercase tracking-wider whitespace-nowrap", className)}>
                    {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />}
                    <span className="truncate flex-1 text-left">{title}</span>
                    {sortState ? (
                        sortState.direction === 'asc' ? 
                        <ArrowUp className={cn("ml-1 h-3 w-3 shrink-0", isFiltered && "text-red-300")} /> : 
                        <ArrowDown className={cn("ml-1 h-3 w-3 shrink-0", isFiltered && "text-red-300")} />
                    ) : (
                        <ArrowUpDown className={cn("ml-1 h-3 w-3 opacity-30", isFiltered ? "text-red-300" : "hover:opacity-100")} />
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-0 shadow-2xl border-blue-100" align="start">
                <div className="p-1.5 space-y-1">
                    <Button variant="ghost" onClick={() => requestSort(columnKey, 'asc')} className="w-full justify-start text-xs h-9 font-medium text-gray-700"><ArrowUp className="mr-2 h-4 w-4 text-blue-600" /> Sắp xếp tăng dần</Button>
                    <Button variant="ghost" onClick={() => requestSort(columnKey, 'desc')} className="w-full justify-start text-xs h-9 font-medium text-gray-700"><ArrowDown className="mr-2 h-4 w-4 text-blue-600" /> Sắp xếp giảm dần</Button>
                    {sortState && <div className="border-t my-1"></div>}
                    {sortState && <Button variant="ghost" onClick={clearSort} className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 text-xs h-9 font-medium"><X className="mr-2 h-4 w-4" /> Xoá sắp xếp</Button>}
                </div>
                <div className="border-t"></div>
                <div className="p-3 bg-gray-50/50 space-y-2">
                    <div className="relative">
                        <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <Input
                            autoFocus
                            placeholder={`Lọc ${title}...`}
                            value={filters[columnKey] || ''}
                            onChange={(e) => handleFilterChange(columnKey, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') setOpenPopover(null); }}
                            className="h-8 pl-8 text-xs bg-white border-gray-100"
                        />
                    </div>
                    {isFiltered && (
                        <Button 
                            variant="ghost" 
                            onClick={() => handleFilterChange(columnKey, '')} 
                            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 h-7 px-2 text-[10px] font-bold"
                        >
                            <X className="mr-2 h-3.5 w-3.5" /> Xóa bộ lọc
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
    const [searchQuery, setSearchQuery] = useState("");
    
    const handleSelect = (value: string) => {
        const newSelected = selected.includes(value) ? selected.filter(i => i !== value) : [...selected, value];
        onChange(newSelected);
    };

    const filteredOptions = options.filter(o => 
        o.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
        o.value.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto min-h-9 py-1 px-3 text-left font-normal flex items-center gap-2 overflow-hidden bg-white shadow-sm border-gray-200 hover:border-gray-300 transition-all">
                    <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                        {selected.length === 0 && <span className="text-muted-foreground truncate text-xs">{placeholder}</span>}
                        {selected.map((val: string) => (
                            <Badge key={val} variant="secondary" className="max-w-[150px] inline-flex items-center gap-1 px-2 shrink-0 bg-gray-100 text-gray-700 border-none hover:bg-gray-200">
                                <span className="truncate flex-1 text-[10px]">{options.find(o => o.value === val)?.label || val}</span>
                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground cursor-pointer" onClick={(e) => { e.stopPropagation(); handleSelect(val); }} />
                            </Badge>
                        ))}
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-0 shadow-xl border-gray-200" align="start">
                <div className="p-2 border-b bg-muted/20">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input 
                            placeholder="Tìm kiếm..." 
                            className="h-7 pl-7 text-[10px] border-none focus-visible:ring-0 bg-transparent" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>
                <ScrollArea className="max-h-[250px]">
                    <div className="p-1 space-y-0.5">
                        {filteredOptions.length === 0 && <p className="p-2 text-center text-xs text-muted-foreground">{emptyText}</p>}
                        {filteredOptions.map(option => (
                            <div
                                key={option.value}
                                className={cn(
                                    "flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-muted text-xs transition-colors",
                                    selected.includes(option.value) && "bg-blue-50 text-blue-700 font-medium"
                                )}
                                onClick={() => handleSelect(option.value)}
                            >
                                <div className={cn(
                                    "flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-primary transition-all",
                                    selected.includes(option.value) ? "bg-primary border-primary text-primary-foreground" : "opacity-50 border-gray-300"
                                )}>
                                    {selected.includes(option.value) && <CheckCircle2 className="h-3 w-3" />}
                                </div>
                                <span className="truncate">{option.label}</span>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
                {selected.length > 0 && (
                    <div className="p-1 border-t bg-gray-50">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full h-7 text-[10px] text-muted-foreground hover:text-red-600 hover:bg-red-50"
                            onClick={() => onChange([])}
                        >
                            Xóa tất cả ({selected.length})
                        </Button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    );
};

// --- Table cho Tiếp nhận tài sản (24 cột) ---
function PropertyDataTable({ data, emptyMessage }: { data: any[], emptyMessage: string }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'} | null>(null);
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [openPopover, setOpenPopover] = useState<string | null>(null);

    // Column definitions for visibility toggle
    const columnDefs = [
        { key: 'code', label: 'Số vào sổ', group: 'Chung', icon: Hash },
        { key: 'campus', label: 'Cơ sở', group: 'Chung', icon: Building },
        
        { key: 'receptionDate', label: 'Ngày tiếp nhận', group: 'Tiếp nhận', icon: CalendarDays },
        { key: 'recipient', label: 'Nhân sự tiếp nhận', group: 'Tiếp nhận', icon: ShieldCheck },
        { key: 'finderName', label: 'Tên người giao', group: 'Tiếp nhận', icon: User },
        { key: 'finderId', label: 'MSSV/CCCD/SĐT', group: 'Tiếp nhận', icon: IdCard },
        { key: 'finderDept', label: 'Đơn vị', group: 'Tiếp nhận', icon: Landmark },
        { key: 'property', label: 'Nội dung TS', group: 'Tiếp nhận', icon: Package },
        
        { key: 'returnDate', label: 'Ngày giao trả', group: 'Giao trả', icon: CalendarDays },
        { key: 'returner', label: 'Nhân sự giao trả', group: 'Giao trả', icon: ShieldCheck },
        { key: 'ownerName', label: 'Tên người nhận', group: 'Giao trả', icon: User },
        { key: 'ownerId', label: 'MSSV/CCCD', group: 'Giao trả', icon: IdCard },
        { key: 'ownerClass', label: 'Lớp', group: 'Giao trả', icon: Library },
        { key: 'ownerDept', label: 'Đơn vị Khoa/Viện', group: 'Giao trả', icon: Landmark },
        { key: 'ownerPhone', label: 'Điện thoại', group: 'Giao trả', icon: Phone },
        
        { key: 'appreciationCode', label: 'Số vào sổ (TÂ)', group: 'Tri ân', icon: Hash },
        { key: 'appreciationCampus', label: 'Cơ sở (TÂ)', group: 'Tri ân', icon: Building },
        { key: 'appreciationName', label: 'Họ và tên (TÂ)', group: 'Tri ân', icon: User },
        { key: 'appreciationRecDate', label: 'Ngày nhận TS (TÂ)', group: 'Tri ân', icon: CalendarDays },
        { key: 'appreciationGiveDate', label: 'Ngày tri ân', group: 'Tri ân', icon: Star },
        { key: 'gift', label: 'Quà', group: 'Tri ân', icon: Gift },
        { key: 'appreciationId', label: 'MSSV/SĐT (TÂ)', group: 'Tri ân', icon: IdCard },
        { key: 'appreciationDept', label: 'Đơn vị (TÂ)', group: 'Tri ân', icon: Landmark },
        { key: 'note', label: 'Ghi chú', group: 'Tri ân', icon: StickyNote },
    ];

    const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('gooddeeds-property-cols', columnDefs.map(c => c.key));
    const isVisible = (key: string) => visibleColumns.includes(key);

    const toggleColumn = (key: string) => {
        setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
    };

    // Calculate colSpans dynamically
    const receptionColSpan = columnDefs.filter(c => c.group === 'Tiếp nhận' && isVisible(c.key)).length;
    const returnColSpan = columnDefs.filter(c => c.group === 'Giao trả' && isVisible(c.key)).length;
    const gratitudeColSpan = columnDefs.filter(c => c.group === 'Tri ân' && isVisible(c.key)).length;

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
                const aVal = String(a[sortConfig.key] || '');
                const bVal = String(b[sortConfig.key] || '');
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [data, columnFilters, sortConfig]);

    const totalPages = Math.max(1, Math.ceil(processedData.length / rowsPerPage));
    const currentItems = processedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const requestSort = (key: string, direction: 'asc'|'desc') => { setSortConfig({ key, direction }); setOpenPopover(null); };
    const handleFilterChange = (key: string, value: string) => { setColumnFilters(prev => ({ ...prev, [key]: value })); setCurrentPage(1); };
    const clearSort = () => { setSortConfig(null); setOpenPopover(null); };

    const totalVisibleColumns = visibleColumns.length + 1;

    return (
        <div className="flex flex-col">
            <div className="overflow-x-auto rounded-t-md border border-b-0 border-blue-200">
                <Table className="min-w-[3000px]">
                    <TableHeader>
                        <TableRow className="bg-[#1877F2]">
                            <TableHead rowSpan={2} className="w-[50px] text-center font-bold text-base text-white border-r border-b border-blue-300 align-middle">#</TableHead>
                            {isVisible('code') && (
                                <TableHead rowSpan={2} className="w-[80px] p-0 border-r border-b border-blue-300 align-middle whitespace-nowrap">
                                    <ColumnHeader columnKey="code" title="Số vào sổ" icon={Hash} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}
                            {isVisible('campus') && (
                                <TableHead rowSpan={2} className="w-[100px] p-0 border-r border-b border-blue-300 align-middle whitespace-nowrap">
                                    <ColumnHeader columnKey="campus" title="Cơ sở" icon={Building} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}
                            
                            {receptionColSpan > 0 && <TableHead colSpan={receptionColSpan} className="text-center font-bold text-sm text-white border-r border-b border-blue-300 p-2 uppercase bg-[#1877F2]/90">Phần tiếp nhận</TableHead>}
                            {returnColSpan > 0 && <TableHead colSpan={returnColSpan} className="text-center font-bold text-sm text-white border-r border-b border-blue-300 p-2 uppercase bg-[#1877F2]/80">Phần giao trả</TableHead>}
                            {gratitudeColSpan > 0 && <TableHead colSpan={gratitudeColSpan} className="text-center font-bold text-sm text-white border-b border-blue-300 p-2 uppercase bg-[#1877F2]/90">Phần tri ân</TableHead>}
                            
                            <TableHead rowSpan={2} className="w-16 text-center text-white p-0 border-b border-l border-blue-300 align-middle bg-[#1877F2]/95">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-white hover:text-white hover:bg-blue-700/50 transition-colors">
                                            <Cog className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64 max-h-[400px] overflow-y-auto shadow-xl border-blue-100">
                                        <DropdownMenuLabel className="font-bold text-blue-700">Cấu hình hiển thị cột</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {['Chung', 'Tiếp nhận', 'Giao trả', 'Tri ân'].map(group => (
                                            <div key={group}>
                                                <div className="px-2 py-1.5 text-[11px] font-black uppercase tracking-wider text-muted-foreground bg-gray-50 border-y border-gray-100 mb-1">{group}</div>
                                                {columnDefs.filter(c => c.group === group).map(col => (
                                                    <DropdownMenuCheckboxItem
                                                        key={col.key}
                                                        checked={isVisible(col.key)}
                                                        onCheckedChange={() => toggleColumn(col.key)}
                                                        className="text-sm py-2"
                                                    >
                                                        {col.label}
                                                    </DropdownMenuCheckboxItem>
                                                ))}
                                            </div>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableHead>
                        </TableRow>
                        
                        <TableRow className="bg-[#1877F2] hover:bg-[#1877F2]/90">
                            {/* Tiếp nhận */}
                            {isVisible('receptionDate') && (
                                <TableHead className="w-[110px] p-0 border-r border-blue-300 align-middle h-auto">
                                    <ColumnHeader columnKey="receptionDate" title="Ngày tiếp nhận" icon={CalendarDays} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}
                            {isVisible('recipient') && (
                                <TableHead className="w-[130px] p-0 border-r border-blue-300 align-middle h-auto">
                                    <ColumnHeader columnKey="recipient" title="Nhân sự tiếp nhận" icon={ShieldCheck} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}
                            {isVisible('finderName') && (
                                <TableHead className="w-[150px] p-0 border-r border-blue-300 align-middle h-auto">
                                    <ColumnHeader columnKey="finderName" title="Họ và tên người giao" icon={User} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}
                            {isVisible('finderId') && (
                                <TableHead className="w-[130px] p-0 border-r border-blue-300 align-middle h-auto">
                                    <ColumnHeader columnKey="finderId" title="MSSV/CCCD/SĐT" icon={IdCard} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}
                            {isVisible('finderDept') && (
                                <TableHead className="w-[150px] p-0 border-r border-blue-300 align-middle h-auto">
                                    <ColumnHeader columnKey="finderDept" title="Đơn vị" icon={Landmark} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}
                            {isVisible('property') && (
                                <TableHead className="w-[200px] p-0 border-r border-blue-300 align-middle h-auto">
                                    <ColumnHeader columnKey="property" title="Nội dung TS, đồ vật" icon={Package} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}

                            {/* Giao trả */}
                            {isVisible('returnDate') && (
                                <TableHead className="w-[110px] p-0 border-r border-blue-300 align-middle h-auto bg-[#1877F2]/80">
                                    <ColumnHeader columnKey="returnDate" title="Ngày giao trả" icon={CalendarDays} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}
                            {isVisible('returner') && (
                                <TableHead className="w-[130px] p-0 border-r border-blue-300 align-middle h-auto bg-[#1877F2]/80">
                                    <ColumnHeader columnKey="returner" title="Nhân sự giao trả" icon={ShieldCheck} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}
                            {isVisible('ownerName') && (
                                <TableHead className="w-[150px] p-0 border-r border-blue-300 align-middle h-auto bg-[#1877F2]/80">
                                    <ColumnHeader columnKey="ownerName" title="Họ và tên người nhận" icon={User} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}
                            {isVisible('ownerId') && (
                                <TableHead className="w-[100px] p-0 border-r border-blue-300 align-middle h-auto bg-[#1877F2]/80">
                                    <ColumnHeader columnKey="ownerId" title="MSSV/CCCD" icon={IdCard} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}
                            {isVisible('ownerClass') && (
                                <TableHead className="w-[80px] p-0 border-r border-blue-300 align-middle h-auto bg-[#1877F2]/80">
                                    <ColumnHeader columnKey="ownerClass" title="Lớp" icon={Library} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}
                            {isVisible('ownerDept') && (
                                <TableHead className="w-[150px] p-0 border-r border-blue-300 align-middle h-auto bg-[#1877F2]/80">
                                    <ColumnHeader columnKey="ownerDept" title="Đơn vị Khoa/Viện" icon={Landmark} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}
                            {isVisible('ownerPhone') && (
                                <TableHead className="w-[100px] p-0 border-r border-blue-300 align-middle h-auto bg-[#1877F2]/80">
                                    <ColumnHeader columnKey="ownerPhone" title="Điện thoại" icon={Phone} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}

                            {/* Tri ân */}
                            {isVisible('appreciationCode') && (
                                <TableHead className="w-[90px] p-0 border-r border-blue-300 align-middle h-auto">
                                    <ColumnHeader columnKey="appreciationCode" title="Số vào sổ (TÂ)" icon={Hash} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}
                            {isVisible('appreciationCampus') && (
                                <TableHead className="w-[90px] p-0 border-r border-blue-300 align-middle h-auto">
                                    <ColumnHeader columnKey="appreciationCampus" title="Cơ sở" icon={Building} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}
                            {isVisible('appreciationName') && (
                                <TableHead className="w-[130px] p-0 border-r border-blue-300 align-middle h-auto">
                                    <ColumnHeader columnKey="appreciationName" title="Họ và tên" icon={User} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}
                            {isVisible('appreciationRecDate') && (
                                <TableHead className="w-[110px] p-0 border-r border-blue-300 align-middle h-auto">
                                    <ColumnHeader columnKey="appreciationRecDate" title="Ngày nhận TS" icon={CalendarDays} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}
                            {isVisible('appreciationGiveDate') && (
                                <TableHead className="w-[110px] p-0 border-r border-blue-300 align-middle h-auto">
                                    <ColumnHeader columnKey="appreciationGiveDate" title="Ngày tri ân" icon={Star} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}
                            {isVisible('gift') && (
                                <TableHead className="w-[120px] p-0 border-r border-blue-300 align-middle h-auto">
                                    <ColumnHeader columnKey="gift" title="Quà" icon={Gift} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}
                            {isVisible('appreciationId') && (
                                <TableHead className="w-[130px] p-0 border-r border-blue-300 align-middle h-auto">
                                    <ColumnHeader columnKey="appreciationId" title="MSSV/SĐT" icon={IdCard} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}
                            {isVisible('appreciationDept') && (
                                <TableHead className="w-[130px] p-0 border-r border-blue-300 align-middle h-auto">
                                    <ColumnHeader columnKey="appreciationDept" title="Đơn vị" icon={Landmark} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}
                            {isVisible('note') && (
                                <TableHead className="w-[150px] p-0 align-middle h-auto">
                                    <ColumnHeader columnKey="note" title="Ghi chú" icon={StickyNote} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                </TableHead>
                            )}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {processedData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={totalVisibleColumns} className="h-32 text-center text-muted-foreground italic">
                                    {emptyMessage}
                                </TableCell>
                            </TableRow>
                        ) : currentItems.map((item, idx) => (
                            <TableRow 
                                key={item.id} 
                                className={cn(
                                    "hover:bg-[#f0f7ff] cursor-pointer transition-colors border-b border-gray-200",
                                    selectedRowId === item.id && "bg-[#e1effe] font-medium"
                                )}
                                onClick={() => setSelectedRowId(item.id)}
                            >
                                <TableCell className="text-center border-r p-2 font-medium">{(currentPage - 1) * rowsPerPage + idx + 1}</TableCell>
                                {isVisible('code') && <TableCell className="text-center border-r p-2 font-medium">{item.code}</TableCell>}
                                {isVisible('campus') && <TableCell className="text-center border-r p-2">{item.campus}</TableCell>}
                                
                                {/* Tiếp nhận */}
                                {isVisible('receptionDate') && <TableCell className="text-center border-r p-2">{item.receptionDate}</TableCell>}
                                {isVisible('recipient') && <TableCell className="border-r p-2">{item.recipient}</TableCell>}
                                {isVisible('finderName') && <TableCell className="border-r p-2">{item.finderName}</TableCell>}
                                {isVisible('finderId') && <TableCell className="text-center border-r p-2">{item.finderId}</TableCell>}
                                {isVisible('finderDept') && <TableCell className="border-r p-2">{item.finderDept}</TableCell>}
                                {isVisible('property') && <TableCell className="border-r p-2 text-xs">{item.property}</TableCell>}

                                {/* Giao trả */}
                                {isVisible('returnDate') && <TableCell className="text-center border-r p-2 bg-blue-50/30">{item.returnDate}</TableCell>}
                                {isVisible('returner') && <TableCell className="border-r p-2 bg-blue-50/30">{item.returner}</TableCell>}
                                {isVisible('ownerName') && <TableCell className="border-r p-2 bg-blue-50/30">{item.ownerName}</TableCell>}
                                {isVisible('ownerId') && <TableCell className="text-center border-r p-2 bg-blue-50/30">{item.ownerId}</TableCell>}
                                {isVisible('ownerClass') && <TableCell className="text-center border-r p-2 bg-blue-50/30">{item.ownerClass}</TableCell>}
                                {isVisible('ownerDept') && <TableCell className="border-r p-2 bg-blue-50/30">{item.ownerDept}</TableCell>}
                                {isVisible('ownerPhone') && <TableCell className="text-center border-r p-2 bg-blue-50/30">{item.ownerPhone}</TableCell>}

                                {/* Tri ân */}
                                {isVisible('appreciationCode') && <TableCell className="text-center border-r p-2">{item.appreciationCode}</TableCell>}
                                {isVisible('appreciationCampus') && <TableCell className="text-center border-r p-2">{item.appreciationCampus}</TableCell>}
                                {isVisible('appreciationName') && <TableCell className="border-r p-2">{item.appreciationName}</TableCell>}
                                {isVisible('appreciationRecDate') && <TableCell className="text-center border-r p-2">{item.appreciationRecDate}</TableCell>}
                                {isVisible('appreciationGiveDate') && <TableCell className="text-center border-r p-2">{item.appreciationGiveDate}</TableCell>}
                                {isVisible('gift') && <TableCell className="border-r p-2">{item.gift}</TableCell>}
                                {isVisible('appreciationId') && <TableCell className="text-center border-r p-2">{item.appreciationId}</TableCell>}
                                {isVisible('appreciationDept') && <TableCell className="border-r p-2">{item.appreciationDept}</TableCell>}
                                {isVisible('note') && <TableCell className="border-r p-2">{item.note}</TableCell>}
                                <TableCell className="p-2 text-center border-l bg-blue-50/10"></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 border border-blue-200 bg-gray-50/50 rounded-b-md">
                <div className="text-sm text-muted-foreground">
                    Tổng cộng {processedData.length} bản ghi. {selectedRowId && "Đã chọn 1 dòng."}
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">Số dòng</p>
                        <Select value={`${rowsPerPage}`} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                            <SelectTrigger className="h-8 w-[70px] bg-white"><SelectValue placeholder={rowsPerPage} /></SelectTrigger>
                            <SelectContent side="top">
                                {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((s) => (<SelectItem key={s} value={`${s}`}>{s}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8 p-0 bg-white" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 p-0 bg-white" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                        <div className="flex items-center gap-1 font-medium text-sm">
                            <Input type="number" className="h-8 w-12 text-center bg-white" value={currentPage} onChange={e => { const p = parseInt(e.target.value); if (p > 0 && p <= totalPages) setCurrentPage(p); }} />/ {totalPages}
                        </div>
                        <Button variant="outline" size="icon" className="h-8 w-8 p-0 bg-white" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0}><ChevronRight className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 p-0 bg-white" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0}><ChevronsRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Generic Table Component cho Tab Tri ân ---
function DataTable({ data, columns, emptyMessage }: { data: any[], columns: {key: string, title: string, width?: string}[], emptyMessage: string }) {
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(15);
    const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
    const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'} | null>(null);
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
    const [openPopover, setOpenPopover] = useState<string | null>(null);

    const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('gooddeeds-deed-cols', columns.map(c => c.key));
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
                const aVal = String(a[sortConfig.key] || '');
                const bVal = String(b[sortConfig.key] || '');
                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return result;
    }, [data, columnFilters, sortConfig]);

    const totalPages = Math.max(1, Math.ceil(processedData.length / rowsPerPage));
    const currentItems = processedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    const requestSort = (key: string, direction: 'asc'|'desc') => { setSortConfig({ key, direction }); setOpenPopover(null); };
    const handleFilterChange = (key: string, value: string) => { setColumnFilters(prev => ({ ...prev, [key]: value })); setCurrentPage(1); };
    const clearSort = () => { setSortConfig(null); setOpenPopover(null); };

    const visibleColsCount = visibleColumns.length + 1;

    return (
        <div className="flex flex-col">
            <div className="overflow-x-auto rounded-t-md border border-b-0 border-blue-200">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-[#1877F2] hover:bg-[#1877F2]/90">
                            <TableHead className="w-[60px] text-center font-bold text-base text-white border-r border-blue-300">#</TableHead>
                            {columns.filter(col => isVisible(col.key)).map(col => {
                                const icons: any = {
                                    appreciationCode: Hash,
                                    appreciationCampus: Building,
                                    appreciationName: User,
                                    appreciationRecDate: CalendarDays,
                                    appreciationGiveDate: Star,
                                    gift: Gift,
                                    appreciationId: IdCard,
                                    appreciationDept: Landmark,
                                    refCode: Hash,
                                    note: StickyNote
                                };
                                return (
                                    <TableHead key={col.key} className={cn("p-0 border-r border-blue-300 h-auto", col.width)}>
                                        <ColumnHeader columnKey={col.key} title={col.title} icon={icons[col.key]} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                                    </TableHead>
                                );
                            })}
                            <TableHead className="w-16 text-center text-white p-0 border-l border-blue-300 bg-[#1877F2]/95">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-10 w-10 text-white hover:text-white hover:bg-blue-700/50">
                                            <Cog className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 shadow-xl border-blue-100">
                                        <DropdownMenuLabel className="font-bold text-blue-700">Hiển thị cột</DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {columns.map(col => (
                                            <DropdownMenuCheckboxItem
                                                key={col.key}
                                                checked={isVisible(col.key)}
                                                onCheckedChange={() => toggleColumn(col.key)}
                                                className="py-2"
                                            >
                                                {col.title}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {processedData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={visibleColsCount} className="h-32 text-center text-muted-foreground italic">{emptyMessage}</TableCell>
                            </TableRow>
                        ) : currentItems.map((item, idx) => (
                            <TableRow 
                                key={item.id} 
                                className={cn("hover:bg-[#f0f7ff] cursor-pointer transition-colors border-b border-gray-200", selectedRowId === item.id && "bg-[#e1effe] font-medium")}
                                onClick={() => setSelectedRowId(item.id)}
                            >
                                <TableCell className="text-center border-r p-2 font-medium">{(currentPage - 1) * rowsPerPage + idx + 1}</TableCell>
                                {columns.filter(col => isVisible(col.key)).map(col => (
                                    <TableCell key={col.key} className="border-r p-2 text-gray-800">{item[col.key]}</TableCell>
                                ))}
                                <TableCell className="p-2 text-center border-l bg-blue-50/10"></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 border border-blue-200 bg-gray-50/50 rounded-b-md">
                <div className="text-sm text-muted-foreground">
                    Tổng cộng {processedData.length} bản ghi. {selectedRowId && "Đã chọn 1 dòng."}
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">Số dòng</p>
                        <Select value={`${rowsPerPage}`} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                            <SelectTrigger className="h-8 w-[70px] bg-white"><SelectValue placeholder={rowsPerPage} /></SelectTrigger>
                            <SelectContent side="top">
                                {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((s) => (<SelectItem key={s} value={`${s}`}>{s}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex gap-1">
                        <Button variant="outline" size="icon" className="h-8 w-8 p-0 bg-white" onClick={() => setCurrentPage(1)} disabled={currentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 p-0 bg-white" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                        <div className="flex items-center gap-1 font-medium text-sm">
                            <Input type="number" className="h-8 w-12 text-center bg-white" value={currentPage} onChange={e => { const p = parseInt(e.target.value); if (p > 0 && p <= totalPages) setCurrentPage(p); }} />/ {totalPages}
                        </div>
                        <Button variant="outline" size="icon" className="h-8 w-8 p-0 bg-white" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages || totalPages === 0}><ChevronRight className="h-4 w-4" /></Button>
                        <Button variant="outline" size="icon" className="h-8 w-8 p-0 bg-white" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages || totalPages === 0}><ChevronsRight className="h-4 w-4" /></Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function GoodDeedsReportPage() {
  const { t } = useLanguage();
  const firestore = useFirestore();
  const [fromDate, setFromDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState("property");

  const { blocks, employees } = useMasterData();

  const uniqueOptions = useMemo(() => {
    return {
        buildings: (blocks || []).map((b: any) => ({ label: b.name, value: b.name })).sort((a: any, b: any) => a.label.localeCompare(b.label)),
        recipients: (employees || []).filter((e: any) => e.nickname).map((e: any) => ({ label: e.nickname, value: e.nickname })).sort((a: any, b: any) => a.label.localeCompare(b.label))
    };
  }, [blocks, employees]);
  
  // Data Fetching
  const goodsRef = useMemo(() => (firestore ? collection(firestore, "asset-receptions") : null), [firestore]);
  const { data: rawData, loading } = useCollection<any>(goodsRef);

  // Normalize data for the two tabs

  // Normalize data for the two tabs
  const { propertyData, deedData } = useMemo(() => {
    if (!rawData) return { propertyData: [], deedData: [] };

    const start = new Date(fromDate);
    start.setHours(0,0,0,0);
    const end = new Date(toDate);
    end.setHours(23,59,59,999);

    const filtered = rawData.filter(item => {
        const dateStr = item.receptionDate || item.gratitudeDate || item.resolutionDate || item.date;
        if (!dateStr) return false;
        
        let d;
        if (dateStr.includes("/")) {
            const [day, month, year] = dateStr.split("/");
            d = new Date(`${year}-${month}-${day}`);
        } else {
            d = new Date(dateStr);
        }
        
        const inDateRange = d >= start && d <= end;
        if (!inDateRange) return false;

        if (selectedBuildings.length > 0 && !selectedBuildings.includes(item.buildingBlock)) return false;
        if (selectedRecipients.length > 0 && !selectedRecipients.includes(item.receivingStaff)) return false;

        return true;
    });
    
    const propertyList: any[] = [];
    const deedList: any[] = [];

    filtered.forEach((item, idx) => {
        // All items in asset-receptions are property-related
        propertyList.push({
            id: item.id || `prop-${idx}`,
            code: item.entryNumber || "---",
            campus: item.buildingBlock || "---",
            receptionDate: item.receptionDate || "---",
            recipient: item.receivingStaff || "---",
            finderName: item.giverName || "---",
            finderId: item.giverId || "---",
            finderDept: item.giverUnit || "---",
            property: item.content || "---",
            returnDate: item.resolutionDate || "---",
            returner: item.returnStaff || "---",
            ownerName: item.receiverName || "---",
            ownerId: item.receiverId || "---",
            ownerClass: item.receiverClass || "---",
            ownerDept: item.receiverUnit || "---",
            ownerPhone: item.receiverPhone || "---",
            appreciationCode: item.gratitudeNumber || "---",
            appreciationCampus: item.buildingBlock || "---",
            appreciationName: item.giverName || "---",
            appreciationRecDate: item.receptionDate || "---",
            appreciationGiveDate: item.gratitudeDate || "---",
            gift: item.gratitudeGift || "---",
            appreciationId: item.giverId || "---",
            appreciationDept: item.giverUnit || "---",
            note: item.receiverFeedback || "---"
        });

        // If it's a good deed (gratitude), add to deed list too
        if (item.isGratitude) {
            deedList.push({
                id: item.id || `deed-${idx}`,
                appreciationCode: item.gratitudeNumber || "---",
                appreciationCampus: item.buildingBlock || "---",
                appreciationName: item.giverName || "---",
                appreciationRecDate: item.receptionDate || "---",
                appreciationGiveDate: item.gratitudeDate || "---",
                gift: item.gratitudeGift || "---",
                appreciationId: item.giverId || "---",
                appreciationDept: item.giverUnit || "---",
                refCode: item.entryNumber || "---",
                note: item.receiverFeedback || "---"
            });
        }
    });

    return { propertyData: propertyList, deedData: deedList };
  }, [rawData, fromDate, toDate]);

  const handleExport = () => {
    const sheetName = activeTab === 'property' ? "Tiếp nhận tài sản" : "Tri ân người việc tốt";
    
    if (activeTab === 'property') {
        if (propertyData.length === 0) { alert("Không có dữ liệu Tiếp nhận tài sản để xuất!"); return; }
        // Cần map ra mảng 1 cấp cho Excel
        const exportData = propertyData.map((item, index) => ({
            "STT": index + 1,
            "Số vào sổ": item.code,
            "Cơ sở": item.campus,
            "Ngày tiếp nhận": item.receptionDate,
            "Nhân sự tiếp nhận": item.recipient,
            "Họ và tên người giao TS": item.finderName,
            "MSSV/CCCD/SĐT": item.finderId,
            "Đơn vị người giao": item.finderDept,
            "Nội dung TS": item.property,
            "Ngày giao trả": item.returnDate,
            "Nhân sự giao trả": item.returner,
            "Họ và tên người nhận": item.ownerName,
            "MSSV/CCCD người nhận": item.ownerId,
            "Lớp người nhận": item.ownerClass,
            "Đơn vị người nhận": item.ownerDept,
            "SĐT người nhận": item.ownerPhone,
            "Số vào sổ (TÂ)": item.appreciationCode,
            "Cơ sở (TÂ)": item.appreciationCampus,
            "Họ và tên (TÂ)": item.appreciationName,
            "Ngày tiếp nhận TS (TÂ)": item.appreciationRecDate,
            "Ngày tri ân": item.appreciationGiveDate,
            "Quà tri ân": item.gift,
            "MSSV/SĐT (TÂ)": item.appreciationId,
            "Đơn vị (TÂ)": item.appreciationDept,
            "Ghi chú (TÂ)": item.note
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `TiepNhanTaiSan_${fromDate}_to_${toDate}.xlsx`);
    } else {
        if (deedData.length === 0) { alert("Không có dữ liệu Tri ân để xuất!"); return; }
        const exportData = deedData.map((item, index) => ({
            "STT": index + 1,
            "Số vào sổ": item.appreciationCode,
            "Cơ sở": item.appreciationCampus,
            "Họ và tên": item.appreciationName,
            "Ngày tiếp nhận tài sản": item.appreciationRecDate,
            "Ngày trao tặng thư": item.appreciationGiveDate,
            "Quà": item.gift,
            "MSSV/CCCD; Số điện thoại": item.appreciationId,
            "Đơn vị": item.appreciationDept,
            "Số vào sổ tiếp nhận và bàn giao tài sản": item.refCode,
            "Ghi chú": item.note
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `TriAnNguoiViecTot_${fromDate}_to_${toDate}.xlsx`);
    }
  };

  const handlePrint = () => { window.print(); };

  return (
    <ClientOnly>
      <PageHeader title="Người tốt việc tốt" icon={HeartHandshake} />
      
      <div className="p-4 md:p-6 space-y-6">
        <Card className="shadow-lg border-none bg-white/90 backdrop-blur-md sticky top-[64px] z-10 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-green-600" />
                  <span className="font-bold text-gray-700">Bộ lọc nâng cao</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsFilterExpanded(!isFilterExpanded)} 
                    className="ml-2 h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    {isFilterExpanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                    {isFilterExpanded ? "Thu gọn" : "Mở rộng bộ lọc"}
                  </Button>
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1">
                  <Button variant="outline" onClick={handlePrint} className="border-green-200 text-green-700 hover:bg-green-50 shadow-sm transition-all">
                    <Printer className="h-4 w-4 mr-2" /> In báo cáo
                  </Button>
                  <Button variant="outline" onClick={handleExport} className="border-green-200 text-green-700 hover:bg-green-50 shadow-sm transition-all">
                    <FileDown className="h-4 w-4 mr-2" /> Xuất Excel
                  </Button>
                </div>
              </div>

              {isFilterExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100 animate-in slide-in-from-top-2 fade-in duration-200">
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
                        placeholder="Chọn dãy nhà..."
                        emptyText="Không tìm thấy dãy nhà"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs font-semibold text-gray-600">Nhân viên tiếp nhận</Label>
                    <MultiSelect 
                        options={uniqueOptions.recipients}
                        selected={selectedRecipients}
                        onChange={setSelectedRecipients}
                        placeholder="Chọn nhân viên..."
                        emptyText="Không tìm thấy nhân viên"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="property" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-4 bg-blue-100/50 p-1 rounded-lg">
                <TabsTrigger value="property" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold rounded-md transition-all">
                    <Package className="w-4 h-4 mr-2" /> Tiếp nhận tài sản
                </TabsTrigger>
                <TabsTrigger value="deed" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold rounded-md transition-all">
                    <Star className="w-4 h-4 mr-2" /> Tri ân người/việc tốt
                </TabsTrigger>
            </TabsList>

            <TabsContent value="property" className="m-0 border-none outline-none focus-visible:ring-0">
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-blue-50/80 py-3 px-6 border-b border-blue-100">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-blue-800 flex items-center gap-2">
                        <Package className="h-5 w-5" /> DANH SÁCH TIẾP NHẬN TÀI SẢN ({propertyData.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <PropertyDataTable data={propertyData} emptyMessage="Chưa có ghi nhận tiếp nhận tài sản nào." />
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="deed" className="m-0 border-none outline-none focus-visible:ring-0">
                <Card className="border-none shadow-sm bg-white overflow-hidden">
                    <CardHeader className="bg-blue-50/80 py-3 px-6 border-b border-blue-100">
                        <CardTitle className="text-sm font-black uppercase tracking-widest text-blue-800 flex items-center gap-2">
                        <Star className="h-5 w-5" /> DANH SÁCH TRI ÂN NGƯỜI/VIỆC TỐT ({deedData.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4">
                        <DataTable 
                            data={deedData} 
                            columns={[
                                { key: 'appreciationCode', title: 'Số vào sổ', width: 'min-w-[100px]' },
                                { key: 'appreciationCampus', title: 'Cơ sở', width: 'min-w-[100px]' },
                                { key: 'appreciationName', title: 'Họ và tên', width: 'min-w-[150px]' },
                                { key: 'appreciationRecDate', title: 'Ngày tiếp nhận tài sản', width: 'min-w-[140px]' },
                                { key: 'appreciationGiveDate', title: 'Ngày trao tặng thư', width: 'min-w-[140px]' },
                                { key: 'gift', title: 'Quà', width: 'min-w-[120px]' },
                                { key: 'appreciationId', title: 'MSSV/CCCD; SĐT', width: 'min-w-[150px]' },
                                { key: 'appreciationDept', title: 'Đơn vị', width: 'min-w-[130px]' },
                                { key: 'refCode', title: 'Số vào sổ tiếp nhận và bàn giao', width: 'min-w-[150px]' },
                                { key: 'note', title: 'Ghi chú', width: 'min-w-[180px]' }
                            ]}
                            emptyMessage="Chưa có ghi nhận tri ân nào trong ngày đã chọn."
                        />
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </ClientOnly>
  );
}
