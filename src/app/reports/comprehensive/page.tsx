"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { 
  FileSearch, Printer, FileDown, 
  Search, ShieldAlert, Filter,
  Check, ChevronsUpDown, X,
  ChevronDown, ChevronUp, ArrowUp, ArrowDown, ArrowUpDown, Cog,
  ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight,
  ShieldCheck, CalendarDays, School, Hash, Layers, Landmark, Library, Users, User, Book, AlertTriangle, Info
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import type { DailySchedule } from "@/lib/types";

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
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[200px] p-0" align="start">
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
                                    <span className="truncate">{option.label}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

// ColumnHeader Component
const ColumnHeader = ({ title, columnKey, icon: Icon, t, sortConfig, requestSort, clearSort, filters, handleFilterChange, openPopover, setOpenPopover }: any) => {
    const sortState = sortConfig.find((s: any) => s.key === columnKey);
    const filterValue = filters[columnKey] || '';
    const isFiltered = !!filterValue;

    return (
        <Popover open={openPopover === columnKey} onOpenChange={(open) => setOpenPopover(open ? columnKey : null)}>
            <PopoverTrigger asChild>
                <Button 
                    variant="ghost" 
                    className="text-white hover:text-white hover:bg-blue-700 h-10 px-3 rounded group w-full justify-start font-bold text-[11px] uppercase tracking-wider transition-all whitespace-nowrap"
                >
                    {Icon && <Icon className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-80" />}
                    <span className="truncate flex-1">{title}</span>
                    {sortState ? (
                        sortState.direction === 'ascending' 
                            ? <ArrowUp className={cn("ml-1 h-3 w-3 shrink-0", isFiltered && "text-red-500")} /> 
                            : <ArrowDown className={cn("ml-1 h-3 w-3 shrink-0", isFiltered && "text-red-500")} />
                    ) : (
                        <ArrowUpDown className={cn("ml-1 h-3 w-3 shrink-0 opacity-30", isFiltered ? "text-red-500 opacity-100" : "group-hover:opacity-100")} />
                    )}

                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 shadow-2xl border-gray-100" align="start">
                <div className="p-1.5 space-y-1">
                    <Button variant="ghost" size="sm" className="w-full justify-start font-medium text-xs h-9 text-gray-700" onClick={() => { requestSort(columnKey, 'ascending'); setOpenPopover(null); }}>
                        <ArrowUp className="mr-2 h-4 w-4 text-blue-600" /> Sắp xếp tăng dần
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start font-medium text-xs h-9 text-gray-700" onClick={() => { requestSort(columnKey, 'descending'); setOpenPopover(null); }}>
                        <ArrowDown className="mr-2 h-4 w-4 text-blue-600" /> Sắp xếp giảm dần
                    </Button>
                    {sortState && (
                        <>
                          <div className="h-px bg-gray-100 my-1" />
                          <Button variant="ghost" size="sm" className="w-full justify-start font-medium text-xs h-9 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => { clearSort(); setOpenPopover(null); }}>
                              <X className="mr-2 h-4 w-4" /> Xóa sắp xếp
                          </Button>
                        </>
                    )}
                </div>
                <div className="border-t p-3 bg-gray-50/50 space-y-2">
                    <div className="relative">
                        <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder={`Lọc ${title.toLowerCase()}...`}
                            value={filterValue}
                            onChange={(e) => handleFilterChange(columnKey, e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') setOpenPopover(null); }}
                            className="h-9 pl-9 text-xs bg-white border-gray-100 focus:ring-blue-500/20"
                        />
                    </div>
                    {isFiltered && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { handleFilterChange(columnKey, ''); setOpenPopover(null); }}
                            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 h-8 text-[11px] font-bold px-2"
                        >
                            <X className="mr-2 h-3.5 w-3.5" /> Xóa bộ lọc
                        </Button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default function ComprehensiveReportPage() {
  const { t } = useLanguage();
  const firestore = useFirestore();
  const [fromDate, setFromDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [toDate, setToDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedLecturers, setSelectedLecturers] = useState<string[]>([]);
  
  const [selectedShiftRange, setSelectedShiftRange] = useState<string>("all");
  const [fromPeriod, setFromPeriod] = useState<string>("1");
  const [toPeriod, setToPeriod] = useState<string>("5");
  
  const [isFilterExpanded, setIsFilterExpanded] = useState<boolean>(false);
  
  // Table state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [sortConfig, setSortConfig] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  
  // Data Fetching
  const schedulesRef = useMemo(() => (firestore ? collection(firestore, "schedules") : null), [firestore]);
  const { data: schedulesData, loading: schedulesLoading } = useCollection<DailySchedule>(schedulesRef);

  // Load complete lists from Master Data Provider to populate comboboxes
  const { 
    employees: masterEmployees, 
    lecturers: masterLecturers, 
    departments: masterDepartments, 
    blocks: masterBlocks,
    requestPersonnelData
  } = useMasterData();

  useEffect(() => {
    requestPersonnelData();
  }, [requestPersonnelData]);

  // Combine standard master data + any free-text entries inside schedulesData
  const uniqueOptions = useMemo(() => {
    const bSet = new Set<string>();
    const dSet = new Set<string>();
    const eSet = new Set<string>();
    const lSet = new Set<string>();
    
    // Seed with master data
    masterBlocks.forEach(b => { if (b.name) bSet.add(b.name); });
    masterDepartments.forEach(d => { if (d.name) dSet.add(d.name); });
    masterEmployees.forEach(e => { 
        const empName = e.nickname || e.name;
        if (empName) eSet.add(empName); 
    });
    masterLecturers.forEach(l => { if (l.name) lSet.add(l.name); });

    if (schedulesData) {
      schedulesData.forEach((s: any) => {
        // Also collect incident-related custom entries that might not be in master lists
        if (s.incident) {
          if (s.building) bSet.add(s.building);
          if (s.department) dSet.add(s.department);
          if (s.employee) eSet.add(s.employee);
          if (s.lecturer) lSet.add(s.lecturer);
          if (s.proctor1) lSet.add(s.proctor1);
          if (s.proctor2) lSet.add(s.proctor2);
          if (s.proctor3) lSet.add(s.proctor3);
        }
      });
    }
    
    return {
      buildings: Array.from(bSet).map(v => ({ label: v, value: v })).sort((a,b) => a.label.localeCompare(b.label)),
      departments: Array.from(dSet).map(v => ({ label: v, value: v })).sort((a,b) => a.label.localeCompare(b.label)),
      employees: Array.from(eSet).map(v => ({ label: v, value: v })).sort((a,b) => a.label.localeCompare(b.label)),
      lecturers: Array.from(lSet).map(v => ({ label: v, value: v })).sort((a,b) => a.label.localeCompare(b.label)),
    };
  }, [schedulesData, masterEmployees, masterLecturers, masterDepartments, masterBlocks]);

  // Unified Filter: Apply date range, building, department, shift, and MUST have incident
  const combinedData = useMemo(() => {
    if (!schedulesData) return [];
    
    const startDate = new Date(fromDate);
    startDate.setHours(0,0,0,0);
    const endDate = new Date(toDate);
    endDate.setHours(23,59,59,999);

    const fPeriod = parseInt(fromPeriod) || 1;
    const tPeriod = parseInt(toPeriod) || 15;

    return schedulesData.filter(s => {
      // Must have incident
      if (!s.incident || s.incident === "") return false;

      // Filter Date
      let sDate = s.date; // "DD/MM/YYYY"
      if (sDate) {
         const parts = sDate.split("/");
         if (parts.length === 3) {
            const [d, m, y] = parts;
            const dateObj = new Date(`${y}-${m}-${d}T12:00:00`);
            if (dateObj < startDate || dateObj > endDate) return false;
         }
      } else {
         return false;
      }

      // Filter arrays
      if (selectedBuildings.length > 0 && !selectedBuildings.includes(s.building || "")) return false;
      if (selectedDepartments.length > 0 && !selectedDepartments.includes(s.department || "")) return false;

      if (selectedEmployees.length > 0) {
        const empMatch = selectedEmployees.includes(s.employee || "");
        if (!empMatch) return false;
      }

      if (selectedLecturers.length > 0) {
        const lecMatch = selectedLecturers.includes(s.lecturer || "") 
                      || selectedLecturers.includes(s.proctor1 || "")
                      || selectedLecturers.includes(s.proctor2 || "")
                      || selectedLecturers.includes(s.proctor3 || "");
        if (!lecMatch) return false;
      }

      // Filter shift (Range mode)
      const pStr = String(s.period || "").toLowerCase();
      if (selectedShiftRange !== "all" && pStr) {
         let start = 1;
         let end = 20;

         if (selectedShiftRange === "ca1") {
           start = 1; end = 5;
         } else if (selectedShiftRange === "ca2") {
           start = 6; end = 10;
         } else if (selectedShiftRange === "ca3") {
           start = 11; end = 16;
         } else if (selectedShiftRange === "custom") {
           start = parseInt(fromPeriod) || 1;
           end = parseInt(toPeriod) || 20;
         }

         const pNums = pStr.match(/(\d+)/g);
         if (pNums && pNums.length > 0) {
             const minS = Math.min(...pNums.map(Number));
             const maxS = Math.max(...pNums.map(Number));
             // Overlap logic: if the schedule's periods do not overlap with the requested [start, end]
             if (maxS < start || minS > end) return false;
         } else {
             // Fallback for textual strings like "sáng", "chiều", "tối"
             const isMorning = pStr.includes("sáng");
             const isAfternoon = pStr.includes("chiều");
             const isEvening = pStr.includes("tối");
             
             if (selectedShiftRange === "ca1" && !isMorning) return false;
             if (selectedShiftRange === "ca2" && !isAfternoon) return false;
             if (selectedShiftRange === "ca3" && !isEvening) return false;
         }
      }

      return true;
    });
  }, [schedulesData, fromDate, toDate, selectedBuildings, selectedDepartments, selectedEmployees, selectedLecturers, selectedShiftRange, fromPeriod, toPeriod]);

  // Final processed data (sorted and sub-filtered)
  let finalData = [...combinedData];
  
  if (sortConfig.length > 0) {
      const { key, direction } = sortConfig[0];
      finalData.sort((a, b) => {
          const aVal = String((a as any)[key] || '');
          const bVal = String((b as any)[key] || '');
          if (aVal < bVal) return direction === 'ascending' ? -1 : 1;
          if (aVal > bVal) return direction === 'ascending' ? 1 : -1;
          return 0;
      });
  }

  Object.keys(filters).forEach(key => {
      const val = filters[key].toLowerCase();
      if (val) {
          finalData = finalData.filter(item => String((item as any)[key] || '').toLowerCase().includes(val));
      }
  });

  const totalItems = finalData.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentItems = finalData.slice(startIndex, startIndex + rowsPerPage);

  const columnDefs: any = {
    employee: "Nhân viên",
    date: "Ngày",
    room: "Phòng",
    period: "Tiết",
    type: "LT/TH",
    department: "Khoa",
    class: "Lớp",
    studentCount: "Sĩ số",
    lecturer: "Giảng viên",
    content: "Nội dung",
    incident: "Việc phát sinh",
    incidentDetail: "Chi tiết sự cố"
  };
  const columnIcons: Record<string, any> = {
    employee: ShieldCheck,
    date: CalendarDays,
    room: School,
    period: Hash,
    type: Layers,
    department: Landmark,
    class: Library,
    studentCount: Users,
    lecturer: User,
    content: Book,
    incident: AlertTriangle,
    incidentDetail: Info
  };

  const orderedColumns = ['employee', 'date', 'room', 'period', 'type', 'department', 'class', 'studentCount', 'lecturer', 'content', 'incident', 'incidentDetail'];

  const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>('comprehensive_report_colvis', 
    orderedColumns.reduce((acc, col) => ({ ...acc, [col]: true }), {})
  );

  const isVisible = useCallback((col: string) => columnVisibility[col] !== false, [columnVisibility]);
  const toggleColumn = (col: string) => {
    setColumnVisibility(prev => ({ ...prev, [col]: !isVisible(col) }));
  };

  const handleExport = () => {
    if (combinedData.length === 0) {
      alert("Không có dữ liệu không phù hợp nào để xuất trong ngày này!");
      return;
    }

    const exportData = combinedData.map((item, idx) => {
      // Logic for lecturer column (combining proctors if it's an exam)
      let giangVienStr = item.lecturer || "";
      if (item.status === "Phòng thi" || item.status === "Thi cuối kỳ" || (item.content || "").toLowerCase().includes("thi")) {
        const proctors = [item.proctor1, item.proctor2, item.proctor3].filter(Boolean);
        if (proctors.length > 0) giangVienStr = `CBCT: ${proctors.join(", ")}`;
      }

      return {
        "STT": idx + 1,
        "Nhân viên": item.employee || "",
        "Ngày": item.date || "",
        "Phòng": item.room || "",
        "Tiết": item.period || "",
        "LT/TH": item.type || "",
        "Khoa": item.department || "",
        "Lớp": item.class || "",
        "Sĩ số": item.studentCount || "",
        "Giảng viên": giangVienStr,
        "Nội dung": item.content || "",
        "Việc phát sinh": item.incident || "",
        "Chi tiết sự cố": item.incidentDetail || ""
      };
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Việc Không Phù Hợp");
    XLSX.writeFile(wb, `ViecKhongPhuHop_TongHop_${fromDate}_${toDate}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <ClientOnly>
      <PageHeader title="Việc không phù hợp" icon={FileSearch} />
      
      <div className="p-4 md:p-6 space-y-6">
        {/* Filter Toolbar */}
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
                  <Button variant="outline" onClick={handlePrint} className="border-blue-200 text-blue-700 hover:bg-blue-50 shadow-sm transition-all active:scale-95">
                    <Printer className="h-4 w-4 mr-2" /> In báo cáo
                  </Button>
                  <Button variant="outline" onClick={handleExport} className="border-red-200 text-red-700 hover:bg-red-50 shadow-sm transition-all active:scale-95">
                    <FileDown className="h-4 w-4 mr-2" /> Xuất Excel
                  </Button>
                </div>
              </div>

              {isFilterExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100 animate-in slide-in-from-top-2 fade-in duration-200">
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
                    <Label className="text-xs font-semibold text-gray-600">Ca trực (Tiết)</Label>
                    <div className="flex flex-col gap-2">
                      <Select value={selectedShiftRange} onValueChange={setSelectedShiftRange}>
                        <SelectTrigger className="bg-white h-9">
                          <SelectValue placeholder="Tất cả ca" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tất cả ca</SelectItem>
                          <SelectItem value="ca1">Ca 1 (Tiết 1 - 5)</SelectItem>
                          <SelectItem value="ca2">Ca 2 (Tiết 6 - 10)</SelectItem>
                          <SelectItem value="ca3">Ca 3 (Tiết 11 - 16)</SelectItem>
                          <SelectItem value="custom">Tùy chọn...</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      {selectedShiftRange === "custom" && (
                        <div className="flex items-center gap-2 mt-1 animate-in slide-in-from-top-2">
                          <span className="text-[10px] whitespace-nowrap text-gray-500 font-medium">Từ</span>
                          <Input type="number" value={fromPeriod} onChange={e => setFromPeriod(e.target.value)} className="h-8 bg-white text-xs px-2" min={1} max={20} />
                          <span className="text-[10px] whitespace-nowrap text-gray-500 font-medium">đến</span>
                          <Input type="number" value={toPeriod} onChange={e => setToPeriod(e.target.value)} className="h-8 bg-white text-xs px-2" min={1} max={20} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs font-semibold text-gray-600">Dãy nhà</Label>
                    <MultiSelect 
                      options={uniqueOptions.buildings} 
                      selected={selectedBuildings} 
                      onChange={setSelectedBuildings} 
                      placeholder="Tất cả dãy nhà" 
                      emptyText="Không có dữ liệu" 
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs font-semibold text-gray-600">Khoa / Đơn vị</Label>
                    <MultiSelect 
                      options={uniqueOptions.departments} 
                      selected={selectedDepartments} 
                      onChange={setSelectedDepartments} 
                      placeholder="Tất cả khoa" 
                      emptyText="Không có dữ liệu" 
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs font-semibold text-gray-600">Nhân viên</Label>
                    <MultiSelect 
                      options={uniqueOptions.employees} 
                      selected={selectedEmployees} 
                      onChange={setSelectedEmployees} 
                      placeholder="Tất cả nhân viên" 
                      emptyText="Không có dữ liệu" 
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs font-semibold text-gray-600">Giảng viên / CBCT</Label>
                    <MultiSelect 
                      options={uniqueOptions.lecturers} 
                      selected={selectedLecturers} 
                      onChange={setSelectedLecturers} 
                      placeholder="Tất cả giảng viên" 
                      emptyText="Không có dữ liệu" 
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Unified Table */}
        <Card className="border-none shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
          <CardHeader className="bg-[#1877F2]/5 py-4 px-6 border-b border-blue-100">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <CardTitle className="text-sm font-black uppercase tracking-widest text-[#1877F2] flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" /> BẢNG TỔNG HỢP VIỆC KHÔNG PHÙ HỢP CÁC LĨNH VỰC ({totalItems})
                </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-[#1877F2] hover:bg-[#1877F2] h-14 border-blue-400">
                  <TableHead className="w-[60px] font-bold text-sm text-white text-center border-r border-blue-400 whitespace-nowrap bg-[#1877F2]">#</TableHead>
                  {orderedColumns.filter(isVisible).map(key => (
                    <TableHead key={key} className="text-white border-r border-blue-400 p-0 h-auto bg-[#1877F2]">
                       <ColumnHeader 
                          columnKey={key} 
                          title={columnDefs[key]} 
                          icon={columnIcons[key]}
                          t={t} 
                          sortConfig={sortConfig} 
                          filters={filters}
                          handleFilterChange={(k:any, v:string) => { setFilters((p:any) => ({...p,[k]:v})); setCurrentPage(1); }}
                          requestSort={(k:any, d:any) => setSortConfig([{key:k, direction:d}])}
                          clearSort={() => setSortConfig([])}
                          openPopover={openPopover}
                          setOpenPopover={setOpenPopover}
                       />
                    </TableHead>
                  ))}
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
                              {orderedColumns.map(col => (
                                  <DropdownMenuCheckboxItem
                                      key={col}
                                      checked={isVisible(col)}
                                      onCheckedChange={() => toggleColumn(col)}
                                      className="text-xs py-2"
                                  >
                                      {columnDefs[col]}
                                  </DropdownMenuCheckboxItem>
                              ))}
                          </DropdownMenuContent>
                      </DropdownMenu>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedulesLoading ? (
                  <TableRow>
                     <TableCell colSpan={orderedColumns.filter(isVisible).length + 2} className="h-40 text-center text-muted-foreground italic text-[13px]">Đang tải dữ liệu...</TableCell>
                  </TableRow>
                ) : currentItems.length > 0 ? currentItems.map((item, idx) => {
                  
                  // Compute Lecturer string for Exams
                  let giangVienStr = item.lecturer || "---";
                  const isExam = item.status === "Phòng thi" || item.status === "Thi cuối kỳ" || (item.content || "").toLowerCase().includes("thi");
                  if (isExam) {
                    const proctors = [item.proctor1, item.proctor2, item.proctor3].filter(Boolean);
                    if (proctors.length > 0) giangVienStr = `CBCT: ${proctors.join(", ")}`;
                  }

                  return (
                    <TableRow key={item.id} className="hover:bg-blue-50/50 transition-colors border-b border-gray-200">
                      <TableCell className="text-center font-medium border-r border-gray-200 py-3">{startIndex + idx + 1}</TableCell>
                      {orderedColumns.filter(isVisible).map(key => (
                        <TableCell key={key} className="border-r border-gray-200 py-3 align-middle">
                            {key === 'employee' ? (
                                <span className="text-gray-900 font-medium">{item.employee || "---"}</span>
                            ) : key === 'date' ? (
                                <span className="text-gray-800 font-mono text-[10px]">{item.date}</span>
                            ) : key === 'room' ? (
                                <span className="font-bold text-gray-900">{item.room || "---"}</span>
                            ) : key === 'lecturer' ? (
                                <span className="text-gray-900 font-medium text-xs">{giangVienStr}</span>
                            ) : key === 'incident' ? (
                                <Badge className="bg-red-100 text-red-700 border-red-200 font-bold text-[10px] py-0 h-5">
                                    {item.incident}
                                </Badge>
                            ) : key === 'class' ? (
                                <span className="font-bold text-blue-700 text-xs">{item.class || "---"}</span>
                            ) : (
                                <span className="text-xs text-gray-800 leading-snug">{(item as any)[key] || "---"}</span>
                            )}
                        </TableCell>
                      ))}
                      <TableCell className="p-2 text-center border-l bg-blue-50/5 sticky right-0 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]"></TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableRow>
                    <TableCell colSpan={orderedColumns.filter(isVisible).length + 2} className="h-32 text-center text-muted-foreground italic">
                      Tuyệt vời! Không có việc không phù hợp nào được ghi nhận.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t bg-muted/20">
              <div className="text-sm text-muted-foreground">Tổng cộng {totalItems} bản ghi.</div>
              <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">Số dòng</p>
                      <Select value={`${rowsPerPage}`} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                          <SelectTrigger className="h-8 w-[70px]"><SelectValue placeholder={rowsPerPage} /></SelectTrigger>
                          <SelectContent side="top">
                              {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((s) => (<SelectItem key={s} value={`${s}`}>{s}</SelectItem>))}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="flex gap-1">
                      <Button variant="outline" size="icon" className="h-8 w-8 p-0" onClick={()=>setCurrentPage(1)} disabled={currentPage===1}><ChevronsLeft className="h-4 w-4"/></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 p-0" onClick={()=>setCurrentPage(Math.max(1, currentPage-1))} disabled={currentPage===1}><ChevronLeft className="h-4 w-4"/></Button>
                      <div className="flex items-center gap-1 font-medium text-sm">
                        <Input type="number" className="h-8 w-12 text-center" value={currentPage} onChange={e => { const p = parseInt(e.target.value); if(p > 0 && p <= totalPages) setCurrentPage(p); }} />
                        / {totalPages}
                      </div>
                      <Button variant="outline" size="icon" className="h-8 w-8 p-0" onClick={()=>setCurrentPage(Math.min(totalPages, currentPage+1))} disabled={currentPage===totalPages}><ChevronRight className="h-4 w-4"/></Button>
                      <Button variant="outline" size="icon" className="h-8 w-8 p-0" onClick={()=>setCurrentPage(totalPages)} disabled={currentPage===totalPages}><ChevronsRight className="h-4 w-4"/></Button>
                  </div>
              </div>
          </CardFooter>
        </Card>
      </div>
    </ClientOnly>
  );
}
