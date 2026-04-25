"use client";

import { useState, useRef, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  Camera, MapPin, Loader2, CheckCircle2, 
  Search, X,
  AlertCircle, MessageSquare, Library, Activity, Users,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { useFirestore, useCollection } from '@/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ClientOnly } from '@/components/client-only';
import { EvidenceInput } from "@/components/monitoring/evidence-input";
import { Separator } from "@/components/ui/separator";


export default function LecturerPortalPage() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const storage = getStorage();

    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    
    // Tìm kiếm lớp học
    const [searchDate, setSearchDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [searchClassCode, setSearchClassCode] = useState<string>('');
    const [isSearchingClass, setIsSearchingClass] = useState(false);
    const [classInfo, setClassInfo] = useState<any>(null);
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [locationError, setLocationError] = useState<string>('');
    const [evidence, setEvidence] = useState<string>('');
    const [actualStudentCount, setActualStudentCount] = useState<string>('');
    const [incident, setIncident] = useState<string>('none');
    const [incidentDetail, setIncidentDetail] = useState<string>('');
    const [isNotification, setIsNotification] = useState<boolean>(false);
    
    // Trạng thái thu gọn các phần
    const [expandedSections, setExpandedSections] = useState({
        class: true,
        incident: false,
        gps: false,
        photos: true
    });

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
    };


    // Memoize collection references to prevent infinite re-renders
    const incidentCategoriesCol = useMemo(() => 
        firestore ? collection(firestore, 'incident-categories') : null
    , [firestore]);
    
    const recognitionsCol = useMemo(() => 
        firestore ? collection(firestore, 'recognitions') : null
    , [firestore]);

    // Lấy danh sách việc phát sinh và loại ghi nhận
    const { data: incidentCategories } = useCollection<any>(incidentCategoriesCol);
    const { data: recognitions } = useCollection<any>(recognitionsCol);

    // Lọc danh sách sự cố chỉ lấy "Thực hành ngoài"
    const filteredIncidents = useMemo(() => {
        if (!incidentCategories || !recognitions) return [];
        const targetRec = recognitions.find((r: any) => r.name === "Thực hành ngoài");
        if (!targetRec) return incidentCategories; // Fallback nếu không tìm thấy
        return incidentCategories.filter((i: any) => i.recognitionId === targetRec.id);
    }, [incidentCategories, recognitions]);

    const handleSearchClass = async () => {
        if (!searchDate || !searchClassCode) {
            toast({ title: 'Vui lòng nhập Ngày và Mã lớp', variant: 'destructive' });
            return;
        }
        setIsSearchingClass(true);
        setClassInfo(null);
        try {
            if (!firestore) throw new Error("Mất kết nối database");
            
            // Tìm trong collection schedules theo mã lớp
            const q = query(collection(firestore, 'schedules'), where('class', '==', searchClassCode.trim()));
            const snapshot = await getDocs(q);
            
            // Format ngày để so sánh (YYYY-MM-DD hoặc DD/MM/YYYY)
            const [y, m, d] = searchDate.split('-');
            const dateFormats = [searchDate, `${d}/${m}/${y}`, `${d}-${m}-${y}`];

            const match = snapshot.docs.find(doc => dateFormats.includes(doc.data().date));

            if (match) {
                const data = match.data();
                setClassInfo({
                    Class: data.class,
                    Course: data.content || data.room || 'Thực hành',
                    Lecturer: data.lecturer,
                    Date: data.date,
                    Building: data.building || 'Ngoài trường',
                    Room: data.room || '',
                    Period: data.period || '',
                    StudentCount: data.studentCount || ''
                });
                toast({ title: 'Đã tìm thấy thông tin lớp!' });
            } else {
                // Mock fallback cho test nhanh
                if (searchClassCode.toUpperCase() === 'L01' || searchClassCode.toUpperCase() === 'L02') {
                    setClassInfo({
                        Class: searchClassCode.toUpperCase(),
                        Course: searchClassCode.toUpperCase() === 'L01' ? 'Thực hành Xây dựng Mạng' : 'Kiến tập Doanh nghiệp',
                        Lecturer: 'Giảng viên Test',
                        Date: searchDate
                    });
                    toast({ title: 'Tìm thấy lớp (Dữ liệu mẫu)!' });
                } else {
                    toast({ title: 'Không tìm thấy lớp học', description: 'Lớp này không có lịch vào ngày bạn chọn, hoặc sai mã lớp.', variant: 'destructive' });
                }
            }
        } catch (error: any) {
            toast({ title: 'Lỗi tìm kiếm', description: error.message, variant: 'destructive' });
        } finally {
            setIsSearchingClass(false);
        }
    };

    const handleGetLocation = () => {
        setLocationError('');
        setIsFetchingLocation(true);
        if (!navigator.geolocation) {
            setLocationError('Trình duyệt của bạn không hỗ trợ định vị GPS.');
            setIsFetchingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocation({
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                });
                setIsFetchingLocation(false);
                toast({ title: 'Đã lấy tọa độ thành công!' });
            },
            (error) => {
                setIsFetchingLocation(false);
                setLocationError(`Lỗi định vị: ${error.message}. Vui lòng kiểm tra quyền truy cập vị trí của Ứng dụng/Trình duyệt.`);
                toast({ title: 'Không lấy được vị trí', description: error.message, variant: 'destructive' });
            },
            { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
        );
    };



    const handleSubmit = async () => {
        if (!classInfo) {
            toast({ title: 'Vui lòng tìm và xác nhận lớp học trước', variant: 'destructive' });
            return;
        }
        if (!location) {
            toast({ title: 'Vui lòng lấy tọa độ GPS', variant: 'destructive' });
            return;
        }
        if (!evidence) {
            toast({ title: 'Vui lòng cung cấp ít nhất 1 minh chứng', variant: 'destructive' });
            return;
        }
        if (!firestore) {
            toast({ title: 'Lỗi kết nối cơ sở dữ liệu', variant: 'destructive' });
            return;
        }

        setIsLoading(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 500));

            // Save to Firestore
            const docRef = await addDoc(collection(firestore, 'external_checkins'), {
                classId: searchClassCode.toUpperCase(),
                className: classInfo.Course,
                class: classInfo.Class,
                scheduleDate: searchDate, // Store the date the class was scheduled for
                lecturer: classInfo.Lecturer,
                building: classInfo.Building,
                room: classInfo.Room,
                period: classInfo.Period,
                studentCount: classInfo.StudentCount,
                actualStudentCount: actualStudentCount,
                photoUrls: evidence.split('|').filter(Boolean),
                timestamp: serverTimestamp(),
                status: 'pending_review',
                submittedBy: classInfo.Lecturer || 'Giảng viên',
                location: {
                    latitude: location.lat,
                    longitude: location.lng
                },
                incident: incident,
                incidentDetail: incidentDetail,
                isNotification: isNotification
            });

            setIsSuccess(true);
            toast({ title: 'Check-in thành công!', description: 'Dữ liệu đã được gửi đến phòng Kiểm tra.' });
        } catch (error: any) {
            console.error("Submit Error:", error);
            toast({ title: 'Có lỗi xảy ra', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <Card className="w-full max-w-md text-center py-8 shadow-lg border-green-200 border-t-4 border-t-green-500">
                    <CardContent className="flex flex-col items-center gap-4">
                        <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="h-10 w-10 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-green-700">Check-in Thành Công</CardTitle>
                        <CardDescription className="text-slate-600 font-medium">
                            Minh chứng của bạn đã được ghi nhận vào hệ thống.
                        </CardDescription>
                        <Button 
                            className="mt-6 w-full py-6 text-lg font-bold" 
                            variant="outline" 
                            onClick={() => {
                                setIsSuccess(false);
                                setEvidence('');
                                setLocation(null);
                                setClassInfo(null);
                                setSearchClassCode('');
                                setIncident('none');
                                setIncidentDetail('');
                                setIsNotification(false);
                                setActualStudentCount('');
                            }}
                        >
                            Thực hiện Check-in khác
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <ClientOnly>
            <div className="w-full flex justify-center p-0 md:p-4">
                <Card className="w-full max-w-2xl shadow-xl border-t-4 border-t-blue-600 h-fit">
                    <CardHeader className="text-center pb-2 pt-6">
                        <CardTitle className="text-3xl font-black text-blue-700 uppercase tracking-tight">Cổng Check-in Giảng Viên</CardTitle>
                        <CardDescription className="text-slate-500 font-medium">Dành cho các lớp thực hành / thực tế ngoài cơ sở</CardDescription>
                    </CardHeader>
                    
                    <CardContent className="p-0">
                        {/* Section 1: Lớp học */}
                        <div className="border-b">
                            <button 
                                onClick={() => toggleSection('class')}
                                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
                            >
                                <Label className="text-base font-semibold flex items-center gap-2 cursor-pointer">
                                    <Library className="h-5 w-5 text-blue-600" /> 1. Lớp học đang phụ trách
                                </Label>
                                {expandedSections.class ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </button>
                            
                            {expandedSections.class && (
                                <div className="p-4 pt-0 space-y-4">
                                    <div className="flex gap-2">
                                        <div className="flex-1 flex gap-2">
                                            <Input placeholder="Nhập Mã Lớp" value={searchClassCode} onChange={(e) => setSearchClassCode(e.target.value)} className="h-12 uppercase" />
                                            <Button variant="ghost" onClick={handleSearchClass} disabled={isSearchingClass} className="h-12 w-12 p-0 text-blue-600">
                                                {isSearchingClass ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                                            </Button>
                                        </div>
                                    </div>

                                    {classInfo && (
                                        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded shadow-sm">
                                            <p className="text-xl font-black text-blue-900">{classInfo.Course}</p>
                                            <div className="grid grid-cols-2 gap-2 mt-2 text-sm font-bold text-blue-800">
                                                <p>Lớp: {classInfo.Class}</p>
                                                <p>GV: {classInfo.Lecturer}</p>
                                                <p>Dãy: {classInfo.Building}</p>
                                                <p>Phòng/Tiết: {classInfo.Room} ({classInfo.Period})</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Section 2: Thông tin lớp & sự việc */}
                        <div className="border-b">
                            <button 
                                onClick={() => toggleSection('incident')}
                                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
                            >
                                <Label className="text-base font-semibold flex items-center gap-2 cursor-pointer">
                                    <AlertCircle className="h-5 w-5 text-orange-500" /> 2. Thông tin lớp & sự việc
                                </Label>
                                {expandedSections.incident ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </button>
                            
                            {expandedSections.incident && (
                                <div className="p-4 pt-0">
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-slate-500 uppercase font-bold ml-1 flex items-center gap-1">
                                                <Users className="h-2.5 w-2.5 text-green-500" /> SV tham gia
                                            </Label>
                                            <Input 
                                                type="number"
                                                placeholder="Số lượng..." 
                                                value={actualStudentCount}
                                                onChange={(e) => setActualStudentCount(e.target.value)}
                                                className="h-12"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-slate-500 uppercase font-bold ml-1 flex items-center gap-1">
                                                <Activity className="h-2.5 w-2.5 text-orange-400" /> Việc phát sinh
                                            </Label>
                                            <Select value={incident} onValueChange={setIncident}>
                                                <SelectTrigger className="h-12"><SelectValue placeholder="Loại..." /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">--- Không có ---</SelectItem>
                                                    {filteredIncidents?.map((cat: any) => (
                                                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-slate-500 uppercase font-bold ml-1 flex items-center gap-1">
                                                <Activity className="h-2.5 w-2.5 text-blue-400" /> Thông báo
                                            </Label>
                                            <Select value={isNotification ? "true" : "false"} onValueChange={(v) => setIsNotification(v === "true")}>
                                                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="true">Có</SelectItem>
                                                    <SelectItem value="false">Không</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-slate-500 uppercase font-bold ml-1 flex items-center gap-1">
                                                <MessageSquare className="h-2.5 w-2.5 text-blue-400" /> Chi tiết
                                            </Label>
                                            <Input placeholder="Ghi chú..." value={incidentDetail} onChange={(e) => setIncidentDetail(e.target.value)} className="h-12" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Section 3: GPS */}
                        <div className="border-b">
                            <button 
                                onClick={() => toggleSection('gps')}
                                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
                            >
                                <Label className="text-base font-semibold flex items-center gap-2 cursor-pointer">
                                    <MapPin className="h-5 w-5 text-red-500" /> 3. Tọa độ hiện tại (GPS)
                                </Label>
                                {expandedSections.gps ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </button>
                            
                            {expandedSections.gps && (
                                <div className="p-4 pt-0 space-y-4">
                                    <div className="flex gap-2">
                                        <Button onClick={handleGetLocation} variant={location ? "outline" : "default"} className="flex-1 h-12">
                                            {location ? 'Đã lấy GPS' : 'Lấy GPS'}
                                        </Button>
                                    </div>
                                    {location && (
                                        <iframe width="100%" height="140" style={{ border: 0 }} src={`https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.005},${location.lat - 0.005},${location.lng + 0.005},${location.lat + 0.005}&layer=mapnik&marker=${location.lat},${location.lng}`}></iframe>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Section 4: Hình ảnh */}
                        <div>
                            <button 
                                onClick={() => toggleSection('photos')}
                                className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
                            >
                                <Label className="text-base font-semibold flex items-center gap-2 cursor-pointer">
                                    <Camera className="h-5 w-5 text-blue-500" /> 4. Hình ảnh minh chứng
                                </Label>
                                {expandedSections.photos ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
                            </button>
                            
                            {expandedSections.photos && (
                                <div className="p-4 pt-0">
                                    <EvidenceInput value={evidence} onChange={setEvidence} onlyCamera={true} />
                                </div>
                            )}
                        </div>
                    </CardContent>

                    <CardFooter className="pt-4 pb-8 flex justify-end px-6">
                        <Button 
                            className="bg-blue-700 hover:bg-blue-800 font-bold px-10 h-12 shadow-md transition-all active:scale-95" 
                            disabled={isLoading || !evidence} 
                            onClick={handleSubmit}
                        >
                            {isLoading ? <Loader2 className="animate-spin mr-2" /> : null}
                            GỬI {evidence.split('|').filter(Boolean).length} MINH CHỨNG
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </ClientOnly>
    );
}
