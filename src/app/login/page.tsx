"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { useAuth, useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { logActivity } from "@/lib/activity-logger";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Terminal, Mail, Lock, Eye, EyeOff, LogIn } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Employee } from "@/lib/types";
import { useSystemParameters } from "@/providers/system-parameters-provider";

const defaultLoginImage = "https://images.unsplash.com/photo-1523240795612-9a054b0db644?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3NDE5ODJ8MHwxfHNlYXJjaHwyfHxzdHVkZW50cyUyMGNvbGxhYm9yYXRpbmd8ZW58MHx8fHwxNzIxOTU4OTg5fDA&ixlib=rb-4.0.3&q=80&w=1080";

const formSchema = z.object({
  email: z.string().email({ message: "Vui lòng nhập email hợp lệ." }),
  password: z.string().min(6, { message: "Mật khẩu phải có ít nhất 6 ký tự." }),
  rememberMe: z.boolean().default(false),
});

const passwordResetSchema = z.object({
  email: z.string().email({ message: "Vui lòng nhập email hợp lệ." }),
});

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const { params } = useSystemParameters();
  
  const [apiKeyError, setApiKeyError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      form.setValue('email', rememberedEmail);
      form.setValue('rememberMe', true);
    }
  }, [form]);

  const passwordResetForm = useForm<z.infer<typeof passwordResetSchema>>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      email: "",
    },
  });

  const onPasswordResetSubmit = async (values: z.infer<typeof passwordResetSchema>) => {
    if (!auth) {
      toast({ variant: "destructive", title: "Lỗi", description: "Dịch vụ xác thực chưa sẵn sàng." });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, values.email);
      toast({ title: "Đã gửi email khôi phục", description: "Vui lòng kiểm tra hộp thư của bạn để đặt lại mật khẩu." });
      setIsResetDialogOpen(false);
      passwordResetForm.reset();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Lỗi", description: "Không thể gửi email. Vui lòng thử lại sau." });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
      setApiKeyError(false);
      if (!auth || !firestore) {
          setApiKeyError(true);
          return;
      }

      const superAdminEmails = ['ngviphuc@gmail.com', 'nguyen.phuc@ntt.edu.vn', 'phucn@ntt.edu.vn'];
      const normalizedEmail = values.email.toLowerCase().trim();
      const isSuperAdmin = superAdminEmails.includes(normalizedEmail);

      try {
        // 1. Try to sign in first (this gives us authentication if they already have an account)
        try {
          const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
          
          // They are now authenticated. Let's verify they are in the employees list
          if (!isSuperAdmin) {
            const employeesRef = collection(firestore, "employees");
            const q = query(employeesRef, where("email", "==", normalizedEmail));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
              await auth.signOut();
              toast({ 
                  variant: "destructive", 
                  title: "Truy cập bị từ chối", 
                  description: "Email này không có trong danh sách nhân sự được cấp phép. Vui lòng liên hệ Quản trị viên." 
              });
              return;
            }
          }

          if (values.rememberMe) {
            localStorage.setItem('rememberedEmail', values.email);
          } else {
            localStorage.removeItem('rememberedEmail');
          }
          
          await logActivity(userCredential.user.uid, 'login', 'System', `Người dùng ${values.email} đăng nhập thành công.`, { userEmail: values.email });
          router.push('/dashboard');
          
        } catch (signInError: any) {
          // 2. If sign in fails, check if we should attempt auto-registration
          if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
            try {
              let employeeData: Employee | null = null;
              let employeeDocId: string | null = null;

              if (!isSuperAdmin) {
                // To query 'employees', we must be authenticated. Sign in anonymously temporarily.
                const { signInAnonymously } = await import("firebase/auth");
                await signInAnonymously(auth);

                const employeesRef = collection(firestore, "employees");
                const q = query(employeesRef, where("email", "==", normalizedEmail));
                const querySnapshot = await getDocs(q);
                
                if (querySnapshot.empty) {
                  await auth.signOut();
                  toast({ variant: "destructive", title: "Lỗi đăng nhập", description: "Email hoặc mật khẩu không chính xác." });
                  return;
                }
                employeeData = querySnapshot.docs[0].data() as Employee;
                employeeDocId = querySnapshot.docs[0].id;
              }

              // Try to create the user account (this replaces the anonymous session)
              const createCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
              const user = createCredential.user;
              
              if (employeeData) {
                // User exists in Firestore but not in Auth -> Initialize Auth linkage
                const newEmployeeDocRef = doc(firestore, "employees", user.uid);
                await setDoc(newEmployeeDocRef, {
                  ...employeeData,
                  id: user.uid,
                  updatedAt: new Date().toISOString()
                });
                
                if (employeeDocId !== user.uid) {
                  const batch = writeBatch(firestore);
                  batch.delete(doc(firestore, "employees", employeeDocId!));
                  await batch.commit();
                }
                
                toast({ title: "Kích hoạt tài khoản thành công", description: "Chào mừng bạn quay trở lại!" });
              } else if (isSuperAdmin) {
                // Super Admin not in employees -> Create a default entry for them
                const newEmployeeDocRef = doc(firestore, "employees", user.uid);
                const newAdminData: Employee = {
                  id: user.uid,
                  employeeId: `ADMIN-${Math.floor(1000 + Math.random() * 9000)}`,
                  email: normalizedEmail,
                  name: normalizedEmail.split('@')[0],
                  role: 'Hệ thống',
                  phone: '',
                  position: 'Quản trị viên hệ thống',
                  nickname: 'Admin',
                  birthDate: '',
                  avatarUrl: '',
                  address: '',
                  note: 'Tài khoản quản trị cấp cao',
                };
                await setDoc(newEmployeeDocRef, newAdminData);
                toast({ title: "Kích hoạt tài khoản Quản trị", description: "Chào mừng bạn!" });
              }
              
              await logActivity(user.uid, 'login', 'System', `Người dùng ${values.email} kích hoạt tài khoản thành công.`, { userEmail: values.email });
              
              if (values.rememberMe) localStorage.setItem('rememberedEmail', values.email);
              else localStorage.removeItem('rememberedEmail');
              
              router.push('/dashboard');
            } catch (createError: any) {
              if (createError.code === 'auth/email-already-in-use') {
                toast({ variant: "destructive", title: "Lỗi đăng nhập", description: "Email hoặc mật khẩu không chính xác." });
              } else if (createError.code === 'auth/weak-password') {
                toast({ variant: "destructive", title: "Mật khẩu yếu", description: "Mật khẩu phải có ít nhất 6 ký tự." });
              } else {
                toast({ variant: "destructive", title: "Lỗi", description: "Thông tin không chính xác hoặc lỗi hệ thống." });
              }
            }
          } else if (signInError.code === 'auth/wrong-password') {
            toast({ variant: "destructive", title: "Lỗi đăng nhập", description: "Email hoặc mật khẩu không chính xác." });
          } else if (signInError.code === 'auth/too-many-requests') {
            toast({ variant: "destructive", title: "Lỗi đăng nhập", description: "Tài khoản bị tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau." });
          } else {
            toast({ variant: "destructive", title: "Lỗi đăng nhập", description: "Đã xảy ra lỗi. Vui lòng thử lại sau." });
          }
        }
      } catch (err: any) {
        console.error("Login error:", err);
        toast({ variant: "destructive", title: "Lỗi hệ thống", description: "Không thể kiểm tra thông tin nhân sự. Vui lòng thử lại sau." });
      }
    };

  return (
    <div className="w-full lg:grid lg:min-h-[600px] lg:grid-cols-2 xl:min-h-[800px]">
      <div className="hidden lg:relative lg:flex items-end p-10">
        <div className="absolute inset-0">
            <Image
              src={params.loginImageUrl || defaultLoginImage}
              alt="Login Background"
              fill
              priority
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/70 to-transparent" />
        </div>
        <div className="relative z-10 text-white">
            <div className="space-y-2">
                <blockquote className="text-lg font-medium">&ldquo;{params.loginQuote || "Công nghệ chỉ là một công cụ. Về mặt khích lệ bọn trẻ làm việc cùng nhau và động viên chúng, giáo viên là người quan trọng nhất."}&rdquo;</blockquote>
                <footer className="text-sm font-medium">{params.loginQuoteAuthor || "Bill Gates"}</footer>
            </div>
        </div>
      </div>
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
            <div className="grid gap-2 text-center">
                 <div className="flex justify-center mb-4">
                    <img 
                        src={params.bannerUrl} 
                        alt="Logo" 
                        className="h-14 object-contain"
                    />
                 </div>
                <h1 className="text-3xl font-bold uppercase text-primary">Đăng nhập</h1>
                <p className="text-balance text-xs text-muted-foreground">
                    Cổng thông tin Kiểm tra nội bộ - Trường Đại học Nguyễn Tất Thành
                </p>
            </div>
           {apiKeyError && (
              <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Lỗi cấu hình Firebase!</AlertTitle>
                <AlertDescription>API Key không hợp lệ. Vui lòng kiểm tra lại cấu hình hệ thống.</AlertDescription>
              </Alert>
          )}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-500" />
                        <FormControl><Input placeholder="example@ntt.edu.vn" {...field} className="pl-10" /></FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center">
                        <FormLabel>Mật khẩu</FormLabel>
                         <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
                            <DialogTrigger asChild><Button variant="link" type="button" className="ml-auto inline-block text-sm underline h-auto p-0">Quên mật khẩu?</Button></DialogTrigger>
                            <DialogContent className="sm:max-w-[425px]">
                                <DialogHeader><DialogTitle>Quên mật khẩu</DialogTitle><DialogDescription>Nhập email của bạn để nhận liên kết đặt lại mật khẩu.</DialogDescription></DialogHeader>
                                <Form {...passwordResetForm}>
                                <form onSubmit={passwordResetForm.handleSubmit(onPasswordResetSubmit)} className="space-y-4 py-4">
                                    <FormField
                                    control={passwordResetForm.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem><FormLabel>Email đã đăng ký</FormLabel><FormControl><Input placeholder="example@ntt.edu.vn" {...field} /></FormControl><FormMessage /></FormItem>
                                    )}
                                    />
                                    <DialogFooter><Button type="submit" disabled={passwordResetForm.formState.isSubmitting}>{passwordResetForm.formState.isSubmitting ? "Đang gửi..." : "Gửi liên kết khôi phục"}</Button></DialogFooter>
                                </form>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    </div>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-orange-500" />
                        <FormControl><Input type={showPassword ? "text" : "password"} {...field} className="pl-10 pr-10"/></FormControl>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setShowPassword(!showPassword)} className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:bg-transparent hover:text-foreground">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center justify-between">
                 <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="text-sm font-normal">Lưu thông tin</FormLabel></FormItem>
                  )}
                />
                <Button type="submit" disabled={form.formState.isSubmitting} className="w-[140px]">{form.formState.isSubmitting ? "Đang xử lý..." : (<><LogIn className="mr-2 h-4 w-4" />Đăng nhập</>)}</Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
