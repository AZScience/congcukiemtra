"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";

import { 
  FileText, CalendarDays, Printer, FileDown, 
  Search, ShieldAlert, Laptop, BookUser, 
  BookOpenCheck, Building, ClipboardList, CheckCircle2,
  ArrowUpDown, ArrowUp, ArrowDown, Filter, X, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Cog,
  CloudUpload, Loader2, ShieldCheck, School, Hash, Landmark, Library, User, Book, AlertTriangle, Info, UserCheck,
  Users, Layers, IdCard, StickyNote, CalendarCheck, MapPin, Bell
} from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

import { pushToGoogleSheetDynamic, getGoogleSheetTabs, pushDailyReportToGoogleSheet } from "@/ai/flows/google-sheet-export";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePickerField } from "@/components/ui/date-picker-field";
import PageHeader from "@/components/page-header";
import { ClientOnly } from "@/components/client-only";
import { useLanguage } from "@/hooks/use-language";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { useMasterData } from "@/providers/master-data-provider";
import { collection } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import type { DailySchedule, StudentViolation } from "@/lib/types";

// --- Components ---
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
                        <ArrowUp className="mr-2 h-4 w-4 text-blue-600" /> {t('Sắp xếp tăng dần')}
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start font-medium text-xs h-9 text-gray-700" onClick={() => { requestSort(columnKey, 'descending'); setOpenPopover(null); }}>
                        <ArrowDown className="mr-2 h-4 w-4 text-blue-600" /> {t('Sắp xếp giảm dần')}
                    </Button>
                    {sortState && (
                        <>
                          <div className="h-px bg-gray-100 my-1" />
                          <Button variant="ghost" size="sm" className="w-full justify-start font-medium text-xs h-9 text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => { clearSort(); setOpenPopover(null); }}>
                              <X className="mr-2 h-4 w-4" /> {t('Xóa sắp xếp')}
                          </Button>
                        </>
                    )}
                </div>
                <div className="border-t p-3 bg-gray-50/50 space-y-2">
                    <div className="relative">
                        <Filter className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder={`${t('Lọc')} ${title.toLowerCase()}...`}
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
                            <X className="mr-2 h-3.5 w-3.5" /> {t('Xóa bộ lọc')}
                        </Button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

export default function DailyReportPage() {
  const { t } = useLanguage();
  const firestore = useFirestore();
  const { user: authUser } = useUser();
  const { employees } = useMasterData();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [isPushingGlobal, setIsPushingGlobal] = useState(false);
  const [systemParams] = useLocalStorage<any>("system_parameters", {});

  
  // Data Fetching
  const schedulesRef = useMemo(() => (firestore ? collection(firestore, "schedules") : null), [firestore]);
  const violationsRef = useMemo(() => (firestore ? collection(firestore, "student-violations") : null), [firestore]);
  
  const { data: schedulesData, loading: schedulesLoading } = useCollection<DailySchedule>(schedulesRef);
  const { data: violationsData, loading: violationsLoading } = useCollection<StudentViolation>(violationsRef);

  // Date normalization for filtering
  const displayDate = useMemo(() => {
    if (!selectedDate) return "";
    const [y, m, d] = selectedDate.split("-");
    return `${d}/${m}/${y}`;
  }, [selectedDate]);

  // Filter by current user
  const currentUserEmployee = useMemo(() => employees?.find(e => e.email === authUser?.email), [employees, authUser]);
  const currentNickname = currentUserEmployee?.nickname;

  // Filtering Logic for each Tab
  const inPersonData = useMemo(() => {
    if (!schedulesData || !currentNickname) return [];
    const normalizedNickname = currentNickname.trim().toLowerCase();
    return schedulesData.filter(s => {
      const isHandled = s.recognitionDate && s.employee && s.incident;
      const isRecordForUser = (s.employee || "").trim().toLowerCase() === normalizedNickname;
      if (!isHandled || !isRecordForUser) return false;

      const content = (s.content || "").toLowerCase();
      const status = (s.status || "").toLowerCase();
      const keywords = ["cvht", "shcn", "cố vấn", "sinh hoạt", "chủ nhiệm"];
      const isHomeroom = keywords.some(k => content.includes(k) || status.includes(k));
      const isExam = status === "phòng thi" || status === "thi cuối kỳ" || content.includes("thi");
      
      return s.date === displayDate && 
        !isExam && 
        !(s.building || "").toLowerCase().includes("trực tuyến") && 
        !(s.building || "").toLowerCase().includes("ngoài") &&
        !isHomeroom
    });
  }, [schedulesData, displayDate, currentNickname]);

  const onlineData = useMemo(() => {
    if (!schedulesData || !currentNickname) return [];
    const normalizedNickname = currentNickname.trim().toLowerCase();
    return schedulesData.filter(s => {
      const isHandled = s.recognitionDate && s.employee && s.incident;
      const isRecordForUser = (s.employee || "").trim().toLowerCase() === normalizedNickname;
      if (!isHandled || !isRecordForUser) return false;

      const content = (s.content || "").toLowerCase();
      const status = (s.status || "").toLowerCase();
      const keywords = ["cvht", "shcn", "cố vấn", "sinh hoạt", "chủ nhiệm"];
      const isHomeroom = keywords.some(k => content.includes(k) || status.includes(k));
      const isExam = status === "phòng thi" || status === "thi cuối kỳ" || content.includes("thi");

      return s.date === displayDate && 
        (s.building || "").toLowerCase().includes("trực tuyến") &&
        !isHomeroom &&
        !isExam
    });
  }, [schedulesData, displayDate, currentNickname]);

  const homeroomData = useMemo(() => {
    if (!schedulesData || !currentNickname) return [];
    const normalizedNickname = currentNickname.trim().toLowerCase();
    return schedulesData.filter(s => {
      const isHandled = s.recognitionDate && s.employee && s.incident;
      const isRecordForUser = (s.employee || "").trim().toLowerCase() === normalizedNickname;
      const content = (s.content || "").toLowerCase();
      const status = (s.status || "").toLowerCase();
      const keywords = ["cvht", "shcn", "cố vấn", "sinh hoạt", "chủ nhiệm"];
      const isHomeroom = keywords.some(k => content.includes(k) || status.includes(k));
      
      return s.date === displayDate && 
        isHandled && isRecordForUser &&
        isHomeroom
    });
  }, [schedulesData, displayDate, currentNickname]);

  const violationData = useMemo(() => {
    if (!violationsData || !currentNickname) return [];
    const normalizedNickname = currentNickname.trim().toLowerCase();
    return violationsData.filter(v => 
      v.violationDate === selectedDate && 
      (v.officer || "").trim().toLowerCase() === normalizedNickname &&
      v.violationDate && v.officer && v.violationType
    );
  }, [violationsData, selectedDate, currentNickname]);

  const examData = useMemo(() => {
    if (!schedulesData || !currentNickname) return [];
    const normalizedNickname = currentNickname.trim().toLowerCase();
    return schedulesData.filter(s => {
      const isHandled = s.recognitionDate && s.employee && s.incident;
      const isRecordForUser = (s.employee || "").trim().toLowerCase() === normalizedNickname;
      return s.date === displayDate && 
        isHandled && isRecordForUser &&
        (s.status === "Phòng thi" || s.status === "Thi cuối kỳ" || (s.content || "").toLowerCase().includes("thi"))
    });
  }, [schedulesData, displayDate, currentNickname]);

  const externalData = useMemo(() => {
    if (!schedulesData || !currentNickname) return [];
    const normalizedNickname = currentNickname.trim().toLowerCase();
    return schedulesData.filter(s => {
      const isHandled = s.recognitionDate && s.employee && s.incident;
      const isRecordForUser = (s.employee || "").trim().toLowerCase() === normalizedNickname;
      if (!isHandled || !isRecordForUser) return false;

      const content = (s.content || "").toLowerCase();
      const status = (s.status || "").toLowerCase();
      const keywords = ["cvht", "shcn", "cố vấn", "sinh hoạt", "chủ nhiệm"];
      const isHomeroom = keywords.some(k => content.includes(k) || status.includes(k));
      const isExam = status === "phòng thi" || status === "thi cuối kỳ" || content.includes("thi");

      return s.date === displayDate && 
        (s.building || "").toLowerCase().includes("ngoài") &&
        !isHomeroom &&
        !isExam
    });
  }, [schedulesData, displayDate, currentNickname]);

  const handleExportAll = () => {
    const wb = XLSX.utils.book_new();
    
    const exportConfig = [
      { name: "Phòng Học", data: inPersonData },
      { name: "Trực Tuyến", data: onlineData },
      { name: "Cố Vấn", data: homeroomData },
      { name: "Vi Phạm SV", data: violationData },
      { name: "Thi Kết Thúc", data: examData },
      { name: "Thực Hành Ngoài", data: externalData }
    ];

    exportConfig.forEach(cfg => {
      if (cfg.data.length > 0) {
        const ws = XLSX.utils.json_to_sheet(cfg.data);
        XLSX.utils.book_append_sheet(wb, ws, cfg.name);
      }
    });

    if (wb.SheetNames.length > 0) {
      XLSX.writeFile(wb, `BaoCaoCuoiNgay_${selectedDate}.xlsx`);
    }
  };

  const handlePushToGoogleSheet = async () => {
    if (isPushingGlobal) return;
    
    // Prepare all data
    const allData = [
      ...inPersonData.map(d => ({ ...d, typeLabel: 'Kiểm tra Phòng học' })),
      ...onlineData.map(d => ({ ...d, typeLabel: 'Kiểm tra Trực tuyến' })),
      ...homeroomData.map(d => ({ ...d, typeLabel: 'Sinh hoạt Cố vấn' })),
      ...violationData.map(d => ({ ...d, typeLabel: 'Sinh viên Vi phạm', room: '---', period: '---', content: d.violationType, incident: d.violationType, incidentDetail: d.note, employee: d.officer, lecturer: d.fullName })),
      ...examData.map(d => ({ ...d, typeLabel: 'Thi kết thúc môn' })),
      ...externalData.map(d => ({ ...d, typeLabel: 'Thực hành ngoài' }))
    ];

    if (allData.length === 0) {
      toast({
        title: "Không có dữ liệu",
        description: "Không có dữ liệu nào trong ngày được chọn để đẩy lên Google Sheet.",
        variant: "destructive"
      });
      return;
    }

    setIsPushingGlobal(true);
    try {
      const result = await pushDailyReportToGoogleSheet(
        allData,
        systemParams.googleSheetId,
        systemParams.googleServiceAccountEmail,
        systemParams.googlePrivateKey,
        selectedDate,
        systemParams.reportSheetTabName
      );
      
      toast({
        title: "Thành công",
        description: result.message,
      });
    } catch (error: any) {
      toast({
        title: "Lỗi",
        description: error.message || "Không thể đẩy dữ liệu lên Google Sheet.",
        variant: "destructive"
      });
    } finally {
      setIsPushingGlobal(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <ClientOnly>
    <TooltipProvider>
      <PageHeader title="Báo cáo cuối ngày" icon={FileText} />
      
      <div className="p-4 md:p-6 space-y-6">
        {/* Filter Toolbar */}
        <Card className="shadow-lg border-none bg-white/90 backdrop-blur-md sticky top-[64px] z-10 transition-all duration-300">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <div className="flex items-center gap-2 min-w-[200px]">
                  <Label className="whitespace-nowrap font-bold text-gray-700">Ngày báo cáo:</Label>
                  <DatePickerField 
                    value={selectedDate} 
                    onChange={v => setSelectedDate(v || format(new Date(), "yyyy-MM-dd"))} 
                    className="h-10 focus:ring-blue-500/20"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1">
                <Tooltip><TooltipTrigger asChild><Button variant="outline" onClick={handleExportAll} className="border-green-500 text-green-700 hover:bg-green-600 hover:text-white shadow-sm transition-all active:scale-95">
                  <FileDown className="h-4 w-4 mr-2" /> Xuất Excel (Tất cả)
                </Button></TooltipTrigger><TooltipContent><p>{t('Xuất toàn bộ các bảng báo cáo ra file Excel')}</p></TooltipContent></Tooltip>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* Multi-Activity Tabs */}
        <Tabs defaultValue="in-person" className="w-full">
          <div className="mb-6 overflow-hidden rounded-xl border border-gray-100 bg-white p-1 shadow-sm">
            <TabsList className="h-auto p-0 bg-transparent w-full flex flex-row flex-nowrap justify-start overflow-x-auto no-scrollbar gap-1">
              <TabsTrigger 
                value="in-person" 
                className={cn(
                  "flex-1 h-12 gap-2 text-[11px] font-bold uppercase transition-all duration-300 group",
                  "data-[state=active]:bg-[#16a34a] data-[state=active]:text-white data-[state=active]:shadow-lg"
                )}
              >
                <ClipboardList className="h-4 w-4" /> 
                <span className="truncate">KIỂM TRA PHÒNG HỌC</span>
                {inPersonData.length > 0 && <Badge variant="secondary" className="ml-1 h-5 min-w-5 justify-center items-center bg-white/20 text-white border-none hidden group-data-[state=active]:inline-flex">{inPersonData.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger 
                value="online" 
                className={cn(
                  "flex-1 h-12 gap-2 text-[11px] font-bold uppercase transition-all duration-300 group",
                  "data-[state=active]:bg-[#eab308] data-[state=active]:text-black data-[state=active]:shadow-lg"
                )}
              >
                <Laptop className="h-4 w-4" /> 
                <span className="truncate">KIỂM TRA TRỰC TUYẾN</span>
                {onlineData.length > 0 && <Badge variant="secondary" className="ml-1 h-5 min-w-5 justify-center items-center bg-black/10 text-black border-none hidden group-data-[state=active]:inline-flex">{onlineData.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger 
                value="homeroom" 
                className={cn(
                  "flex-1 h-12 gap-2 text-[11px] font-bold uppercase transition-all duration-300 group",
                  "data-[state=active]:bg-[#16a34a] data-[state=active]:text-white data-[state=active]:shadow-lg"
                )}
              >
                <BookUser className="h-4 w-4" /> 
                <span className="truncate">SINH HOẠT CỐ VẤN</span>
                {homeroomData.length > 0 && <Badge variant="secondary" className="ml-1 h-5 min-w-5 justify-center items-center bg-white/20 text-white border-none hidden group-data-[state=active]:inline-flex">{homeroomData.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger 
                value="violations" 
                className={cn(
                  "flex-1 h-12 gap-2 text-[11px] font-bold uppercase transition-all duration-300 group",
                  "data-[state=active]:bg-[#dc2626] data-[state=active]:text-white data-[state=active]:shadow-lg"
                )}
              >
                <ShieldAlert className="h-4 w-4" /> 
                <span className="truncate">SINH VIÊN VI PHẠM</span>
                {violationData.length > 0 && <Badge variant="secondary" className="ml-1 h-5 min-w-5 justify-center items-center bg-white/20 text-white border-none hidden group-data-[state=active]:inline-flex">{violationData.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger 
                value="exams" 
                className={cn(
                  "flex-1 h-12 gap-2 text-[11px] font-bold uppercase transition-all duration-300 group",
                  "data-[state=active]:bg-[#16a34a] data-[state=active]:text-white data-[state=active]:shadow-lg"
                )}
              >
                <BookOpenCheck className="h-4 w-4" /> 
                <span className="truncate">THI KẾT THÚC MÔN</span>
                {examData.length > 0 && <Badge variant="secondary" className="ml-1 h-5 min-w-5 justify-center items-center bg-white/20 text-white border-none hidden group-data-[state=active]:inline-flex">{examData.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger 
                value="external" 
                className={cn(
                  "flex-1 h-12 gap-2 text-[11px] font-bold uppercase transition-all duration-300 group",
                  "data-[state=active]:bg-[#eab308] data-[state=active]:text-black data-[state=active]:shadow-lg"
                )}
              >
                <Building className="h-4 w-4" /> 
                <span className="truncate">THỰC HÀNH NGOÀI</span>
                {externalData.length > 0 && <Badge variant="secondary" className="ml-1 h-5 min-w-5 justify-center items-center bg-black/10 text-black border-none hidden group-data-[state=active]:inline-flex">{externalData.length}</Badge>}
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="in-person" className="mt-0 focus-visible:outline-none">
            <ReportTable 
              title="KIỂM TRA PHÒNG HỌC" 
              data={inPersonData} 
              loading={schedulesLoading} 
              t={t}
              columnDefs={{
                employee: "Nhân viên",
                date: "Ngày",
                room: "Phòng",
                period: "Tiết",
                department: "Khoa",
                class: "Lớp",
                lecturer: "Giảng viên",
                content: "Nội dung",
                incident: "Việc phát sinh",
                isNotification: "Thông báo",
                incidentDetail: "Chi tiết sự cố"
              }}
              orderedColumns={['employee', 'date', 'room', 'period', 'department', 'class', 'lecturer', 'content', 'incident', 'isNotification', 'incidentDetail']}
            />
          </TabsContent>
          
          <TabsContent value="online" className="mt-0 focus-visible:outline-none">
            <ReportTable 
              title="KIỂM TRA LỚP HỌC TRỰC TUYẾN" 
              data={onlineData} 
              loading={schedulesLoading} 
              t={t}
              columnDefs={{
                employee: "Nhân viên",
                date: "Ngày",
                room: "Link",
                period: "Tiết",
                department: "Khoa",
                class: "Lớp",
                lecturer: "Giảng viên",
                content: "Môn học",
                incident: "Việc phát sinh",
                isNotification: "Thông báo",
                incidentDetail: "Chi tiết sự cố"
              }}
              orderedColumns={['employee', 'date', 'room', 'period', 'department', 'class', 'lecturer', 'content', 'incident', 'isNotification', 'incidentDetail']}
            />
          </TabsContent>
          
          <TabsContent value="homeroom" className="mt-0 focus-visible:outline-none">
            <ReportTable 
              title="SINH HOẠT CỐ VẤN" 
              data={homeroomData} 
              loading={schedulesLoading} 
              showStudentCount={true} 
              hideContent={true} 
              t={t}
              columnDefs={{
                employee: "Nhân viên",
                date: "Ngày",
                room: "Phòng",
                period: "Tiết",
                department: "Khoa",
                class: "Lớp",
                lecturer: "Giảng viên",
                studentCount: "SV dự",
                incident: "Việc phát sinh",
                isNotification: "Thông báo",
                incidentDetail: "Chi tiết sự việc"
              }}
              orderedColumns={['employee', 'date', 'room', 'period', 'department', 'class', 'lecturer', 'studentCount', 'incident', 'isNotification', 'incidentDetail']}
            />
          </TabsContent>
          
          <TabsContent value="violations" className="mt-0 focus-visible:outline-none">
            <ViolationTable data={violationData} loading={violationsLoading} t={t} />
          </TabsContent>
          
          <TabsContent value="exams" className="mt-0 focus-visible:outline-none">
            <ReportTable 
              title="KẾT THÚC MÔN" 
              data={examData} 
              loading={schedulesLoading} 
              isExamMode={true} 
              t={t}
              columnDefs={{
                employee: "Nhân viên",
                date: "Ngày",
                room: "Phòng",
                period: "Tiết",
                department: "Khoa",
                class: "Lớp",
                proctor1: "CBCT 1",
                proctor2: "CBCT 2",
                proctor3: "CBCT 3",
                content: "Môn thi",
                incident: "Việc phát sinh",
                isNotification: "Thông báo",
                incidentDetail: "Chi tiết sự cố"
              }}
              orderedColumns={['employee', 'date', 'room', 'period', 'department', 'class', 'proctor1', 'proctor2', 'proctor3', 'content', 'incident', 'isNotification', 'incidentDetail']}
            />
          </TabsContent>
          
          <TabsContent value="external" className="mt-0 focus-visible:outline-none">
            <ReportTable 
              title="THỰC HÀNH NGOÀI" 
              data={externalData} 
              loading={schedulesLoading} 
              isExternalMode={true} 
              t={t}
              columnDefs={{
                employee: "Nhân viên",
                date: "Ngày",
                room: "Địa điểm",
                period: "Tiết",
                type: "LT/TH",
                department: "Khoa",
                class: "Lớp",
                studentCount: "Sĩ số",
                lecturer: "Giảng viên",
                content: "Nội dung",
                incident: "Việc phát sinh",
                isNotification: "Thông báo",
                incidentDetail: "Chi tiết sự cố"
              }}
              orderedColumns={['employee', 'date', 'room', 'period', 'type', 'department', 'class', 'studentCount', 'lecturer', 'content', 'incident', 'isNotification', 'incidentDetail']}
            />
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
    </ClientOnly>
  );
}

function ReportTable({ 
  title, 
  data, 
  loading, 
  columnDefs,
  orderedColumns,
  t,
  isExamMode = false,
  isExternalMode = false,
  showStudentCount = false,
  hideContent = false
}: { 
  title: string, 
  data: any[], 
  loading: boolean, 
  columnDefs: any,
  orderedColumns: string[],
  t: any,
  isExamMode?: boolean,
  isExternalMode?: boolean,
  showStudentCount?: boolean,
  hideContent?: boolean
}) {
  const { toast } = useToast();
  const [systemParams] = useLocalStorage<any>("system_parameters", {});
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [sortConfig, setSortConfig] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());
  const [isPushing, setIsPushing] = useState(false);
  const [isPushDialogOpen, setIsPushDialogOpen] = useState(false);
  const [targetTabName, setTargetTabName] = useState(systemParams.reportSheetTabName || "Báo cáo Tổng hợp");
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [isLoadingTabs, setIsLoadingTabs] = useState(false);

  const columnIcons: Record<string, any> = {
    employee: ShieldCheck,
    date: CalendarDays,
    room: title.includes("TRỰC TUYẾN") ? MapPin : School,
    period: Hash,
    department: Landmark,
    class: Library,
    lecturer: User,
    proctor1: UserCheck,
    proctor2: UserCheck,
    proctor3: UserCheck,
    content: Book,
    studentCount: Users,
    type: Layers,
    incident: AlertTriangle,
    isNotification: Bell,
    incidentDetail: Info
  };

  // Tạo key an toàn cho LocalStorage (không dấu, không khoảng trắng)
  const slugTitle = title.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>(`daily_report_colvis_${slugTitle}`, 
    orderedColumns.reduce((acc, col) => ({ ...acc, [col]: true }), {})
  );

  const isVisible = (col: string) => columnVisibility[col] !== false;
  
  const toggleColumn = (col: string) => {
    console.log(`Toggling column: ${col} for ${slugTitle}`);
    setColumnVisibility(prev => {
        const next = { ...prev, [col]: !isVisible(col) };
        return next;
    });
  };

  // Fetch tabs when dialog opens
  useEffect(() => {
    if (isPushDialogOpen && systemParams.googleSheetId) {
      setIsLoadingTabs(true);
      getGoogleSheetTabs(
        systemParams.googleSheetId,
        systemParams.googleServiceAccountEmail,
        systemParams.googlePrivateKey
      ).then(tabs => {
        setAvailableTabs(tabs);
      }).catch(err => {
        console.error(err);
      }).finally(() => {
        setIsLoadingTabs(false);
      });
    }
  }, [isPushDialogOpen, systemParams.googleSheetId, systemParams.googleServiceAccountEmail, systemParams.googlePrivateKey]);

  // Logic for data processing (NOT hooks)
  let processedItems = [...data];

  if (sortConfig.length > 0) {
      const { key, direction } = sortConfig[0];
      processedItems.sort((a, b) => {
          const aVal = (a as any)[key];
          const bVal = (b as any)[key];
          if (aVal < bVal) return direction === 'ascending' ? -1 : 1;
          if (aVal > bVal) return direction === 'ascending' ? 1 : -1;
          return 0;
      });
  }

  Object.keys(filters).forEach(key => {
      const val = filters[key].toLowerCase();
      if (val) {
          processedItems = processedItems.filter(item => String((item as any)[key] || '').toLowerCase().includes(val));
      }
  });

  const totalItems = processedItems.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentItems = processedItems.slice(startIndex, startIndex + rowsPerPage);

  const visibleSelectedCount = useMemo(() => {
    return processedItems.filter(item => selectedSet.has(item.id)).length;
  }, [processedItems, selectedSet]);

  if (loading) return <div className="h-40 flex items-center justify-center">Đang tải dữ liệu...</div>;

  const handleRowClick = (id: string) => {
    setSelectedSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePushToGoogleSheet = async () => {
    if (isPushing) return;
    if (processedItems.length === 0) {
        toast({ title: "Không có dữ liệu", description: "Bảng hiện tại không có dữ liệu để đẩy.", variant: "destructive" });
        return;
    }

    setIsPushing(true);
    try {
        // Headers are the labels from columnDefs for the orderedColumns
        const headers = orderedColumns.map(col => columnDefs[col]);
        // Mapping is from field name to header label
        const mapping: Record<string, string> = {};
        orderedColumns.forEach(col => {
            mapping[col] = columnDefs[col];
        });

        const result = await pushToGoogleSheetDynamic(
            processedItems,
            headers,
            mapping,
            systemParams.googleSheetId,
            systemParams.googleServiceAccountEmail,
            systemParams.googlePrivateKey,
            targetTabName
        );

        toast({ title: result.success ? "Thành công" : "Thông báo", description: result.message });
        setIsPushDialogOpen(false);
    } catch (error: any) {
        toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } finally {
        setIsPushing(false);
    }
  };

  return (
    <Card className="border-none shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
      <CardHeader className="bg-muted/30 py-4 px-6 border-b">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-[#1877F2] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> {title} ({totalItems})
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Dialog open={isPushDialogOpen} onOpenChange={(open) => {
                console.log("Dialog Open State:", open);
                setIsPushDialogOpen(open);
            }}>
                <DialogTrigger asChild>
                    <Button 
                        variant="outline" 
                        className="h-9 border-orange-500 text-orange-700 hover:bg-orange-600 hover:text-white shadow-sm"
                        onClick={() => console.log("Push Button Clicked")}
                    >
                        <CloudUpload className="h-4 w-4 mr-2" /> Đẩy lên GoogleSheet
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Đẩy dữ liệu lên Google Sheet</DialogTitle>
                        <DialogDescription>Dữ liệu từ bảng "{title}" sẽ được đưa vào Google Sheet đã kết nối.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Chọn Tab / Sheet đích</Label>
                            {isLoadingTabs ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Đang tải danh sách tab...
                                </div>
                            ) : (
                                <Select value={targetTabName} onValueChange={setTargetTabName}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn một tab..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableTabs.map(tab => (
                                            <SelectItem key={tab} value={tab}>{tab}</SelectItem>
                                        ))}
                                        
                                    </SelectContent>
                                </Select>
                            )}

                        </div>
                        <div className="bg-muted/30 p-3 rounded-lg text-xs space-y-2">
                            <p className="font-bold text-gray-700">Các cột sẽ được xuất (Cột hiện hành):</p>
                            <div className="flex flex-wrap gap-1">
                                {orderedColumns.map(col => (
                                    <Badge key={col} variant="secondary" className="font-normal">{columnDefs[col]}</Badge>
                                ))}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-2 italic">* Chỉ những dữ liệu mới (chưa có UID trên Sheet) mới được đẩy vào để tránh trùng lặp.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPushDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handlePushToGoogleSheet} disabled={isPushing} className="bg-orange-600 hover:bg-orange-700">
                            {isPushing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CloudUpload className="h-4 w-4 mr-2" />}
                            Xác nhận đẩy dữ liệu
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
          </div>
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
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-14 w-16 text-white hover:bg-white/20 rounded-none transition-colors"
                            onClick={() => console.log("ReportTable Cog Clicked")}
                          >
                              <Cog className="h-5 w-5" />
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 shadow-2xl border-blue-200 z-[100]" sideOffset={8}>
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
            {currentItems.length > 0 ? currentItems.map((item, idx) => {
              const isSelected = selectedSet.has(item.id);
              const isHandled = item.recognitionDate && item.employee && item.incident;
              return (
                <TableRow 
                  key={item.id} 
                  onClick={() => handleRowClick(item.id)}
                  data-state={isSelected ? "selected" : ""}
                  className={cn(
                    "cursor-pointer odd:bg-white even:bg-muted/30 transition-all hover:bg-yellow-300 hover:text-black focus-visible:outline-none",
                    "data-[state=selected]:bg-red-800 data-[state=selected]:text-white"
                  )}
                >
                  <TableCell className="font-medium text-center align-middle py-3 border-r text-inherit">
                    {isHandled ? (
                        <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-1 rounded-full border-2 border-red-500 text-red-600 font-black text-sm">
                            {startIndex + idx + 1}
                        </span>
                    ) : (
                        startIndex + idx + 1
                    )}
                  </TableCell>
                  {orderedColumns.filter(isVisible).map(key => (
                    <TableCell key={key} className="font-medium border-r py-3 align-middle text-inherit">
                      {key === 'incident' ? (
                        item.incident ? (
                          <Badge className={cn(
                            "font-bold text-[10px] px-2 py-0 h-5 shadow-sm",
                            item.incident.includes("Báo nghỉ") ? "bg-red-500 text-white border-none" : 
                            item.incident.includes("Chuyển phòng") ? "bg-orange-500 text-white border-none" :
                            "bg-blue-600 text-white border-none"
                          )} variant="default">
                            {item.incident}
                          </Badge>
                        ) : (
                          <span className="text-green-600 text-[10px] font-bold">Bình thường</span>
                        )
                      ) : key === 'isNotification' ? (
                        item.isNotification ? (
                          <Badge className="bg-orange-100 text-orange-700 border-orange-200 font-bold text-[10px]">Có</Badge>
                        ) : (
                          <span className="text-gray-400">---</span>
                        )
                      ) : key === 'type' ? (
                        <Badge variant="outline" className="font-bold border-blue-200 text-blue-700 bg-blue-50">{item.type || "TH"}</Badge>
                      ) : key === 'class' ? (
                        <span className="font-bold text-blue-700 text-sm whitespace-nowrap">{item.class}</span>
                      ) : key === 'room' ? (
                        <span className="font-bold text-gray-900">{(item as any)[key]}</span>
                      ) : String((item as any)[key] ?? '---')}
                    </TableCell>
                  ))}
                  <TableCell className="p-2 text-center border-l bg-blue-50/5 sticky right-0 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]"></TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={orderedColumns.filter(isVisible).length + 2} className="h-32 text-center text-muted-foreground italic">
                   Không có dữ liệu phù hợp với bộ lọc trong ngày đã chọn.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t bg-muted/20">
          <div className="text-sm text-muted-foreground">Tổng cộng {totalItems} bản ghi. {visibleSelectedCount > 0 && `Đã chọn ${visibleSelectedCount} dòng.`}</div>
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
  );
}

function ViolationTable({ data, loading, t }: { data: StudentViolation[], loading: boolean, t: any }) {
  const { toast } = useToast();
  const [systemParams] = useLocalStorage<any>("system_parameters", {});
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(15);
  const [sortConfig, setSortConfig] = useState<any[]>([]);
  const [filters, setFilters] = useState<any>({});
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());
  const [isPushing, setIsPushing] = useState(false);
  const [isPushDialogOpen, setIsPushDialogOpen] = useState(false);
  const [targetTabName, setTargetTabName] = useState(systemParams.reportSheetTabName || "Báo cáo Tổng hợp");
  const [availableTabs, setAvailableTabs] = useState<string[]>([]);
  const [isLoadingTabs, setIsLoadingTabs] = useState(false);
  const title = "BÁO CÁO GHI NHẬN SINH VIÊN VI PHẠM";

  const orderedColumns = ['fullName', 'class', 'studentId', 'violationDate', 'violationType', 'officer', 'note'];
  const slugTitle = title.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>(`daily_report_colvis_${slugTitle}`, 
    orderedColumns.reduce((acc, col) => ({ ...acc, [col]: true }), {})
  );

  const isVisible = (col: string) => columnVisibility[col] !== false;
  
  const toggleColumn = (col: string) => {
    setColumnVisibility(prev => ({ ...prev, [col]: !isVisible(col) }));
  };

  // Fetch tabs when dialog opens
  useEffect(() => {
    if (isPushDialogOpen && systemParams.googleSheetId) {
      setIsLoadingTabs(true);
      getGoogleSheetTabs(
        systemParams.googleSheetId,
        systemParams.googleServiceAccountEmail,
        systemParams.googlePrivateKey
      ).then(tabs => {
        setAvailableTabs(tabs);
      }).catch(err => {
        console.error(err);
      }).finally(() => {
        setIsLoadingTabs(false);
      });
    }
  }, [isPushDialogOpen, systemParams.googleSheetId, systemParams.googleServiceAccountEmail, systemParams.googlePrivateKey]);

  let processedItems = [...data];
  if (sortConfig.length > 0) {
      const { key, direction } = sortConfig[0];
      processedItems.sort((a:any, b:any) => {
          const aVal = (a as any)[key];
          const bVal = (b as any)[key];
          if (aVal < bVal) return direction === 'ascending' ? -1 : 1;
          if (aVal > bVal) return direction === 'ascending' ? 1 : -1;
          return 0;
      });
  }
  Object.keys(filters).forEach(key => {
      const val = filters[key].toLowerCase();
      if (val) {
          processedItems = processedItems.filter((item:any) => String(item[key] || '').toLowerCase().includes(val));
      }
  });

  const totalItems = processedItems.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentItems = processedItems.slice(startIndex, startIndex + rowsPerPage);

  const visibleSelectedCount = useMemo(() => {
    return processedItems.filter(item => selectedSet.has(item.id)).length;
  }, [processedItems, selectedSet]);

  if (loading) return <div className="h-40 flex items-center justify-center">Đang tải dữ liệu...</div>;

  const columnDefs: any = {
    fullName: "Họ và tên",
    class: "Lớp",
    studentId: "Mã số SV",
    violationDate: "Ngày vi phạm",
    violationType: "Lỗi vi phạm",
    officer: "CB ghi nhận",
    note: "Ghi chú"
  };

  const columnIcons: Record<string, any> = {
    fullName: User,
    class: Library,
    studentId: IdCard,
    violationDate: CalendarDays,
    violationType: AlertTriangle,
    officer: ShieldCheck,
    note: StickyNote
  };

  const handlePushToGoogleSheet = async () => {
    if (isPushing) return;
    if (processedItems.length === 0) {
        toast({ title: "Không có dữ liệu", description: "Bảng hiện tại không có dữ liệu để đẩy.", variant: "destructive" });
        return;
    }

    setIsPushing(true);
    try {
        const headers = orderedColumns.map(col => columnDefs[col]);
        const mapping: Record<string, string> = {};
        orderedColumns.forEach(col => {
            mapping[col] = columnDefs[col];
        });

        const result = await pushToGoogleSheetDynamic(
            processedItems,
            headers,
            mapping,
            systemParams.googleSheetId,
            systemParams.googleServiceAccountEmail,
            systemParams.googlePrivateKey,
            targetTabName
        );

        toast({ title: result.success ? "Thành công" : "Thông báo", description: result.message });
        setIsPushDialogOpen(false);
    } catch (error: any) {
        toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    } finally {
        setIsPushing(false);
    }
  };

  return (
    <Card className="border-none shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
      <CardHeader className="bg-red-50/50 py-4 px-6 border-b border-red-100">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <CardTitle className="text-sm font-black uppercase tracking-widest text-[#dc2626] flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> BÁO CÁO GHI NHẬN SINH VIÊN VI PHẠM ({totalItems})
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Dialog open={isPushDialogOpen} onOpenChange={(open) => {
                console.log("Violation Dialog Open State:", open);
                setIsPushDialogOpen(open);
            }}>
                <DialogTrigger asChild>
                    <Button 
                        variant="outline" 
                        className="h-9 border-orange-500 text-orange-700 hover:bg-orange-600 hover:text-white shadow-sm"
                        onClick={() => console.log("Violation Push Button Clicked")}
                    >
                        <CloudUpload className="h-4 w-4 mr-2" /> Đẩy lên GoogleSheet
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Đẩy dữ liệu lên Google Sheet</DialogTitle>
                        <DialogDescription>Dữ liệu vi phạm sinh viên sẽ được đưa vào Google Sheet đã kết nối.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Chọn Tab / Sheet đích</Label>
                            {isLoadingTabs ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Đang tải danh sách tab...
                                </div>
                            ) : (
                                <Select value={targetTabName} onValueChange={setTargetTabName}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn một tab..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableTabs.map(tab => (
                                            <SelectItem key={tab} value={tab}>{tab}</SelectItem>
                                        ))}
                                        <SelectItem value="NEW_TAB_REQUEST">+ Tạo Tab mới hoặc Nhập tên khác...</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                            {(targetTabName === "NEW_TAB_REQUEST" || !availableTabs.includes(targetTabName)) && !isLoadingTabs && (
                                <Input 
                                    className="mt-2"
                                    value={targetTabName === "NEW_TAB_REQUEST" ? "" : targetTabName} 
                                    onChange={e => setTargetTabName(e.target.value)} 
                                    placeholder="Nhập tên tab mới..."
                                    autoFocus
                                />
                            )}
                        </div>
                        <div className="bg-muted/30 p-3 rounded-lg text-xs space-y-2">
                            <p className="font-bold text-gray-700">Các cột sẽ được xuất (Cột hiện hành):</p>
                            <div className="flex flex-wrap gap-1">
                                {orderedColumns.map(col => (
                                    <Badge key={col} variant="secondary" className="font-normal">{columnDefs[col]}</Badge>
                                ))}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-2 italic">* Chỉ những dữ liệu mới (chưa có UID trên Sheet) mới được đẩy vào để tránh trùng lặp.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsPushDialogOpen(false)}>Hủy</Button>
                        <Button onClick={handlePushToGoogleSheet} disabled={isPushing} className="bg-orange-600 hover:bg-orange-700">
                            {isPushing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CloudUpload className="h-4 w-4 mr-2" />}
                            Xác nhận đẩy dữ liệu
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#dc2626] hover:bg-[#dc2626] h-14 border-red-500">
              <TableHead className="w-[60px] font-bold text-sm text-white text-center border-r border-red-500 whitespace-nowrap bg-[#dc2626]">#</TableHead>
              {orderedColumns.filter(isVisible).map(key => (
                <TableHead key={key} className="text-white border-r border-red-500 p-0 h-auto bg-[#dc2626]">
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
              <TableHead className="w-16 text-center text-white p-0 bg-[#dc2626] border-l border-red-300 sticky right-0 z-20 shadow-[-2px_0_5px_rgba(0,0,0,0.1)]">
                  <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-14 w-16 text-white hover:bg-white/20 rounded-none transition-colors"
                            onClick={() => console.log("ViolationTable Cog Clicked")}
                          >
                              <Cog className="h-5 w-5" />
                          </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 shadow-2xl border-red-200 z-[100]" sideOffset={8}>
                          <DropdownMenuLabel className="font-bold text-red-700 text-xs">Hiển thị cột</DropdownMenuLabel>
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
            {currentItems.length > 0 ? currentItems.map((item, idx) => {
              const isSelected = selectedSet.has(item.id);
              return (
                <TableRow 
                  key={item.id} 
                  onClick={() => {
                    setSelectedSet(prev => {
                      const next = new Set(prev);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    });
                  }}
                  data-state={isSelected ? "selected" : ""}
                  className={cn(
                    "cursor-pointer odd:bg-white even:bg-rose-50/30 transition-all hover:bg-yellow-300 hover:text-black focus-visible:outline-none",
                    "data-[state=selected]:bg-red-800 data-[state=selected]:text-white"
                  )}
                >
                  <TableCell className="font-medium text-center align-middle py-3 border-r border-rose-100 text-inherit">{startIndex + idx + 1}</TableCell>
                  {orderedColumns.filter(isVisible).map(key => (
                    <React.Fragment key={key}>
                      {key === 'fullName' && (
                        <TableCell className="border-r border-rose-100 py-3 font-bold text-red-700 whitespace-nowrap align-middle">
                          {item.fullName}
                        </TableCell>
                      )}
                      {key === 'class' && (
                        <TableCell className="border-r border-rose-100 py-3 text-blue-700 font-bold text-xs align-middle">
                          {item.class}
                        </TableCell>
                      )}
                      {key === 'studentId' && (
                        <TableCell className="border-r border-rose-100 py-3 font-mono text-xs align-middle">
                          {item.studentId}
                        </TableCell>
                      )}
                      {key === 'violationDate' && (
                        <TableCell className="border-r border-rose-100 py-3 text-center text-gray-600 font-mono text-[10px] align-middle">
                          {item.violationDate}
                        </TableCell>
                      )}
                      {key === 'violationType' && (
                        <TableCell className="border-r border-rose-100 py-3 align-middle">
                          <Badge variant="destructive" className="font-bold bg-rose-100 text-rose-700 border-rose-200">
                            {item.violationType}
                          </Badge>
                        </TableCell>
                      )}
                      {key === 'officer' && (
                        <TableCell className="border-r border-rose-100 py-3 text-gray-700 font-medium align-middle">
                          {item.officer}
                        </TableCell>
                      )}
                      {key === 'note' && (
                        <TableCell className="py-3 text-[10px] text-gray-500 italic leading-snug align-middle">
                          {item.note || "---"}
                        </TableCell>
                      )}
                    </React.Fragment>
                  ))}
                  <TableCell className="p-2 text-center border-l bg-rose-50/5 sticky right-0 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]"></TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={orderedColumns.filter(isVisible).length + 2} className="h-32 text-center text-muted-foreground italic">
                   Không có dữ liệu vi phạm phù hợp.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t bg-muted/20">
          <div className="text-sm text-muted-foreground">Tổng cộng {totalItems} bản ghi. {visibleSelectedCount > 0 && `Đã chọn ${visibleSelectedCount} dòng.`}</div>
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
  );
}



