
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
  ArrowDown, Filter, X, EllipsisVertical, Save, Undo2, Users, 
  UserCircle2, Ban, FileDown, FileUp, CheckCircle2, Eye, 
  ListFilter, CalendarDays, IdCard, User, Library, Map, 
  Heart, UserCog, Briefcase, Phone, Mail, CreditCard, 
  GraduationCap, StickyNote, MapPin, CloudUpload, CloudDownload, Check, History, ChevronDown
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
import { usePermissions } from "@/hooks/use-permissions";
import { collection, doc, setDoc, deleteDoc, writeBatch, getDoc } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format, isValid } from "date-fns";
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
import type { Student } from '@/lib/types';
import { DataTableEmptyState } from "@/components/data-table-empty-state";

type DialogMode = 'add' | 'edit' | 'copy' | 'view';
interface RenderStudent extends Student { renderId: string; }

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
                        sortState.direction === 'ascending' ? <ArrowUp className={cn("ml-1 h-3 w-3", isFiltered && "text-red-500")} /> : <ArrowDown className={cn("ml-1 h-3 w-3", isFiltered && "text-red-500")} />) : <ArrowUpDown className={cn("ml-1 h-3 w-3 opacity-30", isFiltered ? "text-red-500" : "group-hover:opacity-100")} />}

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

const StudentEditDialog = ({ open, onOpenChange, mode, formData, setFormData, onSave, onUndo, isChanged, t }: any) => (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-5xl">
            <DialogHeader>
                <DialogTitle className="text-xl">
                    {mode === 'view' ? t('Chi tiết') : mode === 'add' ? t('Thêm mới') : t('Chỉnh sửa')} {t('Sinh viên')}
                </DialogTitle>
                <VisuallyHidden><DialogDescription>Nhập thông tin sinh viên</DialogDescription></VisuallyHidden>
            </DialogHeader>
            <ScrollArea className="max-h-[75vh]">
                <div className="p-6">
                    <AvatarInput value={formData.avatarUrl || ''} onChange={(val) => setFormData((p:any) => ({...p, avatarUrl: val}))} name={formData.name} disabled={mode === 'view'} />
                    <Separator className="my-6" />
                    
                    <Accordion type="single" collapsible defaultValue="basic-info" className="w-full space-y-4">
                        <AccordionItem value="basic-info" className="border rounded-lg bg-card px-4">
                            <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex items-center gap-2 font-bold text-primary uppercase tracking-wider">
                                    <Users className="h-4 w-4" /> THÔNG TIN CƠ BẢN
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-muted/20 p-4 rounded-lg">
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground flex items-center gap-2"><IdCard className="h-4 w-4 text-blue-500" /> MSSV *</Label>
                                        {mode === 'view' ? <p className="font-bold">{formData.id}</p> : <Input className="h-8" value={formData.id || ''} onChange={e => setFormData((p:any) => ({...p, id: e.target.value}))} />}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground flex items-center gap-2"><User className="h-4 w-4 text-blue-500" /> {t('Họ và tên')} *</Label>
                                        {mode === 'view' ? <p className="font-bold">{formData.name}</p> : <Input className="h-8" value={formData.name || ''} onChange={e => setFormData((p:any) => ({...p, name: e.target.value}))} />}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground flex items-center gap-2"><Library className="h-4 w-4 text-blue-500" /> {t('Lớp')} *</Label>
                                        {mode === 'view' ? <p className="font-bold text-blue-600">{formData.class}</p> : <Input className="h-8" value={formData.class || ''} onChange={e => setFormData((p:any) => ({...p, class: e.target.value}))} />}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground flex items-center gap-2"><Users className="h-4 w-4 text-blue-500" /> {t('Giới tính')}</Label>
                                        {mode === 'view' ? <p className="font-bold">{formData.gender || 'Nam'}</p> : 
                                            <Select value={formData.gender || 'Nam'} onValueChange={v => setFormData((p:any) => ({...p, gender: v as any}))}>
                                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                                <SelectContent><SelectItem value="Nam">Nam</SelectItem><SelectItem value="Nữ">Nữ</SelectItem></SelectContent>
                                            </Select>
                                        }
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground flex items-center gap-2"><CalendarDays className="h-4 w-4 text-blue-500" /> {t('Ngày sinh')}</Label>
                                        {mode === 'view' ? <p className="font-bold">{formData.birthDate || '---'}</p> : 
                                            <DatePickerField 
                                                value={formData.birthDate || ''} 
                                                onChange={v => setFormData((p:any) => ({...p, birthDate: v}))}
                                                className="h-8"
                                            />
                                        }
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4 text-blue-500" /> {t('Nơi sinh')}</Label>
                                        {mode === 'view' ? <p className="font-bold">{formData.birthPlace || '---'}</p> : <Input className="h-8" value={formData.birthPlace || ''} onChange={e => setFormData((p:any) => ({...p, birthPlace: e.target.value}))} />}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground flex items-center gap-2"><Map className="h-4 w-4 text-blue-500" /> {t('Nguyên quán')}</Label>
                                        {mode === 'view' ? <p className="font-bold">{formData.hometown || '---'}</p> : <Input className="h-8" value={formData.hometown || ''} onChange={e => setFormData((p:any) => ({...p, hometown: e.target.value}))} />}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground flex items-center gap-2"><Heart className="h-4 w-4 text-blue-500" /> {t('Dân tộc')}</Label>
                                        {mode === 'view' ? <p className="font-bold">{formData.ethnicity || '---'}</p> : <Input className="h-8" value={formData.ethnicity || ''} onChange={e => setFormData((p:any) => ({...p, ethnicity: e.target.value}))} />}
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="family-info" className="border rounded-lg bg-card px-4">
                            <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex items-center gap-2 font-bold text-orange-600 uppercase tracking-wider">
                                    <UserCircle2 className="h-4 w-4" /> THÔNG TIN GIA ĐÌNH
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-muted/20 p-4 rounded-lg">
                                    <div className="space-y-1"><Label className="text-muted-foreground flex items-center gap-2"><UserCog className="h-4 w-4 text-orange-600" /> {t('Tên cha')}</Label>{mode === 'view' ? <p className="font-bold">{formData.fatherName || '---'}</p> : <Input className="h-8" value={formData.fatherName || ''} onChange={e => setFormData((p:any) => ({...p, fatherName: e.target.value}))} />}</div>
                                    <div className="space-y-1"><Label className="text-muted-foreground flex items-center gap-2"><Briefcase className="h-4 w-4 text-orange-600" /> {t('Nghề nghiệp cha')}</Label>{mode === 'view' ? <p className="font-bold">{formData.fatherOccupation || '---'}</p> : <Input className="h-8" value={formData.fatherOccupation || ''} onChange={e => setFormData((p:any) => ({...p, fatherOccupation: e.target.value}))} />}</div>
                                    <div className="space-y-1"><Label className="text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4 text-orange-600" /> {t('ĐT Phụ huynh')}</Label>{mode === 'view' ? <p className="font-bold">{formData.parentPhone || '---'}</p> : <Input className="h-8" value={formData.parentPhone || ''} onChange={e => setFormData((p:any) => ({...p, parentPhone: e.target.value}))} />}</div>
                                    <div className="space-y-1"><Label className="text-muted-foreground flex items-center gap-2"><UserCog className="h-4 w-4 text-orange-600" /> {t('Tên mẹ')}</Label>{mode === 'view' ? <p className="font-bold">{formData.motherName || '---'}</p> : <Input className="h-8" value={formData.motherName || ''} onChange={e => setFormData((p:any) => ({...p, motherName: e.target.value}))} />}</div>
                                    <div className="space-y-1"><Label className="text-muted-foreground flex items-center gap-2"><Briefcase className="h-4 w-4 text-orange-600" /> {t('Nghề nghiệp mẹ')}</Label>{mode === 'view' ? <p className="font-bold">{formData.motherOccupation || '---'}</p> : <Input className="h-8" value={formData.motherOccupation || ''} onChange={e => setFormData((p:any) => ({...p, motherOccupation: e.target.value}))} />}</div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="contact-info" className="border rounded-lg bg-card px-4">
                            <AccordionTrigger className="hover:no-underline py-3">
                                <div className="flex items-center gap-2 font-bold text-blue-600 uppercase tracking-wider">
                                    <Edit className="h-4 w-4" /> LIÊN LẠC & KHÁC
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-2 pb-4">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-muted/20 p-4 rounded-lg">
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground flex items-center gap-2"><Map className="h-4 w-4 text-green-500" /> {t('Khu vực')}</Label>
                                        {mode === 'view' ? <p className="font-bold">{formData.region || '---'}</p> : <Input className="h-8" value={formData.region || ''} onChange={e => setFormData((p:any) => ({...p, region: e.target.value}))} />}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground flex items-center gap-2"><Phone className="h-4 w-4 text-green-500" /> {t('Số điện thoại')}</Label>
                                        {mode === 'view' ? <p className="font-bold text-blue-600">{formData.phone || '---'}</p> : <Input className="h-8" value={formData.phone || ''} onChange={e => setFormData((p:any) => ({...p, phone: e.target.value}))} />}
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-muted-foreground flex items-center gap-2"><Mail className="h-4 w-4 text-green-500" /> Email</Label>
                                        {mode === 'view' ? <p className="font-bold">{formData.email || '---'}</p> : <Input className="h-8" value={formData.email || ''} onChange={e => setFormData((p:any) => ({...p, email: e.target.value}))} />}
                                    </div>
                                    <div className="md:col-span-3 space-y-1">
                                        <Label className="text-muted-foreground flex items-center gap-2"><MapPin className="h-4 w-4 text-green-500" /> {t('Địa chỉ')}</Label>
                                        {mode === 'view' ? <p className="font-bold">{formData.address || '---'}</p> : <Input className="h-8" value={formData.address || ''} onChange={e => setFormData((p:any) => ({...p, address: e.target.value}))} />}
                                    </div>
                                    <div className="space-y-1"><Label className="text-muted-foreground flex items-center gap-2"><CreditCard className="h-4 w-4 text-blue-600" /> {t('CCCD')}</Label>{mode === 'view' ? <p className="font-bold">{formData.citizenId || '---'}</p> : <Input className="h-8" value={formData.citizenId || ''} onChange={e => setFormData((p:any) => ({...p, citizenId: e.target.value}))} />}</div>
                                    <div className="space-y-1"><Label className="text-muted-foreground flex items-center gap-2"><GraduationCap className="h-4 w-4 text-blue-600" /> {t('Ngành')}</Label>{mode === 'view' ? <p className="font-bold">{formData.major || '---'}</p> : <Input className="h-8" value={formData.major || ''} onChange={e => setFormData((p:any) => ({...p, major: e.target.value}))} />}</div>
                                    <div className="space-y-1"><Label className="text-muted-foreground flex items-center gap-2"><StickyNote className="h-4 w-4 text-blue-600" /> {t('Ghi chú')}</Label>{mode === 'view' ? <p className="font-bold">{formData.note || '---'}</p> : <Input className="h-8" value={formData.note || ''} onChange={e => setFormData((p:any) => ({...p, note: e.target.value}))} />}</div>
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

const AdvancedFilterDialog = ({ open, onOpenChange, filters, setFilters, t, onSaveCloud, onLoadCloud, isSaving, presets, onDeleteCloud }: any) => {
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
                            <div className="space-y-2"><Label className="flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Họ và tên</Label><Input value={filters.name || ''} onChange={e => setFilters({...filters, name: e.target.value})} placeholder="Nhập tên..." /></div>
                            <div className="space-y-2"><Label className="flex items-center gap-2"><IdCard className="h-4 w-4 text-primary" /> MSSV</Label><Input value={filters.id || ''} onChange={e => setFilters({...filters, id: e.target.value})} placeholder="Nhập mã..." /></div>
                            <div className="space-y-2"><Label className="flex items-center gap-2"><Library className="h-4 w-4 text-primary" /> Lớp</Label><Input value={filters.class || ''} onChange={e => setFilters({...filters, class: e.target.value})} placeholder="Nhập lớp..." /></div>
                            <div className="space-y-2"><Label className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> {t('Ngày sinh')}</Label><DatePickerField value={filters.birthDate || ''} onChange={val => setFilters({...filters, birthDate: val || ''})} className="h-9" /></div>
                        </div>
                    </div>
                </ScrollArea>

                <DialogFooter className="p-4 border-t bg-muted/20 flex items-center justify-end gap-2">
                    <Button variant="ghost" onClick={() => setFilters({})} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                        <X className="mr-2 h-4 w-4" /> {t('Xóa tất cả')}
                    </Button>
                    <Button onClick={() => onOpenChange(false)} className="bg-primary text-primary-foreground shadow-sm">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> {t('Áp dụng bộ lọc')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default function StudentsPage() {
  const { t } = useLanguage();
  const firestore = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const studentsRef = useMemo(() => (firestore ? collection(firestore, 'students') : null), [firestore]);
  const { data: rawStudents, loading, error } = useCollection<Student>(studentsRef);
  // Note: we fetch students locally but we can also use useMasterData if we added them there.
  // Actually, I didn't add students to MasterDataProvider because it might be too large.
  // But let's keep it consistent if possible.
  // For now, I'll just add the import for future use.
  const { permissions } = usePermissions('/personnel/students');
  const data = useMemo(() => (rawStudents || []).map((item, idx) => ({ ...item, renderId: `${item.id}-${idx}` })) as RenderStudent[], [rawStudents]);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isAdvancedFilterOpen, setIsAdvancedFilterOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RenderStudent | null>(null);
  const [formData, setFormData] = useState<Partial<Student>>({});
  const [initialFormState, setInitialFormState] = useState<Partial<Student>>({});
  const [dialogMode, setDialogMode] = useState<DialogMode>('add');
  
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [importingData, setImportingData] = useState<any[]>([]);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const { user: authUser } = useUser();
  const [isSavingFilters, setIsSavingFilters] = useState(false);

  const [currentPage, setCurrentPage] = useLocalStorage('students_page_v27', 1);
  const [rowsPerPage, setRowsPerPage] = useLocalStorage('students_rows_v27', 10);
  const [columnVisibility, setColumnVisibility] = useLocalStorage<Record<string, boolean>>('students_colVis_v27', { avatarUrl: true, id: true, name: true, gender: true, class: true, phone: true, major: false, email: false, note: true });
  const [filters, setFilters] = useLocalStorage<any>('students_filters_v27', {});
  const [sortConfig, setSortConfig] = useLocalStorage<any[]>('students_sort_v27', []);
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useLocalStorage<string[]>('students_selected_ids_v27', []);

  // Cloud Filter Persistence
  const [filterPresets, setFilterPresets] = useState<any[]>([]);

  const { toast } = useToast();

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
            students_advanced_presets: updatedPresets,
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
            if (data.students_advanced_presets) {
                setFilterPresets(data.students_advanced_presets);
            } else if (data.students_advanced_filters) {
                setFilterPresets([{ name: "Bộ lọc cũ", filters: data.students_advanced_filters }]);
            }
        }
    } catch (error) {
        console.error("Error loading filters:", error);
    }
  }, [firestore, authUser, toast]);

  const deleteFilterFromCloud = async (presetName: string) => {
    if (!authUser?.uid || !firestore) return;
    try {
        const updatedPresets = filterPresets.filter(p => p.name !== presetName);
        await setDoc(doc(firestore, 'user_settings', authUser.uid), {
            students_advanced_presets: updatedPresets,
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
  const selectedSet = useMemo(() => new Set(selectedRowIds), [selectedRowIds]);

  const isChanged = useMemo(() => JSON.stringify(formData) !== JSON.stringify(initialFormState), [formData, initialFormState]);

  const filteredItems = useMemo(() => data.filter(item => Object.entries(filters).every(([k, v]) => String(item[k as keyof Student] || '').toLowerCase().includes(String(v).toLowerCase()))), [data, filters]);
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
    const data = item ? (mode === 'copy' ? { ...item, id: undefined } : { ...item }) : { gender: 'Nam', name: '' };
    setFormData(data); setInitialFormState(data); setIsEditDialogOpen(true);
  };

  const handleSave = async () => {
    if (!firestore || !authUser) return;
    const realId = (dialogMode === 'edit' || dialogMode === 'view') && selectedItem ? selectedItem.id : (formData.id || doc(collection(firestore, 'students')).id);
    const action = dialogMode === 'add' ? 'create' : 'update';
    
    await setDoc(doc(firestore, 'students', realId), { ...formData, id: realId }, { merge: true });
    
    // Log Activity
    await logActivity(
        authUser.uid, 
        action, 
        'Sinh viên', 
        `${action === 'create' ? 'Thêm mới' : 'Cập nhật'} sinh viên: ${formData.name} (${realId})`,
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
        const CHUNK_SIZE = 400;
        for (let i = 0; i < importingData.length; i += CHUNK_SIZE) {
            const chunk = importingData.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(firestore);
            
            chunk.forEach((row) => {
                const id = String(row['MSSV'] || '');
                if (!id) return;
                
                batch.set(doc(firestore, 'students', id), {
                    id,
                    name: String(row['Họ và tên'] || ''),
                    class: String(row['Lớp'] || ''),
                    email: String(row['Email'] || ''),
                    gender: String(row['Giới tính'] || 'Nam'),
                    phone: String(row['Điện thoại'] || ''),
                    note: String(row['Ghi chú'] || ''),
                    updatedAt: new Date().toISOString()
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
                'Sinh viên', 
                `Import thành công ${importingData.length} sinh viên từ Excel.`,
                { userEmail: authUser.email || '' }
            );
        }
        
        toast({ title: "Import thành công", description: `Đã nhập ${importingData.length} sinh viên.` });
    } catch (error) {
        console.error("Import error:", error);
        toast({ title: "Lỗi Import", variant: "destructive", description: "Vui lòng kiểm tra lại file Excel hoặc quyền truy cập." });
        setIsProcessingImport(false);
    }
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(sortedItems); const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students"); XLSX.writeFile(wb, `DS_SinhVien_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const columnDefs: Record<string, string> = { avatarUrl: 'Hình', id: 'MSSV', name: 'Họ và tên', gender: 'Giới tính', class: 'Lớp', birthDate: 'Ngày sinh', birthPlace: 'Nơi sinh', hometown: 'Quê quán', ethnicity: 'Dân tộc', religion: 'Tôn giáo', permanentAddress: 'Thường trú', temporaryAddress: 'Tạm trú', citizenId: 'CCCD', major: 'Ngành', fatherName: 'Tên cha', fatherOccupation: 'Nghề nghiệp cha', motherName: 'Tên mẹ', motherOccupation: 'Nghề nghiệp mẹ', parentPhone: 'ĐT Phụ huynh', phone: 'Điện thoại', email: 'Email', note: 'Ghi chú' };
  const columnIcons: Record<string, any> = {
      id: IdCard,
      name: User,
      gender: Users,
      class: Library,
      birthDate: CalendarDays,
      birthPlace: MapPin,
      hometown: Map,
      ethnicity: Heart,
      citizenId: CreditCard,
      major: GraduationCap,
      phone: Phone,
      email: Mail,
      note: StickyNote
  };
  const allColumns = Object.keys(columnDefs);
  const orderedColumns = allColumns.filter(k => columnVisibility[k]);

  return (
    <ClientOnly>
      <TooltipProvider>
        <PageHeader title={t("Bộ danh mục")} description={t("Quản lý sinh viên")} icon={Users} />
        <div className="p-4 md:p-6">
          <Card>
            <CardHeader className="py-3 border-b">
              <div className="flex justify-between items-center">
                <CardTitle className="text-xl flex items-center gap-2"><Users className="h-6 w-6 text-primary" />{t('Danh sách Sinh viên')}</CardTitle>
                <div className="flex items-center gap-2">
                  <input type="file" ref={fileInputRef} onChange={handleImportFile} className="hidden" accept=".xlsx,.xls" />
                  <Tooltip><TooltipTrigger asChild><Button onClick={() => setIsAdvancedFilterOpen(true)} variant="ghost" size="icon" className="text-orange-500"><ListFilter className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Bộ lọc nâng cao')}</p></TooltipContent></Tooltip>
                  
                  {permissions.import && (
                    <Tooltip><TooltipTrigger asChild><Button onClick={() => fileInputRef.current?.click()} variant="ghost" size="icon" className="text-blue-600"><FileUp className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Nhập file Excel')}</p></TooltipContent></Tooltip>
                  )}
                  
                  {permissions.export && (
                    <Tooltip><TooltipTrigger asChild><Button onClick={handleExport} variant="ghost" size="icon" className="text-green-600"><FileDown className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Xuất file Excel')}</p></TooltipContent></Tooltip>
                  )}
                  
                  {permissions.add && (
                    <Tooltip><TooltipTrigger asChild><Button onClick={() => openDialog('add')} variant="ghost" size="icon" className="text-primary"><PlusCircle className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{t('Thêm mới')}</p></TooltipContent></Tooltip>
                  )}
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
                            <ColumnHeader columnKey={k} title={columnDefs[k]} icon={columnIcons[k]} t={t} sortConfig={sortConfig} openPopover={openPopover} setOpenPopover={setOpenPopover} requestSort={(k:any,d:any)=>setSortConfig([{key:k,direction:d}])} clearSort={() => setSortConfig([])} filters={filters} handleFilterChange={(k:any,v:any)=>{setFilters((p:any)=>({...p,[k]:v})); setCurrentPage(1);}} />
                          )}
                        </TableHead>
                      ))}
                      <TableHead className="w-16 sticky right-0 z-20 bg-[#1877F2] shadow-[-2px_0_5px_rgba(0,0,0,0.1)] border-l border-blue-300 p-0 text-center">
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
                      <TableRow>
                          <TableCell colSpan={orderedColumns.length + 2} className="text-center h-40">
                              <div className="flex flex-col items-center justify-center gap-2">
                                  <Cog className="h-8 w-8 animate-spin text-primary opacity-50" />
                                  <p className="text-muted-foreground animate-pulse">{t('Đang tải dữ liệu...')}</p>
                              </div>
                          </TableCell>
                      </TableRow>
                    ) : error ? (
                      <TableRow>
                          <TableCell colSpan={orderedColumns.length + 2} className="text-center h-40">
                              <div className="flex flex-col items-center justify-center gap-2 text-destructive">
                                  <Ban className="h-8 w-8 opacity-50" />
                                  <p className="font-bold">{t('Lỗi truy cập dữ liệu')}</p>
                                  <p className="text-xs opacity-70">{error.message}</p>
                                  <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-2">
                                      <Undo2 className="mr-2 h-4 w-4" /> {t('Thử lại')}
                                  </Button>
                              </div>
                          </TableCell>
                      </TableRow>
                    ) : !permissions.view ? (
                      <TableRow>
                          <TableCell colSpan={orderedColumns.length + 2} className="text-center h-40">
                              <div className="flex flex-col items-center justify-center gap-2 text-orange-500">
                                  <Ban className="h-8 w-8 opacity-50" />
                                  <p className="font-bold">{t('Hạn chế quyền truy cập')}</p>
                                  <p className="text-sm opacity-70">{t('Bạn không có quyền xem dữ liệu trong danh mục này.')}</p>
                              </div>
                          </TableCell>
                      </TableRow>
                    ) : currentItems.length > 0 ? currentItems.map((item, idx) => {
                      const isSelected = selectedSet.has(item.renderId);
                      return (
                        <TableRow key={item.renderId} onClick={() => handleRowClick(item.renderId)} data-state={isSelected ? "selected" : ""} className={cn("cursor-pointer odd:bg-white even:bg-muted/20 hover:bg-yellow-300 transition-all", "data-[state=selected]:bg-red-800 data-[state=selected]:text-white")}>
                          <TableCell className="text-center border-r text-inherit align-middle py-3">{startIndex + idx + 1}</TableCell>
                          {orderedColumns.map(k => (
                            <TableCell key={k} className="border-r text-inherit align-middle py-3">
                              {k === 'avatarUrl' ? (item.avatarUrl ? <Avatar className="h-9 w-9 mx-auto"><AvatarImage src={item.avatarUrl}/><AvatarFallback>{item.name?.charAt(0)}</AvatarFallback></Avatar> : <Users className="h-9 w-9 text-muted-foreground mx-auto"/>) : 
                               k === 'birthDate' ? (item.birthDate ? (() => {
                                   try {
                                       const d = new Date(item.birthDate);
                                       return isValid(d) ? format(d, 'dd/MM/yyyy') : item.birthDate;
                                   } catch (e) { return item.birthDate; }
                               })() : '') :
                               String(item[k as keyof typeof item] || '')}
                            </TableCell>
                          ))}
                          <TableCell className="sticky right-0 z-20 bg-inherit shadow-[-2px_0_5px_rgba(0,0,0,0.05)] border-l text-center py-3 text-inherit align-middle">
                            <div onClick={e => e.stopPropagation()}>
                              <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="text-primary"><EllipsisVertical className="h-5 w-5"/></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onSelect={()=>openDialog('view', item)}><Eye className="mr-2 h-4 w-4"/>Chi tiết</DropdownMenuItem>
                                  
                                  {permissions.edit && (
                                    <>
                                      <DropdownMenuItem onSelect={()=>openDialog('edit', item)}><Edit className="mr-2 h-4 w-4"/>Sửa</DropdownMenuItem>
                                      <DropdownMenuItem onSelect={()=>openDialog('copy', item)}><Copy className="mr-2 h-4 w-4"/>Sao chép</DropdownMenuItem>
                                    </>
                                  )}
                                  
                                  {permissions.delete && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={()=>{ setSelectedItem(item); setIsDeleteDialogOpen(true); }}>
                                        <Trash2 className="mr-2 h-4 w-4"/>Xóa
                                      </DropdownMenuItem>
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
                                                icon={Users}
                                                title={t('Không tìm thấy sinh viên')}
                                                filters={filters}
                                                onClearFilters={() => setFilters({})}
                                            />
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
            onSaveCloud={saveFiltersToCloud}
            onLoadCloud={loadFiltersFromCloud}
            onDeleteCloud={deleteFilterFromCloud}
            isSaving={isSavingFilters}
            presets={filterPresets}
        />
        <StudentEditDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} mode={dialogMode} formData={formData} setFormData={setFormData} onSave={handleSave} onUndo={() => setFormData(initialFormState)} isChanged={isChanged} t={t} />

        <Dialog open={isImportPreviewOpen} onOpenChange={setIsImportPreviewOpen}>
          <DialogContent className="sm:max-w-4xl"><DialogHeader><DialogTitle>Xem trước Import</DialogTitle></DialogHeader>
            <ScrollArea className="max-h-[60vh] border rounded-md"><Table><TableHeader><TableRow className="bg-muted/50"><TableHead>MSSV</TableHead><TableHead>Họ và tên</TableHead><TableHead>Lớp</TableHead></TableRow></TableHeader><TableBody>{importingData.map((r, i) => (<TableRow key={i}><TableCell>{r['MSSV']}</TableCell><TableCell className="font-bold">{r['Họ và tên']}</TableCell><TableCell>{r['Lớp']}</TableCell></TableRow>))}</TableBody></Table></ScrollArea>
            <DialogFooter><Button variant="ghost" onClick={()=>setIsImportPreviewOpen(false)}>Hủy</Button><Button onClick={processImport} disabled={isProcessingImport}>{isProcessingImport ? <Cog className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Xác nhận</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Xác nhận xóa?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel><Ban className="mr-2 h-4 w-4" />Hủy</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={async ()=>{ 
    if(selectedItem && firestore && authUser){ 
        await deleteDoc(doc(firestore, "students", selectedItem.id)); 
        await logActivity(
            authUser.uid, 
            'delete', 
            'Sinh viên', 
            `Xóa sinh viên: ${selectedItem.name} (${selectedItem.id})`,
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
