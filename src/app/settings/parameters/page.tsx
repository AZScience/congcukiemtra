
"use client";

import React, { useState, useEffect } from "react";
import PageHeader from "@/components/page-header";
import { SlidersHorizontal, Save, Database, Image as LucideImage, Key, Mail, Globe, Undo2, Send, Loader2, Sparkles, CheckCircle, AlertTriangle, CloudUpload, X, FileCheck } from "lucide-react";
import { ClientOnly } from "@/components/client-only";
import { sendEmailNotification, verifySMTPConnection } from "@/ai/flows/email-service";
import { verifyAIConnection } from "@/ai/flows/verify-ai";
import { verifyGoogleSheetConnection, verifyGoogleDriveConnection } from "@/ai/flows/verify-google";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSystemParameters } from "@/providers/system-parameters-provider";

export default function SystemParametersPage() {
  const { toast } = useToast();
  const { params, updateParams, loading: isGlobalLoading } = useSystemParameters();
  
  const [localParams, setLocalParams] = useState(params);

  useEffect(() => {
    setLocalParams(params);
  }, [params]);

  const isChanged = JSON.stringify(localParams) !== JSON.stringify(params);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // 1MB limit for Base64 storage
      toast({
        variant: "destructive",
        title: "File quá lớn",
        description: "Vui lòng chọn ảnh dưới 1MB để đảm bảo hiệu suất."
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLocalParams({ ...localParams, bannerUrl: base64 });
      toast({ title: "Đã tải ảnh lên", description: "Nhấn 'Lưu' để ghi nhớ thay đổi." });
    };
    reader.readAsDataURL(file);
  };

  const handleLoginImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit for login background
      toast({
        variant: "destructive",
        title: "File quá lớn",
        description: "Vui lòng chọn ảnh dưới 2MB để đảm bảo hiệu suất tải trang."
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLocalParams({ ...localParams, loginImageUrl: base64 });
      toast({ title: "Đã tải ảnh nền mới", description: "Nhấn 'Lưu' để áp dụng cho trang Đăng nhập." });
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
        await updateParams(localParams);
        toast({
            title: "Thành công",
            description: "Đã cập nhật tham số hệ thống lên đám mây."
        });
    } catch (err: any) {
        toast({
            title: "Lỗi lưu trữ",
            description: err.message || "Không thể đồng bộ lên Cloud.",
            variant: "destructive"
        });
    }
  };

  const handleUndo = () => {
    setLocalParams(params);
    toast({ title: "Đã hoàn tác thay đổi" });
  };

  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const handleTestEmail = async () => {
    if (!localParams.smtpHost || !localParams.smtpUser || !localParams.smtpPass) {
        toast({ variant: "destructive", title: "Thiếu thông tin", description: "Vui lòng nhập đầy đủ Host, User và Pass." });
        return;
    }
    setIsTestingEmail(true);
    try {
        // First verify connection
        const verify = await verifySMTPConnection({
            host: localParams.smtpHost,
            port: localParams.smtpPort,
            user: localParams.smtpUser,
            pass: localParams.smtpPass
        });

        if (!verify.success) {
            toast({ variant: "destructive", title: "Lỗi kết nối", description: verify.message });
            setIsTestingEmail(false);
            return;
        }

        // Then try sending a real test email
        const res = await sendEmailNotification(
            [localParams.smtpUser],
            "Kiểm tra kết nối Email",
            "Đây là tin nhắn kiểm tra từ Hệ thống Kiểm tra nội bộ. Nếu bạn nhận được email này, cấu hình SMTP của bạn đã chính xác.",
            [],
            {
                host: localParams.smtpHost,
                port: localParams.smtpPort,
                user: localParams.smtpUser,
                pass: localParams.smtpPass,
                fromName: localParams.smtpFromName
            }
        );
        if (res.success) {
            toast({ title: "Thành công", description: "Kết nối SMTP hoạt động tốt. Vui lòng kiểm tra hộp thư của bạn." });
        } else {
            toast({ variant: "destructive", title: "Lỗi kết nối", description: res.message });
        }
    } catch (e: any) {
        toast({ variant: "destructive", title: "Lỗi hệ thống", description: e.message });
    } finally {
        setIsTestingEmail(false);
    }
  };

  const [isVerifyingAI, setIsVerifyingAI] = useState(false);

  const handleVerifyAI = async () => {
    if (!localParams.aiApiKey) {
      toast({ variant: "destructive", title: "Lỗi", description: "Vui lòng nhập API Key trước khi kiểm tra." });
      return;
    }
    setIsVerifyingAI(true);
    try {
      const result = await verifyAIConnection(localParams.aiApiKey, localParams.aiModel);
      if (result.success) {
        toast({ title: "Thành công", description: result.message });
      } else {
        toast({ variant: "destructive", title: "Thất bại", description: result.message });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Lỗi hệ thống", description: e.message });
    } finally {
      setIsVerifyingAI(false);
    }
  };

  const [isVerifyingGoogle, setIsVerifyingGoogle] = useState(false);
  const handleVerifyGoogle = async () => {
    setIsVerifyingGoogle(true);
    try {
      const res = await verifyGoogleSheetConnection(
        localParams.googleSheetId,
        localParams.googleServiceAccountEmail,
        localParams.googlePrivateKey,
        localParams.faqSheetTabName
      );
      if (res.success) toast({ title: "Kết nối thành công", description: res.message });
      else toast({ variant: "destructive", title: "Thất bại", description: res.message });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Lỗi", description: e.message });
    } finally {
      setIsVerifyingGoogle(false);
    }
  };

  const [isVerifyingEvidence, setIsVerifyingEvidence] = useState(false);
  const handleVerifyEvidence = async () => {
    setIsVerifyingEvidence(true);
    try {
      // 1. Check Sheet
      const sheetRes = await verifyGoogleSheetConnection(
        localParams.feedbackSheetId || localParams.googleSheetId,
        localParams.evidenceServiceAccountEmail || localParams.googleServiceAccountEmail,
        localParams.evidencePrivateKey || localParams.googlePrivateKey,
        localParams.feedbackTabName
      );
      
      if (!sheetRes.success) {
        toast({ variant: "destructive", title: "Lỗi Google Sheet", description: sheetRes.message });
        setIsVerifyingEvidence(false);
        return;
      }

      // 2. Check Drive
      const driveRes = await verifyGoogleDriveConnection(
        localParams.googleDriveFolderId,
        localParams.evidenceServiceAccountEmail || localParams.googleServiceAccountEmail,
        localParams.evidencePrivateKey || localParams.googlePrivateKey
      );

      if (driveRes.success) {
        toast({ title: "Tất cả kết nối tốt!", description: `${sheetRes.message} và ${driveRes.message}` });
      } else {
        toast({ variant: "destructive", title: "Lỗi Google Drive", description: driveRes.message });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Lỗi", description: e.message });
    } finally {
      setIsVerifyingEvidence(false);
    }
  };

  return (
    <ClientOnly>
      <PageHeader 
        title="Tham số hệ thống" 
        description="Cấu hình các thông số vận hành và giao diện của ứng dụng." 
        icon={SlidersHorizontal} 
      />
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <Tabs defaultValue="interface" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
            <TabsTrigger value="interface" className="flex items-center gap-2">
              <LucideImage className="h-4 w-4" /> Giao diện
            </TabsTrigger>
            <TabsTrigger value="integration" className="flex items-center gap-2">
              <Database className="h-4 w-4" /> Tích hợp
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> Email
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-2">
              <Key className="h-4 w-4 text-purple-500" /> AI
            </TabsTrigger>
            <TabsTrigger value="evidence" className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-amber-500" /> Minh chứng
            </TabsTrigger>
          </TabsList>

          <TabsContent value="interface">
            <Card>
              <CardHeader>
                <CardTitle>Cấu hình Giao diện</CardTitle>
                <CardDescription>Tùy chỉnh logo và hiển thị của ứng dụng.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label className="flex items-center gap-2"><LucideImage className="h-4 w-4 text-rose-500" /> Logo / Banner ứng dụng</Label>
                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    <div className="flex-1 w-full space-y-2">
                        <Input 
                            value={localParams.bannerUrl || ""} 
                            onChange={e => setLocalParams({...localParams, bannerUrl: e.target.value})}
                            placeholder="Dán URL ảnh hoặc tải lên bên phải..."
                            className="h-9 text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground italic">* Nên sử dụng ảnh định dạng PNG có nền trong suốt.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-9 border-dashed"
                            onClick={() => document.getElementById('logo-upload')?.click()}
                        >
                            <CloudUpload className="h-4 w-4 mr-2" /> Tải ảnh lên
                        </Button>
                        <input 
                            id="logo-upload" 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleLogoUpload} 
                        />
                        {localParams.bannerUrl && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                                onClick={() => setLocalParams({...localParams, bannerUrl: ""})}
                            >
                                <X className="h-4 w-4 mr-2" /> Xóa
                            </Button>
                        )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div className="space-y-2">
                    <Label className="text-xs">Chiều cao Banner (px)</Label>
                    <Input 
                      type="number"
                      value={localParams.bannerHeight || ""} 
                      onChange={e => setLocalParams({...localParams, bannerHeight: parseInt(e.target.value) || 0})}
                      className="h-9"
                    />
                  </div>
                  <div className="border rounded-md p-2 bg-muted/20 h-20 flex flex-col justify-center">
                    <Label className="text-[10px] text-muted-foreground mb-1 block">Xem trước hiển thị:</Label>
                    <div className="flex items-center justify-center border bg-card rounded p-1 flex-1 overflow-hidden">
                      {localParams.bannerUrl && localParams.bannerUrl.trim() !== "" ? (
                        <img 
                          src={localParams.bannerUrl} 
                          alt="Preview" 
                          style={{ height: `${localParams.bannerHeight}px` }} 
                          className="object-contain max-w-full"
                        />
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">Chưa có logo</span>
                      )}
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />
                
                <div className="space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                    <LucideImage className="h-4 w-4" /> Trang Đăng nhập
                  </h3>
                  
                  <div className="space-y-3">
                    <Label className="text-xs">Hình nền trang Đăng nhập</Label>
                    <div className="flex flex-col md:flex-row gap-4 items-start">
                      <div className="flex-1 w-full space-y-2">
                        <Input 
                          value={localParams.loginImageUrl || ""} 
                          onChange={e => setLocalParams({...localParams, loginImageUrl: e.target.value})}
                          placeholder="Dán URL ảnh nền đăng nhập hoặc tải lên..."
                          className="h-9 text-sm"
                        />
                        <p className="text-[10px] text-muted-foreground italic">* Ảnh này sẽ hiển thị ở nửa trái màn hình trang Đăng nhập.</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-9 border-dashed"
                          onClick={() => document.getElementById('login-image-upload')?.click()}
                        >
                          <CloudUpload className="h-4 w-4 mr-2" /> Tải ảnh lên
                        </Button>
                        <input 
                          id="login-image-upload" 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={handleLoginImageUpload} 
                        />
                        {localParams.loginImageUrl && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setLocalParams({...localParams, loginImageUrl: ""})}
                          >
                            <X className="h-4 w-4 mr-2" /> Xóa
                          </Button>
                        )}
                      </div>
                      <div className="w-full md:w-32 aspect-video border rounded overflow-hidden bg-muted shrink-0 shadow-inner">
                        {localParams.loginImageUrl ? (
                          <img src={localParams.loginImageUrl} alt="Login Background" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground italic">Trống</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Câu trích dẫn (Quote)</Label>
                      <textarea 
                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={localParams.loginQuote || ""} 
                        onChange={e => setLocalParams({...localParams, loginQuote: e.target.value})}
                        placeholder="Nhập câu trích dẫn..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Tác giả</Label>
                      <Input 
                        value={localParams.loginQuoteAuthor || ""} 
                        onChange={e => setLocalParams({...localParams, loginQuoteAuthor: e.target.value})}
                        placeholder="Tên tác giả..."
                      />
                      <div className="mt-4 p-3 border rounded-lg bg-zinc-900 text-white text-[10px] space-y-1">
                        <p className="italic">&ldquo;{localParams.loginQuote || "..."}&rdquo;</p>
                        <p className="text-right font-bold">- {localParams.loginQuoteAuthor || "..."}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-4" />

                <div className="space-y-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 text-primary">
                    <Mail className="h-4 w-4" /> Thông tin hỗ trợ & Liên hệ
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs">Email quản trị</Label>
                      <Input 
                        value={localParams.adminEmail || ""} 
                        onChange={e => setLocalParams({...localParams, adminEmail: e.target.value})}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Số điện thoại</Label>
                      <Input 
                        value={localParams.supportPhone || ""} 
                        onChange={e => setLocalParams({...localParams, supportPhone: e.target.value})}
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Website</Label>
                    <Input 
                      value={localParams.website || ""} 
                      onChange={e => setLocalParams({...localParams, website: e.target.value})}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integration">
            <Card>
              <CardHeader>
                <CardTitle>Tích hợp Google Sheets (AI Assistant)</CardTitle>
                <CardDescription>Cấu hình kết nối để Trợ lý AI có thể đọc dữ liệu nội bộ.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Google Sheet ID</Label>
                  <Input 
                    value={localParams.googleSheetId || ""} 
                    onChange={e => setLocalParams({...localParams, googleSheetId: e.target.value})}
                    placeholder="1a2b3c4d5e6f7g8h9i0j..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tên Tab Hỏi đáp (FAQ)</Label>
                  <Input 
                    value={localParams.faqSheetTabName || ""} 
                    onChange={e => setLocalParams({...localParams, faqSheetTabName: e.target.value})}
                    placeholder="Hỏi đáp"
                  />
                </div>

                <Separator />
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Key className="h-4 w-4" /> Service Account Email
                  </Label>
                  <Input 
                    value={localParams.googleServiceAccountEmail || ""} 
                    onChange={e => setLocalParams({...localParams, googleServiceAccountEmail: e.target.value})}
                    placeholder="example@project-id.iam.gserviceaccount.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Private Key</Label>
                  <textarea 
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono text-[10px]"
                    value={localParams.googlePrivateKey || ""} 
                    onChange={e => setLocalParams({...localParams, googlePrivateKey: e.target.value})}
                    placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-600 hover:text-white transition-colors"
                    onClick={handleVerifyGoogle}
                    disabled={isVerifyingGoogle}
                  >
                    {isVerifyingGoogle ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                    Kiểm tra kết nối Google Sheet
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>


          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>Cấu hình SMTP Email</CardTitle>
                <CardDescription>Cài đặt để hệ thống có thể gửi thông báo qua Email khi có tin nhắn mới.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input 
                      value={localParams.smtpHost || ""} 
                      onChange={e => setLocalParams({...localParams, smtpHost: e.target.value})}
                      placeholder="smtp.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Port</Label>
                    <Input 
                      value={localParams.smtpPort || ""} 
                      onChange={e => setLocalParams({...localParams, smtpPort: e.target.value})}
                      placeholder="587"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email đăng nhập (Username)</Label>
                    <Input 
                      value={localParams.smtpUser || ""} 
                      onChange={e => setLocalParams({...localParams, smtpUser: e.target.value})}
                      placeholder="your-email@gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Mật khẩu ứng dụng (App Password)</Label>
                    <Input 
                      type="password"
                      value={localParams.smtpPass || ""} 
                      onChange={e => setLocalParams({...localParams, smtpPass: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tên người gửi hiển thị</Label>
                  <Input 
                    value={localParams.smtpFromName || ""} 
                    onChange={e => setLocalParams({...localParams, smtpFromName: e.target.value})}
                    placeholder="Phòng Kiểm tra nội bộ"
                  />
                </div>
                <div className="pt-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-blue-600 border-blue-200 hover:bg-blue-600 hover:text-white transition-colors"
                        onClick={handleTestEmail}
                        disabled={isTestingEmail}
                    >
                        {isTestingEmail ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                        Gửi thử Email kiểm tra kết nối
                    </Button>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-xs text-blue-700 leading-relaxed border border-blue-100">
                  <p className="font-bold mb-1">💡 Hướng dẫn:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Nếu dùng Gmail, hãy bật 2FA và tạo "Mật khẩu ứng dụng" (App Password).</li>
                    <li>Host thường là <b>smtp.gmail.com</b> và Port là <b>587</b>.</li>
                    <li>Hệ thống sẽ gửi email đồng bộ khi bạn gửi tin nhắn nội bộ cho cán bộ.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-700">
                  <Key className="h-5 w-5" /> Cấu hình Trí tuệ nhân tạo (AI)
                </CardTitle>
                <CardDescription>Thiết lập các tham số cho trợ lý AI và các chức năng tự động hóa.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nhà cung cấp AI</Label>
                    <Input 
                      value={localParams.aiProvider || ""} 
                      onChange={e => setLocalParams({...localParams, aiProvider: e.target.value})}
                      placeholder="google, openai, anthropic..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Model Name</Label>
                    <Input 
                      value={localParams.aiModel || ""} 
                      onChange={e => setLocalParams({...localParams, aiModel: e.target.value})}
                      placeholder="gemini-1.5-pro"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>AI API Key</Label>
                  <Input 
                    type="password"
                    value={localParams.aiApiKey || ""} 
                    onChange={e => setLocalParams({...localParams, aiApiKey: e.target.value})}
                    placeholder="Dán API Key của bạn vào đây"
                  />
                </div>
                <div className="space-y-2">
                  <Label>System Prompt (Chỉ dẫn hệ thống)</Label>
                  <textarea 
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={localParams.aiSystemPrompt || ""} 
                    onChange={e => setLocalParams({...localParams, aiSystemPrompt: e.target.value})}
                    placeholder="Mô tả cách AI nên cư xử và trả lời..."
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 border-purple-200 text-purple-700 hover:bg-purple-600 hover:text-white transition-colors"
                    onClick={handleVerifyAI}
                    disabled={isVerifyingAI}
                  >
                    {isVerifyingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Kiểm tra kết nối AI
                  </Button>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg text-xs text-purple-700 leading-relaxed border border-purple-100">
                  <p className="font-bold mb-1">💡 Lưu ý:</p>
                  <p>Các thông số này sẽ được sử dụng cho trợ lý AI hỗ trợ phân tích báo cáo và trả lời câu hỏi nghiệp vụ kiểm tra nội bộ. Hãy cẩn thận khi thay đổi System Prompt vì nó ảnh hưởng trực tiếp đến chất lượng câu trả lời.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="evidence">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-600">
                  <FileCheck className="h-5 w-5" /> Minh chứng Báo cáo kết thúc ca trực
                </CardTitle>
                <CardDescription>Cấu hình nơi lưu trữ file và dữ liệu báo cáo minh chứng.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" /> Service Account Email
                    </Label>
                    <Input 
                      value={localParams.evidenceServiceAccountEmail || ""} 
                      onChange={e => setLocalParams({...localParams, evidenceServiceAccountEmail: e.target.value})}
                      placeholder="minh-chung@project-id.iam.gserviceaccount.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Key className="h-3.5 w-3.5" /> Private Key
                    </Label>
                    <textarea 
                      className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 font-mono text-[10px]"
                      value={localParams.evidencePrivateKey || ""} 
                      onChange={e => setLocalParams({...localParams, evidencePrivateKey: e.target.value})}
                      placeholder="-----BEGIN PRIVATE KEY-----"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Google Sheet ID (Lưu dữ liệu báo cáo)</Label>
                    <Input 
                      value={localParams.feedbackSheetId || ""} 
                      onChange={e => setLocalParams({...localParams, feedbackSheetId: e.target.value})}
                      placeholder="1a2b3c4d5e6f7g8h9i0j..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tên Tab trong Sheet</Label>
                    <Input 
                      value={localParams.feedbackTabName || ""} 
                      onChange={e => setLocalParams({...localParams, feedbackTabName: e.target.value})}
                      placeholder="Biểu mẫu 1"
                    />
                  </div>
                </div>
                
                <Separator />

                <div className="space-y-2">
                  <Label>Google Drive Folder ID (Lưu ảnh minh chứng)</Label>
                  <Input 
                    value={localParams.googleDriveFolderId || ""} 
                    onChange={e => setLocalParams({...localParams, googleDriveFolderId: e.target.value})}
                    placeholder="1A2B3C4D5E6F7G8H9I0J..."
                  />
                  <p className="text-[10px] text-muted-foreground italic">
                    * Mở thư mục trên Drive, ID là chuỗi ký tự cuối cùng trên thanh địa chỉ URL. 
                    Tất cả ảnh minh chứng tải lên sẽ được lưu vào đây.
                  </p>
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    variant="outline" 
                    className="flex items-center gap-2 border-amber-200 text-amber-700 hover:bg-amber-600 hover:text-white transition-colors"
                    onClick={handleVerifyEvidence}
                    disabled={isVerifyingEvidence}
                  >
                    {isVerifyingEvidence ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCheck className="h-4 w-4" />}
                    Kiểm tra kết nối Minh chứng
                  </Button>
                </div>

                <div className="bg-amber-50 p-4 rounded-lg text-xs text-amber-800 leading-relaxed border border-amber-100 mt-4">
                  <p className="font-bold mb-1">💡 Hướng dẫn cấu hình:</p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>Dùng tài khoản Service Account riêng để tách biệt với hệ thống AI nếu cần.</li>
                    <li>Đảm bảo đã chia sẻ quyền <b>Editor</b> cho Service Account trên cả tệp Sheet và Thư mục Drive này.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={handleUndo} disabled={!isChanged}>
            <Undo2 className="mr-2 h-4 w-4" /> Hoàn tác
          </Button>
          <Button onClick={handleSave} disabled={!isChanged} className="w-full sm:w-auto">
            <Save className="mr-2 h-4 w-4" /> Lưu tất cả thay đổi
          </Button>
        </div>
      </div>
    </ClientOnly>
  );
}
