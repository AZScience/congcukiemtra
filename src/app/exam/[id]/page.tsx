"use client";

import { useEffect, useState, use } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, LogOut, CheckCircle2, Clock, HelpCircle, Trophy } from 'lucide-react';

// Initialize Firebase client-side
if (getApps().length === 0) {
    initializeApp(firebaseConfig);
}

const auth = getAuth();
const provider = new GoogleAuthProvider();

export default function ExamPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params);
    const id = resolvedParams?.id || "";
    
    const [exam, setExam] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [score, setScore] = useState<number>(0);

    // Track Auth state
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!id) {
            setError("ID bài kiểm tra không hợp lệ.");
            setLoading(false);
            return;
        }

        const fetchExam = async () => {
            try {
                const res = await fetch(`/api/v1/exams/${id}`);
                const result = await res.json();
                if (result.success && result.data) {
                    setExam(result.data);
                    setTimeLeft((result.data.duration || 15) * 60);
                } else {
                    setError(result.message || "Không tìm thấy dữ liệu bài kiểm tra.");
                }
            } catch (err: any) {
                setError("Lỗi kết nối: " + (err.message || "Unknown error"));
            } finally {
                setLoading(false);
            }
        };
        fetchExam();
    }, [id]);

    // Timer effect
    useEffect(() => {
        if (!exam || submitted || timeLeft <= 0) return;

        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    handleSubmit();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [exam, submitted, timeLeft]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleGoogleSignIn = async () => {
        try {
            await signInWithPopup(auth, provider);
        } catch (err) {
            alert("Lỗi đăng nhập Google!");
        }
    };

    const handleSelectOption = (qIndex: number, optIndex: number) => {
        if (submitted) return;
        setAnswers(prev => ({ ...prev, [qIndex]: optIndex }));
    };

    const handleSubmit = async () => {
        if (submitted || !user) return;
        setSubmitting(true);
        
        try {
            // Tính điểm sơ bộ
            let correctCount = 0;
            exam.questions.forEach((q: any, idx: number) => {
                if (answers[idx] === q.correct) correctCount++;
            });
            const finalScore = (correctCount / exam.questions.length) * 10;
            setScore(finalScore);

            // Gửi kết quả về server (Có thể mở rộng API để lưu kết quả)
            /*
            await fetch(`/api/v1/exams/${id}/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentName: user.displayName,
                    studentEmail: user.email,
                    answers,
                    score: finalScore
                })
            });
            */
            
            setSubmitted(true);
        } catch (err) {
            alert("Lỗi khi nộp bài!");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
    );

    if (error || !exam) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 text-slate-500 font-medium text-center">
            <AlertCircle className="h-10 w-10 text-red-400 mb-4" />
            <p className="max-w-xs">{error || "Không tìm thấy bài kiểm tra."}</p>
            <Button variant="ghost" className="mt-6 text-blue-600 font-bold" onClick={() => window.location.reload()}>Thử lại</Button>
        </div>
    );

    if (submitted) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <Card className="w-full max-w-md shadow-2xl border-none overflow-hidden rounded-3xl animate-in zoom-in duration-500">
                    <div className="bg-emerald-600 p-8 text-center text-white">
                        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trophy className="h-10 w-10 text-white" />
                        </div>
                        <h2 className="text-2xl font-black mb-1">HOÀN THÀNH!</h2>
                        <p className="text-emerald-100 text-sm opacity-90 uppercase tracking-widest font-bold">Bài kiểm tra đã được nộp thành công</p>
                    </div>
                    <CardContent className="p-8 text-center space-y-6">
                        <div className="space-y-1">
                            <span className="text-slate-400 text-xs font-black uppercase tracking-widest">Điểm số của bạn</span>
                            <div className="text-6xl font-black text-slate-800 tracking-tighter">{score.toFixed(1)}</div>
                            <div className="text-slate-400 font-bold">/ 10.0</div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="text-[10px] text-slate-400 font-black uppercase">Đúng</div>
                                <div className="text-xl font-black text-emerald-600">
                                    {Object.keys(answers).filter(k => answers[Number(k)] === exam.questions[Number(k)].correct).length}
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <div className="text-[10px] text-slate-400 font-black uppercase">Sai</div>
                                <div className="text-xl font-black text-red-500">
                                    {exam.questions.length - Object.keys(answers).filter(k => answers[Number(k)] === exam.questions[Number(k)].correct).length}
                                </div>
                            </div>
                        </div>

                        <Button 
                            className="w-full h-12 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl"
                            onClick={() => window.close()}
                        >
                            ĐÓNG CỬA SỔ
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 flex flex-col items-center p-4 font-sans pb-20">
            {/* Header Sticky */}
            <div className="w-full max-w-2xl bg-white sticky top-4 z-50 shadow-xl rounded-2xl p-4 flex justify-between items-center mb-6 border border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white">
                        <HelpCircle className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-sm font-black text-slate-800 uppercase leading-none mb-1 truncate max-w-[180px]">{exam.title}</h1>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{exam.classId} • {exam.questions.length} câu</span>
                    </div>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 ${timeLeft < 60 ? 'bg-red-50 border-red-200 text-red-600' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                    <Clock className={`h-4 w-4 ${timeLeft < 60 ? 'animate-pulse' : ''}`} />
                    <span className="text-lg font-black font-mono">{formatTime(timeLeft)}</span>
                </div>
            </div>

            <div className="w-full max-w-2xl space-y-6">
                {!user ? (
                    <Card className="shadow-2xl border-none rounded-3xl overflow-hidden p-8 text-center space-y-6">
                        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                            <CheckCircle2 className="h-8 w-8 text-blue-600" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-xl font-black text-slate-800 italic">XÁC THỰC DANH TÍNH</h2>
                            <p className="text-slate-500 text-xs px-8">Bạn cần đăng nhập bằng Email sinh viên để làm bài kiểm tra này.</p>
                        </div>
                        <Button 
                            onClick={handleGoogleSignIn}
                            className="w-full h-14 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-100 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 font-bold"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 48 48">
                                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                            </svg>
                            ĐĂNG NHẬP GOOGLE
                        </Button>
                    </Card>
                ) : (
                    <>
                        <div className="flex items-center justify-between px-2 text-slate-500">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[10px] font-bold italic">✓</div>
                                <span className="text-[10px] font-black uppercase tracking-widest">{user.displayName}</span>
                            </div>
                            <button className="text-[10px] font-bold text-slate-400 hover:text-red-500 flex items-center gap-1" onClick={() => signOut(auth)}>
                                <LogOut className="h-3 w-3" /> Đăng xuất
                            </button>
                        </div>

                        {exam.questions.map((q: any, qIdx: number) => (
                            <Card key={qIdx} className="shadow-lg border-none rounded-3xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${qIdx * 100}ms` }}>
                                <div className="p-6 bg-white border-b border-slate-50">
                                    <div className="flex items-start gap-4">
                                        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 font-black text-sm shrink-0">
                                            {qIdx + 1}
                                        </div>
                                        <p className="text-lg font-bold text-slate-800 leading-tight pt-0.5">{q.question}</p>
                                    </div>
                                </div>
                                <CardContent className="p-6 space-y-3 bg-slate-50/50">
                                    {q.options.map((opt: string, oIdx: number) => {
                                        const isSelected = answers[qIdx] === oIdx;
                                        const label = String.fromCharCode(65 + oIdx);
                                        
                                        return (
                                            <button
                                                key={oIdx}
                                                onClick={() => handleSelectOption(qIdx, oIdx)}
                                                className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                                                    isSelected 
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200' 
                                                    : 'bg-white border-white hover:border-blue-100 text-slate-600'
                                                }`}
                                            >
                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                    {label}
                                                </div>
                                                <span className="font-bold text-sm">{opt}</span>
                                            </button>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        ))}

                        <div className="pt-4 pb-12">
                            <Button 
                                onClick={handleSubmit}
                                disabled={submitting || Object.keys(answers).length < exam.questions.length}
                                className="w-full h-16 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-black text-xl rounded-2xl shadow-2xl shadow-blue-200 transition-all active:scale-[0.98]"
                            >
                                {submitting ? <Loader2 className="animate-spin" /> : 'NỘP BÀI KIỂM TRA'}
                            </Button>
                            {Object.keys(answers).length < exam.questions.length && (
                                <p className="text-center text-[10px] text-amber-500 font-bold mt-3 uppercase tracking-widest">
                                    Vui lòng hoàn thành tất cả {exam.questions.length} câu hỏi để nộp bài
                                </p>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
