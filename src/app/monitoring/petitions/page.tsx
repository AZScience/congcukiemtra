
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
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { 
  UserX, PlusCircle, Trash2, Edit, Cog, ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, 
  ArrowDown, Filter, X, EllipsisVertical, Save, 
  Undo2, Eye, FileDown, FileUp, CheckCircle2, Ban, Copy, 
  ListFilter, Check, ChevronsUpDown, CalendarDays, User, GraduationCap,
  IdCard, Phone, FileText, Reply, MessageSquare, Landmark, List, StickyNote, Map, CloudUpload, CloudDownload, Hash
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import * as XLSX from 'xlsx';
import { format, parse, isValid } from 'date-fns';
import { DatePickerField } from "@/components/ui/date-picker-field";
import PageHeader from "@/components/page-header";
import { ClientOnly } from "@/components/client-only";
import { useLanguage } from "@/hooks/use-language";
import { useMasterData } from "@/providers/master-data-provider";
import { useCollection, useFirestore, useUser } from "@/firebase";
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
import type { Petition, BuildingBlock } from '@/lib/types';
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

type DialogMode = 'add' | 'edit' | 'copy' | 'view';
interface RenderPetition extends Petition { renderId: string; }

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

const AdvancedFilterDialog = ({ open, onOpenChange, filters, setFilters, allBlocks, t, onSaveCloud, onLoadCloud, isSaving, presets, onDeleteCloud }: any) => {
    const [newPresetName, setNewPresetName] = useState('');
    const [isNamingPreset, setIsNamingPreset] = useState(false);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl">
                <DialogHeader className="border-b pb-4">
                    <div className="flex items-center justify-between pr-8">
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
                    <VisuallyHidden><DialogDescription>Lọc danh sách.</DialogDescription></VisuallyHidden>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
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

                    <ScrollArea className="max-h-[70vh] col-span-2">
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
                            <div className="space-y-2"><Label className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Ngày tiếp nhận</Label><DatePickerField value={filters.date} onChange={v => setFilters({...filters, date: v})} /></div>
                            <div className="space-y-2"><Label className="flex items-center gap-2"><Map className="h-4 w-4 text-primary" /> Dãy nhà (Chọn nhiều)</Label><MultiSelect options={allBlocks?.map((b:any) => ({ label: b.name, value: b.name })) || []} selected={filters.buildings} onChange={(v:any) => setFilters({...filters, buildings: v})} placeholder="Chọn dãy nhà..." emptyText="Không có dữ liệu" /></div>
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter className="p-4 border-t"><Button variant="outline" onClick={() => setFilters({ date: format(new Date(), 'yyyy-MM-dd'), buildings: [] })}>Xóa tất cả</Button><Button onClick={() => onOpenChange(false)}><CheckCircle2 className="mr-2 h-4 w-4" /> Áp dụng</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const PetitionEditDialog = ({ open, onOpenChange, mode, formData, setFormData, onSave, onUndo, isChanged, t, allBlocks }: any) => {
    const [expanded, setExpanded] = useState({
        citizen: true,
        content: true
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-white border-none shadow-2xl">
                <VisuallyHidden><DialogTitle>Phiếu tiếp nhận và xử lý đơn thư</DialogTitle></VisuallyHidden>
                <div className="flex flex-col h-full max-h-[90vh]">
                    <ScrollArea className="flex-1">
                        <div className="p-10 space-y-8 bg-white">
                            {/* Centered Title */}
                            <div className="text-center pt-2 mb-8">
                                <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">PHIẾU TIẾP NHẬN VÀ XỬ LÝ ĐƠN THƯ</h1>
                            </div>

                            {/* GROUP 1: THÔNG TIN CÔNG DÂN */}
                            <div className="border-l-2 border-slate-200 pl-8 space-y-4">
                                <div className="flex items-center justify-between group cursor-pointer select-none" onClick={() => setExpanded({...expanded, citizen: !expanded.citizen})}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-50 rounded-lg">
                                            <User className="h-5 w-5 text-blue-600" />
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-slate-900 uppercase leading-none">THÔNG TIN CÔNG DÂN</h2>
                                            <p className="text-[10px] italic text-slate-500 mt-1">(Thông tin người gửi đơn và tiếp nhận)</p>
                                        </div>
                                    </div>
                                    {expanded.citizen ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                                </div>

                                {expanded.citizen && (
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        <div className="flex flex-col gap-1.5 border-b border-slate-200 border-dashed pb-1">
                                            <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Ngày tiếp nhận</Label>
                                            <DatePickerField 
                                                value={formData.receptionDate || ''} 
                                                onChange={(val: string) => setFormData({...formData, receptionDate: val})} 
                                                disabled={mode === 'view'}
                                                className="w-full h-8 border-none bg-transparent !p-0 font-bold text-slate-800"
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5 border-b border-slate-200 border-dashed pb-1">
                                            <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Họ và tên công dân</Label>
                                            <Input 
                                                className="border-none p-0 h-8 focus-visible:ring-0 font-bold text-slate-800 bg-transparent shadow-none text-sm"
                                                value={formData.citizenName || ''}
                                                onChange={e => setFormData({...formData, citizenName: e.target.value})}
                                                disabled={mode === 'view'}
                                                placeholder="..."
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5 border-b border-slate-200 border-dashed pb-1">
                                            <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">MSSV / CCCD</Label>
                                            <Input 
                                                className="border-none p-0 h-8 focus-visible:ring-0 font-bold text-slate-800 bg-transparent shadow-none text-sm"
                                                value={formData.citizenId || ''}
                                                onChange={e => setFormData({...formData, citizenId: e.target.value})}
                                                disabled={mode === 'view'}
                                                placeholder="..."
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5 border-b border-slate-200 border-dashed pb-1">
                                            <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Điện thoại</Label>
                                            <Input 
                                                className="border-none p-0 h-8 focus-visible:ring-0 font-bold text-slate-800 bg-transparent shadow-none text-sm"
                                                value={formData.citizenPhone || ''}
                                                onChange={e => setFormData({...formData, citizenPhone: e.target.value})}
                                                disabled={mode === 'view'}
                                                placeholder="..."
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5 border-b border-slate-200 border-dashed pb-1">
                                            <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Địa chỉ</Label>
                                            <Input 
                                                className="border-none p-0 h-8 focus-visible:ring-0 font-bold text-slate-800 bg-transparent shadow-none text-sm"
                                                value={formData.citizenAddress || ''}
                                                onChange={e => setFormData({...formData, citizenAddress: e.target.value})}
                                                disabled={mode === 'view'}
                                                placeholder="..."
                                            />
                                        </div>
                                        <div className="flex flex-col gap-1.5 border-b border-slate-200 border-dashed pb-1">
                                            <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Dãy nhà</Label>
                                            <Select value={formData.buildingBlock || ''} onValueChange={v => setFormData({...formData, buildingBlock: v})} disabled={mode === 'view'}>
                                                <SelectTrigger className="border-none p-0 h-8 shadow-none focus:ring-0 font-bold text-slate-800 bg-transparent">
                                                    <SelectValue placeholder="Chọn dãy nhà..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {allBlocks?.map((block: any) => (
                                                        <SelectItem key={block.id || block.name} value={block.name}>{block.name}</SelectItem>
                                                    ))}
                                                    <SelectItem value="Khác">Khác</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex flex-col gap-1.5 border-b border-slate-200 border-dashed pb-1">
                                            <Label className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Cán bộ tiếp nhận</Label>
                                            <Input 
                                                className="border-none p-0 h-8 focus-visible:ring-0 font-bold text-slate-800 bg-transparent shadow-none text-sm"
                                                value={formData.recipient || ''}
                                                onChange={e => setFormData({...formData, recipient: e.target.value})}
                                                disabled={mode === 'view'}
                                                placeholder="..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* GROUP 2: NỘI DUNG ĐƠN */}
                            <div className="border-l-2 border-slate-200 pl-8 space-y-4">
                                <div className="flex items-center justify-between group cursor-pointer select-none" onClick={() => setExpanded({...expanded, content: !expanded.content})}>
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-50 rounded-lg">
                                            <FileText className="h-5 w-5 text-orange-600" />
                                        </div>
                                        <div>
                                            <h2 className="font-bold text-slate-900 uppercase leading-none">NỘI DUNG ĐƠN</h2>
                                            <p className="text-[10px] italic text-slate-500 mt-1">(Tóm tắt vụ việc và hướng xử lý)</p>
                                        </div>
                                    </div>
                                    {expanded.content ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                                </div>

                                {expanded.content && (
                                    <div className="space-y-8 pt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {/* PART 1: Summary & Classification */}
                                        <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
                                            <Table className="w-full min-w-[600px]">
                                                <TableHeader>
                                                    <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                                                        <TableHead className="text-center font-bold text-slate-900 border-r border-slate-200 w-[60%] py-4">Tóm tắt nội dung vụ việc</TableHead>
                                                        <TableHead className="text-center font-bold text-slate-900 border-r border-slate-200 w-[25%] py-4">Phân loại đơn</TableHead>
                                                        <TableHead className="text-center font-bold text-slate-900 w-[15%] py-4">Số người</TableHead>
                                                    </TableRow>
                                                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-200">
                                                        <TableHead className="text-center text-[10px] text-slate-400 border-r border-slate-200 py-1">(4)</TableHead>
                                                        <TableHead className="text-center text-[10px] text-slate-400 border-r border-slate-200 py-1">(5)</TableHead>
                                                        <TableHead className="text-center text-[10px] text-slate-400 py-1">(6)</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    <TableRow className="hover:bg-transparent">
                                                        <TableCell className="border-r border-slate-200 align-top p-0">
                                                            <textarea 
                                                                className="w-full h-full min-h-[120px] p-4 border-none focus:ring-0 outline-none font-bold text-slate-800 bg-transparent resize-none leading-relaxed text-sm placeholder:text-slate-300"
                                                                placeholder="Nhập tóm tắt..."
                                                                value={formData.summary || ''}
                                                                onChange={e => setFormData({...formData, summary: e.target.value})}
                                                                disabled={mode === 'view'}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="border-r border-slate-200 align-top p-3">
                                                            <Select value={formData.petitionType || 'Kiến nghị'} onValueChange={v => setFormData({...formData, petitionType: v as any})} disabled={mode === 'view'}>
                                                                <SelectTrigger className="border-none p-0 h-8 shadow-none focus:ring-0 font-bold text-slate-800 bg-transparent">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="Khiếu nại">Khiếu nại</SelectItem>
                                                                    <SelectItem value="Tố cáo">Tố cáo</SelectItem>
                                                                    <SelectItem value="Kiến nghị">Kiến nghị</SelectItem>
                                                                    <SelectItem value="Phản ánh">Phản ánh</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell className="align-top p-3">
                                                            <Input 
                                                                type="number"
                                                                className="border-none p-0 h-8 focus-visible:ring-0 font-bold text-slate-800 bg-transparent shadow-none text-sm text-center"
                                                                value={formData.numberOfPeople || ''}
                                                                onChange={e => setFormData({...formData, numberOfPeople: e.target.value ? parseInt(e.target.value) : null})}
                                                                disabled={mode === 'view'}
                                                                placeholder="1"
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>

                                        {/* PART 2: Processing & Follow-up */}
                                        <div className="overflow-x-auto border border-slate-200 rounded-lg shadow-sm">
                                            <Table className="w-full min-w-[800px]">
                                                <TableHeader>
                                                    <TableRow className="bg-slate-50 hover:bg-slate-50 border-b border-slate-200">
                                                        <TableHead className="text-center font-bold text-slate-900 border-r border-slate-200 w-[20%] py-4 h-auto">Cơ quan đã giải quyết (nếu có)</TableHead>
                                                        <TableHead className="text-center font-bold text-slate-900 border-r border-slate-200 p-0 h-auto">
                                                            <div className="text-center border-b border-slate-200 py-2">Hướng xử lý</div>
                                                            <div className="grid grid-cols-3">
                                                                <div className="border-r border-slate-200 p-2 text-[10px] leading-tight flex items-center justify-center min-h-[60px]">Thụ lý để giải quyết</div>
                                                                <div className="border-r border-slate-200 p-2 text-[10px] leading-tight flex items-center justify-center min-h-[60px]">Trả lại đơn và hướng dẫn</div>
                                                                <div className="p-2 text-[10px] leading-tight flex items-center justify-center min-h-[60px]">Chuyển đơn</div>
                                                            </div>
                                                        </TableHead>
                                                        <TableHead className="text-center font-bold text-slate-900 border-r border-slate-200 w-[25%] py-4 h-auto">Theo dõi kết quả giải quyết</TableHead>
                                                        <TableHead className="text-center font-bold text-slate-900 w-[15%] py-4 h-auto">Ghi chú</TableHead>
                                                    </TableRow>
                                                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50 border-b border-slate-200">
                                                        <TableHead className="text-center text-[10px] text-slate-400 border-r border-slate-200 py-1">(7)</TableHead>
                                                        <TableHead className="text-center p-0 border-r border-slate-200">
                                                            <div className="grid grid-cols-3">
                                                                <div className="border-r border-slate-200 py-1 text-[10px] text-slate-400">(8)</div>
                                                                <div className="border-r border-slate-200 py-1 text-[10px] text-slate-400">(9)</div>
                                                                <div className="py-1 text-[10px] text-slate-400">(10)</div>
                                                            </div>
                                                        </TableHead>
                                                        <TableHead className="text-center text-[10px] text-slate-400 border-r border-slate-200 py-1">(11)</TableHead>
                                                        <TableHead className="text-center text-[10px] text-slate-400 py-1">(12)</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    <TableRow className="hover:bg-transparent">
                                                        <TableCell className="border-r border-slate-200 align-top p-3">
                                                            <textarea 
                                                                className="w-full border-none p-0 focus:ring-0 outline-none font-bold text-slate-800 bg-transparent resize-none leading-tight text-sm placeholder:text-slate-300 min-h-[80px]"
                                                                value={formData.previousAuthority || ''}
                                                                onChange={e => setFormData({...formData, previousAuthority: e.target.value})}
                                                                disabled={mode === 'view'}
                                                                placeholder="..."
                                                            />
                                                        </TableCell>
                                                        <TableCell className="border-r border-slate-200 align-top p-0">
                                                            <div className="grid grid-cols-3 h-full min-h-[100px]">
                                                                <div 
                                                                    className="border-r border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
                                                                    onClick={() => mode !== 'view' && setFormData({...formData, isAccepted: !formData.isAccepted})}
                                                                >
                                                                    <div className={cn("w-5 h-5 border-2 border-slate-300 rounded flex items-center justify-center transition-colors", formData.isAccepted && "bg-slate-900 border-slate-900 text-white")}>
                                                                        {formData.isAccepted && <Check className="h-3.5 w-3.5" />}
                                                                    </div>
                                                                </div>
                                                                <div 
                                                                    className="border-r border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
                                                                    onClick={() => mode !== 'view' && setFormData({...formData, isReturned: !formData.isReturned})}
                                                                >
                                                                    <div className={cn("w-5 h-5 border-2 border-slate-300 rounded flex items-center justify-center transition-colors", formData.isReturned && "bg-slate-900 border-slate-900 text-white")}>
                                                                        {formData.isReturned && <Check className="h-3.5 w-3.5" />}
                                                                    </div>
                                                                </div>
                                                                <div 
                                                                    className="flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors"
                                                                    onClick={() => mode !== 'view' && setFormData({...formData, isForwarded: !formData.isForwarded})}
                                                                >
                                                                    <div className={cn("w-5 h-5 border-2 border-slate-300 rounded flex items-center justify-center transition-colors", formData.isForwarded && "bg-slate-900 border-slate-900 text-white")}>
                                                                        {formData.isForwarded && <Check className="h-3.5 w-3.5" />}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="border-r border-slate-200 align-top p-3">
                                                            <textarea 
                                                                className="w-full border-none p-0 focus:ring-0 outline-none font-bold text-slate-800 bg-transparent resize-none leading-tight text-sm placeholder:text-slate-300 min-h-[100px]"
                                                                value={formData.resolutionFollowUp || ''}
                                                                onChange={e => setFormData({...formData, resolutionFollowUp: e.target.value})}
                                                                disabled={mode === 'view'}
                                                                placeholder="..."
                                                            />
                                                        </TableCell>
                                                        <TableCell className="align-top p-3">
                                                            <textarea 
                                                                className="w-full border-none p-0 focus:ring-0 outline-none font-bold text-slate-800 bg-transparent resize-none leading-tight text-sm italic placeholder:text-slate-300 min-h-[100px]"
                                                                value={formData.note || ''}
                                                                onChange={e => setFormData({...formData, note: e.target.value})}
                                                                disabled={mode === 'view'}
                                                                placeholder="..."
                                                            />
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </div>

                                    </div>
                                )}
                            </div>
                        </div>
                    </ScrollArea>

                    <div className="p-6 border-t bg-slate-50 flex justify-end items-center gap-4">
                        <Button 
                            variant="outline" 
                            onClick={onUndo} 
                            disabled={!isChanged || mode === 'view'}
                            className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-8 h-12 transition-all text-slate-600 font-bold shadow-sm"
                        >
                            <Undo2 className="mr-2 h-5 w-5" />Hoàn tác
                        </Button>
                        {mode !== 'view' ? (
                            <Button 
                                onClick={onSave} 
                                disabled={!isChanged} 
                                className="bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl px-10 h-12 shadow-md transition-all font-bold"
                            >
                                <Save className="mr-2 h-5 w-5" />Lưu lại
                            </Button>
                        ) : (
                            <Button 
                                onClick={() => onOpenChange(false)}
                                className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl px-10 h-12 shadow-md transition-all font-bold"
                            >
                                Đóng
                            </Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default function PetitionsPage() {
    const { t } = useLanguage();
    const firestore = useFirestore();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const { user: authUser } = useUser();
    const { employees } = useMasterData();
    const currentEmployee = useMemo(() => {
        return employees.find(e => e.id === authUser?.uid || e.email === authUser?.email);
    }, [employees, authUser]);
    const [isSavingFilters, setIsSavingFilters] = useState(false);
    
    const collectionRef = useMemo(() => (firestore ? collection(firestore, 'petitions') : null), [firestore]);
    const { data: rawPetitions, loading } = useCollection<Petition>(collectionRef);
    const blocksRef = useMemo(() => (firestore ? collection(firestore, 'building-blocks') : null), [firestore]);
    const { data: allBlocks } = useCollection<BuildingBlock>(blocksRef);
    const petitions = useMemo(() => rawPetitions ? rawPetitions.map((item, idx) => ({ ...item, renderId: `${item.id}-${idx}` })) as RenderPetition[] : [], [rawPetitions]);

    const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState<any>({
        date: format(new Date(), 'yyyy-MM-dd'), buildings: []
    });

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<RenderPetition | null>(null);
    const [formData, setFormData] = useState<Partial<Petition>>({});
    const [initialFormState, setInitialFormState] = useState<Partial<Petition>>({});
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
                petitions_advanced_presets: updatedPresets,
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
                if (data.petitions_advanced_presets) {
                    setFilterPresets(data.petitions_advanced_presets);
                } else if (data.petitions_advanced_filters) {
                    setFilterPresets([{ name: "Bộ lọc cũ", filters: data.petitions_advanced_filters }]);
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
                petitions_advanced_presets: updatedPresets,
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

    const [currentPage, setCurrentPage] = useLocalStorage('petitions_page_v26', 1);
    const [rowsPerPage, setRowsPerPage] = useLocalStorage('petitions_rows_v26', 10);
    const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>('petitions_colVis_v26', { id: false, receptionDate: true, citizenName: true, petitionType: true, summary: true, resolutionFollowUp: false });
    const [filters, setFilters] = useLocalStorage<any>('petitions_filters_v26', {});
    const [sortConfig, setSortConfig] = useLocalStorage<any[]>('petitions_sort_v26', []);
    const [openPopover, setOpenPopover] = useState<string | null>(null);
    const [selectedRowIds, setSelectedRowIds] = useLocalStorage<string[]>('petitions_selected_ids_v26', []);
    const selectedSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);

    const isChanged = useMemo(() => JSON.stringify(formData) !== JSON.stringify(initialFormState), [formData, initialFormState]);
    
    const filteredItems = useMemo(() => {
        return petitions.filter(item => {
            const matchesColumnFilters = Object.entries(filters).every(([key, value]) => String((item as any)[key] ?? '').toLowerCase().includes(String(value).toLowerCase()));
            if (!matchesColumnFilters) return false;
            if (advancedFilters.date) {
                const sDate = item.receptionDate;
                let fDate = advancedFilters.date;
                if (advancedFilters.date.includes('-')) {
                    const [y, m, d] = advancedFilters.date.split('-');
                    fDate = `${d}/${m}/${y}`;
                }
                if (sDate !== fDate) return false;
            }
            if (advancedFilters.buildings.length > 0 && !advancedFilters.buildings.includes(item.buildingBlock)) return false;
            return true;
        });
    }, [petitions, filters, advancedFilters]);

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
        const data = item ? (mode === 'copy' ? { ...item, id: undefined } : { ...item }) : { 
            receptionDate: format(new Date(), 'dd/MM/yyyy'), 
            petitionType: 'Kiến nghị',
            recipient: (currentEmployee as any)?.name || (authUser as any)?.name || (authUser as any)?.displayName || (authUser as any)?.fullName || ''
        };
        setFormData(data); setInitialFormState(data); setIsEditDialogOpen(true);
    };

    const handleSave = async () => {
        if (!firestore) return;
        const realId = (dialogMode === 'edit' || dialogMode === 'view') && selectedItem ? selectedItem.id : (formData.id || doc(collection(firestore, "petitions")).id);
        await setDoc(doc(firestore, "petitions", realId), { ...formData, id: realId }, { merge: true });
        setIsEditDialogOpen(false); toast({ title: t('Thành công') });
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
            const id = doc(collection(firestore, "petitions")).id;
            batch.set(doc(firestore, 'petitions', id), { ...row, id }, { merge: true });
        }
        await batch.commit(); setIsProcessingImport(false); setIsImportPreviewOpen(false); toast({ title: "Import thành công" });
    };

    const handleExport = () => {
        const ws = XLSX.utils.json_to_sheet(sortedItems); const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Petitions"); XLSX.writeFile(wb, `DS_DonThu_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    };

    const columnDefs: any = { id: 'Số đơn', receptionDate: 'Ngày tiếp', citizenName: 'Tên công dân', petitionType: 'Loại đơn', summary: 'Nội dung tóm tắt', resolutionFollowUp: 'Kết quả xử lý' };
    const colIcons: Record<string, any> = {
        id: Hash,
        receptionDate: CalendarDays,
        citizenName: User,
        petitionType: List,
        summary: FileText,
        resolutionFollowUp: CheckCircle2
    };
    const allColumns = Object.keys(columnDefs);
    const orderedColumns = allColumns.filter(k => columnVisibility[k]);

    return (
        <ClientOnly>
            <TooltipProvider>
                <PageHeader title={t("Tiếp nhận đơn thư")} icon={UserX} />
                <div className="p-4 md:p-6">
                    <Card>
                        <CardHeader className="py-3 border-b">
                            <div className="flex justify-between items-center">
                                <CardTitle className="text-xl flex items-center gap-2"><UserX className="h-6 w-6 text-primary" />{t('Sổ Tiếp nhận Đơn thư')}</CardTitle>
                                <div className="flex items-center gap-2">
                                    <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".xlsx,.xls" />
                                    <Tooltip><TooltipTrigger asChild><Button onClick={() => setIsAdvancedFilterOpen(true)} variant="ghost" size="icon" className="text-orange-500"><ListFilter className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Bộ lọc nâng cao')}</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="icon" className="text-blue-600"><FileUp className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Nhập file Excel')}</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button onClick={handleExport} variant="ghost" size="icon" className="text-green-600"><FileDown className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Xuất file Excel')}</p></TooltipContent></Tooltip>
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
                                            {orderedColumns.map(k => (
                                                <TableHead key={k} className="p-0 border-r border-blue-300 h-auto">
                                                    <ColumnHeader columnKey={k} title={columnDefs[k]} t={t} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={(k:any,d:any)=>setSortConfig([{key:k,direction:d}])} clearSort={()=>setSortConfig([])} filters={filters} handleFilterChange={(k:any,v:any)=>{setFilters((p:any)=>({...p,[k]:v})); setCurrentPage(1);}} icon={colIcons[k]} />
                                                </TableHead>
                                            ))}
                                            <TableHead className="w-16 text-center text-white font-bold text-base">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:text-white hover:bg-blue-700"><Cog className="h-5 w-5" /></Button></DropdownMenuTrigger>
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
                                        {loading ? <TableRow><TableCell colSpan={orderedColumns.length + 2} className="text-center h-24">{t('Đang tải...')}</TableCell></TableRow> : currentItems.length > 0 ? currentItems.map((item, idx) => {
                                            const isSelected = selectedSet.has(item.renderId);
                                            return (
                                                <TableRow key={item.renderId} onClick={() => handleRowClick(item.renderId)} data-state={isSelected ? "selected" : ""} className={cn("cursor-pointer odd:bg-white even:bg-muted/20 hover:bg-yellow-300 transition-all", "data-[state=selected]:bg-red-800 data-[state=selected]:text-white")}>
                                                    <TableCell className="font-medium text-center border-r align-middle py-3">{startIndex + idx + 1}</TableCell>
                                                    {orderedColumns.map(k => <TableCell key={k} className="border-r text-inherit align-middle py-3">{String(item[k as keyof Petition] || '')}</TableCell>)}
                                                    <TableCell className="text-center py-3 text-inherit align-middle">
                                                        <div onClick={e => e.stopPropagation()}>
                                                            <DropdownMenu modal={false}>
                                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="text-primary"><EllipsisVertical className="h-5 w-5"/></Button></DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onSelect={()=>openDialog('view', item)}><Eye className="mr-2 h-4 w-4"/>Chi tiết</DropdownMenuItem>
                                                                    <DropdownMenuItem onSelect={()=>openDialog('edit', item)}><Edit className="mr-2 h-4 w-4"/>Sửa</DropdownMenuItem>
                                                                    <DropdownMenuItem onSelect={()=>openDialog('copy', item)}><Copy className="mr-2 h-4 w-4"/>Sao chép</DropdownMenuItem>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={()=>{ setSelectedItem(item); setIsDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4"/>Xóa</DropdownMenuItem>
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        }) : <TableRow><TableCell colSpan={orderedColumns.length + 2} className="text-center h-24">{t('Không có dữ liệu.')}</TableCell></TableRow>}
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
                    t={t}
                    onSaveCloud={saveFiltersToCloud}
                    onLoadCloud={loadFiltersFromCloud}
                    onDeleteCloud={deleteFilterFromCloud}
                    isSaving={isSavingFilters}
                    presets={filterPresets}
                />
                <PetitionEditDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} mode={dialogMode} formData={formData} setFormData={setFormData} onSave={handleSave} onUndo={() => setFormData(initialFormState)} isChanged={isChanged} t={t} allBlocks={allBlocks} />

                <Dialog open={isImportPreviewOpen} onOpenChange={setIsImportPreviewOpen}>
                    <DialogContent className="sm:max-w-4xl"><DialogHeader><DialogTitle>Xem trước Import</DialogTitle></DialogHeader>
                        <ScrollArea className="max-h-[60vh] border rounded-md"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead>Ngày tiếp</TableHead><TableHead>Người dân</TableHead></TableRow></TableHeader><TableBody>{importingData.map((r, i) => (<TableRow key={i}><TableCell>{r['receptionDate']}</TableCell><TableCell className="font-bold">{r['citizenName']}</TableCell></TableRow>))}</TableBody></Table></ScrollArea>
                        <DialogFooter><Button variant="ghost" onClick={()=>setIsImportPreviewOpen(false)}>Hủy</Button><Button onClick={processImport} disabled={isProcessingImport}>{isProcessingImport ? <Cog className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Xác nhận</Button></DialogFooter>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel><Ban className="mr-2 h-4 w-4" />Hủy</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={async ()=>{ if(selectedItem && firestore){ await deleteDoc(doc(firestore, "petitions", selectedItem.id)); toast({title: t("Thành công")}); } setIsDeleteDialogOpen(false);}}>Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
            </TooltipProvider>
        </ClientOnly>
    );
}
