
"use client";

import * as React from "react";
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  PlusCircle, Cog, ArrowUpDown, ArrowUp, ArrowDown, X, 
  EllipsisVertical, Save, Undo2, FileUp, FileDown, 
  CheckCircle2, Filter, Trash2, Copy, Eye, Ban, Edit, 
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, 
  ListFilter, Check, ChevronsUpDown, CalendarDays, Map, User, Hash, FileText, CloudUpload, CloudDownload,
  IdCard, GraduationCap, Phone, Activity, Building2, Paperclip, ChevronDown, ClipboardPaste
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from '@/hooks/use-local-storage';
import { usePermissions } from "@/hooks/use-permissions";
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
  DropdownMenuSeparator, DropdownMenuCheckboxItem, 
  DropdownMenuLabel, DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import type { AssetReception, BuildingBlock, Employee } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EvidenceInput } from "@/components/monitoring/evidence-input";
import { Input } from '@/components/ui/input';
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, doc, setDoc, deleteDoc, writeBatch, getDoc } from "firebase/firestore";
import { format, parse, isValid } from "date-fns";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import * as XLSX from 'xlsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useLanguage } from "@/hooks/use-language";
import { logActivity } from "@/lib/activity-logger";
import { DataTableEmptyState } from "@/components/data-table-empty-state";

type DialogMode = 'add' | 'edit' | 'copy' | 'view';
interface RenderReception extends AssetReception { renderId: string; }

// Removed redundant date helpers as DatePickerField handles formatting internally

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
                        sortState.direction === 'ascending' ? <ArrowUp className={cn("ml-2 h-4 w-4 shrink-0", isFiltered && "text-red-500")} /> : <ArrowDown className={cn("ml-2 h-4 w-4 shrink-0", isFiltered && "text-red-500")} />
                    ) : (
                        <ArrowUpDown className={cn("ml-2 h-4 w-4 shrink-0 opacity-50", isFiltered ? "text-red-500" : "group-hover:opacity-100")} />
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
                        <Button variant="ghost" onClick={() => handleFilterChange(columnKey, '')} className="w-full justify-start text-destructive hover:text-destructive h-8 px-2 mt-1 text-xs"><X className="mr-2 h-3.5 w-3.5" /> {t('Xóa bộ lọc')}</Button>
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
                            <div className="space-y-2"><Label className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Ngày tiếp nhận</Label><DatePickerField value={filters.date} onChange={val => setFilters({...filters, date: val || ''})} className="h-9" /></div>
                            <div className="space-y-2"><Label className="flex items-center gap-2"><Map className="h-4 w-4 text-primary" /> Dãy nhà (Chọn nhiều)</Label><MultiSelect options={allBlocks?.map((b: any) => ({ label: b.name, value: b.name })) || []} selected={filters.buildings} onChange={(v: any) => setFilters({...filters, buildings: v})} placeholder="Chọn dãy nhà..." emptyText="Không có dữ liệu" /></div>
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter className="p-4 border-t">
                    <Button variant="outline" onClick={() => setFilters({ date: format(new Date(), 'yyyy-MM-dd'), buildings: [] })}><Undo2 className="mr-2 h-4 w-4" />Xóa tất cả</Button>
                    <Button onClick={() => onOpenChange(false)}><CheckCircle2 className="mr-2 h-4 w-4" /> Áp dụng</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

const EditDialog = ({ open, onOpenChange, mode, formData, setFormData, onSave, onUndo, isChanged, blocks, t }: any) => {
    // Tự động thiết lập năm hiện hành nếu chưa có số KTNB
    const currentYear = new Date().getFullYear();
    const defaultEntryNumber = `TT-.../${currentYear}`;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl p-0 overflow-hidden bg-[#fdfdfd]">
                <VisuallyHidden><DialogTitle>Tiếp nhận tài sản</DialogTitle></VisuallyHidden>
                <div className="flex flex-col h-full max-h-[85vh]">
                    <ScrollArea className="flex-1 p-8 md:p-12">
                        {/* Paper Form Layout */}
                        <div className="max-w-3xl mx-auto space-y-6 text-black">
                            {/* Header */}
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold uppercase tracking-wide">Tiếp nhận Tài sản/Đồ vật</h2>
                            </div>

                            {/* Entry Number */}
                            <div className="flex items-center gap-2 mb-6">
                                <span className="whitespace-nowrap font-semibold">Số:</span>
                                <Input 
                                    className="border-0 border-b border-dashed border-gray-400 rounded-none px-0 h-8 shadow-none focus-visible:ring-0 text-base" 
                                    value={formData.entryNumber || defaultEntryNumber} 
                                    onChange={e => setFormData({...formData, entryNumber: e.target.value})}
                                    placeholder={`TT-.../${currentYear}`}
                                    readOnly={mode === 'view'}
                                />
                            </div>

                            {/* Form Fields - 3 Columns Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                                {/* Giver Name */}
                                <div className="flex flex-col gap-1">
                                    <span className="flex items-center gap-1.5 whitespace-nowrap font-medium"><User className="w-4 h-4 text-primary" /> Họ và tên người giao nộp: <span className="text-red-500">*</span></span>
                                    <Input 
                                        className="w-full border-0 border-b border-dotted border-gray-400 rounded-none px-0 h-7 shadow-none focus-visible:ring-0 text-base bg-transparent" 
                                        value={formData.giverName || ''} 
                                        onChange={e => setFormData({...formData, giverName: e.target.value})} 
                                        disabled={mode === 'view'} 
                                    />
                                </div>

                                {/* Giver ID */}
                                <div className="flex flex-col gap-1">
                                    <span className="flex items-center gap-1.5 whitespace-nowrap font-medium"><IdCard className="w-4 h-4 text-primary" /> MSSV/CCCD người giao nộp: <span className="text-red-500">*</span></span>
                                    <Input 
                                        className="w-full border-0 border-b border-dotted border-gray-400 rounded-none px-0 h-7 shadow-none focus-visible:ring-0 text-base bg-transparent" 
                                        value={formData.giverId || ''} 
                                        onChange={e => setFormData({...formData, giverId: e.target.value})} 
                                        disabled={mode === 'view'} 
                                    />
                                </div>

                                {/* Giver Class */}
                                <div className="flex flex-col gap-1">
                                    <span className="flex items-center gap-1.5 whitespace-nowrap font-medium"><GraduationCap className="w-4 h-4 text-primary" /> Lớp người giao nộp:</span>
                                    <Input 
                                        className="w-full border-0 border-b border-dotted border-gray-400 rounded-none px-0 h-7 shadow-none focus-visible:ring-0 text-base bg-transparent" 
                                        value={formData.giverClass || ''} 
                                        onChange={e => setFormData({...formData, giverClass: e.target.value})} 
                                        disabled={mode === 'view'} 
                                    />
                                </div>

                                {/* Unit / Block */}
                                <div className="flex flex-col gap-1">
                                    <span className="flex items-center gap-1.5 whitespace-nowrap font-medium"><Building2 className="w-4 h-4 text-primary" /> Khoa/đơn vị/địa chỉ: <span className="text-red-500">*</span></span>
                                    {mode === 'view' ? (
                                        <div className="w-full border-b border-dotted border-gray-400 min-h-[28px] text-base leading-7">{formData.giverUnit || formData.buildingBlock || ''}</div>
                                    ) : (
                                        <Input 
                                            className="w-full border-0 border-b border-dotted border-gray-400 rounded-none px-0 h-7 shadow-none focus-visible:ring-0 text-base bg-transparent" 
                                            value={formData.giverUnit || formData.buildingBlock || ''} 
                                            onChange={e => setFormData({...formData, giverUnit: e.target.value, buildingBlock: e.target.value})} 
                                        />
                                    )}
                                </div>

                                {/* Phone */}
                                <div className="flex flex-col gap-1">
                                    <span className="flex items-center gap-1.5 whitespace-nowrap font-medium"><Phone className="w-4 h-4 text-primary" /> Số điện thoại: <span className="text-red-500">*</span></span>
                                    <Input 
                                        className="w-full border-0 border-b border-dotted border-gray-400 rounded-none px-0 h-7 shadow-none focus-visible:ring-0 text-base bg-transparent" 
                                        value={formData.giverPhone || ''} 
                                        onChange={e => setFormData({...formData, giverPhone: e.target.value})} 
                                        disabled={mode === 'view'} 
                                    />
                                </div>

                                {/* Asset State */}
                                <div className="flex flex-col gap-1">
                                    <span className="flex items-center gap-1.5 whitespace-nowrap font-medium"><Activity className="w-4 h-4 text-primary" /> Tình trạng tài sản:</span>
                                    <Input 
                                        className="w-full border-0 border-b border-dotted border-gray-400 rounded-none px-0 h-7 shadow-none focus-visible:ring-0 text-base bg-transparent" 
                                        value={formData.assetState || ''} 
                                        onChange={e => setFormData({...formData, assetState: e.target.value})} 
                                        disabled={mode === 'view'} 
                                    />
                                </div>

                                {/* Content (Spans 3 columns) */}
                                <div className="flex flex-col gap-1 md:col-span-3">
                                    <span className="flex items-center gap-1.5 whitespace-nowrap font-medium"><FileText className="w-4 h-4 text-primary" /> Nội dung giao nộp:</span>
                                    <Input 
                                        className="w-full border-0 border-b border-dotted border-gray-400 rounded-none px-0 h-7 shadow-none focus-visible:ring-0 text-base bg-transparent" 
                                        value={formData.content || ''} 
                                        onChange={e => setFormData({...formData, content: e.target.value})} 
                                        disabled={mode === 'view'} 
                                    />
                                </div>

                                {/* Evidence (Spans 3 columns) */}
                                <div className="flex flex-col gap-1 md:col-span-3 mt-4">
                                    <span className="flex items-center gap-1.5 whitespace-nowrap font-medium mb-2"><Paperclip className="w-4 h-4 text-primary" /> Minh chứng:</span>
                                    {mode === 'view' ? (
                                        <div className="opacity-80 pointer-events-none">
                                            <EvidenceInput value={formData.evidence || ''} onChange={() => {}} />
                                        </div>
                                    ) : (
                                        <EvidenceInput value={formData.evidence || ''} onChange={v => setFormData({...formData, evidence: v})} />
                                    )}
                                </div>
                            </div>

                            {/* Signatures Area */}
                            <div className="mt-6">
                                <div className="flex justify-end mb-2">
                                    <div className="text-center italic text-sm">
                                        <div className="flex items-center gap-1 justify-center">
                                            Ngày 
                                            <Input 
                                                className="w-12 border-0 border-b border-dotted border-gray-400 rounded-none px-1 h-5 text-center shadow-none focus-visible:ring-0 p-0 text-sm italic bg-transparent" 
                                                value={formData.receptionDate ? formData.receptionDate.split('/')[0] : ''} 
                                                onChange={e => {
                                                    const d = e.target.value;
                                                    const parts = (formData.receptionDate || '//').split('/');
                                                    setFormData({...formData, receptionDate: `${d}/${parts[1] || ''}/${parts[2] || ''}`});
                                                }}
                                                disabled={mode === 'view'}
                                            /> 
                                            tháng 
                                            <Input 
                                                className="w-12 border-0 border-b border-dotted border-gray-400 rounded-none px-1 h-5 text-center shadow-none focus-visible:ring-0 p-0 text-sm italic bg-transparent" 
                                                value={formData.receptionDate ? formData.receptionDate.split('/')[1] : ''} 
                                                onChange={e => {
                                                    const m = e.target.value;
                                                    const parts = (formData.receptionDate || '//').split('/');
                                                    setFormData({...formData, receptionDate: `${parts[0] || ''}/${m}/${parts[2] || ''}`});
                                                }}
                                                disabled={mode === 'view'}
                                            /> 
                                            năm 
                                            <Input 
                                                className="w-16 border-0 border-b border-dotted border-gray-400 rounded-none px-1 h-5 text-center shadow-none focus-visible:ring-0 p-0 text-sm italic bg-transparent" 
                                                value={formData.receptionDate ? formData.receptionDate.split('/')[2] : ''} 
                                                onChange={e => {
                                                    const y = e.target.value;
                                                    const parts = (formData.receptionDate || '//').split('/');
                                                    setFormData({...formData, receptionDate: `${parts[0] || ''}/${parts[1] || ''}/${y}`});
                                                }}
                                                disabled={mode === 'view'}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="font-bold">Người giao nộp</p>
                                        <p className="italic text-sm text-gray-600">(ký và ghi rõ họ tên)</p>
                                        <div className="mt-2">
                                            <Input 
                                                className="text-center font-bold border-0 border-b border-dashed border-gray-300 rounded-none h-8 shadow-none focus-visible:ring-0 bg-transparent" 
                                                value={formData.giverName || ''} 
                                                readOnly 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-bold">Cán bộ tiếp nhận</p>
                                        <p className="italic text-sm text-gray-600">(ký và ghi rõ họ tên)</p>
                                        <div className="mt-2">
                                            <Input 
                                                className="text-center font-bold border-0 border-b border-dashed border-gray-300 rounded-none h-8 shadow-none focus-visible:ring-0 bg-transparent" 
                                                value={formData.receivingStaff || ''} 
                                                onChange={e => setFormData({...formData, receivingStaff: e.target.value})}
                                                disabled={mode === 'view'}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <p className="font-bold">Người chứng kiến giao nộp</p>
                                        <p className="italic text-sm text-gray-600">(ký và ghi rõ họ tên)</p>
                                        <div className="mt-2">
                                            <Input 
                                                className="text-center font-bold border-0 border-b border-dashed border-gray-300 rounded-none h-8 shadow-none focus-visible:ring-0 bg-transparent" 
                                                value={formData.witness || ''} 
                                                onChange={e => setFormData({...formData, witness: e.target.value})}
                                                disabled={mode === 'view'}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                    <div className="p-4 border-t bg-muted/20 flex justify-end gap-2 shrink-0">
                        <Button variant="outline" onClick={onUndo} disabled={!isChanged || mode === 'view'}>
                            <Undo2 className="mr-2 h-4 w-4" />Hoàn tác
                        </Button>
                        {mode !== 'view' ? (
                            <Button onClick={onSave} disabled={!isChanged}>
                                <Save className="mr-2 h-4 w-4" />Lưu lại
                            </Button>
                        ) : (
                            <Button onClick={() => onOpenChange(false)}>Đóng</Button>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default function ReceptionTab({ advancedFilters, setAdvancedFilters }: any) {
    const { t } = useLanguage();
    const firestore = useFirestore();
    const { user: authUser } = useUser();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const { permissions } = usePermissions('/monitoring/asset-check') as any;

    const receptionsRef = useMemo(() => firestore ? collection(firestore, 'asset-receptions') : null, [firestore]);
    const blocksRef = useMemo(() => firestore ? collection(firestore, 'building-blocks') : null, [firestore]);
    const employeesRef = useMemo(() => firestore ? collection(firestore, 'employees') : null, [firestore]);

    const { data: rawReceptions, loading } = useCollection<AssetReception>(receptionsRef);
    const { data: allBlocks } = useCollection<BuildingBlock>(blocksRef);
    const { data: employees } = useCollection<Employee>(employeesRef);
    
    const currentUserEmployee = useMemo(() => (employees || []).find(e => e.id === authUser?.uid || (e.email && authUser?.email && e.email === authUser?.email)), [employees, authUser]);
    const receptions = useMemo(() => rawReceptions ? rawReceptions.map((item, idx) => ({ ...item, renderId: `${item.id}-${idx}` })) as RenderReception[] : [], [rawReceptions]);

    const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
    // advancedFilters lifted to parent

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<RenderReception | null>(null);
    const [formData, setFormData] = useState<Partial<AssetReception>>({});
    const [initialFormState, setInitialFormState] = useState<Partial<AssetReception>>({});
    const [dialogMode, setDialogMode] = useState<DialogMode>('add');
    const [isSavingFilters, setIsSavingFilters] = useState(false);

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
                asset_reception_advanced_presets: updatedPresets,
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
                if (data.asset_reception_advanced_presets) {
                    setFilterPresets(data.asset_reception_advanced_presets);
                } else if (data.asset_reception_advanced_filters) {
                    setFilterPresets([{ name: "Bộ lọc cũ", filters: data.asset_reception_advanced_filters }]);
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
                asset_reception_advanced_presets: updatedPresets,
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

    const [currentPage, setCurrentPage] = useLocalStorage('reception_currentPage_v3', 1);
    const [rowsPerPage, setRowsPerPage] = useLocalStorage('reception_rowsPerPage_v3', 10);
    const [sortConfig, setSortConfig] = useLocalStorage<any[]>('reception_sortConfig_v3', []);
    const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>('reception_colVis_v3', { 
        entryNumber: true, receptionDate: true, giverName: true, content: true, returnStatus: true 
    });
    const [filters, setFilters] = useLocalStorage<Partial<Record<keyof AssetReception, string>>>('reception_filters_v3', {});
    const [openPopover, setOpenPopover] = useState<string | null>(null);
    const [selectedRowIds, setSelectedRowIds] = useLocalStorage<string[]>('reception_selected_ids_v3', []);
    const selectedSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);

    const isChanged = useMemo(() => JSON.stringify(formData) !== JSON.stringify(initialFormState), [formData, initialFormState]);
    
    const filteredItems = useMemo(() => {
        return receptions.filter(item => {
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
            if (advancedFilters.buildings.length > 0 && item.buildingBlock && !advancedFilters.buildings.includes(item.buildingBlock)) return false;
            return true;
        });
    }, [receptions, filters, advancedFilters]);

    const sortedItems = useMemo(() => {
        let items = [...filteredItems];
        if (sortConfig.length > 0) {
            items.sort((a, b) => {
                const config = sortConfig[0];
                const aVal = (a as any)[config.key];
                const bVal = (b as any)[config.key];
                if (aVal === null || aVal === undefined) return 1;
                if (bVal === null || bVal === undefined) return -1;
                if (String(aVal) < String(bVal)) return config.direction === 'ascending' ? -1 : 1;
                if (String(aVal) > String(bVal)) return config.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [filteredItems, sortConfig]);

    const columnDefs: Record<string, { title: string }> = { 
        entryNumber: { title: 'Số tiếp nhận' }, receptionDate: { title: 'Ngày tiếp' }, 
        giverName: { title: 'Người giao' }, content: { title: 'Nội dung' }, returnStatus: { title: 'Trạng thái' } 
    };

    const colIcons: Record<string, any> = {
        entryNumber: Hash,
        receptionDate: CalendarDays,
        giverName: User,
        content: FileText,
        returnStatus: CheckCircle2,
    };

    const allColumns = Object.keys(columnDefs);
    const orderedColumns = allColumns.filter(key => columnVisibility[key]);

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

    const openDialog = (mode: DialogMode, item?: RenderReception) => {
        setDialogMode(mode); setSelectedItem(item || null);
        if (mode === 'add') {
            const currentYear = new Date().getFullYear();
            let maxNum = 0;
            
            receptions.forEach(r => {
                if (r.entryNumber && r.entryNumber.startsWith('TT-') && r.entryNumber.endsWith(`/${currentYear}`)) {
                    const parts = r.entryNumber.split('/');
                    if (parts.length === 2) {
                        const numStr = parts[0].replace('TT-', '');
                        const num = parseInt(numStr, 10);
                        if (!isNaN(num) && num > maxNum) {
                            maxNum = num;
                        }
                    }
                }
            });
            const nextNumStr = String(maxNum + 1).padStart(3, '0');
            const newEntryNumber = `TT-${nextNumStr}/${currentYear}`;

            const data: Partial<AssetReception> = { 
                entryNumber: newEntryNumber, 
                receptionDate: format(new Date(), 'dd/MM/yyyy'), 
                returnStatus: 'Chưa trả', 
                receivingStaff: currentUserEmployee?.name || authUser?.displayName || (authUser?.email ? authUser.email.split('@')[0] : '') || authUser?.phoneNumber || authUser?.uid?.slice(0, 8) || 'Cán bộ chưa có tên'
            };
            setFormData(data); setInitialFormState(data);
        } else if (item) {
            const data = mode === 'copy' ? { ...item, id: undefined, entryNumber: `${item.entryNumber} (Copy)` } : { ...item };
            data.receivingStaff = data.receivingStaff || currentUserEmployee?.name || authUser?.displayName || (authUser?.email ? authUser.email.split('@')[0] : '') || authUser?.phoneNumber || authUser?.uid?.slice(0, 8) || 'Cán bộ chưa có tên';
            setFormData(data); setInitialFormState(data);
        }
        setIsEditDialogOpen(true);
    };

    const handleSave = async () => {
        if (!firestore) return;

        if (!formData.giverName?.trim()) { toast({ title: "Thiếu thông tin", description: "Vui lòng nhập họ và tên người giao nộp", variant: "destructive" }); return; }
        if (!formData.giverId?.trim()) { toast({ title: "Thiếu thông tin", description: "Vui lòng nhập MSSV/CCCD người giao nộp", variant: "destructive" }); return; }
        if (!formData.giverUnit?.trim() && !formData.buildingBlock?.trim()) { toast({ title: "Thiếu thông tin", description: "Vui lòng nhập Khoa/đơn vị/địa chỉ", variant: "destructive" }); return; }
        if (!formData.giverPhone?.trim()) { toast({ title: "Thiếu thông tin", description: "Vui lòng nhập số điện thoại", variant: "destructive" }); return; }

        const id = (dialogMode === 'edit' || dialogMode === 'view') && selectedItem ? selectedItem.id : doc(collection(firestore, "asset-receptions")).id;
        const action = dialogMode === 'add' ? 'create' : 'update';
        
        await setDoc(doc(firestore, "asset-receptions", id), { ...formData, id }, { merge: true });
        
        // Log Activity
        if (authUser) {
            await logActivity(
                authUser.uid, 
                action, 
                'Tiếp nhận tài sản', 
                `${action === 'create' ? 'Tạo phiếu' : 'Cập nhật phiếu'} tiếp nhận: ${formData.entryNumber}`,
                { userEmail: authUser.email || '', newData: formData }
            );
        }
        
        toast({ title: "Thành công" }); setIsEditDialogOpen(false);
    };

    const handleUndo = () => { setFormData(initialFormState); toast({ title: t("Đã hoàn tác dữ liệu") }); };
    const confirmDelete = async (item: RenderReception) => { 
        if (firestore && authUser) { 
            await deleteDoc(doc(firestore, "asset-receptions", item.id)); 
            await logActivity(
                authUser.uid, 
                'delete', 
                'Tiếp nhận tài sản', 
                `Xóa phiếu tiếp nhận: ${item.entryNumber}`,
                { userEmail: authUser.email || '', previousData: item }
            );
            toast({ title: "Thành công" }); 
        } 
        setIsDeleteDialogOpen(false); 
    };

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
        try {
            const CHUNK_SIZE = 400;
            for (let i = 0; i < importingData.length; i += CHUNK_SIZE) {
                const chunk = importingData.slice(i, i + CHUNK_SIZE);
                const batch = writeBatch(firestore);
                
                chunk.forEach((row) => {
                    const id = doc(collection(firestore, "asset-receptions")).id;
                    batch.set(doc(firestore, 'asset-receptions', id), {
                        id,
                        entryNumber: String(row['Số tiếp nhận'] || ''),
                        receptionDate: String(row['Ngày tiếp'] || ''),
                        giverName: String(row['Người giao'] || ''),
                        content: String(row['Nội dung'] || ''),
                        returnStatus: 'Chưa trả',
                        createdAt: new Date().toISOString()
                    }, { merge: true });
                });
                
                await batch.commit();
            }
            setIsProcessingImport(false);
            setIsImportPreviewOpen(false);
            
            // Log Activity
            if (authUser) {
                await logActivity(
                    authUser.uid, 
                    'import', 
                    'Tiếp nhận tài sản', 
                    `Import thành công ${importingData.length} phiếu tiếp nhận tài sản từ Excel.`,
                    { userEmail: authUser.email || '' }
                );
            }
            
            toast({ title: "Import thành công", description: `Đã nhập ${importingData.length} bản ghi.` });
        } catch (error) {
            console.error("Import error:", error);
            toast({ title: "Lỗi Import", variant: "destructive", description: "Vui lòng kiểm tra lại file Excel hoặc quyền truy cập." });
            setIsProcessingImport(false);
        }
    };

    const handleExport = () => {
        const ws = XLSX.utils.json_to_sheet(sortedItems); const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Receptions"); XLSX.writeFile(wb, `DS_TiepNhanTS_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    };

    return (
        <Card className="border-none shadow-none">
            <CardHeader className="py-3 border-b px-0">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2">Sổ Tiếp nhận Tài sản</CardTitle>
                    <div className="flex items-center gap-2">
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button onClick={() => setIsAdvancedFilterOpen(true)} variant="ghost" size="icon" className="text-orange-500"><ListFilter className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Bộ lọc nâng cao</p></TooltipContent></Tooltip></TooltipProvider>
                        {permissions.import && <>
                            <input type="file" ref={fileInputRef} onChange={handleImportFileChange} className="hidden" accept=".xlsx,.xls" />
                            <TooltipProvider><Tooltip><TooltipTrigger asChild><Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="icon" className="text-blue-600"><FileUp className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Nhập file Excel</p></TooltipContent></Tooltip></TooltipProvider>
                        </>}
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button onClick={handleExport} variant="ghost" size="icon" className="text-green-600" disabled={!permissions.export}><FileDown className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Xuất file Excel</p></TooltipContent></Tooltip></TooltipProvider>
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button onClick={() => openDialog('add')} variant="ghost" size="icon" disabled={!permissions.add}><PlusCircle className="h-5 w-5 text-primary" /></Button></TooltipTrigger><TooltipContent><p>Thêm mới</p></TooltipContent></Tooltip></TooltipProvider>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-[#1877F2] hover:bg-[#1877F2]/90">
                                <TableHead className="w-[80px] font-bold text-base text-white text-center border-r border-blue-300">#</TableHead>
                                {orderedColumns.map(key => (<TableHead key={key} className="text-white border-r border-blue-300 p-0 h-auto"><ColumnHeader columnKey={key} title={columnDefs[key].title} t={t} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={(k:any, d:any)=>setSortConfig([{key:k, direction:d}])} clearSort={()=>setSortConfig([])} filters={filters} handleFilterChange={(k:any, v:string) => { setFilters(p => ({...p,[k]:v})); setCurrentPage(1); }} icon={colIcons[key]} /></TableHead>))}
                                <TableHead className="w-16 text-center text-white font-bold text-base sticky right-0 bg-[#1877F2] z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.1)]"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:bg-blue-700"><Cog className="h-5 w-5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Hiển thị cột</DropdownMenuLabel><DropdownMenuSeparator />{allColumns.map(key => (<DropdownMenuCheckboxItem key={key} checked={columnVisibility[key]} onCheckedChange={v => setColumnVisibility(prev => ({...prev, [key]: !!v}))}>{t(columnDefs[key].title)}</DropdownMenuCheckboxItem>))}</DropdownMenuContent></DropdownMenu></TableHead>
                            </TableRow>
                        </TableHeader>
                                    <TableBody>
                                        {loading ? <TableRow><TableCell colSpan={orderedColumns.length + 2} className="text-center h-24">Đang tải...</TableCell></TableRow> : currentItems.length > 0 ? currentItems.map((item, idx) => {
                                            const isSelected = selectedSet.has(item.renderId);
                                            return (
                                                <TableRow key={item.renderId} onClick={() => handleRowClick(item.renderId)} data-state={isSelected ? "selected" : ""} className={cn("cursor-pointer odd:bg-white even:bg-muted/20 hover:bg-yellow-300 transition-all", "data-[state=selected]:bg-red-800 data-[state=selected]:text-white")}>
                                                    <TableCell className="font-medium text-center border-r align-middle py-3">{startIndex + idx + 1}</TableCell>
                                                    {orderedColumns.map(key => (
                                                        <TableCell key={key} className="font-medium border-r align-middle py-3">
                                                            {String(item[key as keyof AssetReception] ?? '')}
                                                        </TableCell>
                                                    ))}
                                                    <TableCell className="text-center py-3 sticky right-0 bg-white group-hover:bg-yellow-300 z-10 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">
                                                        <div onClick={e => e.stopPropagation()}>
                                                            <DropdownMenu modal={false}>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="text-primary hover:bg-muted">
                                                                        <EllipsisVertical className="h-5 w-5" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end">
                                                                    <DropdownMenuItem onSelect={() => openDialog('view', item)}><Eye className="mr-2 h-4 w-4" />Chi tiết</DropdownMenuItem>
                                                                    {permissions.edit && <DropdownMenuItem onSelect={() => openDialog('edit', item)}><Edit className="mr-2 h-4 w-4" />Sửa</DropdownMenuItem>}
                                                                    {permissions.add && <DropdownMenuItem onSelect={() => openDialog('copy', item)}><Copy className="mr-2 h-4 w-4" />Sao chép</DropdownMenuItem>}
                                                                    {permissions.delete && (
                                                                        <>
                                                                            <DropdownMenuSeparator />
                                                                            <DropdownMenuItem onSelect={() => { setSelectedItem(item); setIsDeleteDialogOpen(true); }} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" />Xóa</DropdownMenuItem>
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
                                                icon={ClipboardPaste}
                                                title="Không tìm thấy phiếu tiếp nhận"
                                                filters={{ ...filters, ...advancedFilters }}
                                                onClearFilters={() => {
                                                    setFilters({});
                                                    setAdvancedFilters({
                                                        date: format(new Date(), 'yyyy-MM-dd'),
                                                        buildings: []
                                                    });
                                                }}
                                            />
                                        )}
                                    </TableBody>
                    </Table>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-t px-0">
                <div className="text-sm text-muted-foreground">Tổng cộng {sortedItems.length} bản ghi. {selectedSet.size > 0 && `Đã chọn ${selectedSet.size} dòng.`}</div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2"><p className="text-sm text-muted-foreground">Số dòng</p><Select value={`${safeRowsPerPage}`} onValueChange={(v) => { setRowsPerPage(Number(v)); setCurrentPage(1); }}><SelectTrigger className="h-8 w-[70px]"><SelectValue placeholder={safeRowsPerPage} /></SelectTrigger><SelectContent side="top">{[5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map((s) => (<SelectItem key={s} value={`${s}`}>{s}</SelectItem>))}</SelectContent></Select></div>
                    <div className="flex items-center gap-2"><Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(1)} disabled={safeCurrentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button><Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(prev => Math.max(1, prev-1))} disabled={safeCurrentPage === 1}><ChevronLeft className="h-4 w-4" /></Button><div className="flex items-center gap-1 font-medium text-sm"><Input type="number" className="h-8 w-12 text-center" value={safeCurrentPage} onChange={e => { const p = parseInt(e.target.value, 10); if (p > 0 && p <= totalPages) setCurrentPage(p); }} />/ {totalPages}</div><Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentPage(prev => Math.min(prev+1, totalPages))} disabled={safeCurrentPage === totalPages || totalPages === 0}><ChevronRight className="h-4 w-4" /></Button><Button variant="outline" size="icon" className="h-8 w-8 p-0" onClick={() => setCurrentPage(totalPages)} disabled={safeCurrentPage === totalPages || totalPages === 0}><ChevronsRight className="h-4 w-4" /></Button></div>
                </div>
            </CardFooter>

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
            <EditDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} mode={dialogMode} formData={formData} setFormData={setFormData} onSave={handleSave} onUndo={handleUndo} isChanged={isChanged} blocks={allBlocks} t={t} />

            <Dialog open={isImportPreviewOpen} onOpenChange={setIsImportPreviewOpen}>
                <DialogContent className="sm:max-w-4xl"><DialogHeader><DialogTitle>Xem trước Import</DialogTitle></DialogHeader>
                    <ScrollArea className="max-h-[60vh] border rounded-md"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead>STT</TableHead><TableHead>Số tiếp nhận</TableHead><TableHead>Người giao</TableHead><TableHead>Nội dung</TableHead></TableRow></TableHeader><TableBody>{importingData.map((row, idx) => (<TableRow key={idx}><TableCell className="text-center">{idx + 1}</TableCell><TableCell>{row['Số tiếp nhận']}</TableCell><TableCell className="font-bold">{row['Người giao']}</TableCell><TableCell className="truncate max-w-[300px]">{row['Nội dung']}</TableCell></TableRow>))}</TableBody></Table></ScrollArea>
                    <DialogFooter><Button variant="ghost" onClick={() => setIsImportPreviewOpen(false)}>Hủy bỏ</Button><Button onClick={processImport} disabled={isProcessingImport}>{isProcessingImport ? <Cog className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Xác nhận Import</Button></DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle><AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel><Ban className="mr-2 h-4 w-4" />Bỏ qua</AlertDialogCancel><AlertDialogAction onClick={() => selectedItem && confirmDelete(selectedItem)} className="bg-destructive">Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
