"use client";

import { useState, useMemo } from "react";
import { 
  MailQuestion, Printer, FileDown, 
  Search, CheckCircle2, ArrowUpDown, ArrowUp, ArrowDown,
  CalendarDays, Filter, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X, Cog,
  Hash, ShieldCheck, Building, User, IdCard, Library, Landmark, StickyNote, Activity
} from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { useLocalStorage } from "@/hooks/use-local-storage";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import PageHeader from "@/components/page-header";
import { ClientOnly } from "@/components/client-only";
import { useLanguage } from "@/hooks/use-language";
import { useCollection, useFirestore } from "@/firebase";
import { useMasterData } from "@/providers/master-data-provider";
import { collection } from "firebase/firestore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, 
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
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

export default function RequestReportsPage() {
  const { t } = useLanguage();
  const firestore = useFirestore();
  const [fromDate, setFromDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  
  const { blocks, employees } = useMasterData();

  const uniqueOptions = useMemo(() => {
    return {
        buildings: (blocks || []).map((b: any) => ({ label: b.name, value: b.name })).sort((a: any, b: any) => a.label.localeCompare(b.label)),
        recipients: (employees || []).filter((e: any) => e.nickname).map((e: any) => ({ label: e.nickname, value: e.nickname })).sort((a: any, b: any) => a.label.localeCompare(b.label))
    };
  }, [blocks, employees]);
  
  // Table Interactivity State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'} | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  
  const COLUMN_DEFS = [
    { key: 'code', label: 'Số vào sổ' },
    { key: 'recipient', label: 'Nhân sự tiếp nhận' },
    { key: 'receptionDate', label: 'Ngày tiếp nhận' },
    { key: 'building', label: 'Dãy nhà' },
    { key: 'studentName', label: 'Họ và tên SV' },
    { key: 'studentId', label: 'MSSV/CCCD' },
    { key: 'class', label: 'Lớp' },
    { key: 'department', label: 'Đơn vị Khoa...' },
    { key: 'requestType', label: 'Nội dung' },
    { key: 'content', label: 'Ghi rõ nội dung' },
    { key: 'status', label: 'Tình trạng' },
  ];

  const [visibleColumns, setVisibleColumns] = useLocalStorage<string[]>('report-request-cols', COLUMN_DEFS.map(c => c.key));
  const isVisible = (key: string) => visibleColumns.includes(key);
  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };
  
  // Data Fetching
  const reqRef = useMemo(() => (firestore ? collection(firestore, "requests") : null), [firestore]);
  const { data: rawData, loading } = useCollection<any>(reqRef);

  // Normalize data so sorting and filtering is uniform

  // Normalize data so sorting and filtering is uniform
  const normalizedData = useMemo(() => {
    if (!rawData) return [];
    
    const start = new Date(fromDate);
    start.setHours(0,0,0,0);
    const end = new Date(toDate);
    end.setHours(23,59,59,999);

    return rawData
      .filter(item => {
        const itemDateStr = item.receptionDate || item.date;
        if (!itemDateStr) return false;
        
        // Handle both DD/MM/YYYY and YYYY-MM-DD formats
        let d;
        if (itemDateStr.includes("/")) {
          const [day, month, year] = itemDateStr.split("/");
          d = new Date(`${year}-${month}-${day}`);
        } else {
          d = new Date(itemDateStr);
        }
        
        const inDateRange = d >= start && d <= end;
        if (!inDateRange) return false;

        if (selectedBuildings.length > 0 && !selectedBuildings.includes(item.building || item.block)) return false;
        if (selectedRecipients.length > 0 && !selectedRecipients.includes(item.recipient || item.employee)) return false;

        return true;
      })
      .map((item, idx) => ({
        id: item.id,
        code: item.code || `${(idx + 1).toString().padStart(2, '0')}/PYC`,
        recipient: item.recipient || item.employee || "---",
        receptionDate: item.receptionDate || item.date || "---",
        building: item.building || item.block || "---",
        studentName: item.studentName || "---",
        studentId: item.studentId || "---",
        class: item.class || "---",
        department: item.department || item.faculty || "---",
        requestType: item.requestType || item.category || "Phiếu yêu cầu hỗ trợ",
        content: item.content || item.description || "---",
        status: item.status === 'resolved' || item.feedback ? "Đã giải quyết" : "Đang xử lý"
      }));
  }, [rawData, fromDate, toDate]);

  const processedData = useMemo(() => {
    let result = [...normalizedData];

    // Filter
    Object.entries(columnFilters).forEach(([key, value]) => {
      if (value) {
        const lowerValue = value.toLowerCase();
        result = result.filter(item => {
            const itemVal = String((item as any)[key] || '').toLowerCase();
            return itemVal.includes(lowerValue);
        });
      }
    });

    // Sort
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
  }, [normalizedData, columnFilters, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(processedData.length / rowsPerPage));
  const currentItems = processedData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const requestSort = (key: string, direction: 'asc'|'desc') => {
      setSortConfig({ key, direction });
      setOpenPopover(null);
  };

  const handleFilterChange = (key: string, value: string) => {
      setColumnFilters(prev => ({ ...prev, [key]: value }));
      setCurrentPage(1);
  };

  const clearSort = () => {
      setSortConfig(null);
      setOpenPopover(null);
  };

  const handleExport = () => {
    if (processedData.length === 0) {
      alert("Không có dữ liệu để xuất trong ngày này!");
      return;
    }

    // Map to specific columns required by the new template
    const exportData = processedData.map((item, index) => ({
      "Số vào sổ": item.code,
      "Nhân sự tiếp nhận": item.recipient,
      "Ngày tiếp nhận": item.receptionDate,
      "Dãy nhà": item.building,
      "Họ và tên SV": item.studentName,
      "MSSV/CCCD": item.studentId,
      "Lớp": item.class,
      "Đơn vị Khoa/ Trung tâm/Viện": item.department,
      "Nội dung tiếp nhận": item.requestType,
      "Ghi rõ nội dung ghi nhận": item.content,
      "Tình trạng giải quyết": item.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tiếp nhận yêu cầu");
    XLSX.writeFile(wb, `BaoCaoTiepNhanYeuCau_${fromDate}_to_${toDate}.xlsx`);
  };
  const handlePrint = () => {
    window.print();
  };


  return (
    <ClientOnly>
      <PageHeader title="Báo cáo Tiếp nhận yêu cầu" icon={MailQuestion} />
      
      <div className="p-4 md:p-6 space-y-6">
        <Card className="shadow-lg border-none bg-white/90 backdrop-blur-md sticky top-[64px] z-10 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-blue-600" />
                  <span className="font-bold text-gray-700">Bộ lọc nâng cao</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsFilterExpanded(!isFilterExpanded)} 
                    className="ml-2 h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    {isFilterExpanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                    {isFilterExpanded ? "Thu gọn" : "Mở rộng bộ lọc"}
                  </Button>
                </div>
                
                <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1">
                  <Button variant="outline" onClick={handlePrint} className="border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm transition-all">
                    <Printer className="h-4 w-4 mr-2" /> In báo cáo
                  </Button>
                  <Button variant="outline" onClick={handleExport} className="border-teal-200 text-teal-700 hover:bg-teal-50 shadow-sm transition-all">
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
                    <Label className="text-xs font-semibold text-gray-600">Nhân sự tiếp nhận</Label>
                    <MultiSelect 
                        options={uniqueOptions.recipients}
                        selected={selectedRecipients}
                        onChange={setSelectedRecipients}
                        placeholder="Chọn nhân sự..."
                        emptyText="Không tìm thấy nhân sự"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden border-teal-100">
          <CardHeader className="bg-teal-50/80 py-3 px-6 border-b border-teal-100">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-teal-700 flex items-center gap-2">
              <MailQuestion className="h-4 w-4" /> THỐNG KÊ YÊU CẦU ĐÃ TIẾP NHẬN ({processedData.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#1877F2] hover:bg-[#1877F2]/90">
                  <TableHead className="w-[60px] text-center font-bold text-base text-white border-r border-blue-300">#</TableHead>
                  {COLUMN_DEFS.filter(col => isVisible(col.key)).map(col => {
                    const colIcons: any = {
                      code: Hash,
                      recipient: ShieldCheck,
                      receptionDate: CalendarDays,
                      building: Building,
                      studentName: User,
                      studentId: IdCard,
                      class: Library,
                      department: Landmark,
                      requestType: StickyNote,
                      content: FileDown,
                      status: Activity
                    };
                    return (
                      <TableHead key={col.key} className="min-w-[100px] p-0 border-r border-blue-300 h-auto">
                        <ColumnHeader columnKey={col.key} title={col.label} icon={colIcons[col.key]} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={requestSort} clearSort={clearSort} filters={columnFilters} handleFilterChange={handleFilterChange} />
                      </TableHead>
                    );
                  })}
                  <TableHead className="w-16 text-center text-white p-0 bg-[#1877F2] border-l border-blue-300 sticky right-0 z-20 shadow-[-2px_0_5px_rgba(0,0,0,0.1)]">
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-10 w-10 text-white hover:text-white hover:bg-blue-700/50 transition-colors">
                                  <Cog className="h-5 w-5" />
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 shadow-xl border-blue-100">
                              <DropdownMenuLabel className="font-bold text-blue-700 text-xs">Hiển thị cột</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {COLUMN_DEFS.map(col => (
                                  <DropdownMenuCheckboxItem
                                      key={col.key}
                                      checked={isVisible(col.key)}
                                      onCheckedChange={() => toggleColumn(col.key)}
                                      className="text-xs py-2"
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
                {loading && processedData.length === 0 ? (
                  <TableRow>
                     <TableCell colSpan={12} className="h-32 text-center text-muted-foreground italic">Đang tải dữ liệu...</TableCell>
                  </TableRow>
                ) : currentItems.length > 0 ? currentItems.map((item, idx) => (
                  <TableRow 
                    key={item.id} 
                    className={cn(
                      "hover:bg-[#f0f7ff] cursor-pointer transition-colors border-b border-gray-200",
                      selectedRowId === item.id && "bg-[#e1effe] font-medium"
                    )}
                    onClick={() => setSelectedRowId(item.id)}
                  >
                    <TableCell className="text-center border-r py-2 font-medium">{(currentPage - 1) * rowsPerPage + idx + 1}</TableCell>
                    {isVisible('code') && <TableCell className="text-center border-r py-2">{item.code}</TableCell>}
                    {isVisible('recipient') && <TableCell className="border-r py-2 text-gray-800">{item.recipient}</TableCell>}
                    {isVisible('receptionDate') && <TableCell className="text-center border-r py-2 text-gray-800">{item.receptionDate}</TableCell>}
                    {isVisible('building') && <TableCell className="border-r py-2 text-gray-800">{item.building}</TableCell>}
                    {isVisible('studentName') && <TableCell className="border-r py-2 text-gray-800">{item.studentName}</TableCell>}
                    {isVisible('studentId') && <TableCell className="border-r py-2 text-center text-gray-800 font-mono text-[13px]">{item.studentId}</TableCell>}
                    {isVisible('class') && <TableCell className="border-r py-2 text-center text-gray-800 font-mono text-[13px]">{item.class}</TableCell>}
                    {isVisible('department') && <TableCell className="border-r py-2 text-gray-800">{item.department}</TableCell>}
                    {isVisible('requestType') && <TableCell className="border-r py-2 text-gray-800">{item.requestType}</TableCell>}
                    {isVisible('content') && <TableCell className="border-r py-2 text-gray-800 leading-relaxed">{item.content}</TableCell>}
                    {isVisible('status') && (
                      <TableCell className="text-center py-2 text-gray-800">
                        {item.status}
                      </TableCell>
                    )}
                    <TableCell className="p-2 text-center border-l bg-blue-50/5 sticky right-0 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]"></TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={visibleColumns.length + 2} className="h-32 text-center text-muted-foreground italic">
                      Không có yêu cầu nào được tìm thấy.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t bg-gray-50/50">
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
          </CardFooter>
        </Card>
      </div>
    </ClientOnly>
  );
}
