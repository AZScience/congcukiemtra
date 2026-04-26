"use client";

import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2, FileCheck, CheckCircle2, UploadCloud, X } from "lucide-react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useStorage, useFirestore } from "@/firebase";
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, doc, getDoc } from "firebase/firestore";
import { useUser } from "@/firebase";
import { useMasterData } from "@/providers/master-data-provider";
import { pushFeedbackToGoogleSheet } from "@/ai/flows/google-sheet-export";
import { uploadToCatboxServer } from "@/ai/flows/catbox-upload";
import { uploadToFirebaseServer } from "@/ai/flows/firebase-upload";

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

  // Trạng thái các file đính kèm (HỖ TRỢ NHIỀU FILE)
  const [files, setFiles] = useState<{
    proofPrinted: File[];
    proofOnline: File[];
    proofIncident: File[];
    proofFacility: File[];
  }>({
    proofPrinted: [],
    proofOnline: [],
    proofIncident: [],
    proofFacility: []
  });

  const handleFileChange = (field: keyof typeof files, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => ({ ...prev, [field]: [...prev[field], ...newFiles] }));
    }
    e.target.value = ''; // Reset để chọn lại cùng file nếu cần
  };

  const removeFile = (field: keyof typeof files, index: number) => {
    setFiles(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const uploadMultipleFiles = async (fileList: File[]) => {
    if (fileList.length === 0) return "";
    
    const urls: string[] = [];
    
    for (const file of fileList) {
      const formData = new FormData();
      formData.append("reqtype", "fileupload");
      formData.append("fileToUpload", file);
      
      try {
        // Sử dụng một Proxy để tránh lỗi CORS nếu chạy trực tiếp từ browser
        // Hoặc chúng ta có thể gọi qua một server action nếu cần.
        // Ở đây tôi sẽ dùng hướng xử lý qua Server Action để đảm bảo 100% thành công.
        const res = await uploadToCatboxServer(formData);
        if (res.success && res.url) {
          urls.push(res.url);
        } else {
          throw new Error(res.error || "Lỗi tải ảnh lên hệ thống.");
        }
      } catch (err: any) {
        throw new Error(`Lỗi tải tệp "${file.name}": ${err.message}`);
      }
    }
    return urls.join('\n');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const email = sysParams?.evidenceServiceAccountEmail || sysParams?.googleServiceAccountEmail;
    const key = sysParams?.evidencePrivateKey || sysParams?.googlePrivateKey;
    const sheetId = sysParams?.feedbackSheetId || sysParams?.googleSheetId;
    // BẠN CẦN NHẬP ID THƯ MỤC GOOGLE DRIVE VÀO ĐÂY HOẶC VÀO SYSTEM PARAMETERS

    if (!email || !key || !sheetId) {
      toast({
        title: "Thiếu cấu hình",
        description: "Vui lòng vào mục Tham số hệ thống để điền cấu hình Google cho mục Minh chứng.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    toast({ title: "Đang tải các tệp minh chứng..." });

    try {
      // 1. Upload các nhóm file lên ImgBB (Nhanh và ổn định nhất)
      const printedUrl = await uploadMultipleFiles(files.proofPrinted);
      const onlineUrl = await uploadMultipleFiles(files.proofOnline);
      const incidentUrl = await uploadMultipleFiles(files.proofIncident);
      const facilityUrl = await uploadMultipleFiles(files.proofFacility);

      // Log để người dùng biết kết quả lấy link
      toast({ 
        title: "Kết quả lấy link ảnh", 
        description: `Tờ in: ${files.proofPrinted.length} ảnh, Online: ${files.proofOnline.length} ảnh, Sự cố: ${files.proofIncident.length} ảnh, CSVC: ${files.proofFacility.length} ảnh.`,
      });

      toast({ title: "Đang ghi vào Sheet..." });

      // 2. Chuẩn bị dữ liệu ghi vào Google Sheet
      const now = new Date();
      const timestamp = format(now, 'dd/MM/yyyy HH:mm:ss');

      const dataToPush = [{
        timestamp: timestamp,
        employeeName: formData.employeeName || authUser?.displayName || "Cán bộ kiểm tra",
        proofPrinted: printedUrl,
        proofOnline: onlineUrl,
        proofIncident: incidentUrl,
        proofFacility: facilityUrl
      }];

      toast({ title: "Tải ảnh xong, đang ghi vào Google Sheet..." });

      // Đẩy lên Google Sheet
      const finalTabName = sysParams?.feedbackTabName || "Trang tính1";

      const sheetRes = await pushFeedbackToGoogleSheet(
        dataToPush,
        sheetId,
        email,
        key,
        finalTabName
      );

      if (!sheetRes.success) {
        throw new Error(sheetRes.message || "Lỗi khi ghi vào Google Sheet.");
      }

      toast({
        title: "Gửi báo cáo thành công!",
        description: `Dữ liệu đã được ghi vào Sheet: ${sheetRes.message}`,
      });
      
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setFormData(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }));
        setFiles({ proofPrinted: [], proofOnline: [], proofIncident: [], proofFacility: [] });
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
                
                <div>
                  <input 
                    type="file" 
                    id={field.id}
                    multiple
                    className="hidden" 
                    onChange={(e) => handleFileChange(field.id as keyof typeof files, e)}
                    accept="image/*"
                  />
                  <Label htmlFor={field.id} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-blue-600 cursor-pointer hover:bg-gray-50 transition-colors">
                    <UploadCloud size={18} />
                    Thêm tệp
                  </Label>
                </div>

                <div className="mt-3 space-y-2">
                  {files[field.id as keyof typeof files].map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-blue-50 text-blue-700 p-2 px-3 rounded-md border border-blue-200">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileCheck size={16} className="flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{file.name}</span>
                        <span className="text-[10px] text-blue-400">({(file.size/1024).toFixed(0)} KB)</span>
                      </div>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7 hover:bg-blue-200 text-blue-600" 
                        onClick={() => removeFile(field.id as keyof typeof files, idx)}
                      >
                        <X size={14} />
                      </Button>
                    </div>
                  ))}
                </div>
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
