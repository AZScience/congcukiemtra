"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  MonitorCheck, PlusCircle, Trash2, Edit, Cog, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, Copy, ArrowUpDown, ArrowUp, 
  ArrowDown, Filter, X, EllipsisVertical, Save, Undo2, 
  Eye, Ban, FileUp, FileDown, CheckCircle2, ListFilter, Check, 
  ChevronsUpDown, Clock, Library, CalendarDays, Camera,
  Hash, Layers, Users, Landmark, User, FileText, StickyNote,
  GraduationCap, AlertCircle, MessageSquare, Map, School, DoorOpen, Activity, CloudUpload, CloudDownload, Bell, History, ChevronDown
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { usePermissions } from "@/hooks/use-permissions";
import * as XLSX from 'xlsx';
import { format, parse, isValid } from "date-fns";
import { DatePickerField } from "@/components/ui/date-picker-field";
import PageHeader from "@/components/page-header";
import { ClientOnly } from "@/components/client-only";
import { useLanguage } from "@/hooks/use-language";
import { DataTableEmptyState } from "@/components/data-table-empty-state";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { useMasterData } from "@/providers/master-data-provider";
import { collection, doc, setDoc, deleteDoc, writeBatch, getDoc } from "firebase/firestore";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { EvidenceInput } from "@/components/monitoring/evidence-input";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { DailySchedule, IncidentCategory, Employee, BuildingBlock, Department, Lecturer, Classroom } from '@/lib/types';

type DialogMode = 'add' | 'edit' | 'copy' | 'view';

// Removed redundant date helpers as DatePickerField handles formatting internally

const ColumnHeader = ({ columnKey, title, icon: Icon, t, sortConfig, openPopover, setOpenPopover, requestSort, clearSort, filters, handleFilterChange }: any) => {
    const sortState = sortConfig?.find((s: any) => s.key === columnKey);
    const isFiltered = !!filters[columnKey];
    return (
        <Popover open={openPopover === columnKey} onOpenChange={(isOpen) => setOpenPopover(isOpen ? columnKey : null)}>
            <PopoverTrigger asChild>
                <Button variant="ghost" className="text-white hover:text-white hover:bg-blue-700 h-10 px-3 group w-full justify-start font-bold text-[11px] uppercase tracking-wider">
                    {Icon && <Icon className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-80" />}
                    <span className="truncate">{t(title)}</span>
                    {sortState ? (
                        sortState.direction === 'ascending' ? <ArrowUp className={cn("ml-1 h-3 w-3", isFiltered && "text-red-500")} /> : <ArrowDown className={cn("ml-1 h-3 w-3", isFiltered && "text-red-500")} />
                    ) : (
                        <ArrowUpDown className={cn("ml-1 h-3 w-3 opacity-30", isFiltered ? "text-red-500" : "group-hover:opacity-100")} />

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
                    {isFiltered && (
                        <Button variant="ghost" onClick={() => handleFilterChange(columnKey, '')} className="w-full justify-start text-destructive hover:text-destructive h-8 px-2 mt-1">
                            <X className="mr-2 h-4 w-4" /> {t('Xóa bộ lọc')}
                        </Button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

const MultiSelect = ({ options, selected, onChange, placeholder, emptyText }: any) => {
    const [open, setOpen] = useState(false);
    const handleSelect = (value: string) => {
        const newSelected = selected.includes(value) ? selected.filter((i: string) => i !== value) : [...selected, value];
        onChange(newSelected);
    };
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between h-auto min-h-10 py-2 px-3 text-left font-normal flex items-center gap-2 overflow-hidden">
                    <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                        {selected.length === 0 && <span className="text-muted-foreground truncate">{placeholder}</span>}
                        {selected.map((val: string) => (
                            <Badge key={val} variant="secondary" className="max-w-[150px] inline-flex items-center gap-1 px-2 shrink-0">
                                <span className="truncate flex-1">{options.find((o: any) => o.value === val)?.label || val}</span>
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
                            {options.map((option: any) => (
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

const CreatableCombobox = ({ options, value, onChange, placeholder, disabled }: any) => {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");

    const displayValue = options.find((o: any) => o.value === value)?.label || value;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button 
                    variant="outline" 
                    role="combobox" 
                    className="w-full justify-between font-normal h-8 text-sm"
                    disabled={disabled}
                >
                    <span className="truncate">{value ? displayValue : placeholder}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Tìm hoặc nhập mới..." value={search} onValueChange={setSearch} />
                    <CommandList>
                        <CommandEmpty className="p-2">
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-xs text-primary h-8 px-2"
                                onClick={() => {
                                    onChange(search);
                                    setOpen(false);
                                    setSearch("");
                                }}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" /> Thêm mới: "{search}"
                            </Button>
                        </CommandEmpty>
                        <CommandGroup>
                            {options.map((option: any) => (
                                <CommandItem
                                    key={option.value}
                                    onSelect={() => {
                                        onChange(option.value);
                                        setOpen(false);
                                        setSearch("");
                                    }}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", value === option.value ? "opacity-100" : "opacity-0")} />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

const AdvancedFilterDialog = ({ open, onOpenChange, filters, setFilters, blockOptions, deptOptions, roomOptions, lecturerOptions, t, onSaveCloud, onLoadCloud, isSaving, presets, onDeleteCloud }: any) => {
    const [newPresetName, setNewPresetName] = useState('');
    const [isNamingPreset, setIsNamingPreset] = useState(false);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
                <div className="flex items-center justify-between border-b pl-4 pr-12 py-3 bg-muted/30">
                    <div className="flex items-center gap-3">
                        <ListFilter className="h-5 w-5 text-primary" />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <div className="flex items-center gap-2 cursor-pointer hover:opacity-70 transition-opacity group">
                                    <DialogTitle className="text-lg font-bold">Bộ lọc nâng cao</DialogTitle>
                                    <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-64">
                                <DropdownMenuLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <History className="h-3.5 w-3.5" /> Bộ lọc đã lưu
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <ScrollArea className="h-[200px]">
                                    {presets?.length > 0 ? presets.map((preset: any, idx: number) => (
                                        <div key={idx} className="flex items-center group/item px-1">
                                            <DropdownMenuItem className="flex-1 cursor-pointer" onSelect={() => setFilters(preset.filters)}>
                                                <span className="truncate">{preset.name}</span>
                                            </DropdownMenuItem>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover/item:opacity-100 text-destructive hover:bg-destructive/10" onClick={(e) => { e.stopPropagation(); onDeleteCloud(preset.name); }}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    )) : (
                                        <div className="px-2 py-4 text-center italic text-[10px] text-muted-foreground">Chưa có bộ lọc nào</div>
                                    )}
                                </ScrollArea>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-2">
                        {isNamingPreset ? (
                            <div className="flex items-center gap-1">
                                <Input placeholder="Tên bộ lọc..." className="h-8 w-32 text-xs" value={newPresetName} onChange={e => setNewPresetName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && newPresetName.trim()) { onSaveCloud(newPresetName.trim()); setNewPresetName(''); setIsNamingPreset(false); } }} />
                                <Button size="sm" className="h-8 px-2" onClick={() => { if (newPresetName.trim()) { onSaveCloud(newPresetName.trim()); setNewPresetName(''); setIsNamingPreset(false); } }} disabled={isSaving}><Check className="h-3 w-3" /></Button>
                                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setIsNamingPreset(false)}><X className="h-3 w-3" /></Button>
                            </div>
                        ) : (
                            <Button variant="ghost" size="sm" className="h-8 text-[10px] font-bold text-primary hover:bg-primary/10" onClick={() => setIsNamingPreset(true)}>
                                <CloudUpload className="mr-1.5 h-3.5 w-3.5" /> Lưu hiện tại
                            </Button>
                        )}
                    </div>
                </div>

                <VisuallyHidden><DialogDescription>Cấu hình bộ lọc nâng cao.</DialogDescription></VisuallyHidden>

                <ScrollArea className="max-h-[70vh]">
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Ngày lọc</Label><DatePickerField value={filters.date || ''} onChange={val => setFilters({...filters, date: val})} /></div>
                            <div className="space-y-2"><Label className="flex items-center gap-2"><Clock className="h-4 w-4 text-orange-500" /> Ca học</Label>
                                <Select value={filters.periodSession} onValueChange={v => setFilters({...filters, periodSession: v})}>
                                    <SelectTrigger><SelectValue placeholder="Chọn ca học..." /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">Tất cả</SelectItem><SelectItem value="morning">Ca sáng (1-6)</SelectItem><SelectItem value="afternoon">Ca chiều (7-12)</SelectItem><SelectItem value="evening">Ca tối (13-17)</SelectItem><SelectItem value="custom">Tùy chỉnh...</SelectItem></SelectContent>
                                </Select>
                            </div>
                            {filters.periodSession === 'custom' && (
                                <div className="md:col-span-2 grid grid-cols-2 gap-4 border p-3 rounded-lg bg-muted/20">
                                    <div className="space-y-2"><Label className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Từ tiết</Label><Input type="number" min={1} max={17} value={filters.periodStart} onChange={e => setFilters({...filters, periodStart: e.target.value})} placeholder="1" /></div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Đến tiết</Label>
                                        <Input type="number" min={1} max={17} value={filters.periodEnd} onChange={e => setFilters({...filters, periodEnd: e.target.value})} placeholder="17" />
                                    </div>
                                </div>
                            )}
                            <div className="space-y-2"><Label className="flex items-center gap-2"><Map className="h-4 w-4 text-primary" /> Dãy nhà (Chọn nhiều)</Label><MultiSelect options={blockOptions} selected={filters.buildings} onChange={(v: any) => setFilters({...filters, buildings: v})} placeholder="Chọn dãy nhà..." emptyText="Không có dữ liệu" /></div>
                            <div className="space-y-2"><Label className="flex items-center gap-2"><Landmark className="h-4 w-4 text-primary" /> Khoa / Đơn vị (Chọn nhiều)</Label><MultiSelect options={deptOptions} selected={filters.departments} onChange={(v: any) => setFilters({...filters, departments: v})} placeholder="Chọn khoa..." emptyText="Không có dữ liệu" /></div>
                            <div className="space-y-2"><Label className="flex items-center gap-2"><DoorOpen className="h-4 w-4 text-primary" /> Phòng (Chọn nhiều)</Label><MultiSelect options={roomOptions} selected={filters.rooms} onChange={(v: any) => setFilters({...filters, rooms: v})} placeholder="Chọn phòng..." emptyText="Không có dữ liệu" /></div>
                            <div className="space-y-2"><Label className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Giảng viên (Chọn nhiều)</Label><MultiSelect options={lecturerOptions} selected={filters.lecturers} onChange={(v: any) => setFilters({...filters, lecturers: v})} placeholder="Chọn giảng viên..." emptyText="Không có dữ liệu" /></div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="p-4 border-t bg-muted/20 flex items-center justify-end gap-2">
                    <Button variant="ghost" onClick={() => setFilters({ date: format(new Date(), 'yyyy-MM-dd'), buildings: [], departments: [], rooms: [], lecturers: [], periodSession: 'all', periodStart: '', periodEnd: '' })} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <X className="mr-2 h-4 w-4" /> Xóa tất cả
                    </Button>
                    <Button onClick={() => onOpenChange(false)} className="bg-primary text-primary-foreground shadow-sm">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Áp dụng bộ lọc
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const EditDialog = ({ open, onOpenChange, mode, formData: initialFormData, onSave, t, filteredIncidents, blocks, rms, departments, lecturers, currentUserEmployee }: any) => {
    const [formData, setFormData] = useState<any>(initialFormData);

    useEffect(() => {
        if (open) {
            let data = { ...initialFormData };
            if (mode !== 'view' && !data.employee && currentUserEmployee) {
                data.employee = currentUserEmployee.nickname || currentUserEmployee.name || '';
            }
            setFormData(data);
        }
    }, [open, initialFormData, currentUserEmployee]);

    const isChanged = useMemo(() => JSON.stringify(formData) !== JSON.stringify(initialFormData), [formData, initialFormData]);
    const onUndo = () => setFormData(initialFormData);
    const handleLocalSave = () => onSave(formData);

    const blockOptions = useMemo(() => Array.from(new Set((blocks || []).map((b: any) => b.name).filter(Boolean))).sort().map(n => ({ label: n as string, value: n as string })), [blocks]);
    const deptOptions = useMemo(() => Array.from(new Set((departments || []).map((d: any) => d.name).filter(Boolean))).sort().map(n => ({ label: n as string, value: n as string })), [departments]);
    const roomOptions = useMemo(() => Array.from(new Set((rms || []).filter((r: any) => !formData.building || blocks?.find((b: any) => b.id === r.buildingBlockId)?.name === formData.building).map((r: any) => r.name).filter(Boolean))).sort().map(n => ({ label: n as string, value: n as string })), [rms, formData.building, blocks]);
    const lecturerOptions = useMemo(() => Array.from(new Set((lecturers || []).map((l: any) => l.name).filter(Boolean))).sort().map(n => ({ label: n as string, value: n as string })), [lecturers]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader><DialogTitle>{mode === 'view' ? 'Chi tiết' : (mode === 'edit' ? 'Ghi nhận' : 'Thêm mới')} lớp học tại phòng</DialogTitle><VisuallyHidden><DialogDescription>Cấu hình thông tin.</DialogDescription></VisuallyHidden></DialogHeader>
                <ScrollArea className="max-h-[75vh]">
                    <div className="p-6">
                        <Accordion type="single" collapsible defaultValue="class-info" className="w-full space-y-4">
                            <AccordionItem value="class-info" className="border rounded-lg bg-card px-4">
                                <AccordionTrigger className="hover:no-underline py-3">
                                    <div className="flex items-center gap-2 font-bold text-primary uppercase tracking-wider">
                                        <Library className="h-4 w-4" /> THÔNG TIN LỚP HỌC
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pt-2 pb-4">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 text-sm bg-muted/20 p-4 rounded-lg">
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Ngày</Label>
                                            {mode !== 'view' ? 
                                                <DatePickerField 
                                                    value={formData.date?.includes('/') ? formData.date.split('/').reverse().join('-') : formData.date || ''} 
                                                    onChange={val => {
                                                        if (val) {
                                                            const [y, m, d] = val.split('-');
                                                            setFormData({...formData, date: `${d}/${m}/${y}`});
                                                        } else {
                                                            setFormData({...formData, date: ''});
                                                        }
                                                    }}
                                                    className="h-8 cursor-pointer"
                                                /> : 
                                                <p className="font-bold">{formData.date}</p>
                                            }
                                        </div>
                                        <div className="space-y-1"><Label className="text-muted-foreground flex items-center gap-2"><Hash className="h-4 w-4 text-primary" /> Tiết</Label>{mode !== 'view' ? <Input className="h-8" value={formData.period || ''} onChange={e => setFormData({...formData, period: e.target.value})} /> : <p className="font-bold">{formData.period}</p>}</div>
                                        <div className="space-y-1"><Label className="text-muted-foreground flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> LT/TH</Label>{mode !== 'view' ? <Select value={formData.type || 'none'} onValueChange={v => setFormData({...formData, type: v === 'none' ? '' : v})}><SelectTrigger className="h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">---</SelectItem><SelectItem value="LT">Lý thuyết (LT)</SelectItem><SelectItem value="TH">Thực hành (TH)</SelectItem></SelectContent></Select> : <p className="font-bold">{formData.type}</p>}</div>
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground flex items-center gap-2"><Landmark className="h-4 w-4 text-primary" /> Khoa sử dụng</Label>
                                            {mode !== 'view' ? 
                                                <CreatableCombobox options={deptOptions} value={formData.department} onChange={(v: any) => setFormData({...formData, department: v})} placeholder="Chọn..." /> : 
                                                <p className="font-bold">{formData.department}</p>
                                            }
                                        </div>
                                        <div className="space-y-1"><Label className="text-muted-foreground flex items-center gap-2"><Library className="h-4 w-4 text-blue-600" /> Lớp</Label>{mode !== 'view' ? <Input className="h-8" value={formData.class || ''} onChange={e => setFormData({...formData, class: e.target.value})} /> : <p className="font-bold text-blue-600">{formData.class}</p>}</div>
                                        <div className="space-y-1"><Label className="text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Sĩ số</Label>{mode !== 'view' ? <Input type="number" className="h-8" value={formData.studentCount || ''} onChange={e => setFormData({...formData, studentCount: Number(e.target.value)})} /> : <p className="font-bold">{formData.studentCount}</p>}</div>
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Giảng viên</Label>
                                            {mode !== 'view' ? 
                                                <CreatableCombobox options={lecturerOptions} value={formData.lecturer} onChange={(v: any) => setFormData({...formData, lecturer: v})} placeholder="Chọn..." /> : 
                                                <p className="font-bold text-primary">{formData.lecturer}</p>
                                            }
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground flex items-center gap-2"><Map className="h-4 w-4 text-primary" /> Dãy nhà</Label>
                                            {mode !== 'view' ? 
                                                <CreatableCombobox options={blockOptions} value={formData.building} onChange={(v: any) => setFormData({...formData, building: v})} placeholder="Chọn..." /> : 
                                                <p className="font-bold">{formData.building}</p>
                                            }
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground flex items-center gap-2"><DoorOpen className="h-4 w-4 text-primary" /> Phòng</Label>
                                            {mode !== 'view' ? 
                                                <CreatableCombobox options={roomOptions} value={formData.room} onChange={(v: any) => setFormData({...formData, room: v})} placeholder="Chọn..." /> : 
                                                <p className="font-bold">{formData.room}</p>
                                            }
                                        </div>
                                        <div className="space-y-1"><Label className="text-muted-foreground flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Nội dung</Label>{mode !== 'view' ? <Input className="h-8" value={formData.content || ''} onChange={e => setFormData({...formData, content: e.target.value})} /> : <p className="text-xs">{formData.content}</p>}</div>
                                        <div className="space-y-1">
                                            <Label className="text-muted-foreground flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Trạng thái</Label>
                                            {mode !== 'view' ? 
                                                <Select value={formData.status || 'Phòng học'} onValueChange={v => setFormData({...formData, status: v})}>
                                                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Phòng học">Phòng học</SelectItem>
                                                        <SelectItem value="Phòng Thi">Phòng Thi</SelectItem>
                                                        <SelectItem value="Phòng tự do">Phòng tự do</SelectItem>
                                                    </SelectContent>
                                                </Select> : 
                                                <p className="font-bold">{formData.status || 'Phòng học'}</p>
                                            }
                                        </div>
                                        <div className="space-y-1"><Label className="text-muted-foreground flex items-center gap-2"><StickyNote className="h-4 w-4 text-primary" /> Ghi chú</Label><Input className="h-8" value={formData.note || ''} onChange={e => setFormData({...formData, note: e.target.value})} disabled={mode === 'view'} /></div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>

                            {(mode === 'edit' || mode === 'view') && (
                                <>
                                    <AccordionItem value="recording-info" className="border rounded-lg bg-card px-4">
                                        <AccordionTrigger className="hover:no-underline py-3">
                                            <div className="flex items-center gap-2 font-bold text-orange-600 uppercase tracking-wider">
                                                <Edit className="h-4 w-4" /> THÔNG TIN GHI NHẬN
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-2 pb-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="space-y-2"><Label>Sinh viên dự thực tế</Label><Input type="number" value={formData.attendingStudents ?? ''} onChange={e => setFormData({...formData, attendingStudents: e.target.value ? Number(e.target.value) : null})} disabled={mode === 'view'} /></div>
                                                <div className="space-y-2">
                                                    <Label>Việc phát sinh</Label>
                                                    <Select value={formData.incident || 'none'} onValueChange={v => setFormData({...formData, incident: v === 'none' ? '' : v})} disabled={mode === 'view'}>
                                                        <SelectTrigger><SelectValue placeholder="---" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">--- Không có ---</SelectItem>
                                                            {filteredIncidents?.map((i: any) => (
                                                                <SelectItem key={i.id} value={i.name}>{i.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex items-end gap-3 pb-2">
                                                    <div className="flex items-center space-x-2 bg-orange-50 p-2 rounded-md border border-orange-200">
                                                        <Checkbox 
                                                            id="isNotification" 
                                                            checked={!!formData.isNotification} 
                                                            onCheckedChange={checked => setFormData({...formData, isNotification: !!checked})}
                                                            disabled={mode === 'view'}
                                                        />
                                                        <Label htmlFor="isNotification" className="flex items-center gap-2 cursor-pointer text-orange-700 font-bold">
                                                            <Bell className="h-4 w-4" /> Thông báo
                                                        </Label>
                                                    </div>
                                                </div>
                                                <div className="space-y-2"><Label className="flex items-center gap-2"><MessageSquare className="h-4 w-4 text-orange-600" /> Chi tiết sự cố</Label><Input value={formData.incidentDetail || ''} onChange={e => setFormData({...formData, incidentDetail: e.target.value})} disabled={mode === 'view'} /></div>
                                                {mode === 'view' && (
                                                    <>
                                                        <div className="space-y-2">
                                                            <Label className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-orange-600" /> Ngày ghi nhận</Label>
                                                            <Input value={formData.recognitionDate?.includes('-') ? formData.recognitionDate.split('-').reverse().join('/') : formData.recognitionDate || ''} disabled />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label className="flex items-center gap-2"><User className="h-4 w-4 text-orange-600" /> Nhân viên</Label>
                                                            <Input value={formData.employee || ''} disabled />
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="evidence-info" className="border rounded-lg bg-card px-4">
                                        <AccordionTrigger className="hover:no-underline py-3">
                                            <div className="flex items-center gap-2 font-bold text-blue-600 uppercase tracking-wider">
                                                <Camera className="h-4 w-4" /> THÔNG TIN MINH CHỨNG
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="pt-2 pb-4">
                                            <EvidenceInput value={formData.evidence || ''} onChange={v => setFormData({...formData, evidence: v})} />
                                        </AccordionContent>
                                    </AccordionItem>
                                </>
                            )}
                        </Accordion>
                    </div>
                </ScrollArea>
                <DialogFooter className="px-6 pb-6">
                    <Tooltip><TooltipTrigger asChild><Button variant="outline" onClick={onUndo} disabled={!isChanged || mode === 'view'}><Undo2 className="mr-2 h-4 w-4" />Hoàn tác</Button></TooltipTrigger><TooltipContent><p>{t('Khôi phục thay đổi')}</p></TooltipContent></Tooltip>
                    {mode !== 'view' ? (
                        <Tooltip><TooltipTrigger asChild><Button onClick={handleLocalSave} disabled={!isChanged}><Save className="mr-2 h-4 w-4" />Lưu lại</Button></TooltipTrigger><TooltipContent><p>{t('Lưu các thay đổi')}</p></TooltipContent></Tooltip>
                    ) : (
                        <Tooltip><TooltipTrigger asChild><Button onClick={() => onOpenChange(false)}>Đóng</Button></TooltipTrigger><TooltipContent><p>{t('Đóng hộp thoại')}</p></TooltipContent></Tooltip>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function InPersonPage() {
    const { t } = useLanguage();
    const firestore = useFirestore();
    const { user: authUser } = useUser();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const { 
        employees, 
        lecturers, 
        departments, 
        rooms, 
        blocks, 
        recognitions, 
        incidentCategories 
    } = useMasterData();
    const { permissions } = usePermissions('/monitoring/in-person') as any;

    const schedulesRef = useMemo(() => (firestore ? collection(firestore, 'schedules') : null), [firestore]);
    const { data: schedulesData, loading: schedulesLoading } = useCollection<DailySchedule>(schedulesRef);
    
    // Find the recognition ID for "Lớp học trực tiếp"
    const targetRecognition = useMemo(() => 
        recognitions?.find(r => r.name === "Lớp học trực tiếp"),
    [recognitions]);
    
    // Filter incident categories based on the specific recognition ID
    // Fall back to all categories if none match the specific recognition to avoid empty comboboxes
    const filteredIncidents = useMemo(() => {
        if (!incidentCategories) return [];
        const filtered = incidentCategories.filter(i => i.recognitionId === targetRecognition?.id);
        return filtered.length > 0 ? filtered : incidentCategories;
    }, [incidentCategories, targetRecognition]);
    
    const currentUserEmployee = useMemo(() => 
        employees?.find(e => e.email?.toLowerCase() === authUser?.email?.toLowerCase()), 
    [employees, authUser]);

    const inPersonSchedules = useMemo(() => {
      if (!schedulesData) return [];
      return schedulesData
        .filter(s => {
          const isExam = s.status === 'Phòng thi' || s.status === 'Thi cuối kỳ';
          const isOnline = (s.building || '').toLowerCase().includes('trực tuyến');
          const isExternal = (s.building || '').toLowerCase().includes('ngoài');
          const content = (s.content || '').toLowerCase();
          const status = (s.status || '').toLowerCase();
          const isHomeroom = ['cvht', 'shcn', 'cố vấn', 'sinh hoạt', 'chủ nhiệm'].some(k => content.includes(k) || status.includes(k));
          return !isExam && !isOnline && !isExternal && !isHomeroom;
        })
        .map((item, idx) => ({ ...item, renderId: `${item.id}-${idx}` })) as any[];
    }, [schedulesData]);

    const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useLocalStorage<any>('inperson_adv_filters_v1', {
        date: format(new Date(), 'yyyy-MM-dd'), 
        buildings: [], 
        departments: [],
        rooms: [], 
        lecturers: [],
        periodSession: 'all',
        periodStart: '',
        periodEnd: ''
    });

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [formData, setFormData] = useState<Partial<DailySchedule>>({});
    const [initialFormState, setInitialFormState] = useState<Partial<DailySchedule>>({});
    const [dialogMode, setDialogMode] = useState<DialogMode>('edit');

    // Cloud Filter Persistence
    const [filterPresets, setFilterPresets] = useState<any[]>([]);

    const saveFiltersToCloud = useCallback(async (presetName: string) => {
        if (!firestore || !authUser) return;
        setIsSavingFilters(true);
        try {
            const newPreset = {
                name: presetName,
                filters: advancedFilters,
                createdAt: new Date().toISOString()
            };
            const updatedPresets = [...filterPresets.filter(p => p.name !== presetName), newPreset];

            await setDoc(doc(firestore, "user_settings", authUser.uid), {
                inperson_advanced_presets: updatedPresets,
                updatedAt: new Date()
            }, { merge: true });

            setFilterPresets(updatedPresets);
            toast({ title: "Đã lưu bộ lọc", description: `Đã lưu "${presetName}"` });
        } catch (error) {
            toast({ title: "Lỗi khi lưu bộ lọc", variant: "destructive" });
        } finally {
            setIsSavingFilters(false);
        }
    }, [firestore, authUser, advancedFilters, filterPresets, toast]);

    const loadFiltersFromCloud = useCallback(async () => {
        if (!firestore || !authUser) return;
        try {
            const docSnap = await getDoc(doc(firestore, "user_settings", authUser.uid));
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.inperson_advanced_presets) {
                    setFilterPresets(data.inperson_advanced_presets);
                } else if (data.inperson_advanced_filters) {
                    setFilterPresets([{ name: "Bộ lọc cũ", filters: data.inperson_advanced_filters }]);
                }
            }
        } catch (error) {
            console.error("Error loading filters:", error);
        }
    }, [firestore, authUser]);

    const deleteFilterFromCloud = async (presetName: string) => {
        if (!authUser?.uid || !firestore) return;
        try {
            const updatedPresets = filterPresets.filter(p => p.name !== presetName);
            await setDoc(doc(firestore, 'user_settings', authUser.uid), {
                inperson_advanced_presets: updatedPresets,
                updatedAt: new Date()
            }, { merge: true });
            setFilterPresets(updatedPresets);
            toast({ title: "Đã xóa bộ lọc" });
        } catch (err) {
            toast({ title: "Lỗi khi xóa", variant: "destructive" });
        }
    };

    // Auto-load on mount
    useEffect(() => {
        if (authUser) loadFiltersFromCloud();
    }, [authUser, loadFiltersFromCloud]);
    
    const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
    const [importingData, setImportingData] = useState<any[]>([]);
    const [isProcessingImport, setIsProcessingImport] = useState(false);

    const [currentPage, setCurrentPage] = useLocalStorage('inperson_currentPage_v3', 1);
    const [rowsPerPage, setRowsPerPage] = useLocalStorage('inperson_rowsPerPage_v3', 10);
    const [sortConfig, setSortConfig] = useLocalStorage<any[]>('inperson_sortConfig_v3', []);
    const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>('inPerson_colVis_v3', { 
        date: true, building: true, room: true, period: true, type: true, department: true, class: true, studentCount: true, lecturer: true, content: true, status: true, note: false
    });
    const [filters, setFilters] = useLocalStorage<Partial<Record<keyof DailySchedule, string>>>('inperson_filters_v3', {});
    const [isSavingFilters, setIsSavingFilters] = useState(false);
    const [openPopover, setOpenPopover] = useState<string | null>(null);
    const [selectedRowIds, setSelectedRowIds] = useLocalStorage<string[]>('inperson_selected_ids_v3', []);
    const selectedSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);

    const isChanged = useMemo(() => JSON.stringify(formData) !== JSON.stringify(initialFormState), [formData, initialFormState]);

    const blockOptions = useMemo(() => Array.from(new Set((blocks || []).map((b: any) => b.name).filter(Boolean))).sort().map(n => ({ label: n as string, value: n as string })), [blocks]);
    const deptOptions = useMemo(() => Array.from(new Set((departments || []).map((d: any) => d.name).filter(Boolean))).sort().map(n => ({ label: n as string, value: n as string })), [departments]);
    const roomOptions = useMemo(() => Array.from(new Set((rooms || []).map((r: any) => r.name).filter(Boolean))).sort().map(n => ({ label: n as string, value: n as string })), [rooms]);
    const lecturerOptions = useMemo(() => Array.from(new Set((lecturers || []).map((l: any) => l.name).filter(Boolean))).sort().map(n => ({ label: n as string, value: n as string })), [lecturers]);

    const filteredItems = useMemo(() => {
        let fDate = advancedFilters.date || '';
        if (fDate.includes('-')) {
            const [y, m, d] = fDate.split('-');
            fDate = `${d}/${m}/${y}`;
        }

        return inPersonSchedules.filter(item => {
            const matchesColumnFilters = Object.entries(filters).every(([key, value]) => String((item as any)[key] ?? '').toLowerCase().includes(String(value).toLowerCase()));
            if (!matchesColumnFilters) return false;
            
            if (fDate && item.date !== fDate) return false;
            if (advancedFilters.buildings.length > 0 && !advancedFilters.buildings.includes(item.building)) return false;
            if (advancedFilters.departments.length > 0 && !advancedFilters.departments.includes(item.department)) return false;
            if (advancedFilters.rooms.length > 0 && !advancedFilters.rooms.includes(item.room)) return false;
            if (advancedFilters.lecturers.length > 0 && !advancedFilters.lecturers.includes(item.lecturer)) return false;
            
            if (advancedFilters.periodSession !== 'all') {
                const parts = String(item.period || '').split('->').map(p => parseInt(p.trim()));
                const startPeriod = parts[0];
                if (isNaN(startPeriod)) return false;
                if (advancedFilters.periodSession === 'morning' && (startPeriod < 1 || startPeriod > 6)) return false;
                if (advancedFilters.periodSession === 'afternoon' && (startPeriod < 7 || startPeriod > 12)) return false;
                if (advancedFilters.periodSession === 'evening' && (startPeriod < 13 || startPeriod > 17)) return false;
                if (advancedFilters.periodSession === 'custom') {
                    const pStart = parseInt(advancedFilters.periodStart);
                    const pEnd = parseInt(advancedFilters.periodEnd);
                    if (!isNaN(pStart) && startPeriod < pStart) return false;
                    if (!isNaN(pEnd) && startPeriod > pEnd) return false;
                }
            }
            return true;
        });
    }, [inPersonSchedules, filters, advancedFilters]);

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
    const visibleSelectedCount = useMemo(() => sortedItems.filter(item => selectedSet.has(item.renderId)).length, [sortedItems, selectedSet]);

    const safeRowsPerPage = Math.max(1, Number(rowsPerPage) || 10);
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

    const openDialog = (mode: DialogMode, item?: any) => {
        setDialogMode(mode); setSelectedItem(item || null);
        let data = item ? (mode === 'copy' ? { 
            ...item, 
            id: undefined,
            recognitionDate: undefined,
            employee: undefined,
            attendingStudents: undefined,
            incident: undefined,
            incidentDetail: undefined,
            isNotification: undefined,
            evidence: undefined
        } : { ...item }) : { 
            date: format(new Date(), 'dd/MM/yyyy'), 
            status: 'Phòng học'
        };

        if (mode === 'edit' || mode === 'add' || mode === 'copy') {
            if (!data.recognitionDate) data.recognitionDate = format(new Date(), 'yyyy-MM-dd');
            if (!data.employee && currentUserEmployee) {
                data.employee = currentUserEmployee.nickname || currentUserEmployee.name || '';
            }
        }

        setFormData(data); setInitialFormState(data); setIsEditDialogOpen(true);
    };

    const ensureReferences = async (data: any) => {
        if (!firestore) return;
        const batch = writeBatch(firestore);
        let updated = false;

        if (data.lecturer && !lecturers?.some(l => l.name === data.lecturer)) {
            const id = `GV-${Math.floor(1000 + Math.random() * 9000)}`;
            batch.set(doc(firestore, 'lecturers', id), { id, name: data.lecturer, position: 'Giảng viên' });
            updated = true;
        }
        if (data.building && !blocks?.some(b => b.name === data.building)) {
            const id = `B-${Math.floor(100 + Math.random() * 900)}`;
            batch.set(doc(firestore, 'building-blocks', id), { id, code: data.building.charAt(0).toUpperCase(), name: data.building });
            updated = true;
        }
        if (data.department && !departments?.some(d => d.name === data.department)) {
            const id = `K-${Math.floor(100 + Math.random() * 900)}`;
            batch.set(doc(firestore, 'departments', id), { id, departmentId: id, name: data.department });
            updated = true;
        }
        if (data.room && !rooms?.some(r => r.name === data.room)) {
            const id = data.room.replace(/\s+/g, '-');
            batch.set(doc(firestore, 'classrooms', id), { id, name: data.room, roomType: 'Lý thuyết', buildingBlockId: '' });
            updated = true;
        }

        if (updated) await batch.commit();
    };

    const handleSave = async (updatedData: any) => {
        if (!firestore) return;
        const dataToSave = updatedData || formData;
        await ensureReferences(dataToSave);
        const id = (dialogMode === 'edit' || dialogMode === 'view') && selectedItem ? selectedItem.id : (dataToSave.id || doc(collection(firestore, "schedules")).id);
        await setDoc(doc(firestore, "schedules", id), { ...dataToSave, id }, { merge: true });
        setIsEditDialogOpen(false); toast({ title: "Thành công" });
    };

    const handleUndo = () => { setFormData(initialFormState); toast({ title: t("Đã hoàn tác dữ liệu") }); };
    const confirmDelete = async (item: any) => { if (firestore) { await deleteDoc(doc(firestore, "schedules", item.id)); toast({ title: "Thành công" }); } setIsDeleteDialogOpen(false); };

    const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result; const wb = XLSX.read(bstr, { type: 'binary' });
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { range: 7 });
            setImportingData(data); setIsImportPreviewOpen(true);
        };
        reader.readAsBinaryString(file); e.target.value = '';
    };

    const processImport = async () => {
        if (!firestore || importingData.length === 0) return;
        setIsProcessingImport(true);
        const batch = writeBatch(firestore);
        for (const row of importingData) {
            const id = doc(collection(firestore, "schedules")).id;
            batch.set(doc(firestore, 'schedules', id), { 
                id, 
                date: String(row['Ngày'] || ''), 
                building: String(row['Dãy nhà'] || ''), 
                room: String(row['Phòng'] || ''), 
                period: String(row['Tiết'] || ''), 
                type: String(row['LT/TH'] || ''),
                studentCount: Number(row['Sĩ số'] || 0),
                class: String(row['Lớp'] || ''), 
                lecturer: String(row['Giảng viên'] || ''), 
                content: String(row['Nội dung'] || ''), 
                status: String(row['Trạng thái'] || 'Phòng học') 
            }, { merge: true });
        }
        await batch.commit(); setIsProcessingImport(false); setIsImportPreviewOpen(false); toast({ title: "Import thành công" });
    };

    const handleExport = () => {
        const ws = XLSX.utils.json_to_sheet(sortedItems); const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "InPersonClasses"); XLSX.writeFile(wb, `DS_TrucTiep_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    };

    const allColumns = ['date', 'building', 'room', 'period', 'type', 'department', 'class', 'studentCount', 'lecturer', 'content', 'status', 'note'];
    const columnDefs: Record<string, string> = { 
        date: 'Ngày', 
        building: 'Dãy nhà', 
        room: 'Phòng', 
        period: 'Tiết', 
        type: 'LT/TH', 
        department: 'Khoa sử dụng', 
        class: 'Lớp', 
        studentCount: 'Sĩ số', 
        lecturer: 'Giảng viên', 
        content: 'Nội dung', 
        status: 'Trạng thái',
        note: 'Ghi chú'
    };
    const columnIcons: Record<string, any> = {
        date: CalendarDays,
        building: Map,
        room: School,
        period: Hash,
        type: Layers,
        department: Landmark,
        class: Library,
        studentCount: Users,
        lecturer: User,
        content: FileText,
        status: Activity,
        note: StickyNote
    };
    const orderedColumns = allColumns.filter(key => columnVisibility[key]);

    return (
        <ClientOnly>
            <TooltipProvider>
                <PageHeader title="Lớp học trực tiếp" icon={MonitorCheck} />
                <div className="p-4 md:p-6">
                    <Card>
                        <CardHeader className="py-3 border-b">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xl flex items-center gap-2"><MonitorCheck className="h-6 w-6 text-primary" />Lịch học tại phòng</CardTitle>
                                <div className="flex items-center gap-2">
                                    <Tooltip><TooltipTrigger asChild><Button onClick={() => setIsAdvancedFilterOpen(true)} variant="ghost" size="icon" className="text-orange-500"><ListFilter className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Bộ lọc nâng cao')}</p></TooltipContent></Tooltip>
                                    <input type="file" ref={fileInputRef} onChange={handleImportFileChange} className="hidden" accept=".xlsx,.xls" />
                                    <Tooltip><TooltipTrigger asChild><Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="icon" className="text-blue-600" disabled={!permissions.add}><FileUp className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Nhập file Excel')}</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button onClick={handleExport} variant="ghost" size="icon" className="text-green-600" disabled={!permissions.export}><FileDown className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Xuất file Excel')}</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button onClick={() => openDialog('add')} variant="ghost" size="icon" className="text-primary" disabled={!permissions.add}><PlusCircle className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Thêm mới')}</p></TooltipContent></Tooltip>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-[#1877F2] hover:bg-[#1877F2]/90">
                                            <TableHead className="w-12 text-center text-white font-bold text-[11px] uppercase tracking-wider border-r border-blue-300">STT</TableHead>
                                            {orderedColumns.map(key => (<TableHead key={key} className="text-white border-r border-blue-300 p-0 h-auto"><ColumnHeader columnKey={key} title={columnDefs[key]} icon={columnIcons[key]} t={t} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={(k:any, d:any) => setSortConfig([{key:k, direction:d}])} clearSort={() => setSortConfig([])} filters={filters} handleFilterChange={(k:any, v:string) => { setFilters(p => ({...p,[k]:v})); setCurrentPage(1); }} /></TableHead>))}
                                            <TableHead className="w-16 text-center text-white font-bold text-base sticky right-0 z-20 bg-[#1877F2] shadow-[-2px_0_5px_rgba(0,0,0,0.1)] border-l border-blue-400">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:text-white hover:bg-blue-700"><Cog className="h-5 w-5" /></Button></DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto"><DropdownMenuLabel>{t('Hiển thị cột')}</DropdownMenuLabel><DropdownMenuSeparator />{allColumns.map(key => (<DropdownMenuCheckboxItem key={key} checked={columnVisibility[key]} onCheckedChange={(v) => setColumnVisibility(p => ({...p, [key]: !!v}))}>{t(columnDefs[key])}</DropdownMenuCheckboxItem>))}</DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>{t('Cài đặt hiển thị')}</p></TooltipContent>
                                                </Tooltip>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {schedulesLoading ? (
                                            <TableRow><TableCell colSpan={orderedColumns.length + 2} className="h-24 text-center">Đang tải...</TableCell></TableRow>
                                        ) : currentItems.length > 0 ? currentItems.map((item, idx) => {
                                            const isSelected = selectedSet.has(item.renderId);
                                            const isHandled = item.recognitionDate && item.employee && item.incident;
                                            return (
                                                <TableRow key={item.renderId} onClick={() => handleRowClick(item.renderId)} data-state={isSelected ? "selected" : ""} className={cn("cursor-pointer odd:bg-white even:bg-muted/30 transition-all hover:bg-yellow-300 hover:text-black", "data-[state=selected]:bg-red-800 data-[state=selected]:text-white")}>
                                                    <TableCell className="font-medium text-center align-middle py-3 border-r text-inherit w-[80px]">
                                                        {isHandled ? (
                                                            <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-1 rounded-full border-2 border-red-500 text-red-600 font-black text-sm">
                                                                {startIndex + idx + 1}
                                                            </span>
                                                        ) : (
                                                            startIndex + idx + 1
                                                        )}
                                                    </TableCell>
                                                    {orderedColumns.map(key => (
                                                        <TableCell key={key} className="font-medium border-r py-3 text-inherit align-middle">
                                                            {key === 'status' ? (
                                                                item.status || "Phòng học"
                                                            ) : key === 'type' ? (
                                                                item.type ? <Badge variant="outline">{item.type}</Badge> : '---'
                                                            ) : key === 'recognitionDate' ? (
                                                                item.recognitionDate?.includes('-') ? item.recognitionDate.split('-').reverse().join('/') : (item.recognitionDate || '---')
                                                            ) : key === 'incident' ? (
                                                                item.incident ? <Badge variant="destructive" className="text-[10px] uppercase font-bold">{item.incident}</Badge> : '---'
                                                            ) : key === 'incidentDetail' ? (
                                                                <span className="text-[10px] text-orange-600 font-medium">{item.incidentDetail || '---'}</span>
                                                            ) : String((item as any)[key] ?? '')}
                                                        </TableCell>
                                                    ))}
                                                    <TableCell className="w-[60px] p-0 text-center border-l border-blue-100 sticky right-0 z-20 bg-inherit shadow-[-2px_0_5px_rgba(0,0,0,0.05)] align-middle">
                                                        <div onClick={e => e.stopPropagation()}>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <DropdownMenu modal={false}>
                                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="text-primary hover:bg-muted"><EllipsisVertical className="h-5 w-5" /></Button></DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuItem onSelect={() => openDialog('view', item)}><Eye className="mr-2 h-4 w-4" />Chi tiết</DropdownMenuItem>
                                                                        {(permissions.edit || permissions.add) && <DropdownMenuItem onSelect={() => openDialog('edit', item)}><Edit className="mr-2 h-4 w-4" />Ghi nhận</DropdownMenuItem>}
                                                                        {permissions.add && <DropdownMenuItem onSelect={() => openDialog('copy', item)}><Copy className="mr-2 h-4 w-4" />Sao chép</DropdownMenuItem>}
                                                                        {permissions.delete && (
                                                                            <>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem onSelect={() => { setSelectedItem(item); setIsDeleteDialogOpen(true); }} className="text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Xóa</DropdownMenuItem>
                                                                            </>
                                                                        )}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </TooltipTrigger>
                                                            <TooltipContent><p>{t('Thao tác')}</p></TooltipContent>
                                                        </Tooltip>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        }) : (
                                            <DataTableEmptyState 
                                                colSpan={orderedColumns.length + 2} 
                                                icon={MonitorCheck}
                                                title="Không tìm thấy lịch học tại phòng"
                                                filters={{ ...filters, ...advancedFilters }}
                                                onClearFilters={() => {
                                                    setFilters({});
                                                    setAdvancedFilters({
                                                        date: format(new Date(), 'yyyy-MM-dd'),
                                                        buildings: [],
                                                        departments: [],
                                                        rooms: [],
                                                        lecturers: [],
                                                        periodSession: 'all',
                                                        periodStart: '',
                                                        periodEnd: ''
                                                    });
                                                    setCurrentPage(1);
                                                }}
                                            />
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t">
                            <div className="text-sm text-muted-foreground">{t('Tổng cộng')} {sortedItems.length} {t('bản ghi')}. {visibleSelectedCount > 0 && `${t('Đã chọn')} ${visibleSelectedCount} ${t('dòng')}.`}</div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm text-muted-foreground">{t('Số dòng')}</p>
                                    <Select value={`${safeRowsPerPage}`} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}>
                                        <SelectTrigger className="h-8 w-[70px]"><SelectValue placeholder={safeRowsPerPage} /></SelectTrigger>
                                        <SelectContent side="top">
                                            {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((s) => (<SelectItem key={s} value={`${s}`}>{s}</SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-1">
                                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 p-0" onClick={()=>setCurrentPage(1)} disabled={safeCurrentPage===1}><ChevronsLeft className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent><p>{t('Trang đầu')}</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 p-0" onClick={()=>setCurrentPage(Math.max(1, safeCurrentPage-1))} disabled={safeCurrentPage===1}><ChevronLeft className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent><p>{t('Trang trước')}</p></TooltipContent></Tooltip>
                                    <div className="flex items-center gap-1 font-medium text-sm">
                                        <Tooltip><TooltipTrigger asChild><Input type="number" className="h-8 w-12 text-center" value={safeCurrentPage} onChange={e => { const p = parseInt(e.target.value); if(p > 0 && p <= totalPages) setCurrentPage(p); }} /></TooltipTrigger><TooltipContent><p>{t('Nhập số trang')}</p></TooltipContent></Tooltip>
                                        / {totalPages}
                                    </div>
                                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 p-0" onClick={()=>setCurrentPage(Math.min(totalPages, safeCurrentPage+1))} disabled={safeCurrentPage===totalPages}><ChevronRight className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent><p>{t('Trang sau')}</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 p-0" onClick={()=>setCurrentPage(totalPages)} disabled={safeCurrentPage===totalPages}><ChevronsRight className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent><p>{t('Trang cuối')}</p></TooltipContent></Tooltip>
                                </div>
                            </div>
                        </CardFooter>
                    </Card>
                </div>

                <AdvancedFilterDialog 
                    open={isAdvancedFilterOpen} 
                    onOpenChange={setIsAdvancedFilterOpen} 
                    filters={advancedFilters} 
                    setFilters={setAdvancedFilters} 
                    blockOptions={blockOptions}
                    deptOptions={deptOptions}
                    roomOptions={roomOptions}
                    lecturerOptions={lecturerOptions}
                    t={t} 
                    onSaveCloud={saveFiltersToCloud}
                    onLoadCloud={loadFiltersFromCloud}
                    onDeleteCloud={deleteFilterFromCloud}
                    isSaving={isSavingFilters}
                    presets={filterPresets}
                />
                
                <EditDialog 
                    open={isEditDialogOpen} 
                    onOpenChange={setIsEditDialogOpen} 
                    mode={dialogMode} 
                    formData={formData} 
                    onSave={handleSave} 
                    filteredIncidents={filteredIncidents} 
                    blocks={blocks} 
                    rms={rooms} 
                    departments={departments} 
                    lecturers={lecturers} 
                    t={t} 
                    currentUserEmployee={currentUserEmployee}
                />

                <Dialog open={isImportPreviewOpen} onOpenChange={setIsImportPreviewOpen}>
                    <DialogContent className="sm:max-w-4xl"><DialogHeader><DialogTitle>Xem trước Import</DialogTitle></DialogHeader>
                        <ScrollArea className="max-h-[60vh] border rounded-md"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead>STT</TableHead><TableHead>Ngày</TableHead><TableHead>Phòng</TableHead><TableHead>Lớp</TableHead><TableHead>Giảng viên</TableHead></TableRow></TableHeader><TableBody>{importingData.map((r, i) => (<TableRow key={i}><TableCell className="text-center">{i+1}</TableCell><TableCell>{String(r['Ngày'] || '')}</TableCell><TableCell className="font-bold">{String(r['Phòng'] || '')}</TableCell><TableCell>{String(r['Lớp'] || '')}</TableCell><TableCell>{String(r['Giảng viên'] || '')}</TableCell></TableRow>))}</TableBody></Table></ScrollArea>
                        <DialogFooter><Button variant="ghost" onClick={()=>setIsImportPreviewOpen(false)}>Hủy</Button><Button onClick={processImport} disabled={isProcessingImport}>{isProcessingImport ? <Cog className="mr-2 h-4 w-4 animate-spin"/> : "Xác nhận"}</Button></DialogFooter>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Hủy</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={async ()=>{ if(selectedItem && firestore){ await deleteDoc(doc(firestore, "schedules", selectedItem.id)); toast({title: t("Thành công")}); } setIsDeleteDialogOpen(false);}}>Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
            </TooltipProvider>
        </ClientOnly>
    );
}
