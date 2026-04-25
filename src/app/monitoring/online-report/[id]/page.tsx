"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Users, Clock, CalendarDays, Camera, User, 
  MapPin, CheckCircle2, FileText, ChevronLeft,
  ArrowRight, Download, Share2, Globe
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export default function OnlineReportPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Thử tìm trong online-checkins trước (Báo cáo đã Publish)
        let res = await fetch(`/api/v1/online-checkins/${id}`);
        let result = await res.json();
        
        if (!result.success) {
          // Nếu không thấy, thử tìm trong schedules (Dữ liệu realtime)
          res = await fetch(`/api/v1/schedules/${id}`);
          result = await res.json();
        }

        if (result.success) {
          setData(result.data);
        } else {
          setError("Không tìm thấy dữ liệu báo cáo (ID: " + id + ")");
        }
      } catch (err) {
        setError("Lỗi kết nối hệ thống.");
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchData();
  }, [id]);

  if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-1/3" /><Skeleton className="h-64 w-full" /></div>;
  if (error) return <div className="p-8 text-center text-red-500 font-bold">{error}</div>;
  if (!data) return <div className="p-8 text-center">Không tìm thấy dữ liệu báo cáo.</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <ChevronLeft className="h-4 w-4" />
              <span>Quay lại trang giám sát</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
              <div className="w-12 h-12 flex-shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full shadow-sm rounded-full">
                  <circle cx="50" cy="50" r="48" fill="#00558d" />
                  <path d="M25 35 L75 35 L75 45 L55 45 L55 75 L45 75 L45 45 L25 45 Z" fill="white" />
                  <path d="M30 25 L70 25" stroke="white" strokeWidth="4" />
                </svg>
              </div>
              BÁO CÁO GIÁM SÁT TRỰC TUYẾN
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white px-3 py-1 border-blue-200 text-blue-700 font-bold uppercase tracking-wider">
              {data.status === 'completed' ? 'Đã hoàn thành' : 'Đang diễn ra'}
            </Badge>
            <Button variant="outline" size="sm" className="bg-white gap-2 border-slate-200">
              <Share2 className="h-4 w-4" /> Chia sẻ
            </Button>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Cột trái: Thông tin lớp học */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-100">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5 text-blue-500" />
                  Thông tin phiên dạy
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <InfoItem icon={<Users className="h-4 w-4" />} label="Mã lớp & Học phần" value={`${data.Class || 'N/A'} - ${data.Course || data.content || 'N/A'}`} />
                  <InfoItem icon={<User className="h-4 w-4" />} label="Giảng viên" value={data.Lecturer || data.lecturer || 'N/A'} />
                  <InfoItem icon={<CalendarDays className="h-4 w-4" />} label="Ngày dạy" value={data.Date || 'N/A'} />
                </div>
                <div className="space-y-4">
                  <InfoItem icon={<Clock className="h-4 w-4" />} label="Tiết học" value={data.Period || 'N/A'} />
                  <InfoItem icon={<MapPin className="h-4 w-4" />} label="Phòng/Tòa" value={`${data.Room || 'Trực tuyến'} - ${data.Building || 'N/A'}`} />
                  <InfoItem icon={<Globe className="h-4 w-4" />} label="Link cuộc họp" value={data.meetingLink || 'N/A'} isLink />
                </div>
              </CardContent>
            </Card>

            {/* Bảng danh sách sinh viên */}
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-100 flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-500" />
                  Danh sách sinh viên tham gia ({data.actualStudentCount || 0})
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                  <Download className="h-4 w-4 mr-2" /> Tải Excel
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-16 font-bold">STT</TableHead>
                      <TableHead className="font-bold">Họ và Tên</TableHead>
                      <TableHead className="font-bold">Giờ vào</TableHead>
                      <TableHead className="font-bold">Thời lượng</TableHead>
                      <TableHead className="text-right font-bold">Tỷ lệ %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.attendanceDetails?.map((student: any) => (
                      <TableRow key={student.sNo}>
                        <TableCell className="font-medium text-slate-500">{student.sNo}</TableCell>
                        <TableCell className="font-bold text-slate-900">{student.name}</TableCell>
                        <TableCell>{student.firstSeenAt}</TableCell>
                        <TableCell>{student.attendedDuration}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={parseInt(student.attendedPercentage) > 80 ? 'default' : 'secondary'} className="font-mono">
                            {student.attendedPercentage}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {!data.attendanceDetails?.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-slate-400">Không có dữ liệu điểm danh chi tiết.</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Cột phải: Minh chứng hình ảnh */}
          <div className="space-y-6">
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-white border-b border-slate-100">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Camera className="h-5 w-5 text-red-500" />
                  Minh chứng tiết dạy
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {data.evidence ? (
                  <div className="rounded-lg overflow-hidden border border-slate-200">
                    <img src={data.evidence} alt="Meeting Evidence" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500" />
                  </div>
                ) : (
                  <div className="aspect-video bg-slate-100 rounded-lg flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200">
                    <Camera className="h-10 w-10 mb-2 opacity-20" />
                    <p className="text-sm">Chưa có ảnh minh chứng</p>
                  </div>
                )}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="flex items-center gap-2 text-blue-700 font-bold text-sm mb-1">
                    <User className="h-4 w-4" /> Chủ trì cuộc họp:
                  </div>
                  <p className="text-blue-900 font-medium">{data.hostName || "Không rõ"}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
              <CardContent className="p-6 space-y-4 text-center">
                <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-2">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-lg">Xác thực hệ thống</h3>
                <p className="text-blue-100 text-sm">Báo cáo này được tạo tự động bởi NTTU Monitoring System và có giá trị minh chứng chính thức.</p>
                <Separator className="bg-white/20" />
                <div className="text-xs text-blue-200">
                  Mã định danh: {data.id}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value, isLink }: { icon: React.ReactNode, label: string, value: string, isLink?: boolean }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-slate-400 text-xs font-medium uppercase tracking-wider">
        {icon}
        {label}
      </div>
      {isLink ? (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold text-sm hover:underline flex items-center gap-1 truncate">
          {value} <ArrowRight className="h-3 w-3" />
        </a>
      ) : (
        <p className="text-slate-900 font-bold text-sm">{value}</p>
      )}
    </div>
  );
}
