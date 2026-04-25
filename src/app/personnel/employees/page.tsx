
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
import { useState, useMemo, useCallback, useRef } from 'react';
import { 
  PlusCircle, Trash2, Edit, Cog, ChevronLeft, ChevronRight, 
  ChevronsLeft, ChevronsRight, Copy, ArrowUpDown, ArrowUp, 
  ArrowDown, Filter, X, EllipsisVertical, Save, Undo2, 
  UserCog, UserCircle2, Ban, FileDown, FileUp, CheckCircle2, 
  Eye, ListFilter, CalendarDays, IdCard, User, Sparkles, 
  Briefcase, Shield, Mail, Phone, MapPin, StickyNote, CloudUpload, CloudDownload, Check
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import * as XLSX from 'xlsx';
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { Separator } from "@/components/ui/separator";
import PageHeader from "@/components/page-header";
import { ClientOnly } from "@/components/client-only";
import { useLanguage } from "@/hooks/use-language";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { useMasterData } from "@/providers/master-data-provider";
import { collection, doc, setDoc, deleteDoc, writeBatch, getDoc } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, isValid, parseISO } from "date-fns";
import { logActivity } from "@/lib/activity-logger";
import { AvatarInput } from "@/components/personnel/avatar-input";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { DatePickerField } from "@/components/ui/date-picker-field";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { Employee, Role, Position as PositionType } from '@/lib/types';

type DialogMode = 'add' | 'edit' | 'copy' | 'view';
interface RenderEmployee extends Employee { renderId: string; }

const ColumnHeader = ({ columnKey, title, icon: Icon, t, sortConfig, openPopover, setOpenPopover, requestSort, clearSort, filters, handleFilterChange }: any) => {
    const sortState = sortConfig?.find((s: any) => s.key === columnKey);
    const isFiltered = !!filters[columnKey];
    return (
        <Popover open={openPopover === columnKey} onOpenChange={(isOpen) => setOpenPopover(isOpen ? columnKey : null)}>
            <PopoverTrigger asChild>
                <Button variant="ghost" className="text-white hover:text-white hover:bg-blue-700 h-auto p-2 group w-full justify-start font-bold text-[11px] uppercase tracking-wider">
                    {Icon && <Icon className="mr-1.5 h-3.5 w-3.5 shrink-0 opacity-80" />}
                    <span className="truncate">{t(title)}</span>
                    {sortState ? (
                        sortState.direction === 'ascending' ? <ArrowUp className={cn("ml-1 h-3 w-3", isFiltered && "text-red-300")} /> : <ArrowDown className={cn("ml-1 h-3 w-3", isFiltered && "text-red-300")} />) : <ArrowUpDown className={cn("ml-1 h-3 w-3 opacity-30", isFiltered ? "text-red-300" : "group-hover:opacity-100")} />}
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
                        <Button variant="ghost" onClick={() => handleFilterChange(columnKey, '')} className="w-full justify-start text-destructive hover:text-destructive h-8 px-2 mt-1"><X className="mr-2 h-4 w-4" /> {t('Xóa bộ lọc')}</Button>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
};

const EmployeeEditDialog = ({ open, onOpenChange, mode, formData, setFormData, onSave, onUndo, isChanged, t, allRoles, allPositions }: any) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle className="text-xl">
                    {mode === 'view' ? t('Chi tiết') : mode === 'add' ? t('Thêm mới') : t('Chỉnh sửa')} {t('Nhân viên')}
                </DialogTitle>
                <VisuallyHidden><DialogDescription>Thông tin nhân viên</DialogDescription></VisuallyHidden>
            </DialogHeader>
            <ScrollArea className="max-h-[75vh]">
                <div className="p-6">
                    <AvatarInput value={formData.avatarUrl || ''} onChange={(val) => setFormData((p:any) => ({...p, avatarUrl: val}))} name={formData.name} disabled={mode === 'view'} />
                    <Separator className="my-6" />
                    
                    <Accordion type="single" collapsible defaultValue="job-info" className="w-full space-y-4">
                        <AccordionItem value="job-info" className="border rounded-lg bg-card px-4">
                            <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex items-center gap-2 font-bold text-primary uppercase tracking-wider">
                                    <UserCog className="h-4 w-4" /> THÔNG TIN CÔNG VIỆC
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-muted/20 p-4 rounded-lg">
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground flex items-center gap-2"><IdCard className="h-4 w-4 text-blue-500" /> {t('Mã số')} *</Label>
                                        {mode === 'view' ? <p className="font-bold">{formData.employeeId}</p> : <Input className="h-8" value={formData.employeeId || ''} onChange={e => setFormData((p:any) => ({...p, employeeId: e.target.value}))} />}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground flex items-center gap-2"><User className="h-4 w-4 text-blue-500" /> {t('Họ và tên')} *</Label>
                                        {mode === 'view' ? <p className="font-bold">{formData.name}</p> : <Input className="h-8" value={formData.name || ''} onChange={e => setFormData((p:any) => ({...p, name: e.target.value}))} />}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground flex items-center gap-2"><Sparkles className="h-4 w-4 text-blue-500" /> {t('Biệt danh')}</Label>
                                        {mode === 'view' ? <p className="font-bold">{formData.nickname || '---'}</p> : <Input className="h-8" value={formData.nickname || ''} onChange={e => setFormData((p:any) => ({...p, nickname: e.target.value}))} />}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground flex items-center gap-2"><Briefcase className="h-4 w-4 text-blue-500" /> {t('Chức vụ')}</Label>
                                        {mode === 'view' ? <p className="font-bold text-blue-600">{allPositions?.find((p:any) => p.id === formData.position)?.name || t('Không có')}</p> : 
                                            <Select value={formData.position || 'none'} onValueChange={v => setFormData((p:any) => ({...p, position: v === 'none' ? '' : v}))}>
                                                <SelectTrigger className="h-8"><SelectValue placeholder={t('Chọn chức vụ...')} /></SelectTrigger>
                                                <SelectContent><SelectItem value="none">{t('Không có')}</SelectItem>{allPositions?.map((pos:any) => <SelectItem key={pos.id} value={pos.id}>{pos.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        }
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground flex items-center gap-2"><Shield className="h-4 w-4 text-blue-500" /> {t('Vai trò')}</Label>
                                        {mode === 'view' ? <p className="font-bold">{allRoles?.find((r:any) => r.id === formData.role)?.name || formData.role}</p> : 
                                            <Select value={formData.role || 'Nhân viên'} onValueChange={v => setFormData((p:any) => ({...p, role: v}))}>
                                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                                <SelectContent>{allRoles?.map((role:any) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        }
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground flex items-center gap-2"><Mail className="h-4 w-4 text-blue-500" /> {t('Email')} *</Label>
                                        {mode === 'view' ? <p className="font-bold">{formData.email}</p> : <Input className="h-8" value={formData.email || ''} onChange={e => setFormData((p:any) => ({...p, email: e.target.value}))} />}
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="personal-info" className="border rounded-lg bg-card px-4">
                            <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex items-center gap-2 font-bold text-orange-600 uppercase tracking-wider">
                                    <UserCircle2 className="h-4 w-4" /> THÔNG TIN CÁ NHÂN
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-muted/20 p-4 rounded-lg">
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground flex items-center gap-2"><CalendarDays className="h-4 w-4 text-orange-500" /> {t('Ngày sinh')}</Label>
                                        {mode === 'view' ? <p className="font-bold">{formData.birthDate || '---'}</p> : 
                                            <DatePickerField 
                                                value={formData.birthDate || ''} 
                                                onChange={v => setFormData((p:any) => ({...p, birthDate: v}))}
                                                className="h-8"
                                            />
                                        }
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4 text-orange-500" /> {t('Số điện thoại')}</Label>
                                        {mode === 'view' ? <p className="font-bold text-blue-600">{formData.phone || '---'}</p> : <Input className="h-8" value={formData.phone || ''} onChange={e => setFormData((p:any) => ({...p, phone: e.target.value}))} />}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4 text-orange-500" /> {t('Địa chỉ')}</Label>
                                        {mode === 'view' ? <p className="font-bold">{formData.address || '---'}</p> : <Input className="h-8" value={formData.address || ''} onChange={e => setFormData((p:any) => ({...p, address: e.target.value}))} />}
                                    </div>
                                    <div className="md:col-span-3 space-y-1">
                                        <Label className="text-muted-foreground flex items-center gap-2"><StickyNote className="h-4 w-4 text-orange-500" /> {t('Ghi chú')}</Label>
                                        {mode === 'view' ? <p className="font-bold">{formData.note || '---'}</p> : <Input className="h-8" value={formData.note || ''} onChange={e => setFormData((p:any) => ({...p, note: e.target.value}))} />}
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            </ScrollArea>
            <DialogFooter className="p-6 pt-0">
                <Tooltip><TooltipTrigger asChild><Button variant="outline" onClick={onUndo} disabled={!isChanged || mode === 'view'}>
                    <Undo2 className="mr-2 h-4 w-4" />{t('Hoàn tác')}
                </Button></TooltipTrigger><TooltipContent><p>{t('Khôi phục thay đổi')}</p></TooltipContent></Tooltip>
                {mode !== 'view' ? (
                    <Tooltip><TooltipTrigger asChild><Button onClick={onSave} disabled={!isChanged}>
                        <Save className="mr-2 h-4 w-4" />{t('Lưu lại')}
                    </Button></TooltipTrigger><TooltipContent><p>{t('Lưu các thay đổi')}</p></TooltipContent></Tooltip>
                ) : (
                    <Tooltip><TooltipTrigger asChild><Button onClick={() => onOpenChange(false)}>{t('Đóng')}</Button></TooltipTrigger><TooltipContent><p>{t('Đóng hộp thoại')}</p></TooltipContent></Tooltip>
                )}
            </DialogFooter>
        </DialogContent>
    </Dialog>
);

const AdvancedFilterDialog = ({ open, onOpenChange, filters, setFilters, allRoles, allPositions, t, onSaveCloud, onLoadCloud, isSaving, presets, onDeleteCloud }: any) => {
    const [newPresetName, setNewPresetName] = useState('');
    const [isNamingPreset, setIsNamingPreset] = useState(false);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-4xl">
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
                                        <Tooltip><TooltipTrigger asChild><Button 
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
                                    </Button></TooltipTrigger><TooltipContent><p>{t('Lưu bộ lọc mới')}</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button 
                                        variant="ghost" 
                                        size="sm" 
                                        className="h-8 px-2" 
                                        onClick={() => setIsNamingPreset(false)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button></TooltipTrigger><TooltipContent><p>{t('Hủy')}</p></TooltipContent></Tooltip>
                                </div>
                            ) : (
                                <Tooltip><TooltipTrigger asChild><Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 text-[10px] font-bold border-green-200 text-green-700 hover:bg-green-50"
                                    onClick={() => setIsNamingPreset(true)}
                                >
                                    <CloudUpload className="mr-1 h-3 w-3" /> Lưu bộ lọc mới
                                </Button></TooltipTrigger><TooltipContent><p>{t('Lưu thiết lập bộ lọc hiện tại')}</p></TooltipContent></Tooltip>
                            )}
                        </div>
                    </div>
                    <VisuallyHidden><DialogDescription>Lọc danh sách nhân viên</DialogDescription></VisuallyHidden>
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
                                    <Tooltip><TooltipTrigger asChild><Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                                        onClick={() => onDeleteCloud(preset.name)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button></TooltipTrigger><TooltipContent><p>{t('Xóa bộ lọc đã lưu')}</p></TooltipContent></Tooltip>
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

                        <div className="grid gap-4 p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2"><Label className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Họ và tên</Label><Input value={filters.name || ''} onChange={e => setFilters({...filters, name: e.target.value})} placeholder="Nhập tên..." /></div>
                                <div className="space-y-2"><Label className="flex items-center gap-2"><IdCard className="h-4 w-4 text-primary" /> Mã số</Label><Input value={filters.employeeId || ''} onChange={e => setFilters({...filters, employeeId: e.target.value})} placeholder="Nhập mã..." /></div>
                            </div>
                            <div className="space-y-2"><Label className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> {t('Ngày sinh')}</Label><DatePickerField value={filters.birthDate || ''} onChange={val => setFilters({...filters, birthDate: val || ''})} className="h-9" /></div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Vai trò</Label>
                                <Select value={filters.role || 'all'} onValueChange={v => setFilters({...filters, role: v === 'all' ? '' : v})}>
                                    <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">Tất cả</SelectItem>{allRoles?.map((r:any) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> Chức vụ</Label>
                                <Select value={filters.position || 'all'} onValueChange={v => setFilters({...filters, position: v === 'all' ? '' : v})}>
                                    <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
                                    <SelectContent><SelectItem value="all">Tất cả</SelectItem>{allPositions?.map((p:any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                    </ScrollArea>
                </div>
                <DialogFooter className="p-4 border-t">
                    <Tooltip><TooltipTrigger asChild><Button variant="outline" onClick={() => setFilters({})}>Xóa tất cả</Button></TooltipTrigger><TooltipContent><p>{t('Thiết lập lại bộ lọc')}</p></TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button onClick={() => onOpenChange(false)}><CheckCircle2 className="mr-2 h-4 w-4" /> Áp dụng</Button></TooltipTrigger><TooltipContent><p>{t('Áp dụng bộ lọc')}</p></TooltipContent></Tooltip>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function EmployeesPage() {
  const { t } = useLanguage();
  const firestore = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { 
    employees: rawEmployees, 
    roles: allRoles, 
    positions: allPositions, 
    loadStates
  } = useMasterData();
  const loading = loadStates.employees;

  const employees = useMemo(() => (rawEmployees || []).map((item, idx) => ({ ...item, renderId: `${item.id || 'no-id'}-${idx}` })) as RenderEmployee[], [rawEmployees]);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RenderEmployee | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({});
  const [initialFormState, setInitialFormState] = useState<Partial<Employee>>({});
  const [dialogMode, setDialogMode] = useState<DialogMode>('add');
  
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [importingData, setImportingData] = useState<any[]>([]);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const { user: authUser } = useUser();
  const [isSavingFilters, setIsSavingFilters] = useState(false);
  const { toast } = useToast();

  const [currentPage, setCurrentPage] = useLocalStorage('employees_page_v27', 1);
  const [rowsPerPage, setRowsPerPage] = useLocalStorage('employees_rows_v27', 10);
  const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>('employees_colVis_v27', { avatarUrl: true, employeeId: true, name: true, role: true, phone: true, nickname: false, position: true, birthDate: false, address: false, email: true, note: true });
  const [filters, setFilters] = useLocalStorage<any>('employees_filters_v27', {});
  const [sortConfig, setSortConfig] = useLocalStorage<any[]>('employees_sort_v27', []);

  // Cloud Filter Persistence
  const [filterPresets, setFilterPresets] = useState<any[]>([]);

  const saveFiltersToCloud = useCallback(async (presetName: string) => {
    if (!firestore || !authUser) return;
    setIsSavingFilters(true);
    try {
        const newPreset = {
            name: presetName,
            filters: filters,
            createdAt: new Date().toISOString()
        };
        const updatedPresets = [...filterPresets.filter(p => p.name !== presetName), newPreset];

        await setDoc(doc(firestore, "user_settings", authUser.uid), {
            employees_advanced_presets: updatedPresets,
            updatedAt: new Date()
        }, { merge: true });

        setFilterPresets(updatedPresets);
        toast({ title: "Đã lưu bộ lọc", description: `Đã lưu "${presetName}"` });
    } catch (error) {
        toast({ title: "Lỗi khi lưu bộ lọc", variant: "destructive" });
    } finally {
        setIsSavingFilters(false);
    }
  }, [firestore, authUser, filters, filterPresets, toast]);

  const loadFiltersFromCloud = useCallback(async () => {
    if (!firestore || !authUser) return;
    try {
        const docSnap = await getDoc(doc(firestore, "user_settings", authUser.uid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.employees_advanced_presets) {
                setFilterPresets(data.employees_advanced_presets);
            } else if (data.employees_advanced_filters) {
                setFilterPresets([{ name: "Bộ lọc cũ", filters: data.employees_advanced_filters }]);
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
            employees_advanced_presets: updatedPresets,
            updatedAt: new Date()
        }, { merge: true });
        setFilterPresets(updatedPresets);
        toast({ title: "Đã xóa bộ lọc" });
    } catch (err) {
        toast({ title: "Lỗi khi xóa", variant: "destructive" });
    }
  };

  // Auto-load on mount
  useMemo(() => {
    if (authUser) {
        loadFiltersFromCloud();
    }
  }, [authUser, loadFiltersFromCloud]);

  // useLocalStorage hooks moved above callbacks
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useLocalStorage<string[]>('employees_selected_ids_v27', []);
  const selectedSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);

  const isChanged = useMemo(() => JSON.stringify(formData) !== JSON.stringify(initialFormState), [formData, initialFormState]);

  const filteredItems = useMemo(() => employees.filter(item => Object.entries(filters).every(([k, v]) => {
    if (!v) return true;
    if (k === 'position') {
      const posName = allPositions?.find(p => p.id === item.position)?.name || item.position || '';
      return posName.toLowerCase().includes(String(v).toLowerCase());
    }
    if (k === 'role') {
      const roleName = allRoles?.find(r => r.id === item.role)?.name || item.role || '';
      return roleName.toLowerCase().includes(String(v).toLowerCase());
    }
    return String(item[k as keyof Employee] || '').toLowerCase().includes(String(v).toLowerCase());
  })), [employees, filters, allPositions, allRoles]);
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
    const data = item ? (mode === 'copy' ? { ...item, id: undefined } : { ...item }) : { role: 'Nhân viên', name: '' };
    setFormData(data); setInitialFormState(data); setIsEditDialogOpen(true);
  };

  // toast moved up

  const handleSave = async () => {
    if (!firestore || !authUser) return;
    const realId = (dialogMode === 'edit' || dialogMode === 'view') && selectedItem ? selectedItem.id : (formData.id || doc(collection(firestore, 'employees')).id);
    const action = dialogMode === 'add' ? 'create' : 'update';
    
    await setDoc(doc(firestore, 'employees', realId), { ...formData, id: realId }, { merge: true });
    
    // Log Activity
    await logActivity(
        authUser.uid, 
        action, 
        'Nhân viên', 
        `${action === 'create' ? 'Thêm mới' : 'Cập nhật'} nhân viên: ${formData.name}`,
        { userEmail: authUser.email || '', newData: formData }
    );
    
    setIsEditDialogOpen(false); 
    toast({ title: t('Thành công') });
  };

  const handleImportFile = (e: any) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: 'binary' });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { range: 7 }); 
      setImportingData(data); setIsImportPreviewOpen(true);
    };
    reader.readAsBinaryString(file); e.target.value = '';
  };

  const processImport = async () => {
    if (!firestore || importingData.length === 0) return;
    setIsProcessingImport(true);
    try {
        const CHUNK_SIZE = 400; // Safe margin below 500
        for (let i = 0; i < importingData.length; i += CHUNK_SIZE) {
            const chunk = importingData.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(firestore);
            
            chunk.forEach((row) => {
                const id = doc(collection(firestore, 'employees')).id;
                batch.set(doc(firestore, 'employees', id), {
                    id,
                    employeeId: String(row['Mã số'] || ''),
                    name: String(row['Họ và tên'] || ''),
                    email: String(row['Email'] || ''),
                    role: 'Nhân viên',
                    note: String(row['Ghi chú'] || ''),
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
                'Nhân viên', 
                `Import thành công ${importingData.length} nhân viên từ Excel.`,
                { userEmail: authUser.email || '' }
            );
        }
        
        toast({ title: "Import thành công", description: `Đã nhập ${importingData.length} bản ghi.` });
    } catch (error) {
        console.error("Import error:", error);
        toast({ title: "Lỗi Import", variant: "destructive", description: "Vui lòng kiểm tra lại file hoặc quyền truy cập." });
        setIsProcessingImport(false);
    }
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(sortedItems); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Employees"); XLSX.writeFile(wb, `DS_NhanVien_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const columnDefs: Record<string, string> = { avatarUrl: 'Hình', employeeId: 'Mã số', name: 'Họ và tên', nickname: 'Biệt danh', position: 'Chức vụ', role: 'Vai trò', phone: 'Điện thoại', birthDate: 'Ngày sinh', address: 'Địa chỉ', email: 'Email', note: 'Ghi chú' };
  const columnIcons: Record<string, any> = {
      employeeId: IdCard,
      name: User,
      nickname: Sparkles,
      position: Briefcase,
      role: Shield,
      phone: Phone,
      birthDate: CalendarDays,
      address: MapPin,
      email: Mail,
      note: StickyNote
  };
  const allColumns = Object.keys(columnDefs);
  const orderedColumns = allColumns.filter(k => columnVisibility[k]);

  return (
    <ClientOnly>
      <TooltipProvider>
        <PageHeader title={t("Bộ danh mục")} description={t("Quản lý nhân viên")} icon={UserCog} />
        <div className="p-4 md:p-6">
          <Card>
            <CardHeader className="py-3 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl flex items-center gap-2"><UserCog className="h-6 w-6 text-primary" />{t('Danh sách Nhân viên')}</CardTitle>
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
                          {k === 'avatarUrl' ? <div className="px-4 py-2 font-bold text-white text-center text-xs uppercase tracking-wider">{t('Hình')}</div> : (
                            <ColumnHeader columnKey={k} title={columnDefs[k]} icon={columnIcons[k]} t={t} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={(k:any,d:any)=>setSortConfig([{key:k,direction:d}])} clearSort={()=>setSortConfig([])} filters={filters} handleFilterChange={(k:any,v:any)=>{setFilters((p:any)=>({...p,[k]:v})); setCurrentPage(1);}} />
                          )}
                        </TableHead>
                      ))}
                      <TableHead className="w-16 text-center text-white font-bold text-base">
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9 text-white hover:text-white hover:bg-blue-700"><Cog className="h-5 w-5" /></Button></DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="max-h-80 overflow-y-auto">
                                                                <DropdownMenuLabel>{t('Hiển thị cột')}</DropdownMenuLabel>
                                                                <DropdownMenuSeparator />
                                                                {allColumns.map(k => <DropdownMenuCheckboxItem key={k} checked={columnVisibility[k]} onCheckedChange={(v) => setColumnVisibility(p => ({...p, [k]: !!v}))}>{t(columnDefs[k])}</DropdownMenuCheckboxItem>)}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>{t('Cài đặt hiển thị')}</p></TooltipContent>
                                                </Tooltip>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? <TableRow><TableCell colSpan={orderedColumns.length + 2} className="text-center h-24">{t('Đang tải...')}</TableCell></TableRow> : currentItems.length > 0 ? currentItems.map((item, idx) => {
                      const isSelected = selectedSet.has(item.renderId);
                      return (
                        <TableRow key={item.renderId} onClick={() => handleRowClick(item.renderId)} data-state={isSelected ? "selected" : ""} className={cn("cursor-pointer odd:bg-white even:bg-muted/20 hover:bg-yellow-300 transition-all", "data-[state=selected]:bg-red-800 data-[state=selected]:text-white")}>
                          <TableCell className="text-center border-r text-inherit align-middle py-3">{startIndex + idx + 1}</TableCell>
                          {orderedColumns.map(k => (
                            <TableCell key={k} className="border-r text-inherit align-middle py-3">
                              {k === 'avatarUrl' ? (item.avatarUrl ? <Avatar className="h-9 w-9 mx-auto"><AvatarImage src={item.avatarUrl}/><AvatarFallback>{item.name?.charAt(0)}</AvatarFallback></Avatar> : <UserCircle2 className="h-9 w-9 text-muted-foreground mx-auto"/>) : 
                               k === 'birthDate' ? (item.birthDate ? (() => {
                                   try {
                                       const d = new Date(item.birthDate);
                                       return isValid(d) ? format(d, 'dd/MM/yyyy') : item.birthDate;
                                   } catch (e) { return item.birthDate; }
                               })() : '') :
                               k === 'position' ? (allPositions?.find((p:any) => p.id === item.position)?.name || item.position || '') :
                               k === 'role' ? (allRoles?.find((r:any) => r.id === item.role)?.name || item.role || '') :
                               String(item[k as keyof Employee] || '')}
                            </TableCell>
                          ))}
                          <TableCell className="text-center py-3 text-inherit align-middle">
                            <div onClick={e => e.stopPropagation()}>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <DropdownMenu modal={false}><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="text-primary"><EllipsisVertical className="h-5 w-5"/></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onSelect={()=>openDialog('view', item)}><Eye className="mr-2 h-4 w-4"/>Chi tiết</DropdownMenuItem><DropdownMenuItem onSelect={()=>openDialog('edit', item)}><Edit className="mr-2 h-4 w-4"/>Sửa</DropdownMenuItem><DropdownMenuItem onSelect={()=>openDialog('copy', item)}><Copy className="mr-2 h-4 w-4"/>Sao chép</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={()=>{ setSelectedItem(item); setIsDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4"/>Xóa</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                                                                </TooltipTrigger>
                                                                <TooltipContent><p>{t('Thao tác')}</p></TooltipContent>
                                                            </Tooltip>
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
                                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8" onClick={()=>setCurrentPage(1)} disabled={safeCurrentPage===1}><ChevronsLeft className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent><p>{t('Trang đầu')}</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8" onClick={()=>setCurrentPage(Math.max(1, safeCurrentPage-1))} disabled={safeCurrentPage===1}><ChevronLeft className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent><p>{t('Trang trước')}</p></TooltipContent></Tooltip>
                                    <div className="flex items-center gap-1 font-medium text-sm">
                                      <Tooltip><TooltipTrigger asChild><Input type="number" className="h-8 w-12 text-center" value={safeCurrentPage} onChange={e => { const p = parseInt(e.target.value); if(p > 0 && p <= totalPages) setCurrentPage(p); }} /></TooltipTrigger><TooltipContent><p>{t('Nhập số trang')}</p></TooltipContent></Tooltip>
                                      / {totalPages}
                                    </div>
                                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8" onClick={()=>setCurrentPage(Math.min(totalPages, safeCurrentPage+1))} disabled={safeCurrentPage===totalPages}><ChevronRight className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent><p>{t('Trang sau')}</p></TooltipContent></Tooltip>
                                    <Tooltip><TooltipTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 p-0" onClick={()=>setCurrentPage(totalPages)} disabled={safeCurrentPage===totalPages}><ChevronsRight className="h-4 w-4"/></Button></TooltipTrigger><TooltipContent><p>{t('Trang cuối')}</p></TooltipContent></Tooltip>
                                </div>
              </div>
            </CardFooter>
          </Card>
        </div>

        <AdvancedFilterDialog 
            open={isAdvancedFilterOpen} 
            onOpenChange={setIsAdvancedFilterOpen} 
            filters={filters} 
            setFilters={setFilters} 
            t={t} 
            allRoles={allRoles} 
            allPositions={allPositions} 
            onSaveCloud={saveFiltersToCloud}
            onLoadCloud={loadFiltersFromCloud}
            onDeleteCloud={deleteFilterFromCloud}
            isSaving={isSavingFilters}
            presets={filterPresets}
        />
        <EmployeeEditDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} mode={dialogMode} formData={formData} setFormData={setFormData} onSave={handleSave} onUndo={() => setFormData(initialFormState)} isChanged={isChanged} t={t} allRoles={allRoles} allPositions={allPositions} />

        <Dialog open={isImportPreviewOpen} onOpenChange={setIsImportPreviewOpen}>
          <DialogContent className="sm:max-w-4xl"><DialogHeader><DialogTitle>Xem trước Import</DialogTitle></DialogHeader>
            <ScrollArea className="max-h-[60vh] border rounded-md"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead>Mã số</TableHead><TableHead>Họ và tên</TableHead><TableHead>Email</TableHead></TableRow></TableHeader><TableBody>{importingData.map((r, i) => (<TableRow key={i}><TableCell>{r['Mã số']}</TableCell><TableCell className="font-bold">{r['Họ và tên']}</TableCell><TableCell>{r['Email']}</TableCell></TableRow>))}</TableBody></Table></ScrollArea>
            <DialogFooter><Button variant="ghost" onClick={()=>setIsImportPreviewOpen(false)}>Hủy</Button><Button onClick={processImport} disabled={isProcessingImport}>{isProcessingImport ? <Cog className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Xác nhận</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel><Ban className="mr-2 h-4 w-4" />Hủy</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={async ()=>{ 
    if(selectedItem && firestore && authUser){ 
        await deleteDoc(doc(firestore, "employees", selectedItem.id)); 
        await logActivity(
            authUser.uid, 
            'delete', 
            'Nhân viên', 
            `Xóa nhân viên: ${selectedItem.name}`,
            { userEmail: authUser.email || '', previousData: selectedItem }
        );
        toast({title: t("Thành công")}); 
    } 
    setIsDeleteDialogOpen(false);
}}>Xóa</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </TooltipProvider>
    </ClientOnly>
  );
}
