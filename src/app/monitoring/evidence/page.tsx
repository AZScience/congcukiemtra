"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from "@/components/ui/badge";
import { 
  Search, Filter, Calendar, User, FileText, Image as ImageIcon, 
  ExternalLink, Eye, Download, Library, LayoutGrid, List,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, X,
  Clock, CheckCircle2, AlertCircle, MapPin, Camera, Trash2
} from 'lucide-react';
import { format, parse, isValid, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import PageHeader from "@/components/page-header";
import { ClientOnly } from "@/components/client-only";
import { useLanguage } from "@/hooks/use-language";
import { useCollection, useFirestore } from "@/firebase";
import { collection, doc, updateDoc, deleteField } from "firebase/firestore";
import { useMasterData } from "@/providers/master-data-provider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { useToast } from "@/hooks/use-toast";

// --- Types ---

type EvidenceSource = 'direct' | 'online' | 'homeroom' | 'checkin' | 'feedback' | 'shift_schedule' | 'requests' | 'petitions' | 'asset_check' | 'violations' | 'exams' | 'practice';

interface UnifiedEvidence {
    id: string;
    source: EvidenceSource;
    sourceLabel: string;
    title: string;
    description: string;
    date: Date;
    dateStr: string;
    submittedBy: string;
    submittedByName: string;
    items: string[]; // List of base64 or URLs
    status?: string;
    originalData: any;
}

export default function EvidenceManagementPage() {
    const { t } = useLanguage();
    const firestore = useFirestore();
    const { employees } = useMasterData();

    // --- Collections ---
    const schedulesRef = useMemo(() => firestore ? collection(firestore, 'schedules') : null, [firestore]);
    const checkinsRef = useMemo(() => firestore ? collection(firestore, 'external_checkins') : null, [firestore]);
    const requestsRef = useMemo(() => firestore ? collection(firestore, 'requests') : null, [firestore]);
    const petitionsRef = useMemo(() => firestore ? collection(firestore, 'petitions') : null, [firestore]);
    const assetRef = useMemo(() => firestore ? collection(firestore, 'asset-receptions') : null, [firestore]);
    const violationsRef = useMemo(() => firestore ? collection(firestore, 'student-violations') : null, [firestore]);

    const { data: schedulesData, loading: loadingSchedules } = useCollection<any>(schedulesRef);
    const { data: checkinsData, loading: loadingCheckins } = useCollection<any>(checkinsRef);
    const { data: requestsData, loading: loadingRequests } = useCollection<any>(requestsRef);
    const { data: petitionsData, loading: loadingPetitions } = useCollection<any>(petitionsRef);
    const { data: assetData, loading: loadingAsset } = useCollection<any>(assetRef);
    const { data: violationsData, loading: loadingViolations } = useCollection<any>(violationsRef);

    const isLoading = loadingSchedules || loadingCheckins || loadingRequests || loadingPetitions || loadingAsset || loadingViolations;

    // --- State ---
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedEvidence, setSelectedEvidence] = useState<UnifiedEvidence | null>(null);
    const [previewItem, setPreviewItem] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSource, setFilterSource] = useState<string>('all');
    const [filterDate, setFilterDate] = useState<string>('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(12);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<UnifiedEvidence | null>(null);
    const { toast } = useToast();

    // --- Normalization ---
    const allEvidence = useMemo(() => {
        const unified: UnifiedEvidence[] = [];

        // 1. From schedules (Direct, Homeroom, Practice, Exams, Online)
        if (schedulesData) {
            schedulesData.forEach(item => {
                if (item.evidence) {
                    const evidenceList = item.evidence.split('|').filter(Boolean);
                    if (evidenceList.length > 0) {
                        const dateParts = item.date?.split('/') || [];
                        let dateObj = new Date();
                        if (dateParts.length === 3) {
                            dateObj = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
                        }

                        // Determine source type more accurately
                        let source: EvidenceSource = 'direct';
                        let sourceLabel = 'Lớp học trực tiếp';
                        
                        const content = (item.content || '').toLowerCase();
                        const status = (item.status || '').toLowerCase();
                        const building = (item.building || '').toLowerCase();
                        const isHomeroom = ['cvht', 'shcn', 'cố vấn', 'sinh hoạt', 'chủ nhiệm'].some(k => content.includes(k) || status.includes(k));
                        const isPractice = building.includes('ngoài');
                        const isOnline = building.includes('trực tuyến') || building.includes('online');
                        const isExam = status.includes('thi');

                        if (isHomeroom) { source = 'homeroom'; sourceLabel = 'Cố vấn học tập'; }
                        else if (isOnline) { source = 'online'; sourceLabel = 'Lớp học online'; }
                        else if (isPractice) { source = 'practice'; sourceLabel = 'Thực hành ngoài'; }
                        else if (isExam) { source = 'exams'; sourceLabel = 'Thi kết thúc môn'; }

                        unified.push({
                            id: `schedule-${item.id || Math.random().toString()}`,
                            source,
                            sourceLabel,
                            title: `${item.class || 'N/A'} - ${item.room || 'N/A'}`,
                            description: item.content || item.incident || 'Báo cáo giám sát',
                            date: dateObj,
                            dateStr: item.date || 'N/A',
                            submittedBy: item.employee || 'System',
                            submittedByName: item.employee || 'Hệ thống',
                            items: evidenceList,
                            status: item.incident ? 'Có việc phát sinh' : 'Bình thường',
                            originalData: item
                        });
                    }
                }
            });
        }

        // 2. From external_checkins (Lecturer Check-in)
        if (checkinsData) {
            checkinsData.forEach(item => {
                const evidenceList = item.photoUrls || (item.photoUrl ? [item.photoUrl] : []);
                if (evidenceList.length > 0) {
                    let dateObj = new Date();
                    if (item.timestamp) {
                        dateObj = item.timestamp.seconds ? new Date(item.timestamp.seconds * 1000) : new Date(item.timestamp);
                    }

                    unified.push({
                        id: `checkin-${item.id || Math.random().toString()}`,
                        source: 'checkin',
                        sourceLabel: 'Check-in Giảng viên',
                        title: `${item.lecturerName || item.submittedBy || 'N/A'} - ${item.classId || 'N/A'}`,
                        description: `Check-in tại tọa độ: ${item.location?.latitude?.toFixed(4)}, ${item.location?.longitude?.toFixed(4)}`,
                        date: dateObj,
                        dateStr: format(dateObj, 'dd/MM/yyyy'),
                        submittedBy: item.submittedBy || 'N/A',
                        submittedByName: item.submittedBy || 'N/A',
                        items: evidenceList,
                        status: item.status === 'approved' ? 'Đã duyệt' : (item.status === 'rejected' ? 'Từ chối' : 'Chờ duyệt'),
                        originalData: item
                    });
                }
            });
        }

        // 3. From requests (Tiếp nhận yêu cầu)
        if (requestsData) {
            requestsData.forEach(item => {
                if (item.attachments) {
                    const evidenceList = item.attachments.split('|').filter(Boolean);
                    if (evidenceList.length > 0) {
                        const dateParts = item.requestDate?.split('/') || [];
                        let dateObj = new Date();
                        if (dateParts.length === 3) {
                            dateObj = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
                        } else if (item.createdAt?.toDate) {
                            dateObj = item.createdAt.toDate();
                        }

                        unified.push({
                            id: `request-${item.id}`,
                            source: 'requests',
                            sourceLabel: 'Tiếp nhận yêu cầu',
                            title: `Yêu cầu: ${item.studentName} (${item.studentId})`,
                            description: item.content || 'Hỗ trợ sinh viên',
                            date: dateObj,
                            dateStr: item.requestDate || format(dateObj, 'dd/MM/yyyy'),
                            submittedBy: item.recipient || 'N/A',
                            submittedByName: item.recipient || 'N/A',
                            items: evidenceList,
                            status: item.status || 'Đã tiếp nhận',
                            originalData: item
                        });
                    }
                }
            });
        }

        // 4. From petitions (Tiếp nhận đơn thư)
        if (petitionsData) {
            petitionsData.forEach(item => {
                if (item.evidence) {
                    const evidenceList = item.evidence.split('|').filter(Boolean);
                    if (evidenceList.length > 0) {
                        const dateParts = item.receptionDate?.split('/') || [];
                        let dateObj = new Date();
                        if (dateParts.length === 3) {
                            dateObj = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
                        }

                        unified.push({
                            id: `petition-${item.id}`,
                            source: 'petitions',
                            sourceLabel: 'Tiếp nhận đơn thư',
                            title: `Đơn thư: ${item.citizenName}`,
                            description: item.summary || 'Đơn thư công dân',
                            date: dateObj,
                            dateStr: item.receptionDate || format(dateObj, 'dd/MM/yyyy'),
                            submittedBy: item.recipient || 'N/A',
                            submittedByName: item.recipient || 'N/A',
                            items: evidenceList,
                            status: item.petitionType,
                            originalData: item
                        });
                    }
                }
            });
        }

        // 5. From asset-receptions (Nhận - Trả tài sản)
        if (assetData) {
            assetData.forEach(item => {
                if (item.evidence) {
                    const evidenceList = item.evidence.split('|').filter(Boolean);
                    if (evidenceList.length > 0) {
                        const dateParts = item.receptionDate?.split('/') || [];
                        let dateObj = new Date();
                        if (dateParts.length === 3) {
                            dateObj = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
                        }

                        unified.push({
                            id: `asset-${item.id}`,
                            source: 'asset_check',
                            sourceLabel: 'Nhận - Trả tài sản',
                            title: `Tài sản: ${item.giverName} (${item.entryNumber})`,
                            description: item.content || 'Giao nhận tài sản',
                            date: dateObj,
                            dateStr: item.receptionDate || format(dateObj, 'dd/MM/yyyy'),
                            submittedBy: item.receivingStaff || 'N/A',
                            submittedByName: item.receivingStaff || 'N/A',
                            items: evidenceList,
                            status: item.returnStatus,
                            originalData: item
                        });
                    }
                }
            });
        }

        // 6. From student-violations (Sinh viên vi phạm)
        if (violationsData) {
            violationsData.forEach(item => {
                const evidenceList = [];
                if (item.portraitPhoto) evidenceList.push(`Ảnh chân dung:::${item.portraitPhoto}`);
                if (item.documentPhoto) evidenceList.push(`Ảnh giấy tờ:::${item.documentPhoto}`);
                if (item.signatureBase64) evidenceList.push(`Chữ ký xác nhận:::${item.signatureBase64}`);

                if (evidenceList.length > 0) {
                    let dateObj = new Date();
                    if (item.violationDate) {
                        const parts = item.violationDate.split('-');
                        if (parts.length === 3) dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                    }

                    unified.push({
                        id: `violation-${item.id}`,
                        source: 'violations',
                        sourceLabel: 'Sinh viên vi phạm',
                        title: `Vi phạm: ${item.fullName} (${item.studentId})`,
                        description: item.violationType || 'Vi phạm nội quy',
                        date: dateObj,
                        dateStr: item.violationDate || format(dateObj, 'yyyy-MM-dd'),
                        submittedBy: item.officer || 'N/A',
                        submittedByName: item.officer || 'N/A',
                        items: evidenceList,
                        status: item.signed || 'Chưa ký',
                        originalData: item
                    });
                }
            });
        }

        // Sort by date descending
        return unified.sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [schedulesData, checkinsData, requestsData, petitionsData, assetData, violationsData]);

    // --- Filtering ---
    const filteredEvidence = useMemo(() => {
        return allEvidence.filter(item => {
            const matchesSearch = 
                item.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.submittedByName.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesSource = filterSource === 'all' || item.source === filterSource;
            
            let matchesDate = true;
            if (filterDate) {
                const filterDateObj = new Date(filterDate);
                matchesDate = 
                    item.date.getFullYear() === filterDateObj.getFullYear() &&
                    item.date.getMonth() === filterDateObj.getMonth() &&
                    item.date.getDate() === filterDateObj.getDate();
            }

            return matchesSearch && matchesSource && matchesDate;
        });
    }, [allEvidence, searchTerm, filterSource, filterDate]);

    // --- Pagination ---
    const totalPages = Math.ceil(filteredEvidence.length / itemsPerPage);
    const paginatedItems = filteredEvidence.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handlePageChange = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    // --- Helpers ---
    const parseEvidenceItem = (item: string) => {
        if (item.includes(':::')) {
            const parts = item.split(':::');
            return { name: parts[0], data: parts.slice(1).join(':::') };
        }
        return { name: '', data: item };
    };

    const getFileIcon = (item: string) => {
        const { data } = parseEvidenceItem(item);
        if (data.startsWith('data:image') || data.includes('firebasestorage') || data.includes('googleusercontent')) {
            return <ImageIcon className="h-10 w-10 text-blue-500/50" />;
        }
        return <FileText className="h-10 w-10 text-slate-400" />;
    };

    // --- Handlers ---
    const handleDelete = async () => {
        if (!deleteTarget || !firestore) return;

        setIsDeleting(true);
        try {
            const docId = deleteTarget.id.split('-').slice(1).join('-');
            let collectionName = '';
            let updateField = '';

            switch (deleteTarget.source) {
                case 'direct':
                case 'online':
                case 'homeroom':
                case 'practice':
                case 'exams':
                    collectionName = 'schedules';
                    updateField = 'evidence';
                    break;
                case 'checkin':
                    collectionName = 'external_checkins';
                    updateField = 'photoUrls'; // and possibly photoUrl
                    break;
                case 'requests':
                    collectionName = 'requests';
                    updateField = 'attachments';
                    break;
                case 'petitions':
                    collectionName = 'petitions';
                    updateField = 'evidence';
                    break;
                case 'asset_check':
                    collectionName = 'asset-receptions';
                    updateField = 'evidence';
                    break;
                case 'violations':
                    collectionName = 'student-violations';
                    // This is complex as it has 3 fields. We'll clear all photos.
                    break;
            }

            if (collectionName) {
                const docRef = doc(firestore, collectionName, docId);
                if (deleteTarget.source === 'violations') {
                    await updateDoc(docRef, {
                        portraitPhoto: deleteField(),
                        documentPhoto: deleteField(),
                        signatureBase64: deleteField()
                    });
                } else if (deleteTarget.source === 'checkin') {
                    await updateDoc(docRef, {
                        photoUrls: deleteField(),
                        photoUrl: deleteField()
                    });
                } else {
                    await updateDoc(docRef, {
                        [updateField]: deleteField()
                    });
                }

                toast({
                    title: "Đã xóa minh chứng",
                    description: `Minh chứng từ ${deleteTarget.sourceLabel} đã được gỡ bỏ thành công.`,
                });
            }
            setDeleteTarget(null);
        } catch (error) {
            console.error("Error deleting evidence:", error);
            toast({
                title: "Lỗi khi xóa",
                description: "Không thể xóa minh chứng. Vui lòng thử lại sau.",
                variant: "destructive"
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const isImage = (item: string) => {
        const { data } = parseEvidenceItem(item);
        return data.startsWith('data:image') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(data) || data.includes('photo') || data.includes('image');
    };

    return (
        <ClientOnly>
            <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 bg-slate-50/50 min-h-screen">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <PageHeader 
                        title="Quản lý Minh chứng" 
                        description="Kho lưu trữ tập trung tất cả hình ảnh và tài liệu minh chứng từ các hoạt động giám sát." 
                        icon={Camera}
                    />
                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border shadow-sm self-start">
                        <Button 
                            variant={viewMode === 'grid' ? 'default' : 'ghost'} 
                            size="sm" 
                            className="h-8" 
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid className="h-4 w-4 mr-2" /> Lưới
                        </Button>
                        <Button 
                            variant={viewMode === 'list' ? 'default' : 'ghost'} 
                            size="sm" 
                            className="h-8" 
                            onClick={() => setViewMode('list')}
                        >
                            <List className="h-4 w-4 mr-2" /> Danh sách
                        </Button>
                    </div>
                </div>

                {/* Filters Row */}
                <Card className="border-none shadow-sm overflow-hidden">
                    <CardContent className="p-4 flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Tìm kiếm theo lớp, phòng, người gửi..." 
                                className="pl-9 h-10"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="w-[200px]">
                            <Select value={filterSource} onValueChange={setFilterSource}>
                                <SelectTrigger className="h-10">
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-4 w-4 text-muted-foreground" />
                                        <SelectValue placeholder="Phân loại" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả nguồn</SelectItem>
                                    <SelectItem value="direct">Lớp học trực tiếp</SelectItem>
                                    <SelectItem value="online">Lớp học online</SelectItem>
                                    <SelectItem value="homeroom">Cố vấn học tập</SelectItem>
                                    <SelectItem value="practice">Thực hành ngoài</SelectItem>
                                    <SelectItem value="exams">Thi kết thúc môn</SelectItem>
                                    <SelectItem value="checkin">Check-in Giảng viên</SelectItem>
                                    <SelectItem value="requests">Tiếp nhận yêu cầu</SelectItem>
                                    <SelectItem value="petitions">Tiếp nhận đơn thư</SelectItem>
                                    <SelectItem value="asset_check">Nhận - Trả tài sản</SelectItem>
                                    <SelectItem value="violations">Sinh viên vi phạm</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-[180px] relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                            <Input 
                                type="date" 
                                className="pl-9 h-10 cursor-pointer"
                                value={filterDate}
                                onChange={(e) => setFilterDate(e.target.value)}
                            />
                        </div>
                        {(searchTerm || filterSource !== 'all' || filterDate) && (
                            <Button variant="ghost" size="sm" onClick={() => { setSearchTerm(''); setFilterSource('all'); setFilterDate(''); }} className="h-10 px-2 text-destructive hover:bg-destructive/10">
                                <X className="h-4 w-4 mr-2" /> Xóa lọc
                            </Button>
                        )}
                        <div className="ml-auto text-sm text-muted-foreground font-medium bg-slate-100 px-3 py-1.5 rounded-full">
                            Tổng cộng: <span className="text-blue-600 font-bold">{filteredEvidence.length}</span> minh chứng
                        </div>
                    </CardContent>
                </Card>

                {/* Content Area */}
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <div className="h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-muted-foreground animate-pulse">Đang nạp dữ liệu minh chứng...</p>
                    </div>
                ) : filteredEvidence.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-32 bg-white rounded-xl border border-dashed border-slate-300">
                        <div className="bg-slate-100 p-6 rounded-full mb-4">
                            <ImageIcon className="h-12 w-12 text-slate-300" />
                        </div>
                        <p className="text-slate-500 font-medium text-lg">Không tìm thấy minh chứng nào phù hợp</p>
                        <p className="text-slate-400 text-sm">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                        <Button variant="link" onClick={() => { setSearchTerm(''); setFilterSource('all'); setFilterDate(''); }} className="mt-2">
                            Xóa tất cả bộ lọc
                        </Button>
                    </div>
                ) : viewMode === 'grid' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {paginatedItems.map((item) => (
                            <Card 
                                key={item.id} 
                                className="group overflow-hidden border border-slate-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300 cursor-pointer"
                                onClick={() => setSelectedEvidence(item)}
                            >
                                <div className="relative aspect-video bg-slate-100 overflow-hidden">
                                    {isImage(item.items[0]) ? (
                                        <img 
                                            src={item.items[0]} 
                                            alt={item.title} 
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center p-6 text-slate-400">
                                            {getFileIcon(item.items[0])}
                                            <p className="text-[10px] mt-2 font-mono truncate max-w-full">{parseEvidenceItem(item.items[0]).name || 'Tệp đính kèm'}</p>
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                        <div className="bg-white/90 backdrop-blur p-2 rounded-full shadow-lg scale-90 group-hover:scale-100 transition-all">
                                            <Eye className="h-5 w-5 text-blue-600" />
                                        </div>
                                    </div>
                                    <div className="absolute top-2 left-2">
                                        <Badge className={cn("text-[10px] shadow-sm", 
                                            item.source === 'direct' ? 'bg-blue-600' : 
                                            item.source === 'online' ? 'bg-purple-600' : 
                                            item.source === 'homeroom' ? 'bg-amber-600' : 
                                            item.source === 'practice' ? 'bg-emerald-600' : 
                                            item.source === 'exams' ? 'bg-rose-600' : 
                                            item.source === 'checkin' ? 'bg-green-600' : 
                                            item.source === 'requests' ? 'bg-sky-600' : 
                                            item.source === 'petitions' ? 'bg-teal-600' : 
                                            item.source === 'asset_check' ? 'bg-orange-600' : 
                                            item.source === 'violations' ? 'bg-red-600' : 'bg-slate-600'
                                        )}>
                                            {item.sourceLabel}
                                        </Badge>
                                    </div>
                                    {item.items.length > 1 && (
                                        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded backdrop-blur">
                                            +{item.items.length - 1} ảnh
                                        </div>
                                    )}
                                </div>
                                <CardContent className="p-4 space-y-2">
                                    <h3 className="font-bold text-sm text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{item.title}</h3>
                                    <p className="text-xs text-slate-500 line-clamp-2 min-h-[2rem] leading-relaxed">{item.description}</p>
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                                        <div className="flex items-center gap-1.5 text-slate-400">
                                            <User className="h-3 w-3" />
                                            <span className="text-[10px] font-medium">{item.submittedByName}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                            <div className="flex items-center gap-1.5 text-slate-400 ml-1">
                                                <Clock className="h-3 w-3" />
                                                <span className="text-[10px] font-medium">{item.dateStr}</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <Card className="border-none shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-[80px]">Xem</TableHead>
                                    <TableHead className="w-[180px]">Phân loại</TableHead>
                                    <TableHead>Đối tượng / Nội dung</TableHead>
                                    <TableHead className="w-[150px]">Người cập nhật</TableHead>
                                    <TableHead className="w-[120px]">Ngày</TableHead>
                                    <TableHead className="w-[120px] text-right sticky right-0 z-20 bg-slate-50 shadow-[-2px_0_5px_rgba(0,0,0,0.1)] border-l border-blue-400">Tác vụ</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedItems.map((item) => (
                                    <TableRow key={item.id} className="hover:bg-blue-50 transition-colors group cursor-pointer" onClick={() => setSelectedEvidence(item)}>
                                        <TableCell>
                                            <div className="h-10 w-12 rounded border bg-slate-100 overflow-hidden relative">
                                                {isImage(item.items[0]) ? (
                                                    <img src={item.items[0]} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-slate-300">
                                                        <FileText className="h-5 w-5" />
                                                        <span className="text-[8px] absolute bottom-1 text-slate-400 truncate w-full px-1 text-center">{parseEvidenceItem(item.items[0]).name}</span>
                                                    </div>
                                                )}
                                                {item.items.length > 1 && (
                                                    <div className="absolute bottom-0 right-0 bg-blue-600 text-[8px] text-white px-0.5 rounded-tl font-bold">
                                                        +{item.items.length - 1}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={cn("text-[10px] font-bold border-2", 
                                                item.source === 'direct' ? 'text-blue-600 border-blue-100 bg-blue-50' : 
                                                item.source === 'online' ? 'text-purple-600 border-purple-100 bg-purple-50' : 
                                                item.source === 'homeroom' ? 'text-amber-600 border-amber-100 bg-amber-50' : 
                                                item.source === 'practice' ? 'text-emerald-600 border-emerald-100 bg-emerald-50' : 
                                                item.source === 'exams' ? 'text-rose-600 border-rose-100 bg-rose-50' : 
                                                item.source === 'checkin' ? 'text-green-600 border-green-100 bg-green-50' : 
                                                item.source === 'requests' ? 'text-sky-600 border-sky-100 bg-sky-50' : 
                                                item.source === 'petitions' ? 'text-teal-600 border-teal-100 bg-teal-50' : 
                                                item.source === 'asset_check' ? 'text-orange-600 border-orange-100 bg-orange-50' : 
                                                item.source === 'violations' ? 'text-red-600 border-red-100 bg-red-50' : 'text-slate-600 border-slate-100 bg-slate-50'
                                            )}>
                                                {item.sourceLabel}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-sm text-slate-800">{item.title}</span>
                                                <span className="text-xs text-slate-500 truncate max-w-[400px]">{item.description}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-xs font-medium text-slate-600">{item.submittedByName}</TableCell>
                                        <TableCell className="text-xs text-slate-500">{item.dateStr}</TableCell>
                                        <TableCell className="text-right sticky right-0 z-10 bg-white group-hover:bg-blue-50 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] border-l">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-100">
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(item); }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                )}

                {/* Delete Confirmation Dialog */}
                <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600">
                                <AlertCircle className="h-5 w-5" /> Xác nhận xóa minh chứng
                            </DialogTitle>
                            <DialogDescription className="pt-2">
                                Bạn có chắc chắn muốn xóa tất cả minh chứng của <strong>{deleteTarget?.title}</strong>? 
                                <br /><br />
                                <span className="text-destructive font-medium">Hành động này không thể hoàn tác và sẽ gỡ bỏ minh chứng khỏi hồ sơ gốc.</span>
                            </DialogDescription>
                        </DialogHeader>
                        <Separator />
                        <div className="flex justify-end gap-3 mt-4">
                            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Hủy</Button>
                            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="min-w-[80px]">
                                {isDeleting ? (
                                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : 'Xác nhận xóa'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border mt-6">
                        <div className="text-sm text-muted-foreground hidden sm:block">
                            Hiển thị <span className="font-bold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> đến <span className="font-bold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredEvidence.length)}</span> của <span className="font-bold text-slate-700">{filteredEvidence.length}</span> mục
                        </div>
                        <div className="flex items-center gap-2 mx-auto sm:mx-0">
                            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handlePageChange(1)} disabled={currentPage === 1}><ChevronsLeft className="h-4 w-4" /></Button>
                            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
                            <div className="flex items-center gap-1 mx-2">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum = currentPage;
                                    if (currentPage <= 3) pageNum = i + 1;
                                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = currentPage - 2 + i;
                                    
                                    if (pageNum <= 0 || pageNum > totalPages) return null;

                                    return (
                                        <Button 
                                            key={pageNum} 
                                            variant={currentPage === pageNum ? 'default' : 'ghost'} 
                                            size="sm" 
                                            className={cn("h-9 w-9 font-bold", currentPage === pageNum ? "bg-blue-600 shadow-md" : "text-slate-600")}
                                            onClick={() => handlePageChange(pageNum)}
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}
                            </div>
                            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages}><ChevronsRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                )}

                {/* Detail Dialog */}
                <Dialog open={!!selectedEvidence} onOpenChange={(open) => !open && setSelectedEvidence(null)}>
                    <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden flex flex-col bg-slate-50 border-none shadow-2xl">
                        <DialogHeader className="p-6 bg-white border-b shrink-0">
                            <div className="flex items-center justify-between pr-8">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge className={cn("text-[10px] font-bold shadow-sm", 
                                            selectedEvidence?.source === 'direct' ? 'bg-blue-600' : 
                                            selectedEvidence?.source === 'online' ? 'bg-purple-600' : 
                                            selectedEvidence?.source === 'homeroom' ? 'bg-amber-600' : 
                                            selectedEvidence?.source === 'practice' ? 'bg-emerald-600' : 
                                            selectedEvidence?.source === 'exams' ? 'bg-rose-600' : 
                                            selectedEvidence?.source === 'checkin' ? 'bg-green-600' : 
                                            selectedEvidence?.source === 'requests' ? 'bg-sky-600' : 
                                            selectedEvidence?.source === 'petitions' ? 'bg-teal-600' : 
                                            selectedEvidence?.source === 'asset_check' ? 'bg-orange-600' : 
                                            selectedEvidence?.source === 'violations' ? 'bg-red-600' : 'bg-slate-600'
                                        )}>
                                            {selectedEvidence?.sourceLabel}
                                        </Badge>
                                        <Badge variant="outline" className="text-[10px] border-slate-200 bg-white">
                                            {selectedEvidence?.items.length} minh chứng
                                        </Badge>
                                    </div>
                                    <DialogTitle className="text-2xl font-bold text-slate-800">{selectedEvidence?.title}</DialogTitle>
                                    <DialogDescription className="text-slate-500 font-medium">
                                        Cập nhật vào {selectedEvidence?.dateStr} bởi {selectedEvidence?.submittedByName}
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>
                        
                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                            {/* Left: Gallery */}
                            <div className="flex-1 bg-black/5 p-6 overflow-y-auto custom-scrollbar">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {selectedEvidence?.items.map((url, idx) => (
                                        <div 
                                            key={idx} 
                                            className="group relative bg-white rounded-xl border p-2 shadow-sm hover:shadow-md transition-all cursor-zoom-in overflow-hidden"
                                            onClick={() => setPreviewItem(url)}
                                        >
                                            {isImage(url) ? (
                                                <div className="aspect-[4/3] rounded-lg overflow-hidden">
                                                    <img src={parseEvidenceItem(url).data} alt={`Evidence ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                </div>
                                            ) : (
                                                <div className="aspect-[4/3] flex flex-col items-center justify-center gap-3 bg-slate-50 rounded-lg text-slate-400">
                                                    <FileText className="h-12 w-12" />
                                                    <span className="text-[10px] font-mono px-4 text-center break-all">{url.substring(0, 80)}...</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all">
                                                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full shadow-lg bg-white/90 backdrop-blur">
                                                    <Eye className="h-4 w-4 text-blue-600" />
                                                </Button>
                                            </div>
                                            <div className="mt-2 px-1 py-1 flex items-center justify-between">
                                                <span className="text-[10px] font-bold text-slate-500 truncate max-w-[150px]">{parseEvidenceItem(url).name || `Minh chứng #${idx + 1}`}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6" asChild onClick={(e) => e.stopPropagation()}>
                                                    <a href={parseEvidenceItem(url).data} download={parseEvidenceItem(url).name || `evidence_${idx + 1}`}><Download className="h-3.5 w-3.5" /></a>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Right: Info Panel */}
                            <div className="w-full md:w-80 bg-white border-l p-6 shrink-0 space-y-6 overflow-y-auto">
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Thông tin chi tiết</h4>
                                    
                                    <div className="space-y-1">
                                        <Label className="text-[10px] text-muted-foreground uppercase font-bold">Mô tả / Sự cố</Label>
                                        <p className="text-sm font-medium text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                                            "{selectedEvidence?.description}"
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 pt-2">
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1.5">
                                                <Calendar className="h-3 w-3 text-blue-500" /> Ngày ghi nhận
                                            </Label>
                                            <p className="text-sm font-bold text-slate-800">{selectedEvidence?.dateStr}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1.5">
                                                <User className="h-3 w-3 text-indigo-500" /> Người thực hiện
                                            </Label>
                                            <p className="text-sm font-bold text-slate-800">{selectedEvidence?.submittedByName}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1.5">
                                                <MapPin className="h-3 w-3 text-red-500" /> Tọa độ xác thực
                                            </Label>
                                            {selectedEvidence?.originalData?.location ? (
                                                <div className="flex flex-col gap-1">
                                                    <p className="text-[11px] font-mono font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded border">
                                                        {selectedEvidence.originalData.location.latitude.toFixed(6)}, {selectedEvidence.originalData.location.longitude.toFixed(6)}
                                                    </p>
                                                    <Button variant="link" size="sm" className="h-auto p-0 justify-start text-[10px]" asChild>
                                                        <a href={`https://www.google.com/maps/search/?api=1&query=${selectedEvidence.originalData.location.latitude},${selectedEvidence.originalData.location.longitude}`} target="_blank" rel="noreferrer">
                                                            <ExternalLink className="h-3 w-3 mr-1" /> Mở bản đồ vệ tinh
                                                        </a>
                                                    </Button>
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic">Không có dữ liệu GPS</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b pb-2">Tác vụ</h4>
                                    <div className="grid grid-cols-1 gap-2">
                                        <Button className="w-full bg-blue-600 hover:bg-blue-700 shadow-sm" asChild>
                                            <a href={parseEvidenceItem(selectedEvidence?.items[0] || '').data} target="_blank" rel="noreferrer">
                                                <ExternalLink className="h-4 w-4 mr-2" /> Mở minh chứng gốc
                                            </a>
                                        </Button>
                                        <Button variant="outline" className="w-full border-slate-200" onClick={() => setSelectedEvidence(null)}>
                                            Đóng chi tiết
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Lightbox Preview */}
                <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
                    <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black/90 border-none flex items-center justify-center overflow-hidden">
                        <VisuallyHidden><DialogTitle>Preview</DialogTitle></VisuallyHidden>
                        <div className="relative w-full h-full flex items-center justify-center p-4">
                            {previewItem && isImage(previewItem) ? (
                                <img src={previewItem} alt="Fullscreen preview" className="max-w-full max-h-full object-contain shadow-2xl rounded-sm" />
                            ) : previewItem && (
                                <div className="bg-white p-8 rounded-lg shadow-xl max-w-lg w-full flex flex-col items-center gap-6">
                                    <div className="bg-slate-100 p-8 rounded-full">
                                        <FileText className="h-20 w-20 text-slate-400" />
                                    </div>
                                    <div className="text-center space-y-2">
                                        <h3 className="text-lg font-bold text-slate-800">Tài liệu đính kèm</h3>
                                        <p className="text-sm text-slate-500">Tài liệu này không thể xem trực tiếp ở chế độ toàn màn hình.</p>
                                    </div>
                                    <div className="flex gap-3 w-full">
                                        <Button className="flex-1" asChild>
                                            <a href={previewItem} target="_blank" rel="noreferrer">Mở liên kết gốc</a>
                                        </Button>
                                        <Button variant="outline" className="flex-1" asChild>
                                            <a href={previewItem} download>Tải xuống tệp</a>
                                        </Button>
                                    </div>
                                </div>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => setPreviewItem(null)} className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/10 rounded-full h-10 w-10">
                                <X className="h-6 w-6" />
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <style jsx global>{`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 6px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(0, 0, 0, 0.1);
                        border-radius: 10px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: rgba(0, 0, 0, 0.2);
                    }
                `}</style>
            </div>
        </ClientOnly>
    );
}
