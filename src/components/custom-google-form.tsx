"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, FileCheck, CheckCircle2, UploadCloud, X } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useUser } from "@/firebase";
import { useMasterData } from "@/providers/master-data-provider";
import { uploadToGoogleDrive } from "@/ai/flows/google-drive-upload";
import { pushFeedbackToGoogleSheet } from "@/ai/flows/google-sheet-export";

export function CustomGoogleForm() {
  const { toast } = useToast();
  const { user: authUser } = useUser();
  const [sysParams] = useLocalStorage<any>('system_parameters', {});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Các trường thông tin
  const [formData, setFormData] = useState({
    email: "",
    employeeName: "",
    date: new Date().toISOString().split('T')[0],
  });

  const { employees } = useMasterData();

  useEffect(() => {
    if (authUser?.email) {
      // Tìm tên thật từ database nhân viên
      const currentUser = employees?.find((e: any) => e.email === authUser.email || e.id === authUser.uid);
      const realName = currentUser?.name || authUser.displayName || authUser.email?.split('@')[0] || "";

      setFormData(prev => ({
        ...prev,
        email: authUser.email || prev.email,
        employeeName: realName
      }));
    }
  }, [authUser, employees]);

  // Trạng thái các file đính kèm
  const [files, setFiles] = useState<{
    proofPrinted: File | null;
    proofOnline: File | null;
    proofIncident: File | null;
    proofFacility: File | null;
  }>({
    proofPrinted: null,
    proofOnline: null,
    proofIncident: null,
    proofFacility: null
  });

  const handleFileChange = (field: keyof typeof files, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFiles(prev => ({ ...prev, [field]: e.target.files![0] }));
    }
  };

  const removeFile = (field: keyof typeof files) => {
    setFiles(prev => ({ ...prev, [field]: null }));
  };

  const uploadSingleFile = async (file: File | null, folderId: string, email: string, key: string) => {
    if (!file) return "";
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folderId', folderId);
    fd.append('serviceAccountEmail', email);
    fd.append('privateKey', key);
    
    const res = await uploadToGoogleDrive(fd);
    if (!res.success) throw new Error(`Lỗi tải lên ${file.name}: ${res.error}`);
    return res.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const email = sysParams?.googleServiceAccountEmail;
    const key = sysParams?.googlePrivateKey;
    const sheetId = sysParams?.googleSheetId;
    // BẠN CẦN NHẬP ID THƯ MỤC GOOGLE DRIVE VÀO ĐÂY HOẶC VÀO SYSTEM PARAMETERS

    if (!email || !key || !sheetId) {
      toast({
        title: "Thiếu cấu hình",
        description: "Vui lòng vào mục Tham số hệ thống để điền Email và Private Key của Service Account.",
        variant: "destructive"
      });
      return;
    }

    const driveFolderId = sysParams?.googleDriveFolderId;
      
    if (!driveFolderId || driveFolderId === "NHẬP_ID_THƯ_MỤC_DRIVE_CỦA_BẠN_VÀO_ĐÂY") {
      toast({ title: "Chưa cấu hình Thư mục Drive", description: "Vui lòng vào trang Tham số hệ thống để điền ID thư mục Google Drive.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(true);
    toast({ title: "Đang tải tệp lên Google Drive..." });

    try {
      // 1. Upload các file lên Drive và lấy Link
      const printedUrl = await uploadSingleFile(files.proofPrinted, driveFolderId, email, key);
      const onlineUrl = await uploadSingleFile(files.proofOnline, driveFolderId, email, key);
      const incidentUrl = await uploadSingleFile(files.proofIncident, driveFolderId, email, key);
      const facilityUrl = await uploadSingleFile(files.proofFacility, driveFolderId, email, key);

      toast({ title: "Tải tệp thành công, đang ghi vào Sheet..." });

      // 2. Chuẩn bị dữ liệu ghi vào Google Sheet
      const now = new Date();
      const timestamp = `${now.getDate().toString().padStart(2, '0')}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      const dataToPush = [{
        timestamp: timestamp,
        email: formData.email,
        employeeName: formData.employeeName,
        date: formData.date.split('-').reverse().join('/'), // Convert YYYY-MM-DD to DD/MM/YYYY
        proofPrinted: printedUrl || "",
        proofOnline: onlineUrl || "",
        proofIncident: incidentUrl || "",
        proofFacility: facilityUrl || ""
      }];

      // Đẩy lên Google Sheet
      const targetSheetId = "1X1SVdKrM2GlKxTcPdb7hqfzJNx3zIhfUhb_36qP7ghU";
      
      await pushFeedbackToGoogleSheet(
        dataToPush,
        targetSheetId,
        email,
        key,
        "Biểu mẫu 1" // Thay bằng tên Tab thực tế trên Sheet của bạn (Thường là Form Responses 1 hoặc Biểu mẫu 1)
      );

      toast({
        title: "Gửi báo cáo thành công!",
        description: "Thông tin và tệp đính kèm đã được đẩy lên Google Drive & Sheet.",
      });
      
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setFormData({ email: "", employeeName: "", date: new Date().toISOString().split('T')[0] });
        setFiles({ proofPrinted: null, proofOnline: null, proofIncident: null, proofFacility: null });
      }, 3000);
      
    } catch (error: any) {
      toast({
        title: "Lỗi kết nối",
        description: error.message || "Không thể gửi dữ liệu, vui lòng thử lại.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <Card className="shadow-xl border-t-8 border-t-blue-600 bg-white/95 backdrop-blur-sm relative">
        <CardHeader className="pb-4 border-b">
          <CardTitle className="text-2xl font-bold text-gray-800">
            MINH CHỨNG BÁO CÁO KẾT THÚC CA TRỰC
          </CardTitle>
          <CardDescription className="text-gray-600 text-sm mt-2">
            Quý thầy/cô theo phân công tiến hành kiểm tra... ghi nhận trên mẫu này. 
            Lưu ý thực hiện ngay sau khi ca trực kết thúc.
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-6">
            
            <div className="bg-gray-50 p-4 rounded-lg border flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-800">{formData.email || "Chưa đăng nhập"}</span>
                <span className="text-sm text-blue-600 hover:underline cursor-pointer">Chuyển đổi tài khoản</span>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Tên, <span className="font-semibold text-gray-700">email</span> và ảnh <span className="font-semibold text-gray-700">liên kết với Tài khoản Google</span> của bạn sẽ được ghi lại khi bạn tải tệp lên và gửi biểu mẫu này
              </p>
              {!authUser?.email && (
                 <Input 
                   type="email"
                   placeholder="Nhập email của bạn..." 
                   value={formData.email}
                   onChange={(e) => setFormData({...formData, email: e.target.value})}
                   required 
                   className="mt-3"
                 />
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border">
              <Label htmlFor="employeeName" className="font-semibold text-gray-700 text-base">Cán bộ thực hiện kiểm tra, báo cáo <span className="text-red-500">*</span></Label>
              <Input 
                id="employeeName" 
                placeholder="Câu trả lời của bạn" 
                value={formData.employeeName}
                onChange={(e) => setFormData({...formData, employeeName: e.target.value})}
                required 
                className="mt-3 border-b-2 border-t-0 border-l-0 border-r-0 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-blue-600 px-0 bg-transparent"
              />
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border">
              <Label htmlFor="date" className="font-semibold text-gray-700 text-base">Ngày thực hiện, báo cáo kiểm tra <span className="text-red-500">*</span></Label>
              <Input 
                id="date" 
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required
                className="mt-3 w-48 border-b-2 border-t-0 border-l-0 border-r-0 rounded-none border-gray-300 focus-visible:ring-0 focus-visible:border-blue-600 px-0 bg-transparent"
              />
            </div>

            {/* Component Tải tệp dùng chung */}
            {[
              { id: 'proofPrinted', label: 'Minh chứng Tờ in sử dụng để Kiểm tra. (Lưu ý tờ in phải có chữ ký)' },
              { id: 'proofOnline', label: 'Minh chứng kiểm tra ghi nhận các lớp trực tuyến' },
              { id: 'proofIncident', label: 'Minh chứng các ghi nhận không phù hợp trong ca trực.' },
              { id: 'proofFacility', label: 'Minh chứng ghi nhận cơ sở vật chất' },
            ].map((field) => (
              <div key={field.id} className="bg-gray-50 p-4 rounded-lg border">
                <Label className="font-semibold text-gray-700 text-base block mb-3">{field.label}</Label>
                
                {files[field.id as keyof typeof files] ? (
                   <div className="flex items-center gap-3 bg-blue-50 text-blue-700 p-3 rounded-md border border-blue-200 w-max">
                     <FileCheck size={18} />
                     <span className="text-sm font-medium">{files[field.id as keyof typeof files]?.name}</span>
                     <Button type="button" variant="ghost" size="icon" className="h-6 w-6 ml-2 hover:bg-blue-200" onClick={() => removeFile(field.id as keyof typeof files)}>
                        <X size={14} />
                     </Button>
                   </div>
                ) : (
                  <div>
                    <input 
                      type="file" 
                      id={field.id}
                      className="hidden" 
                      onChange={(e) => handleFileChange(field.id as keyof typeof files, e)}
                    />
                    <Label htmlFor={field.id} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-blue-600 cursor-pointer hover:bg-gray-50 transition-colors">
                      <UploadCloud size={18} />
                      Thêm tệp
                    </Label>
                  </div>
                )}
              </div>
            ))}

          </CardContent>
          
          <CardFooter className="bg-white pt-2 pb-6 px-6 flex justify-between items-center">
            <Button 
              type="submit" 
              className={`h-10 px-6 rounded-md transition-all ${isSuccess ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
              disabled={isSubmitting || isSuccess}
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang tải & Nộp bài...</>
              ) : isSuccess ? (
                <><CheckCircle2 className="mr-2 h-4 w-4" /> Đã gửi thành công</>
              ) : (
                "Gửi"
              )}
            </Button>
            <Button type="button" variant="ghost" className="text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                Xóa hết câu trả lời
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
