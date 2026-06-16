"use client";

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  PlusCircle, Trash2, Edit, Cog, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, 
  ArrowDown, X, EllipsisVertical, Save, CalendarCog, CalendarDays, 
  Undo2, Eye, FileUp, FileDown, CheckCircle2, ListFilter, Check, 
  ChevronsUpDown, Clock, Filter, Ban, Copy, Landmark, DoorOpen,
  Library, Users, Activity, Hash, GraduationCap, FileText, StickyNote, CheckSquare, CloudUpload, CloudDownload, ShieldAlert,
  Loader2
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from '@/hooks/use-local-storage';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Separator } from "@/components/ui/separator";
import { format, parse, isValid } from "date-fns";
import PageHeader from "@/components/page-header";
import { ClientOnly } from "@/components/client-only";
import type ExcelJS from 'exceljs';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFirestore, useCollection, useUser } from "@/firebase";
import { collection, doc, setDoc, deleteDoc, writeBatch, getDoc } from "firebase/firestore";
import { useLanguage } from "@/hooks/use-language";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import * as XLSX from 'xlsx';
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DatePickerField } from "@/components/ui/date-picker-field";

type DialogMode = 'add' | 'edit' | 'copy' | 'view';

const toDisplayDate = (dateStr: string | undefined) => { 
    if (!dateStr) return ''; 
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    try { 
        const parsed = parse(dateStr, 'dd/MM/yyyy', new Date()); 
        if (!isValid(parsed)) return ''; 
        return format(parsed, 'yyyy-MM-dd'); 
    } catch { return ''; } 
};

const fromInputDate = (dateStr: string) => { 
    if (!dateStr) return ''; 
    try { 
        const parsed = parse(dateStr, 'yyyy-MM-dd', new Date()); 
        if (!isValid(parsed)) return ''; 
        return format(parsed, 'dd/MM/yyyy'); 
    } catch { return ''; } 
};

const ColumnHeader = ({ columnKey, title, icon: Icon, t, sortConfig, openPopover, setOpenPopover, requestSort, clearSort, filters, handleFilterChange }: any) => {
    const sortState = sortConfig?.find((s: any) => s.key === columnKey);
    const isFiltered = !!filters[columnKey];

    return (
        <Popover open={openPopover === columnKey} onOpenChange={(isOpen) => setOpenPopover(isOpen ? columnKey : null)}>
            <PopoverTrigger asChild>
                <div className={cn("flex items-center justify-start gap-1.5 cursor-pointer hover:bg-blue-700 p-2 rounded transition-colors w-full h-full text-white font-bold text-[11px] uppercase tracking-wider whitespace-normal")}>
                    {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-80" />}
                    <span className="truncate flex-1 text-left">{t(title)}</span>
                    {sortState ? (
                        sortState.direction === 'ascending' ? 
                        <ArrowUp className={cn("ml-1 h-3 w-3 shrink-0", isFiltered && "text-red-500")} /> : 
                        <ArrowDown className={cn("ml-1 h-3 w-3 shrink-0", isFiltered && "text-red-500")} />
                    ) : (
                        <ArrowUpDown className={cn("ml-1 h-3 w-3 opacity-30", isFiltered ? "text-red-500" : "hover:opacity-100")} />
                    )}

                </div>
            </PopoverTrigger>
            <PopoverContent className="w-60 p-0 shadow-2xl border-blue-100" align="start">
                <div className="p-1.5 space-y-1">
                    <Button variant="ghost" onClick={() => requestSort(columnKey, 'ascending')} className="w-full justify-start text-xs h-9 font-medium text-gray-700"><ArrowUp className="mr-2 h-4 w-4 text-blue-600" /> Sắp xếp tăng dần</Button>
                    <Button variant="ghost" onClick={() => requestSort(columnKey, 'descending')} className="w-full justify-start text-xs h-9 font-medium text-gray-700"><ArrowDown className="mr-2 h-4 w-4 text-blue-600" /> Sắp xếp giảm dần</Button>
                    {sortState && <div className="border-t my-1"></div>}
                    {sortState && <Button variant="ghost" onClick={clearSort} className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 text-xs h-9 font-medium"><X className="mr-2 h-4 w-4" /> Xoá sắp xếp</Button>}
                </div>
                <div className="border-t"></div>
                <div className="p-3 bg-gray-50/50 space-y-2">
                    <div className="relative">
                        <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                        <Input
                            autoFocus
                            placeholder={`${t('Lọc')} ${t(title)}...`}
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
                            <X className="mr-2 h-3.5 w-3.5" /> {t('Xóa bộ lọc')}
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
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader className="border-b pb-4">
                    <div className="flex items-center justify-between pr-12">
                        <DialogTitle className="flex items-center gap-2">
                            <ListFilter className="h-5 w-5 text-primary" />
                            Bộ lọc nâng cao
                        </DialogTitle>
                        <div className="flex gap-2">
                            {isNamingPreset ? (
                                <div className="flex items-center gap-2">
                                    <Input 
                                        placeholder="Tên bộ lọc..." 
                                        className="h-8 w-40 text-xs" 
                                        value={newPresetName} 
                                        onChange={e => setNewPresetName(e.target.value)} 
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newPresetName.trim()) {
                                                onSaveCloud(newPresetName.trim());
                                                setNewPresetName('');
                                                setIsNamingPreset(false);
                                            }
                                        }}
                                    />
                                    <Button 
                                        size="sm" 
                                        className="h-8 px-2" 
                                        onClick={() => {
                                            if (newPresetName.trim()) {
                                                onSaveCloud(newPresetName.trim());
                                                setNewPresetName('');
                                                setIsNamingPreset(false);
                                            }
                                        }}
                                        disabled={isSaving}
                                    >
                                        <Check className="h-3 w-3 mr-1" /> Lưu
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 px-2" 
                                        onClick={() => setIsNamingPreset(false)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ) : (
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 text-[10px] font-bold border-green-200 text-green-700 hover:bg-green-50"
                                    onClick={() => setIsNamingPreset(true)}
                                >
                                    <CloudUpload className="mr-1 h-3 w-3" /> Lưu bộ lọc mới
                                </Button>
                            )}
                        </div>
                    </div>
                    <VisuallyHidden><DialogDescription>Lọc danh sách lịch học theo nhiều tiêu chí.</DialogDescription></VisuallyHidden>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-0">
                    {/* Presets Sidebar */}
                    <div className="border-r pr-2 py-4 hidden md:block overflow-y-auto max-h-[70vh]">
                        <div className="px-3 mb-2 flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            <span>Bộ lọc đã lưu</span>
                            <span className="bg-primary/10 text-primary px-1.5 rounded-full">{presets?.length || 0}</span>
                        </div>
                        <div className="space-y-1 px-1">
                            {presets?.length > 0 ? presets.map((preset: any, idx: number) => (
                                <div key={idx} className="group flex items-center gap-1 rounded-md hover:bg-muted p-1 transition-colors">
                                    <Button 
                                        variant="ghost" 
                                        className="flex-1 justify-start h-8 text-xs font-medium px-2 py-1 text-left truncate overflow-hidden"
                                        onClick={() => setFilters(preset.filters)}
                                    >
                                        {preset.name}
                                    </Button>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                                        onClick={() => onDeleteCloud(preset.name)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            )) : (
                                <p className="text-[10px] text-muted-foreground px-3 py-4 text-center italic">Chưa có bộ lọc nào.</p>
                            )}
                        </div>
                    </div>

                    <ScrollArea className="max-h-[70vh] col-span-3">
                        {/* Mobile Presets (Horizontal) */}
                        <div className="md:hidden p-4 border-b">
                            <Label className="text-[10px] font-bold text-muted-foreground uppercase mb-2 block">Bộ lọc đã lưu</Label>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {presets?.map((preset: any, idx: number) => (
                                    <Badge 
                                        key={idx} 
                                        variant="secondary" 
                                        className="cursor-pointer hover:bg-primary hover:text-white transition-colors py-1.5"
                                        onClick={() => setFilters(preset.filters)}
                                    >
                                        {preset.name}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Ngày lọc</Label>
                                <DatePickerField value={filters.date} onChange={v => setFilters({...filters, date: v})} />
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Clock className="h-4 w-4 text-orange-500" /> Ca học</Label>
                                <Select value={filters.periodSession} onValueChange={v => setFilters({...filters, periodSession: v})}>
                                    <SelectTrigger><SelectValue placeholder="Chọn ca học..." /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tất cả</SelectItem>
                                        <SelectItem value="morning">Ca sáng (1-6)</SelectItem>
                                        <SelectItem value="afternoon">Ca chiều (7-12)</SelectItem>
                                        <SelectItem value="evening">Ca tối (13-17)</SelectItem>
                                        <SelectItem value="custom">Tùy chỉnh...</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {filters.periodSession === 'custom' && (
                                <div className="md:col-span-2 grid grid-cols-2 gap-4 border p-3 rounded-lg bg-muted/20">
                                    <div className="space-y-2">
                                        <Label>Từ tiết</Label>
                                        <Input type="number" min={1} max={17} value={filters.periodStart} onChange={e => setFilters({...filters, periodStart: e.target.value})} placeholder="1" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Đến tiết</Label>
                                        <Input type="number" min={1} max={17} value={filters.periodEnd} onChange={e => setFilters({...filters, periodEnd: e.target.value})} placeholder="17" />
                                    </div>
                                </div>
                            )}
                            <div className="space-y-2">
                                <Label>Dãy nhà (Chọn nhiều)</Label>
                                <MultiSelect options={blockOptions} selected={filters.buildings} onChange={(v: any) => setFilters({...filters, buildings: v})} placeholder="Chọn dãy nhà..." emptyText="Không có dữ liệu" />
                            </div>
                            <div className="space-y-2">
                                <Label>Đơn vị / Khoa (Chọn nhiều)</Label>
                                <MultiSelect options={deptOptions} selected={filters.departments} onChange={(v: any) => setFilters({...filters, departments: v})} placeholder="Chọn khoa..." emptyText="Không có dữ liệu" />
                            </div>
                            <div className="space-y-2">
                                <Label>Phòng (Chọn nhiều)</Label>
                                <MultiSelect options={roomOptions} selected={filters.rooms} onChange={(v: any) => setFilters({...filters, rooms: v})} placeholder="Chọn phòng..." emptyText="Không có dữ liệu" />
                            </div>
                            <div className="space-y-2">
                                <Label>Giảng viên / CBCT (Chọn nhiều)</Label>
                                <MultiSelect options={lecturerOptions} selected={filters.lecturers} onChange={(v: any) => setFilters({...filters, lecturers: v})} placeholder="Chọn giảng viên..." emptyText="Không có dữ liệu" />
                            </div>
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter className="p-4 border-t">
                    <Button variant="outline" onClick={() => setFilters({ date: format(new Date(), 'yyyy-MM-dd'), buildings: [], departments: [], rooms: [], lecturers: [], periodSession: 'all', periodStart: '', periodEnd: '', statuses: [] })}>
                        <Undo2 className="mr-2 h-4 w-4" />Xóa tất cả
                    </Button>
                    <Button onClick={() => onOpenChange(false)}>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Áp dụng
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const ScheduleEditDialog = ({ open, onOpenChange, mode, formData, setFormData, onSave, onUndo, isChanged, blocks, depts, rooms, lecturers, t }: any) => {
    const blockOptions = useMemo(() => Array.from(new Set((blocks || []).map((b: any) => b.name).filter(Boolean))).sort().map(n => ({ label: n as string, value: n as string })), [blocks]);
    const deptOptions = useMemo(() => Array.from(new Set((depts || []).map((d: any) => d.name).filter(Boolean))).sort().map(n => ({ label: n as string, value: n as string })), [depts]);
    const roomOptions = useMemo(() => Array.from(new Set((rooms || []).map((r: any) => r.name).filter(Boolean))).sort().map(n => ({ label: n as string, value: n as string })), [rooms]);
    const lecturerOptions = useMemo(() => Array.from(new Set((lecturers || []).map((l: any) => l.name).filter(Boolean))).sort().map(n => ({ label: n as string, value: n as string })), [lecturers]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{mode === 'view' ? 'Chi tiết' : (mode === 'add' ? 'Thêm mới' : 'Chỉnh sửa')} Lịch học</DialogTitle>
                    <VisuallyHidden><DialogDescription>Nhập thông tin lịch học chi tiết.</DialogDescription></VisuallyHidden>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] p-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-semibold"><CalendarDays className="h-4 w-4 text-orange-600" /> Ngày *</Label>
                            <DatePickerField value={toDisplayDate(formData.date)} onChange={v => setFormData({...formData, date: fromInputDate(v)})} disabled={mode === 'view'} />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-semibold"><Landmark className="h-4 w-4 text-primary" /> Dãy nhà *</Label>
                            {(mode === 'add' || mode === 'copy' || mode === 'edit') && mode !== 'view' ? 
                                <CreatableCombobox options={blockOptions} value={formData.building} onChange={(v: any) => setFormData({...formData, building: v})} placeholder="Chọn..." /> : 
                                <p className="font-bold underline text-blue-700 h-8 flex items-center">{formData.building}</p>
                            }
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-semibold"><DoorOpen className="h-4 w-4 text-primary" /> Phòng *</Label>
                            {(mode === 'add' || mode === 'copy' || mode === 'edit') && mode !== 'view' ? 
                                <CreatableCombobox options={roomOptions} value={formData.room} onChange={(v: any) => setFormData({...formData, room: v})} placeholder="Chọn..." /> : 
                                <p className="font-bold underline text-blue-700 h-8 flex items-center">{formData.room}</p>
                            }
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-semibold"><Clock className="h-4 w-4 text-orange-500" /> Tiết *</Label>
                            <Input value={formData.period || ''} onChange={e => setFormData({...formData, period: e.target.value})} disabled={mode === 'view'} placeholder="Ví dụ: 1->3" className="h-9" />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-semibold"><Library className="h-4 w-4 text-primary" /> Khoa sử dụng *</Label>
                            {(mode === 'add' || mode === 'copy' || mode === 'edit') && mode !== 'view' ? 
                                <CreatableCombobox options={deptOptions} value={formData.department} onChange={(v: any) => setFormData({...formData, department: v})} placeholder="Chọn..." /> : 
                                <p className="font-bold text-sm h-8 flex items-center">{formData.department}</p>
                            }
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-semibold"><Users className="h-4 w-4 text-primary" /> Lớp *</Label>
                            <Input value={formData.class || ''} onChange={e => setFormData({...formData, class: e.target.value})} disabled={mode === 'view'} placeholder="Tên lớp..." className="h-9" />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-semibold"><Activity className="h-4 w-4 text-blue-600" /> Loại (LT/TH)</Label>
                            <Select value={formData.type || ''} onValueChange={v => setFormData({...formData, type: v})} disabled={mode === 'view'}>
                                <SelectTrigger className="h-9"><SelectValue placeholder="Chọn loại..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LT">LT</SelectItem>
                                    <SelectItem value="TH">TH</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-semibold"><Hash className="h-4 w-4 text-blue-600" /> Sĩ số</Label>
                            <Input type="number" value={formData.studentCount || ''} onChange={e => setFormData({...formData, studentCount: e.target.value ? Number(e.target.value) : null})} disabled={mode === 'view'} className="h-9" />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4 text-red-600" /> Trạng thái</Label>
                            <Select value={formData.status || 'Phòng học'} onValueChange={v => setFormData({...formData, status: v})} disabled={mode === 'view'}>
                                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Phòng học">Phòng học</SelectItem>
                                    <SelectItem value="Phòng thi">Phòng thi</SelectItem>
                                    <SelectItem value="Phòng tự do">Phòng tự do</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-semibold"><GraduationCap className="h-4 w-4 text-primary" /> Giảng viên giảng dạy</Label>
                            {(mode === 'add' || mode === 'copy' || mode === 'edit') && mode !== 'view' ? 
                                <CreatableCombobox options={lecturerOptions} value={formData.lecturer} onChange={(v: any) => setFormData({...formData, lecturer: v})} placeholder="Chọn giảng viên..." /> : 
                                <p className="font-bold h-8 flex items-center">{formData.lecturer}</p>
                            }
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-semibold text-green-700"><Users className="h-4 w-4" /> CBCT 01</Label>
                            {(mode === 'add' || mode === 'copy' || mode === 'edit') && mode !== 'view' ? 
                                <CreatableCombobox options={lecturerOptions} value={formData.proctor1} onChange={(v: any) => setFormData({...formData, proctor1: v})} placeholder="Chọn CBCT1..." /> : 
                                <p className="font-bold text-sm h-8 flex items-center">{formData.proctor1 || '---'}</p>
                            }
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-semibold text-green-700"><Users className="h-4 w-4" /> CBCT 02</Label>
                            {(mode === 'add' || mode === 'copy' || mode === 'edit') && mode !== 'view' ? 
                                <CreatableCombobox options={lecturerOptions} value={formData.proctor2} onChange={(v: any) => setFormData({...formData, proctor2: v})} placeholder="Chọn CBCT2..." /> : 
                                <p className="font-bold text-sm h-8 flex items-center">{formData.proctor2 || '---'}</p>
                            }
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-semibold text-green-700"><Users className="h-4 w-4" /> CBCT 03</Label>
                            {(mode === 'add' || mode === 'copy' || mode === 'edit') && mode !== 'view' ? 
                                <CreatableCombobox options={lecturerOptions} value={formData.proctor3} onChange={(v: any) => setFormData({...formData, proctor3: v})} placeholder="Chọn CBCT3..." /> : 
                                <p className="font-bold text-sm h-8 flex items-center">{formData.proctor3 || '---'}</p>
                            }
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-semibold"><FileText className="h-4 w-4 text-primary" /> Nội dung</Label>
                            <Input value={formData.content || ''} onChange={e => setFormData({...formData, content: e.target.value})} disabled={mode === 'view'} placeholder="Nội dung chi tiết..." className="h-9" />
                        </div>
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-semibold"><StickyNote className="h-4 w-4 text-primary" /> Ghi chú</Label>
                            <Input value={formData.note || ''} onChange={e => setFormData({...formData, note: e.target.value})} disabled={mode === 'view'} placeholder="Ghi chú thêm..." className="h-9" />
                        </div>
                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={onUndo} disabled={!isChanged || mode === 'view'}><Undo2 className="mr-2 h-4 w-4" />{t('Hoàn tác')}</Button>
                    {mode !== 'view' ? (<Button onClick={onSave} disabled={!isChanged}><Save className="mr-2 h-4 w-4" />{t('Lưu lại')}</Button>) : (<Button onClick={() => onOpenChange(false)}>{t('Đóng')}</Button>)}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const normalize = (s: string) => s ? String(s).toLowerCase().replace(/[^\w\d]/g, '').trim() : '';

export default function SchedulePage() {
    const { t } = useLanguage();
    const firestore = useFirestore();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isExporting, setIsExporting] = useState(false);
    const templateCache = useRef<ArrayBuffer | null>(null);

    // Memoize references
    const schedulesRef = useMemo(() => (firestore ? collection(firestore, 'schedules') : null), [firestore]);
    const blocksRef = useMemo(() => (firestore ? collection(firestore, 'building-blocks') : null), [firestore]);
    const deptsRef = useMemo(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);
    const roomsRef = useMemo(() => (firestore ? collection(firestore, 'classrooms') : null), [firestore]);
    const lecturersRef = useMemo(() => (firestore ? collection(firestore, 'lecturers') : null), [firestore]);

    const { data: rawData, loading } = useCollection<any>(schedulesRef);
    const { data: allBlocks } = useCollection<any>(blocksRef);
    const { data: allDepts } = useCollection<any>(deptsRef);
    const { data: allRooms } = useCollection<any>(roomsRef);
    const { data: allLecturers } = useCollection<any>(lecturersRef);

    const data = useMemo(() => (rawData || []).map((item, idx) => ({ 
        ...item, 
        renderId: `${item.id || 'no-id'}-${idx}` 
    })), [rawData]);

    const blockOptions = useMemo(() => Array.from(new Set((allBlocks || []).map((b: any) => b.name).filter(Boolean))).sort().map(n => ({ label: n as string, value: n as string })), [allBlocks]);
    const deptOptions = useMemo(() => Array.from(new Set((allDepts || []).map((d: any) => d.name).filter(Boolean))).sort().map(n => ({ label: n as string, value: n as string })), [allDepts]);
    const roomOptions = useMemo(() => Array.from(new Set((allRooms || []).map((r: any) => r.name).filter(Boolean))).sort().map(n => ({ label: n as string, value: n as string })), [allRooms]);
    const lecturerOptions = useMemo(() => Array.from(new Set((allLecturers || []).map((l: any) => l.name).filter(Boolean))).sort().map(n => ({ label: n as string, value: n as string })), [allLecturers]);

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [formData, setFormData] = useState<any>({});
    const [initialFormState, setInitialFormState] = useState<any>({});
    const [dialogMode, setDialogMode] = useState<DialogMode>('add');
    
    const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
    const [isDeleteByDateOpen, setIsDeleteByDateOpen] = useState(false);
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
    const [deleteDate, setDeleteDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [importingData, setImportingData] = useState<any[]>([]);
    const [isProcessingImport, setIsProcessingImport] = useState(false);
    const { user: authUser } = useUser();
    const [isSavingFilters, setIsSavingFilters] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useLocalStorage<any>('sched_adv_filters_v27', {
        date: format(new Date(), 'yyyy-MM-dd'), buildings: [], departments: [], rooms: [], lecturers: [], periodSession: 'all', periodStart: '', periodEnd: '', statuses: []
    });

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
                schedule_advanced_presets: updatedPresets,
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
                if (data.schedule_advanced_presets) {
                    setFilterPresets(data.schedule_advanced_presets);
                } else if (data.schedule_advanced_filters) {
                    setFilterPresets([{ name: "Bộ lọc cũ", filters: data.schedule_advanced_filters }]);
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
                schedule_advanced_presets: updatedPresets,
                updatedAt: new Date()
            }, { merge: true });
            setFilterPresets(updatedPresets);
            toast({ title: "Đã xóa bộ lọc" });
        } catch (err) {
            toast({ title: "Lỗi khi xóa", variant: "destructive" });
        }
    };

    // Auto-load on mount
    React.useEffect(() => {
        if (authUser) loadFiltersFromCloud();
    }, [authUser, loadFiltersFromCloud]);

    const [isDeleting, setIsDeleting] = useState(false);

    const [currentPage, setCurrentPage] = useLocalStorage('sched_page_v27', 1);
    const [rowsPerPage, setRowsPerPage] = useLocalStorage('sched_rows_v27', 10);
    const [columnFilters, setColumnFilters] = useLocalStorage<any>('sched_filters_v27', {});
    const [sortConfig, setSortConfig] = useLocalStorage<any[]>('sched_sort_v27', []);
    const [openPopover, setOpenPopover] = useState<string | null>(null);
    
    const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>('sched_colVis_v27', {
        date: true, building: true, room: true, period: true, type: true, studentCount: true, department: true, class: true, lecturer: true, proctor1: true, proctor2: false, proctor3: false, content: true, status: true, 
        incident: false, incidentDetail: false,
        note: false
    });

    const [selectedRowIds, setSelectedRowIds] = useLocalStorage<string[]>('sched_selected_ids_v27', []);
    const selectedSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);

    const isChanged = useMemo(() => JSON.stringify(formData) !== JSON.stringify(initialFormState), [formData, initialFormState]);

    const filteredItems = useMemo(() => {
        return data.filter(item => {
            const matchesColumn = Object.entries(columnFilters).every(([k, v]) => String(item[k] || '').toLowerCase().includes(String(v).toLowerCase()));
            if (!matchesColumn) return false;
            
            if (advancedFilters.date) {
                const sDate = item.date;
                let fDate = advancedFilters.date;
                if (advancedFilters.date.includes('-')) {
                    const [y, m, d] = advancedFilters.date.split('-');
                    fDate = `${d}/${m}/${y}`;
                }
                if (sDate !== fDate) return false;
            }
            if (advancedFilters.buildings.length > 0 && !advancedFilters.buildings.includes(item.building)) return false;
            if (advancedFilters.departments.length > 0 && !advancedFilters.departments.includes(item.department)) return false;
            if (advancedFilters.rooms.length > 0 && !advancedFilters.rooms.includes(item.room)) return false;
            
            if (advancedFilters.lecturers.length > 0) {
                const itemLecs = [item.lecturer, item.proctor1, item.proctor2, item.proctor3].filter(Boolean);
                const hasMatch = itemLecs.some(lec => advancedFilters.lecturers.includes(lec));
                if (!hasMatch) return false;
            }
            
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
    }, [data, columnFilters, advancedFilters]);

    const sortedItems = useMemo(() => {
        let items = [...filteredItems];
        if (sortConfig.length > 0) {
            const { key, direction } = sortConfig[0];
            items.sort((a: any, b: any) => {
                const valA = a[key]; const valB = b[key];
                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;
                return direction === 'ascending' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
            });
        }
        return items;
    }, [filteredItems, sortConfig]);

    const safeRowsPerPage = Math.max(1, Number(rowsPerPage));
    const totalPages = Math.max(1, Math.ceil(sortedItems.length / safeRowsPerPage));
    const safeCurrentPage = Math.min(Math.max(1, Number(currentPage)), totalPages);
    const startIndex = (safeCurrentPage - 1) * safeRowsPerPage;
    const currentItems = sortedItems.slice(startIndex, startIndex + safeRowsPerPage);

    const handleRowClick = useCallback((renderId: string) => {
        setSelectedRowIds(prev => {
            const next = new Set(prev);
            if (next.has(renderId)) next.delete(renderId); else next.add(renderId);
            return Array.from(next);
        });
    }, [setSelectedRowIds]);

    const openDialog = (mode: DialogMode, item?: any) => {
        setDialogMode(mode); setSelectedItem(item || null);
        const data = item ? (mode === 'copy' ? { ...item, id: undefined } : { ...item }) : { date: format(new Date(), 'dd/MM/yyyy'), status: 'Phòng học' };
        setFormData(data); setInitialFormState(data); setIsEditDialogOpen(true);
    };

    const ensureReferences = async (data: any) => {
        if (!firestore) return;
        const batch = writeBatch(firestore);
        let updated = false;

        const namesToCheck = [data.lecturer, data.proctor1, data.proctor2, data.proctor3].filter(Boolean);
        for (const name of namesToCheck) {
            if (!allLecturers?.some((l: any) => l.name === name)) {
                const id = `GV-${Math.floor(1000 + Math.random() * 9000)}`;
                batch.set(doc(firestore, 'lecturers', id), { id, name, position: 'Giảng viên' });
                updated = true;
            }
        }
        if (data.building && !allBlocks?.some((b: any) => b.name === data.building)) {
            const id = `B-${Math.floor(100 + Math.random() * 900)}`;
            batch.set(doc(firestore, 'building-blocks', id), { id, code: data.building.charAt(0).toUpperCase(), name: data.building });
            updated = true;
        }
        if (data.department && !allDepts?.some((d: any) => d.name === data.department)) {
            const id = `K-${Math.floor(100 + Math.random() * 900)}`;
            batch.set(doc(firestore, 'departments', id), { id, departmentId: id, name: data.department });
            updated = true;
        }
        if (data.room && !allRooms?.some((r: any) => r.name === data.room)) {
            const id = data.room.replace(/\s+/g, '-');
            batch.set(doc(firestore, 'classrooms', id), { id, name: data.room, roomType: 'Lý thuyết', buildingBlockId: '' });
            updated = true;
        }

        if (updated) await batch.commit();
    };

    const handleSave = async () => {
        if (!firestore) return;
        await ensureReferences(formData);
        const id = (dialogMode === 'edit' || dialogMode === 'view') && selectedItem ? selectedItem.id : (formData.id || doc(collection(firestore, 'schedules')).id);
        await setDoc(doc(firestore, "schedules", id), { ...formData, id }, { merge: true });
        setIsEditDialogOpen(false); toast({ title: t("Thành công") });
    };

    const handleUndo = () => { setFormData(initialFormState); toast({ title: t("Đã hoàn tác dữ liệu") }); };

    const handleImportFile = (e: any) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result; 
            const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
            const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { range: 7 });
            setImportingData(data); setIsImportPreviewOpen(true);
        };
        reader.readAsBinaryString(file); e.target.value = '';
    };

    const processImport = async () => {
        if (!firestore || importingData.length === 0) return;
        setIsProcessingImport(true);
        
        const normalize = (val: any) => String(val || '').toLowerCase().replace(/[^a-z0-9]/gi, '').trim();

        // 1. Global Merge in Memory
        const globalMergedMap = new Map<string, any>();
        for (const row of importingData) {
            const status = String(row['Trạng thái'] || 'Phòng học');
            let dateStr = '';
            const rawDate = row['Ngày'];
            if (rawDate instanceof Date) dateStr = format(rawDate, 'dd/MM/yyyy');
            else dateStr = String(rawDate || '');

            const rawClass = String(row['Lớp'] || '');
            const rawLec = String(row['Giảng viên'] || '');
            let finalClass = rawClass;
            let finalLec = rawLec;

            if (status === 'Phòng tự do' && !rawClass && !rawLec) {
                finalClass = 'Tự do';
                finalLec = 'Tự do';
            }

            const rowData = {
                date: dateStr, building: String(row['Dãy nhà'] || ''), 
                room: String(row['Phòng'] || ''), period: String(row['Tiết'] || ''), 
                department: String(row['Khoa sử dụng'] || ''), type: String(row['LT/TH'] || row['Loại'] || ''),
                studentCount: Number(row['Sĩ số'] || 0), class: finalClass, 
                lecturer: finalLec, proctor1: String(row['CBCT 01'] || ''),
                proctor2: String(row['CBCT 02'] || ''), proctor3: String(row['CBCT 03'] || ''),
                content: String(row['Nội dung'] || ''), status: status
            };

            const baseKey = `${normalize(rowData.date)}${normalize(rowData.building)}${normalize(rowData.room)}${normalize(rowData.period)}${normalize(rowData.type)}${normalize(rowData.department)}${normalize(rowData.class)}${normalize(rowData.studentCount)}${normalize(rowData.content)}`;
            const key = status === 'Phòng thi' ? baseKey : `${baseKey}${normalize(rowData.lecturer)}`;

            if (globalMergedMap.has(key)) {
                const existing = globalMergedMap.get(key);
                if (rowData.content && !existing.content.includes(rowData.content)) existing.content += ` / ${rowData.content}`;

                if (status === 'Phòng thi') {
                    const nextLec = rowData.lecturer;
                    if (nextLec && ![existing.proctor1, existing.proctor2, existing.proctor3].includes(nextLec)) {
                        if (!existing.proctor1) existing.proctor1 = nextLec;
                        else if (!existing.proctor2) existing.proctor2 = nextLec;
                        else if (!existing.proctor3) existing.proctor3 = nextLec;
                    }
                    existing.lecturer = '';
                } else {
                    if (rowData.lecturer && !existing.lecturer.includes(rowData.lecturer)) existing.lecturer += `, ${rowData.lecturer}`;
                }
            } else {
                if (status === 'Phòng thi') {
                    const firstLec = rowData.lecturer;
                    globalMergedMap.set(key, { 
                        ...rowData, 
                        proctor1: firstLec || rowData.proctor1, 
                        proctor2: rowData.proctor2 || '', 
                        proctor3: rowData.proctor3 || '', 
                        lecturer: '' 
                    });
                } else {
                    globalMergedMap.set(key, { ...rowData });
                }
            }
        }

        const results = Array.from(globalMergedMap.values());
        const existingKeys = new Set((rawData || []).map(item => `${normalize(item.date)}${normalize(item.building)}${normalize(item.room)}${normalize(item.period)}${normalize(item.department)}${normalize(item.content)}${normalize(item.class)}${normalize(item.lecturer)}`));

        // 2. Filter New Items
        const newItems = results.filter(data => {
            const rowKey = `${normalize(data.date)}${normalize(data.building)}${normalize(data.room)}${normalize(data.period)}${normalize(data.department)}${normalize(data.content)}${normalize(data.class)}${normalize(data.lecturer)}`;
            return !existingKeys.has(rowKey);
        });

        if (newItems.length === 0) {
            toast({ title: t("Thông báo"), description: `Không có bản ghi mới (Trùng ${results.length} bản ghi).`, variant: "destructive" });
            setIsProcessingImport(false);
            setIsImportPreviewOpen(false);
            return;
        }

        // 3. Parallel Batch Execution (High performance)
        const CHUNK_SIZE = 250;
        const promises = [];
        for (let i = 0; i < newItems.length; i += CHUNK_SIZE) {
            const chunk = newItems.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(firestore);
            chunk.forEach(data => {
                const id = doc(collection(firestore, 'schedules')).id;
                batch.set(doc(firestore, 'schedules', id), { ...data, id }, { merge: true });
            });
            promises.push(batch.commit());
        }
        await Promise.all(promises);

        setIsProcessingImport(false);
        setIsImportPreviewOpen(false);
        toast({ title: t("Import hoàn tất"), description: `Đã thêm ${newItems.length} bản ghi mới.` });
    };

    const handleDeleteSelected = async () => {
        if (!firestore || selectedRowIds.length === 0) return;
        setIsDeleting(true);
        
        const CHUNK_SIZE = 250;
        const promises = [];
        for (let i = 0; i < selectedRowIds.length; i += CHUNK_SIZE) {
            const chunk = selectedRowIds.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(firestore);
            chunk.forEach(renderId => {
                const actualId = renderId.split('-')[0];
                batch.delete(doc(firestore, "schedules", actualId));
            });
            promises.push(batch.commit());
        }
        await Promise.all(promises);

        setSelectedRowIds([]);
        setIsBulkDeleteDialogOpen(false);
        setIsDeleting(false);
        toast({ title: t("Thành công"), description: `Đã xóa ${selectedRowIds.length} bản ghi.` });
    };

    const handleDeleteByDate = async () => {
        if (!firestore || !deleteDate) return;
        setIsDeleting(true);
        
        const [y, m, d] = deleteDate.split('-');
        const targetDate = `${d}/${m}/${y}`;
        const rowsToDelete = (rawData || []).filter(item => item.date === targetDate);
        
        if (rowsToDelete.length === 0) {
            setIsDeleting(false);
            toast({ title: t("Thông báo"), description: `Không tìm thấy bản ghi ngày ${targetDate}.`, variant: "destructive" });
            return;
        }

        const CHUNK_SIZE = 250;
        const promises = [];
        for (let i = 0; i < rowsToDelete.length; i += CHUNK_SIZE) {
            const chunk = rowsToDelete.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(firestore);
            chunk.forEach(row => {
                batch.delete(doc(firestore, "schedules", row.id));
            });
            promises.push(batch.commit());
        }
        await Promise.all(promises);

        setIsDeleteByDateOpen(false);
        setIsDeleting(false);
        toast({ title: t("Thành công"), description: `Đã xóa ${rowsToDelete.length} bản ghi ngày ${targetDate}.` });
    };

    const handleExport = async () => {
        if (isExporting) return;
        setIsExporting(true);
        
        const ExcelJS = (await import('exceljs')).default;
        const loadingToast = toast({ title: "Đang xử lý", description: "Hệ thống đang chuẩn bị lịch học Excel..." });
        
        try {
            // Chuẩn hóa chuỗi để so sánh không dấu, không hoa thường
            const normalizeSearch = (s: string) => {
                return (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
            };

            // Lấy ngày đang chọn từ bộ lọc (nếu có)
            let targetDate = "";
            if (advancedFilters.date) {
                if (advancedFilters.date.includes('-')) {
                    const [y, m, d] = advancedFilters.date.split('-');
                    targetDate = `${d}/${m}/${y}`;
                } else {
                    targetDate = advancedFilters.date;
                }
            }

            // Sử dụng chính xác danh sách đang hiển thị trên màn hình (đã qua tất cả các bộ lọc)
            const baseData = sortedItems;

            if (!baseData || baseData.length === 0) {
                toast({ title: "Thông báo", description: "Không có dữ liệu phù hợp với bộ lọc để xuất.", variant: "destructive" });
                setIsExporting(false);
                return;
            }

            const isOnline = (b: string) => {
                const s = normalizeSearch(b);
                return s.includes("online") || s.includes("truc tuyen");
            };
            
            const isExam = (s: string) => {
                const status = normalizeSearch(s);
                return status.includes("thi");
            };

            const examData = baseData.filter(s => isExam(s.status));
            const onlineData = baseData.filter(s => isOnline(s.building) && !isExam(s.status));
            const inPersonData = baseData.filter(s => !isOnline(s.building) && !isExam(s.status));
            
            toast({ 
                title: "KẾT QUẢ PHÂN LOẠI", 
                description: `Trực tiếp: ${inPersonData.length}, Thi: ${examData.length}, Online: ${onlineData.length}`,
                duration: 10000 
            });

            const categories = [
                { key: "LOPTRUCTIEP", data: inPersonData },
                { key: "LOPTHI", data: examData },
                { key: "LOPONLINE", data: onlineData }
            ];

            let arrayBuffer = templateCache.current;
            if (!arrayBuffer) {
                const response = await fetch('/templates/daily_schedule_template.xlsx');
                if (!response.ok) throw new Error("Không thể tải tệp mẫu daily_schedule_template.xlsx");
                arrayBuffer = await response.arrayBuffer();
                templateCache.current = arrayBuffer;
            }

            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);

            const normalizeName = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '').trim();
            
            const getSheet = (key: string): ExcelJS.Worksheet | undefined => {
                const normalizedKey = normalizeName(key);
                let ws = workbook.worksheets.find(w => normalizeName(w.name).includes(normalizedKey)) ||
                         workbook.worksheets.find(w => normalizedKey.includes(normalizeName(w.name)));
                
                if (!ws) {
                    if (key === "LOPTRUCTIEP") return getSheet("PHONGHOC") || getSheet("TRUCTIEP");
                    if (key === "LOPONLINE") return getSheet("TRUCTUYEN") || getSheet("ONLINE");
                    if (key === "LOPTHI") return getSheet("THI") || getSheet("EXAM");
                }
                return ws;
            };

            const columns = ['date', 'building', 'room', 'period', 'type', 'department', 'class', 'studentCount', 'lecturer', 'content', 'status', 'note'];
            const yieldToUI = () => new Promise(resolve => setTimeout(resolve, 0));

            const dates = baseData.map(s => {
                const parts = (s.date || "").split('/');
                if (parts.length === 3) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                return null;
            }).filter(d => d && !isNaN(d.getTime())) as Date[];
            
            let dateRangeText = "Lịch học";
            if (dates.length > 0) {
                const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
                const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
                dateRangeText = `Lịch học từ ngày ${format(minDate, 'dd/MM/yyyy')} đến ngày ${format(maxDate, 'dd/MM/yyyy')}`;
            }

            for (const cfg of categories) {
                const worksheet = getSheet(cfg.key);
                if (worksheet) {
                    worksheet.autoFilter = undefined;
                    worksheet.getCell('A6').value = dateRangeText;
                    
                    // Ghi dữ liệu trực tiếp
                    cfg.data.forEach((item, index) => {
                        const rowIndex = 8 + index;
                        const row = worksheet.getRow(rowIndex);
                        const rowValues: any[] = [];
                        rowValues[1] = index + 1; // STT
                        
                        columns.forEach((col, colIdx) => {
                            rowValues[colIdx + 2] = item[col] || '';
                        });
                        
                        row.values = rowValues;

                        for (let i = 1; i <= columns.length + 1; i++) {
                            const cell = row.getCell(i);
                            cell.border = {
                                top: { style: 'thin' }, left: { style: 'thin' },
                                bottom: { style: 'thin' }, right: { style: 'thin' }
                            };
                            cell.font = { name: 'Times New Roman', size: 12 };
                            
                            // Căn lề: STT(1), Ngày(2), Tiết(5), Sĩ số(9) căn giữa, còn lại căn trái
                            const centerCols = [1, 2, 5, 9];
                            cell.alignment = { 
                                vertical: 'middle', 
                                horizontal: centerCols.includes(i) ? 'center' : 'left', 
                                wrapText: true 
                            };
                        }
                    });

                    // Footer theo mẫu trong ảnh
                    const footerStartRow = 8 + cfg.data.length + 2;
                    const now = new Date();
                    const dateStr = `Hồ Chí Minh, ngày ${format(now, 'dd')} tháng ${format(now, 'MM')} năm ${format(now, 'yyyy')}`;
                    
                    const setFooterLine = (row: number, text: string, isBold: boolean = false, isItalic: boolean = false) => {
                        try {
                            worksheet.mergeCells(row, 10, row, 15);
                            const cell = worksheet.getCell(row, 10);
                            cell.value = text;
                            cell.font = { name: 'Times New Roman', size: 12, bold: isBold, italic: isItalic };
                            cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        } catch (e) {}
                    };

                    setFooterLine(footerStartRow, dateStr, false, true);
                    setFooterLine(footerStartRow + 1, "Người lập biểu", true, false);
                    setFooterLine(footerStartRow + 6, "Nguyễn Vĩnh Phúc", true, false);

                    await yieldToUI();
                }
            }

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const timeStr = format(new Date(), "dd-MM-yyyy_HH-mm");
            a.download = `LichHoc_NguyenVinhPhuc_${timeStr}.xlsx`;
            a.click();
            window.URL.revokeObjectURL(url);
            toast({ title: "Thành công", description: "Đã xuất lịch học theo mẫu." });
        } catch (error: any) {
            console.error("Export error:", error);
            toast({ title: "Lỗi xuất file", description: error.message, variant: "destructive" });
        } finally {
            setIsExporting(false);
        }
    };

    const columnDefs: any = { 
        date: 'Ngày', building: 'Dãy nhà', room: 'Phòng', period: 'Tiết', type: 'LT/TH', studentCount: 'Sĩ số', department: 'Khoa sử dụng', class: 'Lớp', lecturer: 'Giảng viên', proctor1: 'CBCT 01', proctor2: 'CBCT 02', proctor3: 'CBCT 03', content: 'Nội dung', status: 'Trạng thái', 
        incident: 'Việc phát sinh', incidentDetail: 'Chi tiết phát sinh',
        note: 'Ghi chú'
    };
    const allColumns = Object.keys(columnDefs);
    const orderedColumns = allColumns.filter(k => columnVisibility[k]);

    const [showDeleteAction, setShowDeleteAction] = useState(false);

    return (
        <ClientOnly>
            <TooltipProvider>
                <PageHeader title={t("Thiết lập hệ thống")} description={t("Quản lý lịch học chi tiết hàng ngày.")} icon={CalendarCog} />
                <div className="p-4 md:p-6">
                    <Card>
                        <CardHeader className="py-3 border-b">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-center gap-4" onBlur={(e) => {
                                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                                        setShowDeleteAction(false);
                                    }
                                }}>
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-xl flex items-center gap-2"><CalendarDays className="h-6 w-6 text-primary" />{t('Lịch học chi tiết')}</CardTitle>
                                        <Tooltip><TooltipTrigger asChild><Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className={cn("h-6 w-6 rounded-full transition-colors", showDeleteAction ? "text-red-500 bg-red-50" : "text-muted-foreground")}
                                            onClick={() => setShowDeleteAction(!showDeleteAction)}
                                        >
                                            <Trash2 className={cn("h-4 w-4", showDeleteAction && "scale-110")} />
                                        </Button></TooltipTrigger><TooltipContent><p>{t('Bật/tắt thao tác xóa nhanh')}</p></TooltipContent></Tooltip>
                                    </div>
                                    {showDeleteAction && advancedFilters.date && (
                                        <Tooltip><TooltipTrigger asChild><Button 
                                            variant="ghost" 
                                            size="sm"
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2 border border-red-100 animate-in fade-in slide-in-from-left-2 duration-300"
                                            onClick={() => {
                                                setDeleteDate(advancedFilters.date);
                                                setIsDeleteByDateOpen(true);
                                            }}
                                        >
                                            <CalendarDays className="mr-2 h-4 w-4" /> 
                                            Xóa toàn bộ lịch ngày {fromInputDate(advancedFilters.date)}
                                        </Button></TooltipTrigger><TooltipContent><p>{t('Xóa tất cả dữ liệu của ngày đang xem')}</p></TooltipContent></Tooltip>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".xlsx,.xls" />
                                    <Tooltip><TooltipTrigger asChild><Button onClick={() => setIsAdvancedFilterOpen(true)} variant="ghost" size="icon" className="text-orange-500"><ListFilter className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Bộ lọc nâng cao')}</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="icon" className="text-blue-600"><FileUp className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Nhập file Excel')}</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button onClick={handleExport} disabled={isExporting} variant="ghost" size="icon" className="text-green-600">
                                        {isExporting ? <Loader2 className="h-5 w-5 animate-spin" /> : <FileDown className="h-5 w-5" />}
                                    </Button></TooltipTrigger><TooltipContent><p>{t('Xuất file Excel')}</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button onClick={() => openDialog('add')} variant="ghost" size="icon" className="text-primary"><PlusCircle className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Thêm mới')}</p></TooltipContent></Tooltip>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-[#1877F2] hover:bg-[#1877F2]/90">
                                            <TableHead className="w-[80px] text-white font-bold text-base text-center border-r border-blue-300">#</TableHead>
                                            {orderedColumns.map(k => {
                                                const colIcons: any = {
                                                    date: CalendarDays,
                                                    building: Landmark,
                                                    room: DoorOpen,
                                                    period: Clock,
                                                    type: Activity,
                                                    studentCount: Hash,
                                                    department: Library,
                                                    class: GraduationCap,
                                                    lecturer: Users,
                                                    proctor1: Users,
                                                    proctor2: Users,
                                                    proctor3: Users,
                                                    content: FileText,
                                                    status: FileText,
                                                    note: StickyNote,
                                                    incident: ShieldAlert,
                                                    incidentDetail: StickyNote
                                                };
                                                return (
                                                    <TableHead key={k} className="p-0 border-r border-blue-300 h-auto">
                                                        <ColumnHeader 
                                                            columnKey={k} 
                                                            title={columnDefs[k]} 
                                                            icon={colIcons[k]}
                                                            t={t} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={(k:any,d:any)=>setSortConfig([{key:k,direction:d}])} clearSort={() => setSortConfig([])} filters={columnFilters} handleFilterChange={(k:any,v:any)=>{setColumnFilters((p:any)=>({...p,[k]:v})); setCurrentPage(1);}} 
                                                        />
                                                    </TableHead>
                                                );
                                            })}
                                            <TableHead className="w-16 text-center text-white font-bold text-base">
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
                                        {(loading && currentItems.length === 0) ? (
                                            <TableRow><TableCell colSpan={orderedColumns.length + 2} className="text-center h-24">{t('Đang tải...')}</TableCell></TableRow>
                                        ) : currentItems.length > 0 ? (
                                            currentItems.map((item, idx) => (
                                                <ScheduleRow 
                                                    key={item.renderId} 
                                                    item={item} 
                                                    index={startIndex + idx + 1}
                                                    orderedColumns={orderedColumns}
                                                    isSelected={selectedSet.has(item.renderId)}
                                                    onRowClick={handleRowClick}
                                                    openDialog={openDialog}
                                                    setIsDeleteDialogOpen={setIsDeleteDialogOpen}
                                                    setIsBulkDeleteDialogOpen={setIsBulkDeleteDialogOpen}
                                                    setIsDeleteByDateOpen={setIsDeleteByDateOpen}
                                                    setSelectedItem={setSelectedItem}
                                                    setDeleteDate={setDeleteDate}
                                                    t={t}
                                                />
                                            ))
                                        ) : (
                                            <TableRow><TableCell colSpan={orderedColumns.length + 2} className="text-center h-24">{t('Không có dữ liệu phù hợp.')}</TableCell></TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t">
                            <div className="text-sm text-muted-foreground">{t('Tổng cộng')} {sortedItems.length} {t('bản ghi')}. {selectedSet.size > 0 && `${t('Đã chọn')} ${selectedSet.size} ${t('dòng')}.`}</div>
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
                
                <ScheduleEditDialog 
                    open={isEditDialogOpen} 
                    onOpenChange={setIsEditDialogOpen} 
                    mode={dialogMode} 
                    formData={formData} 
                    setFormData={setFormData} 
                    onSave={handleSave} 
                    onUndo={handleUndo} 
                    isChanged={isChanged}
                    blocks={allBlocks}
                    depts={allDepts}
                    rooms={allRooms}
                    lecturers={allLecturers}
                    t={t}
                />
                
                <Dialog open={isImportPreviewOpen} onOpenChange={setIsImportPreviewOpen}>
                    <DialogContent className="sm:max-w-5xl">
                        <DialogHeader><DialogTitle>Xem trước dữ liệu trước khi thêm.</DialogTitle></DialogHeader>
                        <ScrollArea className="max-h-[60vh] border rounded-md">
                            <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="w-[100px]">Ngày</TableHead>
                                                <TableHead>Dãy nhà</TableHead>
                                                <TableHead>Phòng</TableHead>
                                                <TableHead className="text-center">Tiết</TableHead>
                                                <TableHead>Khoa sử dụng</TableHead>
                                                <TableHead>Giảng viên / CBCT</TableHead>
                                                <TableHead>Nội dung</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(() => {
                                                const previewMap = new Map<string, any>();
                                                for (const row of importingData) {
                                                    const status = String(row['Trạng thái'] || 'Phòng học');
                                                    let c = String(row['Lớp'] || '');
                                                    let l = String(row['Giảng viên'] || '');
                                                    if (status === 'Phòng tự do' && !c && !l) { c = 'Tự do'; l = 'Tự do'; }

                                                    const rowData = {
                                                        date: String(row['Ngày'] || ''), building: String(row['Dãy nhà'] || ''), 
                                                        room: String(row['Phòng'] || ''), period: String(row['Tiết'] || ''),
                                                        type: String(row['LT/TH'] || row['Loại'] || ''),
                                                        studentCount: Number(row['Sĩ số'] || 0),
                                                        department: String(row['Khoa sử dụng'] || row['Khoa'] || ''), content: String(row['Nội dung'] || ''),
                                                        class: c, lecturer: status === 'Phòng thi' ? '' : l,
                                                        proctor1: status === 'Phòng thi' ? l : '',
                                                        proctor2: '', proctor3: '', status
                                                    };
                                                    
                                                    const baseKey = normalize(`${rowData.date}-${rowData.building}-${rowData.room}-${rowData.period}-${rowData.type}-${rowData.department}-${rowData.class}-${rowData.studentCount}-${rowData.content}`);
                                                    const key = status === 'Phòng thi' ? baseKey : normalize(`${baseKey}-${l}`);
                                                    
                                                    if (previewMap.has(key)) {
                                                        const existing = previewMap.get(key);
                                                        if (status === 'Phòng thi' && l) {
                                                            if (!existing.proctor1) existing.proctor1 = l;
                                                            else if (!existing.proctor2) existing.proctor2 = l;
                                                            else if (!existing.proctor3) existing.proctor3 = l;
                                                        }
                                                    } else {
                                                        previewMap.set(key, rowData);
                                                    }
                                                }
                                                return Array.from(previewMap.values()).map((r, i) => (
                                                    <TableRow key={i} className="hover:bg-muted/30">
                                                        <TableCell className="text-[10px] whitespace-nowrap">{r.date}</TableCell>
                                                        <TableCell className="text-xs font-medium">{r.building}</TableCell>
                                                        <TableCell className="font-bold text-primary">{r.room}</TableCell>
                                                        <TableCell className="text-center font-semibold text-orange-600">{r.period}</TableCell>
                                                        <TableCell className="text-[10px]">{r.department}</TableCell>
                                                        <TableCell className="text-[10px]">
                                                            {r.status === 'Phòng thi' ? (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-blue-600 font-medium">{r.proctor1}</span>
                                                                    {r.proctor2 && <span className="text-blue-600 font-medium">{r.proctor2}</span>}
                                                                    {r.proctor3 && <span className="text-blue-600 font-medium">{r.proctor3}</span>}
                                                                </div>
                                                            ) : (
                                                                <span>{r.lecturer}</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-[10px] italic text-slate-500 line-clamp-2 max-w-[250px]">{r.content}</TableCell>
                                                    </TableRow>
                                                ));
                                            })()}
                                        </TableBody>
                            </Table>
                        </ScrollArea>
                        <DialogFooter><Button variant="ghost" onClick={()=>setIsImportPreviewOpen(false)}>Hủy</Button><Button onClick={processImport} disabled={isProcessingImport || loading}>{isProcessingImport ? <Cog className="mr-2 h-4 w-4 animate-spin"/> : (loading ? "Đang tải dữ liệu..." : "Xác nhận Lưu")}</Button></DialogFooter>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>{t('Xác nhận xóa?')}</AlertDialogTitle><AlertDialogDescription>{t('Hành động này không thể hoàn tác.')}</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel><Ban className="mr-2 h-4 w-4" />{t('Bỏ qua')}</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive" onClick={async ()=>{ if(selectedItem && firestore){ await deleteDoc(doc(firestore, "schedules", selectedItem.id)); toast({title: t("Thành công")}); } setIsDeleteDialogOpen(false); }}>
                                {t('Xóa')}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Xóa đã chọn */}
                <AlertDialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Xác nhận xóa {selectedRowIds.length} mục?</AlertDialogTitle>
                            <AlertDialogDescription>Bạn có chắc chắn muốn xóa tất cả các mục đã chọn không? Hành động này không thể hoàn tác.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive" onClick={handleDeleteSelected} disabled={isDeleting}>
                                {isDeleting ? "Đang xóa..." : "Xác nhận xóa"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Xóa theo ngày */}
                <Dialog open={isDeleteByDateOpen} onOpenChange={setIsDeleteByDateOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Xóa lịch học theo ngày</DialogTitle>
                            <DialogDescription>Toàn bộ lịch học của ngày được chọn sẽ bị xóa vĩnh viễn.</DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <Label>Chọn ngày cần xóa</Label>
                                <DatePickerField value={deleteDate} onChange={val => setDeleteDate(val || '')} className="h-9" />
                            </div>
                            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                                <p className="text-xs text-red-600 font-medium">Lưu ý: Hành động này sẽ xóa tất cả các lớp học, phòng thi... thuộc ngày này.</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDeleteByDateOpen(false)} disabled={isDeleting}>Hủy</Button>
                            <Button variant="destructive" onClick={handleDeleteByDate} disabled={isDeleting}>
                                {isDeleting ? <Cog className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
                                Xóa toàn bộ
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </TooltipProvider>
        </ClientOnly>
    );
}

const ScheduleRow = React.memo(({ 
    item, index, orderedColumns, isSelected, onRowClick,
    openDialog, setIsDeleteDialogOpen,
    setIsBulkDeleteDialogOpen, setIsDeleteByDateOpen,
    setSelectedItem, setDeleteDate, t 
}: any) => {
    return (
        <TableRow 
            onClick={() => onRowClick(item.renderId)}
            data-state={isSelected ? "selected" : ""}
            className={cn(
                "cursor-pointer odd:bg-white even:bg-muted/30 transition-all hover:bg-yellow-300 hover:text-black",
                "data-[state=selected]:bg-red-800 data-[state=selected]:text-white"
            )}
        >
            <TableCell className="text-center border-r text-inherit align-middle py-3">{index}</TableCell>
            {orderedColumns.map((k: string) => (
                <TableCell key={k} className="border-r text-inherit align-middle py-3">
                    {k === 'type' ? (item.type ? <Badge variant="outline">{item.type}</Badge> : '---') :
                     k === 'studentCount' ? (item.studentCount || 0) :
                     k === 'proctor1' ? (item.proctor1 || '---') :
                     k === 'proctor2' ? (item.proctor2 || '---') :
                     k === 'proctor3' ? (item.proctor3 || '---') :
                     k === 'incident' ? (item.incident && item.incident !== 'none' ? <Badge variant="destructive">{item.incident}</Badge> : '---') :
                     String(item[k] || '')}
                </TableCell>
            ))}
            <TableCell className="text-center py-3 text-inherit align-middle">
                <div onClick={e => e.stopPropagation()}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="hover:bg-muted text-primary"><EllipsisVertical className="h-5 w-5" /></Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onSelect={()=>openDialog('view', item)}><Eye className="mr-2 h-4 w-4"/>{t('Chi tiết')}</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={()=>openDialog('edit', item)}><Edit className="mr-2 h-4 w-4"/>{t('Sửa')}</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={()=>openDialog('copy', item)}><Copy className="mr-2 h-4 w-4"/>Sao chép</DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={()=>{ setSelectedItem(item); setIsDeleteDialogOpen(true); }}>
                                            <Trash2 className="mr-2 h-4 w-4"/>{t('Xóa')}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-red-500" onClick={() => {
                                            const [d, m, y] = item.date.split('/');
                                            setDeleteDate(`${y}-${m}-${d}`);
                                            setIsDeleteByDateOpen(true);
                                        }}>
                                            <CalendarDays className="mr-2 h-4 w-4" /> Xóa toàn bộ lịch ngày {item.date}
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TooltipTrigger>
                            <TooltipContent><p>{t('Thao tác')}</p></TooltipContent>
                        </Tooltip>
                </div>
            </TableCell>
        </TableRow>
    );
});
ScheduleRow.displayName = 'ScheduleRow';

