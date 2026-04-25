"use client";

import { useEffect, useState, use } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Loader2, AlertCircle, LogOut, Download, Table, ListChecks } from 'lucide-react';

// Initialize Firebase client-side
if (getApps().length === 0) {
    initializeApp(firebaseConfig);
}

const auth = getAuth();
const provider = new GoogleAuthProvider();

export default function PollPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const id = resolvedParams?.id || "";
    
    // Check if Lecturer (via URL param)
    const [isLecturer, setIsLecturer] = useState(false);
    
    const [poll, setPoll] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [timeLeft, setTimeLeft] = useState<string>("");
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        setIsLecturer(searchParams.get('role') === 'lecturer');
    }, []);

    // Track Auth state
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!id) {
            setError("ID bình chọn không hợp lệ.");
            setLoading(false);
            return;
        }

        const fetchPoll = async () => {
            try {
                const res = await fetch(`/api/v1/polls/${id}`);
                const result = await res.json();
                if (result.success && result.data) {
                    setPoll(result.data);
                } else {
                    setError(result.message || "Không tìm thấy dữ liệu bình chọn.");
                }
            } catch (err: any) {
                setError("Lỗi kết nối: " + (err.message || "Unknown error"));
            } finally {
                setLoading(false);
            }
        };
        fetchPoll();
    }, [id]);

    // Timer effect
    useEffect(() => {
        if (!poll?.endTime) return;

        const interval = setInterval(() => {
            const end = new Date(poll.endTime).getTime();
            const now = new Date().getTime();
            const diff = end - now;

            if (diff <= 0) {
                setTimeLeft("ĐÃ KẾT THÚC");
                setIsExpired(true);
                clearInterval(interval);
            } else {
                const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const secs = Math.floor((diff % (1000 * 60)) / 1000);
                setTimeLeft(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [poll]);

    const handleGoogleSignIn = async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (err) {
            alert("Lỗi đăng nhập Google!");
        }
    };

    const handleVote = async (index: number) => {
        if (!id || !user || isExpired) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/v1/polls/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    voterName: user.displayName || user.email?.split('@')[0] || "Người dùng", 
                    voterEmail: user.email,
                    optionIndex: index 
                })
            });
            const result = await res.json();
            if (result.success) {
                const refreshRes = await fetch(`/api/v1/polls/${id}`);
                const refreshResult = await refreshRes.json();
                if (refreshResult.success) {
                    setPoll(refreshResult.data);
                }
            }
        } catch (err) {
            alert("Lỗi khi gửi bình chọn!");
        } finally {
            setSubmitting(false);
        }
    };

    const downloadResults = () => {
        if (!poll?.voters) return;
        
        const votersMap = poll.voters;
        const options = poll.options || [];
        
        let csvContent = "\uFEFF"; 
        csvContent += "Email,Họ Tên,Lựa chọn,Nội dung lựa chọn,Thời gian\n";
        
        Object.entries(votersMap).forEach(([key, val]: [string, any]) => {
            let email = key.replace(/_/g, '.');
            let name = "";
            let idx = -1;
            let time = "";

            if (typeof val === 'object' && val !== null) {
                name = val.name || "";
                idx = Number(val.index);
                time = val.timestamp ? new Date(val.timestamp).toLocaleString('vi-VN') : "";
            } else {
                // Legacy support
                name = email.split('@')[0];
                idx = Number(val);
            }

            const optionText = options[idx] ? options[idx].replace(/<[^>]*>/g, '') : "N/A";
            csvContent += `${email},${name},${idx + 1},"${optionText}",${time}\n`;
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Ket_qua_binh_chon_${id}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
    );

    if (error || !poll) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-slate-500 font-medium text-center">
            <AlertCircle className="h-10 w-10 text-red-400 mb-4" />
            <p className="max-w-xs">{error || "Không tìm thấy bình chọn hoặc đã hết hạn."}</p>
            <div className="mt-4 text-[10px] text-slate-300 font-mono">ID: {id}</div>
            <Button variant="ghost" className="mt-6 text-blue-600 font-bold" onClick={() => window.location.reload()}>Thử lại</Button>
        </div>
    );

    const votersMap = poll?.voters || {};
    const voterEntries = Object.entries(votersMap);
    const totalVotes = voterEntries.length;
    
    const votesByOption: Record<number, {name: string, email: string}[]> = {};
    voterEntries.forEach(([key, val]: [string, any]) => {
        let email = key.replace(/_/g, '.');
        let name = "";
        let idx = -1;

        if (typeof val === 'object' && val !== null) {
            name = val.name || email.split('@')[0];
            idx = Number(val.index);
        } else {
            name = email.split('@')[0];
            idx = Number(val);
        }

        if (!votesByOption[idx]) votesByOption[idx] = [];
        votesByOption[idx].push({ name, email });
    });

    const currentUserVoteKey = user?.email ? user.email.replace(/\./g, '_') : null;
    const currentUserVote = currentUserVoteKey ? (votersMap[currentUserVoteKey]?.index ?? (typeof votersMap[currentUserVoteKey] === 'number' ? votersMap[currentUserVoteKey] : undefined)) : undefined;

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 font-sans gap-6" translate="no">
            <Card className="w-full max-w-md shadow-2xl border-none overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className={`p-2 text-center text-[10px] font-black uppercase tracking-[0.3em] ${isExpired ? 'bg-red-500' : 'bg-amber-500'} text-white`}>
                    {isExpired ? 'Cuộc bình chọn đã đóng' : `Thời gian còn lại: ${timeLeft}`}
                </div>

                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
                    <div className="flex justify-between items-center mb-2">
                        <span className="bg-white/20 px-2 py-1 rounded text-white text-[10px] font-bold uppercase tracking-tight">HỆ THỐNG BÌNH CHỌN</span>
                        <div className="flex items-center gap-1 text-[10px] font-bold opacity-80">
                            <Users className="h-3 w-3" /> {totalVotes} phiếu
                        </div>
                    </div>
                    <div 
                        className="text-xl font-black leading-tight mb-1 [&_*]:!bg-transparent [&_*]:!border-none [&_*]:!outline-none"
                        dangerouslySetInnerHTML={{ __html: poll?.question || poll?.content || "Câu hỏi bình chọn" }}
                    />
                    <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wider">
                        {(poll?.classId || "").toString()} • {(poll?.lecturer || "").toString()}
                    </p>
                </div>
                
                <CardContent className="p-6">
                    {!user ? (
                        <div className="space-y-6 py-4 text-center">
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-slate-800 tracking-tight italic">CHỐNG GIẢ MẠO DANH TÍNH</h3>
                                <p className="text-slate-500 text-xs px-4">Vui lòng đăng nhập bằng tài khoản Google để tiếp tục.</p>
                            </div>
                            
                            <Button 
                                onClick={handleGoogleSignIn}
                                className="w-full h-14 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-100 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 font-bold group"
                            >
                                <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 48 48">
                                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                                </svg>
                                ĐĂNG NHẬP GOOGLE
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-2xl border border-emerald-100 shadow-inner">
                                <div className="text-xs">
                                    <span className="text-emerald-500 font-black uppercase block text-[8px] tracking-[0.2em] mb-1">Đã xác thực</span>
                                    <span className="text-emerald-700 font-black text-sm truncate max-w-[180px] block">{user.displayName}</span>
                                </div>
                                <button className="text-slate-400 hover:text-red-500 transition-colors" onClick={() => signOut(auth)}>
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {(poll?.options || []).map((option: any, index: number) => {
                                    const voters = votesByOption[index] || [];
                                    const voteCount = voters.length;
                                    const percentage = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                                    const isSelected = currentUserVote === index;
                                    
                                    return (
                                        <div key={index} className="space-y-2">
                                            <Button 
                                                variant="outline" 
                                                className={`w-full justify-start h-auto min-h-[56px] py-3 px-4 border-2 transition-all relative overflow-hidden group rounded-2xl ${
                                                    isSelected 
                                                    ? 'border-blue-500 bg-blue-50/30 text-blue-700 shadow-md shadow-blue-100' 
                                                    : 'border-slate-100 hover:border-blue-200 text-slate-700 hover:bg-white'
                                                }`}
                                                onClick={() => handleVote(index)}
                                                disabled={submitting || isExpired}
                                            >
                                                <div className={`absolute left-0 top-0 bottom-0 transition-all duration-1000 ${isSelected ? 'bg-blue-500/10' : 'bg-slate-500/5'}`} style={{ width: `${percentage}%` }} />
                                                <div className="flex items-center justify-between w-full z-10 gap-3">
                                                    <div className="flex items-start gap-4 text-left">
                                                        <div className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black mt-0.5 ${isSelected ? 'border-blue-500 bg-blue-500 text-white shadow-lg' : 'border-slate-200 bg-white text-slate-400'}`}>
                                                            {isSelected ? '✓' : index + 1}
                                                        </div>
                                                        <div className="font-bold text-sm leading-snug pt-1 [&_*]:!bg-transparent [&_*]:!border-none [&_*]:!outline-none" dangerouslySetInnerHTML={{ __html: (option || "").toString() }} />
                                                    </div>
                                                    <div className="text-right shrink-0">
                                                        <div className="font-black text-blue-600 text-sm">{percentage}%</div>
                                                        <div className="text-[9px] text-slate-400 font-bold uppercase">{voteCount} phiếu</div>
                                                    </div>
                                                </div>
                                            </Button>
                                            
                                            {isLecturer && (
                                                <div className="px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 animate-in fade-in slide-in-from-top-1 duration-300 space-y-2">
                                                    <div className="flex justify-between items-center px-1">
                                                        <span className="text-[8px] font-black uppercase text-slate-400 tracking-wider">Danh sách bình chọn ({voters.length})</span>
                                                        <ListChecks className="h-3 w-3 text-slate-300" />
                                                    </div>
                                                    {voters.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {voters.map((v, vi) => (
                                                                <div key={vi} className="text-[9px] font-bold bg-white text-slate-600 px-2 py-1 rounded-lg border border-slate-200 flex items-center gap-1.5 shadow-sm">
                                                                    <div className="w-1 h-1 rounded-full bg-blue-500" />
                                                                    {v.name}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-[9px] text-slate-400 italic px-1">Chưa có ai chọn phương án này.</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {!isLecturer && (
                                <div className="pt-6 border-t border-slate-100 text-center space-y-4">
                                    <p className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.3em] italic">
                                        {isExpired ? "Bình chọn đã kết thúc" : "Lựa chọn sẽ được cập nhật ngay lập tức"}
                                    </p>
                                    
                                    <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="text-[10px] text-slate-400 hover:text-blue-600 font-bold gap-2 uppercase tracking-tight"
                                        onClick={() => window.location.search = '?role=lecturer'}
                                    >
                                        <Table className="h-3 w-3" /> Xem thống kê & Tải kết quả (Dành cho Giảng viên)
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* LECTURER TOOLS SECTION - FULL WIDTH DASHBOARD */}
            {isLecturer && (
                <div className="w-full max-w-6xl space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-12">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <Table className="h-6 w-6 text-blue-600" />
                            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">BẢNG ĐIỀU KHIỂN BÌNH CHỌN (GIẢNG VIÊN)</h2>
                        </div>
                        <Button 
                            variant="default" 
                            className="bg-emerald-600 hover:bg-emerald-700 font-bold gap-2 rounded-xl shadow-lg shadow-emerald-100"
                            onClick={downloadResults}
                        >
                            <Download className="h-4 w-4" /> Tải về CSV
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* CỘT TRÁI: CHƯA BÌNH CHỌN */}
                        <Card className="border-none shadow-xl overflow-hidden rounded-2xl flex flex-col h-[600px]">
                            <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
                                <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4 text-amber-400" /> 
                                    Chưa bình chọn ({
                                        (poll.attendanceList || []).filter((name: string) => 
                                            !Object.values(votersMap).some((v: any) => (v.name === name))
                                        ).length
                                    })
                                </h3>
                            </div>
                            <CardContent className="p-0 overflow-y-auto flex-1 bg-slate-50">
                                <div className="divide-y divide-slate-200">
                                    {((poll.attendanceList || []).filter((name: string) => 
                                        !Object.values(votersMap).some((v: any) => (v.name === name))
                                    )).length === 0 ? (
                                        <div className="p-12 text-center text-slate-400 italic text-sm">
                                            {poll.attendanceList?.length > 0 ? "🎉 Tất cả thành viên đã bình chọn." : "Chưa có danh sách tham gia để so khớp."}
                                        </div>
                                    ) : (
                                        (poll.attendanceList || []).filter((name: string) => 
                                            !Object.values(votersMap).some((v: any) => (v.name === name))
                                        ).map((name: string, i: number) => (
                                            <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-white transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                        {i + 1}
                                                    </div>
                                                    <span className="font-bold text-slate-700">{name}</span>
                                                </div>
                                                <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    Nhắc nhở
                                                </Button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* CỘT PHẢI: ĐÃ BÌNH CHỌN */}
                        <Card className="border-none shadow-xl overflow-hidden rounded-2xl flex flex-col h-[600px]">
                            <div className="bg-blue-600 p-4 text-white flex justify-between items-center">
                                <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                                    <ListChecks className="h-4 w-4" /> 
                                    Đã bình chọn ({voterEntries.length})
                                </h3>
                            </div>
                            <CardContent className="p-0 overflow-y-auto flex-1 bg-white">
                                <div className="divide-y divide-slate-100">
                                    {voterEntries.length === 0 ? (
                                        <div className="p-12 text-center text-slate-400 italic text-sm">
                                            Chưa có ai bình chọn.
                                        </div>
                                    ) : (
                                        voterEntries.map(([key, val]: [string, any], i) => {
                                            let email = key.replace(/_/g, '.');
                                            let name = val.name || email.split('@')[0];
                                            let idx = Number(val.index);

                                            return (
                                                <div key={i} className="px-6 py-4 flex items-center justify-between hover:bg-blue-50/30 transition-colors">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-800">{name}</span>
                                                        <span className="text-[10px] text-slate-400">{email}</span>
                                                    </div>
                                                    <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-100 max-w-[220px]">
                                                        <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] shrink-0">{idx + 1}</span>
                                                        <span className="truncate" dangerouslySetInnerHTML={{ __html: poll.options[idx] || "" }}></span>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
