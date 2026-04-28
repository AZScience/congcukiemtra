
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  MailQuestion, PlusCircle, Trash2, Edit, Cog, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, 
  ArrowDown, Filter, X, EllipsisVertical, Save, 
  Undo2, Eye, FileDown, FileUp, CheckCircle2, Ban, Copy, 
  ListFilter, Check, ChevronsUpDown, CalendarDays, User, GraduationCap,
  IdCard, Phone, FileText, Reply, MessageSquare, Landmark, Map, CloudUpload, CloudDownload, Building2, Paperclip,
  BarChart3, ClipboardEdit, Camera, Hash, Users, StickyNote, History, Activity, Link, Search
} from 'lucide-react';
import { logActivity } from "@/lib/activity-logger";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { usePermissions } from "@/hooks/use-permissions";
import * as XLSX from 'xlsx';
import { format, parse, isValid, addDays } from 'date-fns';
import { DatePickerField } from "@/components/ui/date-picker-field";
import PageHeader from "@/components/page-header";
import { ClientOnly } from "@/components/client-only";
import { useLanguage } from "@/hooks/use-language";
import { DataTableEmptyState } from "@/components/data-table-empty-state";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { EvidenceInput } from "@/components/monitoring/evidence-input";
import { collection, doc, setDoc, deleteDoc, writeBatch, getDoc } from "firebase/firestore";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Request as RequestType, BuildingBlock, Department, Employee } from '@/lib/types';
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandInput as CommandInputBase, CommandItem, CommandList } from "@/components/ui/command";

type DialogMode = 'add' | 'edit' | 'copy' | 'view';
interface RenderRequest extends RequestType { renderId: string; }

// Removed redundant date helpers as DatePickerField handles formatting internally

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

const AdvancedFilterDialog = ({ open, onOpenChange, filters, setFilters, allBlocks, allDepts, t, onSaveCloud, onLoadCloud, isSaving, presets, onDeleteCloud }: any) => {
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

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-semibold">
                                <CalendarDays className="h-4 w-4 text-primary" /> Ngày tiếp nhận
                            </Label>
                            <DatePickerField value={filters.date || ''} onChange={(val: string) => setFilters({...filters, date: val})} className="h-10" />
                        </div>

                        <div className="space-y-2">
                            <Label className="flex items-center gap-2 font-semibold">
                                <Map className="h-4 w-4 text-primary" /> Dãy nhà
                            </Label>
                            <MultiSelect options={allBlocks?.map((b:any) => ({ label: b.name, value: b.name })) || []} selected={filters.buildings} onChange={(v:any) => setFilters({...filters, buildings: v})} placeholder="Chọn dãy nhà..." emptyText="Không có dữ liệu" />
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-4 border-t bg-muted/20 flex items-center justify-end gap-2">
                    <Button variant="ghost" onClick={() => setFilters({ date: format(new Date(), 'yyyy-MM-dd'), buildings: [] })} className="text-destructive hover:text-destructive hover:bg-destructive/10">
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


const RequestEditDialog = ({ open, onOpenChange, mode, formData, setFormData, onSave, onUndo, isChanged, t, requests, currentUserEmployee }: any) => {
    const [showEvidence, setShowEvidence] = useState(false);
    const [openReason, setOpenReason] = useState(false);
    const [expanded, setExpanded] = useState({
        info: true,
        resolution: true,
        feedback: true
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-white border-none shadow-2xl">
            <VisuallyHidden><DialogTitle>Phiếu yêu cầu hỗ trợ</DialogTitle></VisuallyHidden>
            <div className="flex flex-col h-full max-h-[90vh]">


                <ScrollArea className="flex-1">
                    <div className="p-10 space-y-6 bg-white">


                        {/* Centered Title */}
                        <div className="text-center pt-2">
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">PHIẾU THÔNG TIN HỖ TRỢ GIẢI QUYẾT</h1>
                        </div>

                        <div className="flex items-center gap-2 border-b border-slate-200 border-dashed pb-2">
                            <Hash className="h-4 w-4 text-blue-500 shrink-0" />
                            <span className="font-bold text-slate-800 text-sm">Số:</span>
                            <Input 
                                className="border-none p-0 h-auto focus-visible:ring-0 font-bold text-slate-800 bg-transparent shadow-none w-32"
                                value={formData.ticketNumber || (mode === 'add' ? (requests.length + 1).toString().padStart(4, '0') + '/PYC' : formData.id)}
                                onChange={e => setFormData({...formData, ticketNumber: e.target.value})}
                                disabled={mode === 'view'}
                            />
                        </div>

                        {/* SECTION I: INFORMATION */}
                        <div className="border-l-2 border-slate-200 pl-8 space-y-4 transition-all duration-300">
                            <div className="flex items-center justify-between group cursor-pointer select-none" onClick={() => setExpanded({...expanded, info: !expanded.info})}>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-slate-900" />
                                        <h2 className="font-bold text-slate-900 uppercase">THÔNG TIN YÊU CẦU</h2>
                                    </div>
                                    <p className="text-xs italic text-slate-500">(Dành cho người yêu cầu).</p>
                                </div>
                                <div className="p-1 rounded-full group-hover:bg-slate-50 transition-colors">
                                    {expanded.info ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                                </div>
                            </div>
                            {expanded.info && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                                <div className="flex flex-col gap-1 border-b border-slate-200 border-dashed pb-1 col-span-1">
                                    <div className="flex items-center gap-2">
                                        <User className="h-4 w-4 text-sky-500 shrink-0" />
                                        <Label className="text-slate-800 font-bold whitespace-nowrap leading-none">Họ và tên:</Label>
                                    </div>
                                    <Input 
                                        className="border-none p-0 h-auto focus-visible:ring-0 font-medium text-slate-700 bg-transparent shadow-none"
                                        value={formData.studentName || ''}
                                        onChange={e => setFormData({...formData, studentName: e.target.value})}
                                        disabled={mode === 'view'}
                                    />
                                </div>
                                <div className="flex flex-col gap-1 border-b border-slate-200 border-dashed pb-1 col-span-1">
                                    <div className="flex items-center gap-2">
                                        <IdCard className="h-4 w-4 text-blue-500 shrink-0" />
                                        <Label className="text-slate-800 font-bold whitespace-nowrap leading-none">MSSV:</Label>
                                    </div>
                                    <Input 
                                        className="border-none p-0 h-auto focus-visible:ring-0 font-medium text-slate-700 bg-transparent shadow-none"
                                        value={formData.studentId || ''}
                                        onChange={e => setFormData({...formData, studentId: e.target.value})}
                                        disabled={mode === 'view'}
                                    />
                                </div>
                                <div className="flex flex-col gap-1 border-b border-slate-200 border-dashed pb-1 col-span-1">
                                    <div className="flex items-center gap-2">
                                        <GraduationCap className="h-4 w-4 text-indigo-500 shrink-0" />
                                        <Label className="text-slate-800 font-bold whitespace-nowrap leading-none">Lớp:</Label>
                                    </div>
                                    <Input 
                                        className="border-none p-0 h-auto focus-visible:ring-0 font-medium text-slate-700 bg-transparent shadow-none"
                                        value={formData.class || ''}
                                        onChange={e => setFormData({...formData, class: e.target.value})}
                                        disabled={mode === 'view'}
                                    />
                                </div>
                                <div className="flex flex-col gap-1 border-b border-slate-200 border-dashed pb-1 col-span-1">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-cyan-500 shrink-0" />
                                        <Label className="text-slate-800 font-bold whitespace-nowrap leading-none">Khoa/ đơn vị:</Label>
                                    </div>
                                    <Input 
                                        className="border-none p-0 h-auto focus-visible:ring-0 font-medium text-slate-700 bg-transparent shadow-none"
                                        value={formData.department || ''}
                                        onChange={e => setFormData({...formData, department: e.target.value})}
                                        disabled={mode === 'view'}
                                    />
                                </div>
                                <div className="flex flex-col gap-1 border-b border-slate-200 border-dashed pb-1 col-span-1">
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-teal-500 shrink-0" />
                                        <Label className="text-slate-800 font-bold whitespace-nowrap leading-none">Số điện thoại:</Label>
                                    </div>
                                    <Input 
                                        className="border-none p-0 h-auto focus-visible:ring-0 font-medium text-slate-700 bg-transparent shadow-none"
                                        value={formData.phone || ''}
                                        onChange={e => setFormData({...formData, phone: e.target.value})}
                                        disabled={mode === 'view'}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-1 border-b border-slate-200 border-dashed pb-1">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-sky-600 shrink-0" />
                                    <Label className="text-slate-800 font-bold whitespace-nowrap leading-none">Nội dung yêu cầu hỗ trợ giải quyết:</Label>
                                </div>
                                <textarea 
                                    className="w-full border-none p-0 focus:ring-0 outline-none font-medium text-slate-700 bg-transparent min-h-[40px] resize-none leading-relaxed"
                                    value={formData.content || ''}
                                    onChange={e => setFormData({...formData, content: e.target.value})}
                                    disabled={mode === 'view'}
                                />
                            </div>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between border-b border-slate-200 border-dashed pb-1">
                                    <div className="flex items-center gap-2">
                                        <Paperclip className="h-4 w-4 text-sky-600 shrink-0" />
                                        <Label className="text-slate-800 font-bold whitespace-nowrap leading-none">Hồ sơ kèm theo:</Label>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-6 px-2 text-[10px] font-bold uppercase tracking-wider text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-md"
                                        onClick={() => setShowEvidence(!showEvidence)}
                                    >
                                        {showEvidence ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                                        {showEvidence ? 'Thu gọn' : 'Mở rộng'}
                                    </Button>
                                </div>
                                {showEvidence && (
                                    <div className="space-y-3">
                                        <EvidenceInput 
                                            value={formData.attachments || ''} 
                                            onChange={(v: string) => setFormData({...formData, attachments: v})} 
                                        />
                                    </div>
                                )}
                            </div>
                            {/* Signatures for Section I */}
                            <div className="grid grid-cols-2 text-center">
                                <div className="flex flex-col items-center">
                                    <p className="font-bold text-slate-800 leading-none text-sm uppercase">Người yêu cầu</p>
                                    <p className="text-[10px] italic text-slate-400 mt-1 leading-none">(ký và ghi rõ họ tên)</p>
                                    <div className="h-4"></div>
                                    <p className="font-bold text-slate-700 border-b border-slate-200 border-dashed px-4 min-w-[120px] text-center">{formData.studentName || '...'}</p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <div className="italic text-[12px] text-slate-500 mb-1 flex items-center justify-center gap-0.5">
                                        Ngày <Input className="w-6 h-5 p-0 text-center border-none font-bold text-slate-700 focus-visible:ring-0 bg-transparent text-[12px]" value={formData.receptionDay || format(new Date(), 'dd')} onChange={e => setFormData({...formData, receptionDay: e.target.value})} disabled={mode === 'view'} /> 
                                        tháng <Input className="w-6 h-5 p-0 text-center border-none font-bold text-slate-700 focus-visible:ring-0 bg-transparent text-[12px]" value={formData.receptionMonth || format(new Date(), 'MM')} onChange={e => setFormData({...formData, receptionMonth: e.target.value})} disabled={mode === 'view'} /> 
                                        năm <Input className="w-10 h-5 p-0 text-center border-none font-bold text-slate-700 focus-visible:ring-0 bg-transparent text-[12px]" value={formData.receptionYear || format(new Date(), 'yyyy')} onChange={e => setFormData({...formData, receptionYear: e.target.value})} disabled={mode === 'view'} />
                                    </div>
                                    <p className="font-bold text-slate-800 leading-none text-sm uppercase">Người tiếp nhận</p>
                                    <p className="text-[10px] italic text-slate-400 mt-1 leading-none">(ký và ghi rõ họ tên)</p>
                                    <div className="h-4"></div>
                                    <Input 
                                        className="border-none p-0 h-auto focus-visible:ring-0 font-bold text-slate-700 bg-transparent shadow-none text-center min-w-[120px] border-b border-slate-200 border-dashed text-sm"
                                        value={formData.recipient || currentUserEmployee?.name || ''}
                                        onChange={e => setFormData({...formData, recipient: e.target.value})}
                                        disabled={mode === 'view'}
                                        placeholder="..."
                                    />
                                </div>
                            </div>
                                </div>
                            )}
                        </div>

                        {/* SECTION II: RESOLUTION */}
                        <div className="border-l-2 border-slate-200 pl-8 space-y-4 transition-all duration-300">
                            <div className="flex items-center justify-between group cursor-pointer select-none" onClick={() => setExpanded({...expanded, resolution: !expanded.resolution})}>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <ClipboardEdit className="h-5 w-5 text-slate-900" />
                                        <h2 className="font-bold text-slate-900 uppercase">KẾT QUẢ GIẢI QUYẾT</h2>
                                    </div>
                                    <p className="text-xs italic text-slate-500">(Dành cho CB giải quyết).</p>
                                </div>
                                <div className="p-1 rounded-full group-hover:bg-slate-50 transition-colors">
                                    {expanded.resolution ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                                </div>
                            </div>
                            {expanded.resolution && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">

                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <div 
                                        className={cn("w-4 h-4 border border-slate-400 flex items-center justify-center cursor-pointer", formData.isProcessedImmediately && "bg-slate-800 border-slate-800 text-white")}
                                        onClick={() => mode !== 'view' && setFormData({...formData, isProcessedImmediately: !formData.isProcessedImmediately})}
                                    >
                                        {formData.isProcessedImmediately && <Check className="h-3 w-3" />}
                                    </div>
                                    <span className="text-sm text-slate-800">Đã hỗ trợ xử lý ngay</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div 
                                        className={cn("w-4 h-4 border border-slate-400 flex items-center justify-center cursor-pointer", formData.appointmentDate && "bg-slate-800 border-slate-800 text-white")}
                                        onClick={() => mode !== 'view' && setFormData({...formData, appointmentDate: formData.appointmentDate ? '' : format(addDays(new Date(), 3), 'dd/MM/yyyy')})}
                                    >
                                        {formData.appointmentDate && <Check className="h-3 w-3" />}
                                    </div>
                                    <span className="text-sm text-slate-800 flex items-center gap-1">
                                        Hẹn trả lời ngày 
                                        <DatePickerField 
                                            value={formData.appointmentDate || ''} 
                                            onChange={(val: string) => setFormData({...formData, appointmentDate: val})} 
                                            disabled={mode === 'view'}
                                            className="w-40 h-6 border-b border-slate-200 border-dashed bg-transparent !border-x-0 !border-t-0 shadow-none rounded-none"
                                        />
                                    </span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-start gap-3 group">
                                        <div 
                                            className={cn("w-4 h-4 border border-slate-400 flex items-center justify-center cursor-pointer mt-1 shrink-0", formData.otherNote && "bg-slate-800 border-slate-800 text-white")}
                                            onClick={() => mode !== 'view' && setFormData({...formData, otherNote: formData.otherNote ? '' : ' '})}
                                        >
                                            {formData.otherNote && <Check className="h-3 w-3" />}
                                        </div>
                                        <div className="flex items-start gap-2 flex-1">
                                            <span className="text-sm text-slate-800 shrink-0 mt-0.5">Khác:</span>
                                            <Input 
                                                className="flex-1 border-none p-0 h-6 focus-visible:ring-0 font-bold text-slate-700 bg-transparent shadow-none border-b border-slate-200 border-dashed rounded-none text-sm"
                                                value={formData.otherNote || ''}
                                                onChange={e => setFormData({...formData, otherNote: e.target.value})}
                                                disabled={mode === 'view'}
                                                placeholder="..."
                                            />
                                    </div>
                                </div>
                            </div>
                        </div>

                            <div className="pt-6 flex flex-col items-center">
                                <div className="italic text-[12px] text-slate-500 mb-1 flex items-center justify-center gap-0.5">
                                    Ngày <Input className="w-6 h-5 p-0 text-center border-none font-bold text-slate-700 focus-visible:ring-0 bg-transparent text-[12px]" value={formData.resolutionDay || format(new Date(), 'dd')} onChange={e => setFormData({...formData, resolutionDay: e.target.value})} disabled={mode === 'view'} /> 
                                    tháng <Input className="w-6 h-5 p-0 text-center border-none font-bold text-slate-700 focus-visible:ring-0 bg-transparent text-[12px]" value={formData.resolutionMonth || format(new Date(), 'MM')} onChange={e => setFormData({...formData, resolutionMonth: e.target.value})} disabled={mode === 'view'} /> 
                                    năm <Input className="w-10 h-5 p-0 text-center border-none font-bold text-slate-700 focus-visible:ring-0 bg-transparent text-[12px]" value={formData.resolutionYear || format(new Date(), 'yyyy')} onChange={e => setFormData({...formData, resolutionYear: e.target.value})} disabled={mode === 'view'} />
                                </div>
                                <p className="font-bold text-slate-800 leading-none uppercase text-sm">Cán bộ giải quyết</p>
                                <p className="text-[10px] italic text-slate-400 mt-1 leading-none">(ký và ghi rõ họ tên)</p>
                                <div className="h-4"></div>
                                <Input 
                                    className="border-none p-0 h-auto focus-visible:ring-0 font-bold text-slate-700 bg-transparent shadow-none text-center min-w-[120px] border-b border-slate-200 border-dashed text-sm"
                                    value={formData.resolverName || ''}
                                    onChange={e => setFormData({...formData, resolverName: e.target.value})}
                                    disabled={mode === 'view'}
                                    placeholder="..."
                                />
                            </div>
                                </div>
                            )}
                        </div>

                        {/* SECTION III: FEEDBACK */}
                        <div className="border-l-2 border-slate-200 pl-8 space-y-4 transition-all duration-300">
                            <div className="flex items-center justify-between group cursor-pointer select-none" onClick={() => setExpanded({...expanded, feedback: !expanded.feedback})}>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5 text-slate-900" />
                                        <h2 className="font-bold text-slate-900 uppercase">Ý KIẾN PHẢN HỒI</h2>
                                    </div>
                                    <p className="text-xs italic text-slate-500">(Dành cho người yêu cầu sau khi được giải quyết)</p>
                                </div>
                                <div className="p-1 rounded-full group-hover:bg-slate-50 transition-colors">
                                    {expanded.feedback ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                                </div>
                            </div>
                            {expanded.feedback && (
                                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                            <textarea 
                                className="w-full border-none p-0 focus:ring-0 outline-none font-medium text-slate-700 bg-transparent min-h-[100px] resize-none leading-relaxed italic placeholder:text-slate-300"
                                placeholder="Người yêu cầu nhập ý kiến phản hồi tại đây..."
                                value={formData.feedback || ''}
                                onChange={e => setFormData({...formData, feedback: e.target.value})}
                                disabled={mode === 'view'}
                            />
                                </div>
                            )}
                        </div>
                    </div>
                </ScrollArea>
                
                <div className="p-6 border-t bg-white flex justify-end items-center gap-4">
                    <Button 
                        variant="outline" 
                        onClick={onUndo} 
                        disabled={!isChanged || mode === 'view'}
                        className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-8 h-12 transition-all text-slate-600 font-bold shadow-sm"
                    >
                        <Undo2 className="mr-2 h-5 w-5" />Hoàn tác
                    </Button>
                    <Button 
                        onClick={onSave} 
                        disabled={!isChanged} 
                        className="bg-[#87cefa] hover:bg-[#00bfff] text-white rounded-xl px-10 h-12 shadow-md transition-all font-bold"
                    >
                        <Save className="mr-2 h-5 w-5" />Lưu lại
                    </Button>
                </div>
            </div>
        </DialogContent>
    </Dialog>
  );
};

export default function RequestsPage() {
    const { t } = useLanguage();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { permissions } = usePermissions('/monitoring/requests');
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const { user: authUser } = useUser();
    const [isSavingFilters, setIsSavingFilters] = useState(false);
    
    const collectionRef = useMemo(() => (firestore ? collection(firestore, 'requests') : null), [firestore]);
    const { data: rawRequests, loading } = useCollection<RequestType>(collectionRef);
    const blocksRef = useMemo(() => (firestore ? collection(firestore, 'building-blocks') : null), [firestore]);
    const { data: allBlocks } = useCollection<BuildingBlock>(blocksRef);
    const deptsRef = useMemo(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);
    const { data: allDepts } = useCollection<Department>(deptsRef);
    const employeesRef = useMemo(() => (firestore ? collection(firestore, 'employees') : null), [firestore]);
    const { data: employees } = useCollection<Employee>(employeesRef);
    
    const currentUserEmployee = useMemo(() => (employees || []).find(e => e.id === authUser?.uid || (e.email && authUser?.email && e.email === authUser?.email)), [employees, authUser]);
    const requests = useMemo(() => rawRequests ? rawRequests.map((item, idx) => ({ ...item, renderId: `${item.id}-${idx}` })) as RenderRequest[] : [], [rawRequests]);

    const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState<any>({
        date: format(new Date(), 'yyyy-MM-dd'), buildings: []
    });

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<RenderRequest | null>(null);
    const [formData, setFormData] = useState<Partial<RequestType>>({});
    const [initialFormState, setInitialFormState] = useState<Partial<RequestType>>({});
    const [dialogMode, setDialogMode] = useState<DialogMode>('add');

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
                requests_advanced_presets: updatedPresets,
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
                if (data.requests_advanced_presets) {
                    setFilterPresets(data.requests_advanced_presets);
                } else if (data.requests_advanced_filters) {
                    setFilterPresets([{ name: "Bộ lọc cũ", filters: data.requests_advanced_filters }]);
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
                requests_advanced_presets: updatedPresets,
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

    const [currentPage, setCurrentPage] = useLocalStorage('requests_page_v26', 1);
    const [rowsPerPage, setRowsPerPage] = useLocalStorage('requests_rows_v26', 10);
    const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>('requests_colVis_v26', { id: false, receptionDate: true, studentName: true, class: true, department: true, resolutionDate: false });
    const [filters, setFilters] = useLocalStorage<any>('requests_filters_v26', {});
    const [sortConfig, setSortConfig] = useLocalStorage<any[]>('requests_sort_v26', []);
    const [openPopover, setOpenPopover] = useState<string | null>(null);
    const [selectedRowIds, setSelectedRowIds] = useLocalStorage<string[]>('requests_selected_ids_v26', []);

    const selectedSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);

    const isChanged = useMemo(() => JSON.stringify(formData) !== JSON.stringify(initialFormState), [formData, initialFormState]);
    
    const filteredItems = useMemo(() => {
        return requests.filter(item => {
            const matchesColumnFilters = Object.entries(filters).every(([key, value]) => String((item as any)[key] ?? '').toLowerCase().includes(String(value).toLowerCase()));
            if (!matchesColumnFilters) return false;
            if (advancedFilters.date) {
                const sDate = item.receptionDate;
                let fDate = advancedFilters.date;
                if (fDate.includes('-')) {
                    const [y, m, d] = fDate.split('-');
                    fDate = `${d}/${m}/${y}`;
                }
                if (sDate !== fDate) return false;
            }
            if (advancedFilters.buildings.length > 0 && !advancedFilters.buildings.includes(item.buildingBlock)) return false;
            return true;
        });
    }, [requests, filters, advancedFilters]);

    const sortedItems = useMemo(() => {
        let items = [...filteredItems];
        if (sortConfig.length > 0) {
            const { key, direction } = sortConfig[0];
            items.sort((a: any, b: any) => {
                const aVal = (a as any)[key];
                const bVal = (b as any)[key];
                return direction === 'ascending' ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
            });
        }
        return items;
    }, [filteredItems, sortConfig]);
    const visibleSelectedCount = useMemo(() => sortedItems.filter(item => selectedSet.has(item.renderId)).length, [sortedItems, selectedSet]);

    const safeRowsPerPage = Math.max(1, Number(rowsPerPage));
    const totalPages = Math.max(1, Math.ceil(sortedItems.length / safeRowsPerPage));
    const safeCurrentPage = Math.min(Math.max(1, Number(currentPage)), totalPages);
    const startIndex = (safeCurrentPage - 1) * safeRowsPerPage;
    const currentItems = sortedItems.slice(startIndex, startIndex + safeRowsPerPage);

    const handleRowClick = useCallback((id: string) => {
        setSelectedRowIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return Array.from(next);
        });
    }, [setSelectedRowIds]);

    const openDialog = (mode: DialogMode, item?: any) => {
        setDialogMode(mode); setSelectedItem(item || null);
        const today = format(new Date(), 'dd/MM/yyyy');
        const defaultRecipient = currentUserEmployee?.name || authUser?.displayName || (authUser?.email ? authUser.email.split('@')[0] : '') || 'Cán bộ chưa có tên';
        
        const data = item 
            ? (mode === 'copy' ? { ...item, id: `REQ${Date.now()}`, receptionDate: today } : { ...item }) 
            : { 
                id: `REQ${Date.now()}`, 
                receptionDate: today, 
                requestDate: today,
                recipient: defaultRecipient,
                isProcessedImmediately: false
            };
        setFormData(data); setInitialFormState(data); setIsEditDialogOpen(true);
    };

    const handleSave = async () => {
        if (!firestore) return;
        try {
            const realId = (dialogMode === 'edit' || dialogMode === 'view') && selectedItem ? selectedItem.id : (formData.id || doc(collection(firestore, "requests")).id);
            
            let finalData = { ...formData, id: realId };
            
            if (dialogMode === 'add' || dialogMode === 'copy') {
                const nextTicketNumber = (requests.length + 1).toString().padStart(4, '0') + '/PYC';
                finalData = {
                    ...finalData,
                    ticketNumber: nextTicketNumber,
                    createdAt: new Date().toISOString(),
                    status: 'pending'
                };
            }

            await setDoc(doc(firestore, "requests", realId), finalData, { merge: true });

            // Log activity
            if (authUser?.uid) {
                await logActivity(
                    authUser.uid,
                    (dialogMode === 'edit' || dialogMode === 'view') ? 'update' : 'create',
                    'Request',
                    `${(dialogMode === 'edit' || dialogMode === 'view') ? 'Cập nhật' : 'Thêm mới'} yêu cầu hỗ trợ: ${finalData.studentName} (${finalData.studentId})`,
                    { 
                        userEmail: authUser.email || undefined,
                        previousData: (dialogMode === 'edit' || dialogMode === 'view') ? selectedItem : null,
                        newData: finalData
                    }
                );
            }

            setIsEditDialogOpen(false);
            toast({ title: dialogMode === 'add' ? "Đã thêm yêu cầu mới!" : t('Thành công') });
        } catch (error) {
            toast({ title: "Lỗi", variant: "destructive" });
        }
    };

    const handleImportFile = (e: any) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const wb = XLSX.read(evt.target?.result, { type: 'binary' });
            setImportingData(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { range: 7 }));
            setIsImportPreviewOpen(true);
        };
        reader.readAsBinaryString(file); e.target.value = '';
    };

    const processImport = async () => {
        if (!firestore) return; setIsProcessingImport(true);
        const batch = writeBatch(firestore);
        for (const row of importingData) {
            const id = doc(collection(firestore, "requests")).id;
            batch.set(doc(firestore, 'requests', id), { ...row, id }, { merge: true });
        }
        await batch.commit(); setIsProcessingImport(false); setIsImportPreviewOpen(false); toast({ title: "Import thành công" });
    };

    const handleExport = () => {
        const ws = XLSX.utils.json_to_sheet(sortedItems); const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Requests"); XLSX.writeFile(wb, `DS_YeuCau_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    };

    const columnDefs: any = { 
        ticketNumber: 'Số phiếu', 
        receptionDate: 'Ngày tiếp', 
        studentName: 'Họ tên SV', 
        class: 'Lớp', 
        department: 'Đơn vị', 
        resolutionDate: 'Ngày giải quyết'
    };
    const colIcons: Record<string, any> = {
        ticketNumber: Hash,
        receptionDate: CalendarDays,
        studentName: User,
        class: GraduationCap,
        department: Building2,
        resolutionDate: History
    };
    const allColumns = Object.keys(columnDefs);
    const orderedColumns = allColumns.filter(k => columnVisibility[k]);

    return (
        <ClientOnly>
            <TooltipProvider>
                <PageHeader title={t("Tiếp nhận yêu cầu")} icon={MailQuestion} />
                <div className="p-4 md:p-6">
                    <Card>
                        <CardHeader className="py-3 border-b">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xl flex items-center gap-2"><MailQuestion className="h-6 w-6 text-primary" />{t('Sổ Tiếp nhận Yêu cầu')}</CardTitle>
                                <div className="flex items-center gap-2">
                                    <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".xlsx,.xls" />
                                    <Tooltip><TooltipTrigger asChild><Button onClick={() => setIsAdvancedFilterOpen(true)} variant="ghost" size="icon" className="text-orange-500"><ListFilter className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Bộ lọc nâng cao')}</p></TooltipContent></Tooltip>
                                    {permissions.import && <Tooltip><TooltipTrigger asChild><Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="icon" className="text-blue-600"><FileUp className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Nhập file Excel')}</p></TooltipContent></Tooltip>}
                                    {permissions.export && <Tooltip><TooltipTrigger asChild><Button onClick={handleExport} variant="ghost" size="icon" className="text-green-600"><FileDown className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Xuất file Excel')}</p></TooltipContent></Tooltip>}
                                    {permissions.add && <Tooltip><TooltipTrigger asChild><Button onClick={() => openDialog('add')} variant="ghost" size="icon" className="text-primary"><PlusCircle className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Thêm mới')}</p></TooltipContent></Tooltip>}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-[#1877F2] hover:bg-[#1877F2]/90">
                                            <TableHead className="w-[80px] text-white font-bold text-base text-center border-r border-blue-300">#</TableHead>
                                            {orderedColumns.map(k => (
                                                <TableHead key={k} className="p-0 border-r border-blue-300 h-auto">
                                                    <ColumnHeader columnKey={k} title={columnDefs[k]} t={t} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={(k:any,d:any)=>setSortConfig([{key:k,direction:d}])} clearSort={()=>setSortConfig([])} filters={filters} handleFilterChange={(k:any,v:any)=>{setFilters((p:any)=>({...p,[k]:v})); setCurrentPage(1);}} icon={colIcons[k]} />
                                                </TableHead>
                                            ))}
                                            <TableHead className="w-16 sticky right-0 z-20 bg-[#1877F2] shadow-[-2px_0_5px_rgba(0,0,0,0.1)] border-l border-blue-400 p-0 text-center">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-10 w-10 text-white hover:bg-white/20 rounded-none transition-colors"><Cog className="h-5 w-5" /></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                                                        <DropdownMenuLabel>{t('Hiển thị cột')}</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        {allColumns.map(k => <DropdownMenuCheckboxItem key={k} checked={columnVisibility[k]} onCheckedChange={(v) => setColumnVisibility(p => ({...p, [k]: !!v}))}>{t(columnDefs[k])}</DropdownMenuCheckboxItem>)}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {loading ? (
                                            <TableRow><TableCell colSpan={orderedColumns.length + 2} className="text-center h-24">{t('Đang tải...')}</TableCell></TableRow>
                                        ) : currentItems.length > 0 ? currentItems.map((item, idx) => {
                                            const isSelected = selectedSet.has(item.renderId);
                                                            return (
                                                                <TableRow 
                                                                    key={item.renderId} 
                                                                    onClick={() => handleRowClick(item.renderId)} 
                                                                    data-state={isSelected ? "selected" : ""} 
                                                                    className={cn(
                                                                        "cursor-pointer odd:bg-white even:bg-slate-50 transition-all hover:bg-yellow-300 hover:text-black group", 
                                                                        "data-[state=selected]:bg-red-800 data-[state=selected]:text-white"
                                                                    )}
                                                                >
                                                                    <TableCell className="text-center border-r text-inherit align-middle py-3">
                                                                        {startIndex + currentItems.indexOf(item) + 1}
                                                                    </TableCell>
                                                                    {orderedColumns.map(k => (
                                                                        <TableCell key={k} className="border-r text-inherit align-middle py-3">
                                                                            {String(item[k as keyof RequestType] || '')}
                                                                        </TableCell>
                                                                    ))}
                                                                    <TableCell className="sticky right-0 z-10 bg-white group-data-[state=selected]:bg-red-800 group-hover:bg-yellow-300 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] border-l text-center py-3 text-inherit align-middle">
                                                                        <div onClick={e => e.stopPropagation()}>
                                                                            <DropdownMenu modal={false}>
                                                                                <DropdownMenuTrigger asChild>
                                                                                    <Button variant="ghost" size="icon" className="text-primary">
                                                                                        <EllipsisVertical className="h-5 w-5"/>
                                                                                    </Button>
                                                                                </DropdownMenuTrigger>
                                                                                <DropdownMenuContent align="end">
                                                                                    <DropdownMenuItem onSelect={()=>openDialog('view', item)}><Eye className="mr-2 h-4 w-4"/>Chi tiết</DropdownMenuItem>
                                                                                    {permissions.edit && <DropdownMenuItem onSelect={()=>openDialog('edit', item)}><Edit className="mr-2 h-4 w-4"/>Sửa</DropdownMenuItem>}
                                                                                    {permissions.add && <DropdownMenuItem onSelect={()=>openDialog('copy', item)}><Copy className="mr-2 h-4 w-4"/>Sao chép</DropdownMenuItem>}
                                                                                    {permissions.delete && (
                                                                                        <>
                                                                                            <DropdownMenuSeparator />
                                                                                            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={()=>{ setSelectedItem(item); setIsDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4"/>Xóa</DropdownMenuItem>
                                                                                        </>
                                                                                    )}
                                                                                </DropdownMenuContent>
                                                                            </DropdownMenu>
                                                                        </div>
                                                                    </TableCell>
                                                                </TableRow>
                                            );
                                        }) : (
                                            <DataTableEmptyState 
                                                colSpan={orderedColumns.length + 2} 
                                                icon={MailQuestion}
                                                title="Không tìm thấy yêu cầu hỗ trợ"
                                                filters={{ ...filters, ...advancedFilters }}
                                                onClearFilters={() => {
                                                    setFilters({});
                                                    setAdvancedFilters({
                                                        date: '', 
                                                        buildings: []
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
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={()=>setCurrentPage(1)} disabled={safeCurrentPage===1}><ChevronsLeft className="h-4 w-4"/></Button>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={()=>setCurrentPage(Math.max(1, safeCurrentPage-1))} disabled={safeCurrentPage===1}><ChevronLeft className="h-4 w-4"/></Button>
                                    <div className="flex items-center gap-1 font-medium text-sm"><Input type="number" className="h-8 w-12 text-center" value={safeCurrentPage} onChange={e => { const p = parseInt(e.target.value); if(p > 0 && p <= totalPages) setCurrentPage(p); }} />/ {totalPages}</div>
                                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={()=>setCurrentPage(Math.min(totalPages, safeCurrentPage+1))} disabled={safeCurrentPage===totalPages}><ChevronRight className="h-4 w-4"/></Button>
                                    <Button variant="outline" size="icon" className="h-8 w-8 p-0" onClick={()=>setCurrentPage(totalPages)} disabled={safeCurrentPage===totalPages}><ChevronsRight className="h-4 w-4"/></Button>
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
                    allBlocks={allBlocks} 
                    allDepts={allDepts} 
                    t={t}
                    onSaveCloud={saveFiltersToCloud}
                    onLoadCloud={loadFiltersFromCloud}
                    onDeleteCloud={deleteFilterFromCloud}
                    isSaving={isSavingFilters}
                    presets={filterPresets}
                />
                <RequestEditDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} mode={dialogMode} formData={formData} setFormData={setFormData} onSave={handleSave} onUndo={() => setFormData(initialFormState)} isChanged={isChanged} t={t} requests={requests} currentUserEmployee={currentUserEmployee} />

                <Dialog open={isImportPreviewOpen} onOpenChange={setIsImportPreviewOpen}>
                    <DialogContent className="sm:max-w-4xl"><DialogHeader><DialogTitle>Xem trước Import</DialogTitle></DialogHeader>
                        <ScrollArea className="max-h-[60vh] border rounded-md"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead>Ngày tiếp</TableHead><TableHead>Họ tên SV</TableHead></TableRow></TableHeader><TableBody>{importingData.map((r, i) => (<TableRow key={i}><TableCell>{r['receptionDate']}</TableCell><TableCell className="font-bold">{r['studentName']}</TableCell></TableRow>))}</TableBody></Table></ScrollArea>
                        <DialogFooter><Button variant="ghost" onClick={()=>setIsImportPreviewOpen(false)}>Hủy</Button><Button onClick={processImport} disabled={isProcessingImport}>{isProcessingImport ? <Cog className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Xác nhận</Button></DialogFooter>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel><Ban className="mr-2 h-4 w-4" />Hủy</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={async ()=>{ 
                    if(selectedItem && firestore){ 
                        await deleteDoc(doc(firestore, "requests", selectedItem.id)); 
                        if (authUser?.uid) {
                            await logActivity(
                                authUser.uid,
                                'delete',
                                'Request',
                                `Xóa yêu cầu hỗ trợ: ${selectedItem.studentName} (${selectedItem.studentId})`,
                                { 
                                    userEmail: authUser.email || undefined,
                                    previousData: selectedItem
                                }
                            );
                        }
                        toast({title: t("Thành công")}); 
                    } 
                    setIsDeleteDialogOpen(false);
                }}>Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
            </TooltipProvider>
        </ClientOnly>
    );
}
