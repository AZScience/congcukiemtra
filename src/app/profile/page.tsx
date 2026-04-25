'use client';

import React, { useState, useMemo, useEffect } from 'react';
import PageHeader from "@/components/page-header";
import { User, Mail, Phone, MapPin, Briefcase, Camera, Save, Key, ShieldCheck, Loader2, Lock } from "lucide-react";
import { ClientOnly } from "@/components/client-only";
import { useLanguage } from "@/hooks/use-language";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUser, useFirestore, useDoc, useAuth } from "@/firebase";
import { doc, setDoc } from "firebase/firestore";
import { 
    EmailAuthProvider, 
    reauthenticateWithCredential, 
    updatePassword 
} from "firebase/auth";
import { useMasterData } from "@/providers/master-data-provider";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Employee } from '@/lib/types';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogFooter,
    DialogTrigger
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { DatePickerField } from "@/components/ui/date-picker-field";

export default function ProfilePage() {
    const { t } = useLanguage();
    const { user: authUser } = useUser();
    const auth = useAuth();
    const { employees, roles, positions, loading: masterLoading } = useMasterData();
    const firestore = useFirestore();

    const [isAvatarDialogOpen, setIsAvatarDialogOpen] = useState(false);

    // Try to find in master data first (cached)
    const masterEmployee = useMemo(() => {
        return employees.find(e => e.id === authUser?.uid || e.email === authUser?.email);
    }, [employees, authUser]);

    // Fallback: Fetch directly if master data doesn't have it (e.g. permission restricted to self)
    const selfDocRef = useMemo(() => (firestore && authUser ? doc(firestore, 'employees', authUser.uid) : null), [firestore, authUser]);
    const { data: directEmployee, loading: directLoading } = useDoc<Employee>(selfDocRef);

    const employee = masterEmployee || directEmployee;
    const loading = masterLoading && directLoading;

    const [form, setForm] = useState({
        nickname: '',
        phone: '',
        address: '',
        birthDate: '',
        avatarUrl: '',
    });

    const [passwords, setPasswords] = useState({
        old: '',
        new: '',
        confirm: ''
    });

    const [isSaving, setIsSaving] = useState(false);
    const [isChangingPass, setIsChangingPass] = useState(false);

    // Update form when employee data arrives
    useEffect(() => {
        if (employee) {
            setForm({
                nickname: employee.nickname || '',
                phone: employee.phone || '',
                address: employee.address || '',
                birthDate: employee.birthDate || '',
                avatarUrl: employee.avatarUrl || '',
            });
        }
    }, [employee]);

    const handleSave = async () => {
        if (!firestore || !employee) return;
        setIsSaving(true);
        try {
            await setDoc(doc(firestore, 'employees', employee.id), form, { merge: true });
            toast({ title: t('Đã cập nhật hồ sơ thành công') });
            setIsAvatarDialogOpen(false);
        } catch (e) {
            toast({ variant: 'destructive', title: t('Lỗi khi cập nhật hồ sơ') });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth || !authUser || !authUser.email) return;
        
        if (!passwords.old || !passwords.new || !passwords.confirm) {
            toast({ variant: 'destructive', title: t('Vui lòng điền đầy đủ các thông tin mật khẩu') });
            return;
        }

        if (passwords.new !== passwords.confirm) {
            toast({ variant: 'destructive', title: t('Mật khẩu xác nhận không khớp') });
            return;
        }

        setIsChangingPass(true);
        try {
            const credential = EmailAuthProvider.credential(authUser.email, passwords.old);
            await reauthenticateWithCredential(authUser, credential);
            await updatePassword(authUser, passwords.new);
            
            setPasswords({ old: '', new: '', confirm: '' });
            toast({ title: t('Đã đổi mật khẩu thành công') });
        } catch (e: any) {
            console.error(e);
            let msg = t('Lỗi khi đổi mật khẩu');
            if (e.code === 'auth/wrong-password') msg = t('Mật khẩu cũ không chính xác');
            if (e.code === 'auth/requires-recent-login') msg = t('Vui lòng đăng nhập lại để thực hiện thao tác này');
            toast({ variant: 'destructive', title: msg });
        } finally {
            setIsChangingPass(false);
        }
    };

    return (
        <ClientOnly>
            {loading && !employee ? (
                <div className="flex flex-col items-center justify-center p-12 space-y-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">{t('Đang thiết lập hồ sơ...')}</p>
                </div>
            ) : !employee ? (
                <div className="p-12 text-center space-y-4">
                    <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                        <User className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-bold">{t('Không tìm thấy thông tin hồ sơ')}</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                        {t('Tài khoản của bạn chưa được liên kết với hồ sơ nhân viên. Vui lòng liên hệ quản trị viên.')}
                    </p>
                </div>
            ) : (
                <>
                    <PageHeader 
                        title={t('Hồ sơ nhân viên')}
                        description={t('Quản lý thông tin định danh và bảo mật tài khoản.')}
                        icon={User}
                    />
                    <div className="p-4 md:p-6 max-w-6xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                            {/* ... existing content ... */}

                    {/* Sidebar section */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="shadow-sm border-t-4 border-t-primary overflow-hidden">
                            <CardContent className="pt-8 flex flex-col items-center">
                                <Dialog open={isAvatarDialogOpen} onOpenChange={setIsAvatarDialogOpen}>
                                    <DialogTrigger asChild>
                                        <div className="relative group cursor-pointer mb-6 transition-transform hover:scale-105">
                                            <Avatar className="h-32 w-32 border-4 border-background shadow-2xl">
                                                <AvatarImage src={form.avatarUrl} />
                                                <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                                                    {employee.name.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                <Camera className="text-white h-8 w-8" />
                                            </div>
                                        </div>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>{t('Cập nhật Ảnh đại diện')}</DialogTitle>
                                        </DialogHeader>
                                        <div className="py-4 space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold">{t('Đường dẫn ảnh (URL)')}</label>
                                                <Input 
                                                    value={form.avatarUrl} 
                                                    onChange={(e) => setForm({...form, avatarUrl: e.target.value})}
                                                    placeholder="https://example.com/photo.jpg"
                                                />
                                                <p className="text-[10px] text-muted-foreground">
                                                    {t('* Hiện tại hệ thống hỗ trợ cập nhật ảnh qua đường dẫn trực tiếp.')}
                                                </p>
                                            </div>
                                            <div className="flex justify-center p-4 bg-muted/30 rounded-lg">
                                                <Avatar className="h-24 w-24">
                                                    <AvatarImage src={form.avatarUrl} />
                                                    <AvatarFallback>{employee.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="ghost" onClick={() => setIsAvatarDialogOpen(false)}>{t('Hủy')}</Button>
                                            <Button onClick={handleSave} disabled={isSaving}>{t('Cập nhật')}</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                <h2 className="text-xl font-bold text-center px-2" suppressHydrationWarning>{employee.name}</h2>
                                <p className="text-sm text-muted-foreground mb-4" suppressHydrationWarning>
                                    {positions.find(p => p.id === employee.position)?.name || 
                                     (employee.position && employee.position.length < 15 ? employee.position : t('Thành viên'))}
                                </p>
                                <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase tracking-widest mb-6" suppressHydrationWarning>
                                    {roles.find(r => r.id === employee.role)?.name || 
                                     (employee.role && employee.role.length < 15 ? employee.role : t('Nhân viên'))}
                                </span>
                                
                                <div className="w-full space-y-4 pt-6 border-t px-2" suppressHydrationWarning>
                                    <InfoRow icon={Mail} label={t('Email định danh')} value={employee.email} />
                                    <InfoRow icon={Phone} label={t('Số điện thoại')} value={employee.phone} />
                                    <InfoRow icon={ShieldCheck} label={t('Mã nhân viên')} value={employee.employeeId} />
                                </div>


                            </CardContent>
                        </Card>
                    </div>

                    {/* Main section */}
                    <div className="lg:col-span-3">
                        <Card className="shadow-sm h-full">
                            <Tabs defaultValue="personal" className="w-full h-full flex flex-col">
                                <CardHeader className="pb-0 border-b shrink-0">
                                    <TabsList className="bg-transparent h-auto p-0 gap-8 justify-start">
                                        <TabsTrigger value="personal" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-4 px-2 font-bold uppercase text-[11px] tracking-wider transition-all">
                                            {t('Thông tin cá nhân')}
                                        </TabsTrigger>
                                        <TabsTrigger value="security" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent pb-4 px-2 font-bold uppercase text-[11px] tracking-wider transition-all">
                                            {t('Bảo mật tài khoản')}
                                        </TabsTrigger>
                                    </TabsList>
                                </CardHeader>
                                <CardContent className="pt-8 flex-1">
                                    <TabsContent value="personal" className="space-y-8 mt-0 focus-visible:outline-none focus-visible:ring-0">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold flex items-center gap-2">
                                                    {t('Họ và tên')} <span className="text-red-500">*</span>
                                                </label>
                                                <Input value={employee.name} disabled className="bg-muted/50 cursor-not-allowed font-medium" />
                                                <p className="text-[10px] text-muted-foreground">{t('Liên hệ nhân sự nếu cần đổi tên định danh.')}</p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold">{t('Biệt danh / Tên gọi khác')}</label>
                                                <Input 
                                                    value={form.nickname} 
                                                    onChange={(e) => setForm({...form, nickname: e.target.value})}
                                                    placeholder={t('Ví dụ: Phúc Nguyễn')}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold">{t('Số điện thoại liên lạc')}</label>
                                                <Input 
                                                    value={form.phone} 
                                                    onChange={(e) => setForm({...form, phone: e.target.value})}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-semibold">{t('Ngày sinh')}</label>
                                                <DatePickerField 
                                                    value={form.birthDate} 
                                                    onChange={(val) => setForm({...form, birthDate: val})}
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-semibold">{t('Địa chỉ thường trú')}</label>
                                            <Input 
                                                value={form.address} 
                                                onChange={(e) => setForm({...form, address: e.target.value})}
                                                placeholder={t('Nhập địa chỉ nhà...')}
                                            />
                                        </div>
                                        <div className="flex justify-end pt-6 border-t font-bold">
                                            <Button className="gap-2 px-8 shadow-lg shadow-primary/20" onClick={handleSave} disabled={isSaving}>
                                                <Save className="h-4 w-4" />
                                                {isSaving ? t('Đang xử lý...') : t('Cập nhật hồ sơ')}
                                            </Button>
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="security" className="space-y-8 mt-0 focus-visible:outline-none focus-visible:ring-0">
                                        <div className="max-w-md mx-auto space-y-6">
                                            <div className="text-center space-y-2 mb-8">
                                                <div className="h-12 w-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                                                    <Lock className="h-6 w-6" />
                                                </div>
                                                <h3 className="font-bold text-lg">{t('Đổi mật khẩu truy cập')}</h3>
                                                <p className="text-xs text-muted-foreground">{t('Để đảm bảo an toàn, vui lòng cập nhật mật khẩu định kỳ.')}</p>
                                            </div>

                                            <form onSubmit={handlePasswordChange} className="space-y-5">
                                                <div className="space-y-2">
                                                    <label className="text-sm font-semibold">{t('Mật khẩu hiện tại')}</label>
                                                    <Input 
                                                        type="password"
                                                        value={passwords.old}
                                                        onChange={(e) => setPasswords({...passwords, old: e.target.value})}
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-semibold">{t('Mật khẩu mới')}</label>
                                                    <Input 
                                                        type="password"
                                                        value={passwords.new}
                                                        onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-sm font-semibold">{t('Xác nhận mật khẩu mới')}</label>
                                                    <Input 
                                                        type="password"
                                                        value={passwords.confirm}
                                                        onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                                                        placeholder="••••••••"
                                                    />
                                                </div>
                                                <Button 
                                                    type="submit" 
                                                    className="w-full gap-2 mt-4 font-bold" 
                                                    disabled={isChangingPass}
                                                >
                                                    {isChangingPass ? (
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Key className="h-4 w-4" />
                                                    )}
                                                    {t('Xác nhận thay đổi')}
                                                </Button>
                                            </form>
                                        </div>
                                    </TabsContent>
                                </CardContent>
                            </Tabs>
                        </Card>
                        </div>
                    </div>
                </div>
            </>
        )}
    </ClientOnly>
    );
}



function InfoRow({ icon: Icon, label, value }: any) {
    return (
        <div className="flex items-center gap-4 group">
            <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">{label}</p>
                <p className="text-sm font-semibold truncate text-foreground/80">{value || '---'}</p>
            </div>
        </div>
    );
}
