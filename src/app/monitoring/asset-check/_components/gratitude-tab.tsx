
"use client";

import * as React from "react";
import { useState, useMemo, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  HeartHandshake, Cog, ArrowUpDown, ArrowUp, ArrowDown, X, 
  EllipsisVertical, Save, Filter, Eye, Undo2, 
  Ban, FileDown, CheckCircle2, Copy, Trash2, Edit, 
  ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, 
  ListFilter, Check, ChevronsUpDown, CalendarDays, Map, Hash, User, Gift, StickyNote, CloudUpload, CloudDownload, FileText,
  IdCard, GraduationCap, Building2, Phone, Activity, FilePlus, UserCircle, Briefcase, ChevronDown
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { AssetReception, Gift as GiftType, Employee, BuildingBlock } from '@/lib/types';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";
import { format, parse, isValid } from 'date-fns';
import { DatePickerField } from "@/components/ui/date-picker-field";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import * as XLSX from 'xlsx';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useLanguage } from "@/hooks/use-language";
import { DataTableEmptyState } from "@/components/data-table-empty-state";

type DialogMode = 'edit' | 'copy' | 'view';
interface RenderGratitude extends AssetReception { renderId: string; }

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
                            <div className="space-y-2"><Label className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Ngày tri ân/tiếp</Label><DatePickerField value={filters.date} onChange={val => setFilters({...filters, date: val || ''})} className="h-9" /></div>
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

const EditDialog = ({ open, onOpenChange, mode, formData, setFormData, onSave, onUndo, isChanged, allGifts, t }: any) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden border-none shadow-2xl">
            <div className="bg-white p-6 border-b">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-center uppercase tracking-wider text-gray-900">Tặng thư tri ân "Người tốt Việc tốt"</DialogTitle>
                    <VisuallyHidden><DialogDescription>Cấu hình tri ân</DialogDescription></VisuallyHidden>
                </DialogHeader>
            </div>

            <ScrollArea className="max-h-[85vh] p-8 bg-[#fdfdfd]">
                <div className="space-y-8">
                    {/* Header Info */}
                    <div className="bg-orange-50/50 p-2 border border-orange-100 rounded-sm">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-700 ml-2">Số:</span>
                            <span className="font-bold text-orange-600 px-2 bg-orange-100/50 rounded">{formData.gratitudeNumber || ''}</span>
                            <span className="mx-4 text-gray-300">|</span>
                            <span className="font-bold text-gray-700">Số KTNB:</span>
                            <span className="italic text-gray-600 px-2">{formData.entryNumber || ''}</span>
                        </div>
                    </div>

                    {/* Main Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                        {/* Giver Name */}
                        <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1.5 whitespace-nowrap font-medium text-gray-700"><User className="w-4 h-4 text-orange-500" /> Họ và tên người nhận quà: <span className="text-red-500">*</span></span>
                            <Input 
                                className="w-full border-0 border-b border-dotted border-gray-400 rounded-none px-0 h-7 shadow-none focus-visible:ring-0 text-base bg-transparent font-semibold h-auto py-0" 
                                value={formData.giverName || ''} 
                                readOnly 
                            />
                        </div>

                        {/* Giver ID */}
                        <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1.5 whitespace-nowrap font-medium text-gray-700"><IdCard className="w-4 h-4 text-orange-500" /> MSSV/CCCD người nhận quà:</span>
                            <Input 
                                className="w-full border-0 border-b border-dotted border-gray-400 rounded-none px-0 h-7 shadow-none focus-visible:ring-0 text-base bg-transparent h-auto py-0" 
                                value={formData.giverId || ''} 
                                readOnly 
                            />
                        </div>

                        {/* Giver Class */}
                        <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1.5 whitespace-nowrap font-medium text-gray-700"><GraduationCap className="w-4 h-4 text-orange-500" /> Lớp người nhận quà:</span>
                            <Input 
                                className="w-full border-0 border-b border-dotted border-gray-400 rounded-none px-0 h-7 shadow-none focus-visible:ring-0 text-base bg-transparent h-auto py-0" 
                                value={formData.giverClass || ''} 
                                readOnly 
                            />
                        </div>

                        {/* Giver Unit (Span 2) */}
                        <div className="flex flex-col gap-1 md:col-span-2">
                            <span className="flex items-center gap-1.5 whitespace-nowrap font-medium text-gray-700"><Building2 className="w-4 h-4 text-orange-500" /> Khoa/đơn vị/địa chỉ:</span>
                            <Input 
                                className="w-full border-0 border-b border-dotted border-gray-400 rounded-none px-0 h-7 shadow-none focus-visible:ring-0 text-base bg-transparent h-auto py-0" 
                                value={formData.giverUnit || ''} 
                                readOnly 
                            />
                        </div>

                        {/* Giver Phone (Col 3) */}
                        <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1.5 whitespace-nowrap font-medium text-gray-700"><Phone className="w-4 h-4 text-orange-500" /> Số điện thoại:</span>
                            <Input 
                                className="w-full border-0 border-b border-dotted border-gray-400 rounded-none px-0 h-7 shadow-none focus-visible:ring-0 text-base bg-transparent h-auto py-0" 
                                value={formData.giverPhone || ''} 
                                readOnly 
                            />
                        </div>

                        {/* Gift (Span 2) */}
                        <div className="flex flex-col gap-1 md:col-span-2">
                            <span className="flex items-center gap-1.5 whitespace-nowrap font-medium text-gray-700"><Gift className="h-4 h-4 text-orange-500" /> Quà trao tặng:</span>
                            <Select value={formData.gratitudeGift || 'none'} onValueChange={v => setFormData({...formData, gratitudeGift: v === 'none' ? '' : v})} disabled={mode === 'view'}>
                                <SelectTrigger className="w-full border-0 border-b border-dotted border-gray-400 rounded-none px-0 h-7 shadow-none focus-visible:ring-0 text-base bg-transparent ring-offset-0 focus:ring-0 h-auto py-0">
                                    <SelectValue placeholder="Chọn quà..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">--- Chưa có ---</SelectItem>
                                    {allGifts?.map((g: any) => <SelectItem key={g.id} value={g.name}>{g.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Date (Col 3) */}
                        <div className="flex flex-col gap-1">
                            <span className="flex items-center gap-1.5 whitespace-nowrap font-medium text-gray-700"><CalendarDays className="h-4 h-4 text-orange-500" /> Ngày trao quà:</span>
                            <Input 
                                className="w-full border-0 border-b border-dotted border-gray-400 rounded-none px-0 h-7 shadow-none focus-visible:ring-0 text-base bg-transparent h-auto py-0" 
                                value={formData.gratitudeDate || ''} 
                                readOnly 
                            />
                        </div>
                    </div>

                    {/* Signature Area */}
                    <div className="mt-12 border-t pt-8">
                        <div className="grid grid-cols-3 gap-8 text-center">
                            <div>
                                <p className="font-bold text-gray-800 uppercase text-xs tracking-wider">Người nhận quà</p>
                                <p className="italic text-[10px] text-gray-500">(ký và ghi rõ họ tên)</p>
                                <div className="mt-4">
                                    <Input 
                                        className="text-center font-bold border-0 border-b border-dashed border-gray-300 rounded-none h-8 shadow-none focus-visible:ring-0 bg-transparent h-auto py-0" 
                                        value={formData.giverName || ''} 
                                        readOnly 
                                    />
                                </div>
                            </div>
                            <div>
                                <p className="font-bold text-gray-800 uppercase text-xs tracking-wider">Cán bộ phát quà</p>
                                <p className="italic text-[10px] text-gray-500">(ký và ghi rõ họ tên)</p>
                                <div className="mt-4">
                                    <Input 
                                        className="text-center font-bold border-0 border-b border-dashed border-gray-300 rounded-none h-8 shadow-none focus-visible:ring-0 bg-transparent h-auto py-0" 
                                        value={formData.gratitudeStaff || ''} 
                                        onChange={e => setFormData({...formData, gratitudeStaff: e.target.value})}
                                        disabled={mode === 'view'}
                                    />
                                </div>
                            </div>
                            <div>
                                <p className="font-bold text-gray-800 uppercase text-xs tracking-wider">Người chứng kiến</p>
                                <p className="italic text-[10px] text-gray-500">(ký và ghi rõ họ tên)</p>
                                <div className="mt-4">
                                    <Input 
                                        className="text-center font-bold border-0 border-b border-dashed border-gray-300 rounded-none h-8 shadow-none focus-visible:ring-0 bg-transparent h-auto py-0" 
                                        value={formData.gratitudeWitness || ''} 
                                        onChange={e => setFormData({...formData, gratitudeWitness: e.target.value})}
                                        disabled={mode === 'view'}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </ScrollArea>

            <DialogFooter className="p-6 bg-gray-50 border-t flex justify-end gap-3">
                <Button variant="ghost" onClick={onUndo} disabled={!isChanged || mode === 'view'} className="h-10 px-6">
                    <Undo2 className="mr-2 h-4 w-4" /> Hoàn tác
                </Button>
                {mode !== 'view' ? (
                    <Button className="bg-[#87CFFB] hover:bg-[#87CFFB]/90 text-white shadow-sm h-10 px-8" onClick={onSave} disabled={!isChanged}>
                        <Save className="mr-2 h-4 w-4" /> Lưu lại
                    </Button>
                ) : (
                    <Button onClick={() => onOpenChange(false)} className="h-10 px-8">Đóng</Button>
                )}
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

export default function GratitudeTab({ advancedFilters, setAdvancedFilters }: any) {
    const { t } = useLanguage();
    const firestore = useFirestore();
    const { user: authUser } = useUser();
    const { toast } = useToast();
    const permissions = usePermissions('/monitoring/asset-check');
    const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
    // advancedFilters lifted to parent

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<RenderGratitude | null>(null);
    const [formData, setFormData] = useState<Partial<AssetReception>>({});
    const [initialFormState, setInitialFormState] = useState<Partial<AssetReception>>({});
    const [dialogMode, setDialogMode] = useState<DialogMode>('view');
    const [currentPage, setCurrentPage] = useLocalStorage('gratitude_currentPage_v3', 1);
    const [rowsPerPage, setRowsPerPage] = useLocalStorage('gratitude_rowsPerPage_v3', 10);
    const [sortConfig, setSortConfig] = useLocalStorage<any[]>('gratitude_sortConfig_v3', []);
    const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>('gratitude_colVis_v4', { 
        gratitudeNumber: true, giverName: true, content: true, receptionDate: true, gratitudeDate: true, gratitudeGift: true, gratitudeStatus: true 
    });
    const [filters, setFilters] = useLocalStorage<Partial<Record<keyof AssetReception, string>>>('gratitude_filters_v4', {});
    const [openPopover, setOpenPopover] = useState<string | null>(null);
    const [selectedRowIds, setSelectedRowIds] = useLocalStorage<string[]>('gratitude_selected_ids_v3', []);

    const [isSavingFilters, setIsSavingFilters] = useState(false);

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
                asset_gratitude_advanced_presets: updatedPresets,
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
                if (data.asset_gratitude_advanced_presets) {
                    setFilterPresets(data.asset_gratitude_advanced_presets);
                } else if (data.asset_gratitude_advanced_filters) {
                    setFilterPresets([{ name: "Bộ lọc cũ", filters: data.asset_gratitude_advanced_filters }]);
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
                asset_gratitude_advanced_presets: updatedPresets,
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

    const receptionRef = useMemo(() => firestore ? collection(firestore, 'asset-receptions') : null, [firestore]);
    const blocksRef = useMemo(() => firestore ? collection(firestore, 'building-blocks') : null, [firestore]);
    const giftsRef = useMemo(() => firestore ? collection(firestore, 'gifts') : null, [firestore]);
    const employeesRef = useMemo(() => firestore ? collection(firestore, 'employees') : null, [firestore]);

    const { data: rawReceptions, loading } = useCollection<AssetReception>(receptionRef);
    const { data: allBlocks } = useCollection<BuildingBlock>(blocksRef);
    const { data: allGifts } = useCollection<GiftType>(giftsRef);
    const { data: employees } = useCollection<Employee>(employeesRef);
    
    const currentUserEmployee = useMemo(() => (employees || []).find(e => e.id === authUser?.uid || (e.email && authUser?.email && e.email === authUser?.email)), [employees, authUser]);
    const gratitudes = useMemo(() => rawReceptions ? rawReceptions.filter(r => r.isGratitude === true).map((item, idx) => ({ ...item, renderId: `${item.id}-${idx}` })) as RenderGratitude[] : [], [rawReceptions]);

    const selectedSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);

    const isChanged = useMemo(() => JSON.stringify(formData) !== JSON.stringify(initialFormState), [formData, initialFormState]);
    
    const filteredItems = useMemo(() => {
        return gratitudes.filter(item => {
            const matchesColumnFilters = Object.entries(filters).every(([key, value]) => String((item as any)[key] ?? '').toLowerCase().includes(String(value).toLowerCase()));
            if (!matchesColumnFilters) return false;
            if (advancedFilters.date) {
                const sDate = item.gratitudeDate || item.receptionDate;
                let fDate = advancedFilters.date;
                if (advancedFilters.date.includes('-')) {
                    const [y, m, d] = advancedFilters.date.split('-');
                    fDate = `${d}/${m}/${y}`;
                }
                if (sDate !== fDate) return false;
            }
            if (advancedFilters.buildings.length > 0 && item.giverUnit && !advancedFilters.buildings.includes(item.giverUnit)) return false;
            return true;
        });
    }, [gratitudes, filters, advancedFilters]);

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
        gratitudeNumber: { title: 'Số thư tri ân' }, giverName: { title: 'Người nhận quà' }, content: { title: 'Nội dung' },
        receptionDate: { title: 'Ngày tiếp' }, gratitudeDate: { title: 'Ngày phát quà' }, 
        gratitudeGift: { title: 'Quà tặng' }, gratitudeStatus: { title: 'Trạng thái' } 
    };

    const colIcons: Record<string, any> = {
        gratitudeNumber: Hash,
        giverName: User,
        content: FileText,
        receptionDate: CalendarDays,
        gratitudeDate: CalendarDays,
        gratitudeGift: Gift,
        gratitudeStatus: CheckCircle2,
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

    const openDialog = (mode: DialogMode, item: RenderGratitude) => {
        setDialogMode(mode); setSelectedItem(item);
        const data = mode === 'copy' ? { ...item, id: undefined, gratitudeNumber: `${item.gratitudeNumber || ''} (Copy)` } : { ...item };
        
        if (mode === 'edit' && !data.gratitudeNumber) {
            let maxNum = 0;
            gratitudes.forEach(r => {
                if (r.gratitudeNumber && r.gratitudeNumber.endsWith('/TTA')) {
                    const numStr = r.gratitudeNumber.split('/')[0];
                    const num = parseInt(numStr, 10);
                    if (!isNaN(num) && num > maxNum) maxNum = num;
                }
            });
            const nextNumStr = String(maxNum + 1).padStart(4, '0');
            data.gratitudeNumber = `${nextNumStr}/TTA`;
            data.gratitudeDate = data.gratitudeDate || format(new Date(), 'dd/MM/yyyy');
            data.gratitudeStaff = data.gratitudeStaff || currentUserEmployee?.name || authUser?.displayName || (authUser?.email ? authUser.email.split('@')[0] : '') || authUser?.phoneNumber || authUser?.uid?.slice(0, 8) || 'Cán bộ chưa có tên';
        }
        
        setFormData(data); setInitialFormState(data);
        setIsEditDialogOpen(true);
    };

    const handleSave = async () => {
        if (!firestore || !selectedItem) return;
        const id = selectedItem.id;
        await setDoc(doc(firestore, "asset-receptions", id), { ...formData, id }, { merge: true });
        toast({ title: "Thành công" }); setIsEditDialogOpen(false);
    };

    const handleUndo = () => { setFormData(initialFormState); toast({ title: t("Đã hoàn tác dữ liệu") }); };
    const confirmDelete = async (item: RenderGratitude) => { if (firestore) { await setDoc(doc(firestore, "asset-receptions", item.id), { isGratitude: false }, { merge: true }); toast({ title: "Đã hủy ghi nhận tri ân" }); } setIsDeleteDialogOpen(false); };

    const handleExport = () => {
        const ws = XLSX.utils.json_to_sheet(sortedItems); const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Gratitudes"); XLSX.writeFile(wb, `DS_TriAn_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    };

    return (
        <Card className="border-none shadow-none">
            <CardHeader className="py-3 border-b px-0">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg flex items-center gap-2">Sổ Người tốt việc tốt</CardTitle>
                    <div className="flex items-center gap-2">
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button onClick={() => setIsAdvancedFilterOpen(true)} variant="ghost" size="icon" className="text-orange-500"><ListFilter className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Bộ lọc nâng cao</p></TooltipContent></Tooltip></TooltipProvider>
                        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button onClick={handleExport} variant="ghost" size="icon" className="text-green-600" disabled={!permissions.export}><FileDown className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Xuất file Excel</p></TooltipContent></Tooltip></TooltipProvider>
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
                            {loading ? (
                                <TableRow><TableCell colSpan={orderedColumns.length + 2} className="h-24 text-center">Đang tải...</TableCell></TableRow>
                            ) : currentItems.length > 0 ? currentItems.map((item, idx) => {
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
                                    icon={HeartHandshake}
                                    title="Không tìm thấy ghi nhận tri ân"
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
            <EditDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} mode={dialogMode} formData={formData} setFormData={setFormData} onSave={handleSave} onUndo={handleUndo} isChanged={isChanged} allGifts={allGifts} t={t} />

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle><AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel><Ban className="mr-2 h-4 w-4" />Bỏ qua</AlertDialogCancel><AlertDialogAction onClick={() => selectedItem && confirmDelete(selectedItem)} className="bg-destructive">Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
