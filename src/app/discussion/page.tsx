"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy, 
  arrayUnion,
  setDoc,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  MoreHorizontal, 
  MessageSquare, 
  Send, 
  User, 
  Clock,
  Layout,
  PlusCircle,
  X,
  ChevronDown,
  ChevronUp,
  CornerDownRight,
  ShieldCheck,
  Edit2,
  Edit3,
  Trash2,
  Search,
  Calendar as CalendarIcon,
  Filter,
  MessageCircle,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format, formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { toast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { useMasterData } from '@/providers/master-data-provider';
import { cn } from '@/lib/utils';
import { RichTextEditor } from '@/components/rich-text-editor';
import { DatePickerField } from "@/components/ui/date-picker-field";

interface Comment {
  id: string;
  text: string;
  authorName: string;
  authorEmail: string;
  createdAt: any;
}

interface Section {
  id: string;
  title: string;
  studentContent?: string;
  lecturerContent?: string; // Kept for backward compatibility if needed, but we'll use comments
  comments?: Comment[];
  authorEmail: string;
  authorName: string;
  createdAt: any;
}

export default function DiscussionPage() {
  const { user } = useUser();
  const { lecturers, employees } = useMasterData();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionStudentContent, setNewSectionStudentContent] = useState('');
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editSectionTitle, setEditSectionTitle] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDate, setSearchDate] = useState<string>('');

  useEffect(() => {
    const q = query(collection(db, 'discussion_sections'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const sectionsData: Section[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Section[];
      setSections(sectionsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const currentUserInfo = useMemo(() => {
    if (!user) return { name: "Khách", role: "guest" };
    const email = user.email;
    const lecturer = lecturers.find(l => l.email === email);
    if (lecturer) return { name: lecturer.name, role: "giảng viên" };
    const employee = employees.find(e => e.email === email);
    if (employee) return { name: employee.name || employee.nickname, role: "nhân viên" };
    return { name: user.displayName || user.email?.split('@')[0] || "Người dùng", role: "sinh viên" };
  }, [user, lecturers, employees]);

  const handleAddSection = async () => {
    if (!newSectionTitle.trim()) return;
    try {
      await addDoc(collection(db, 'discussion_sections'), {
        title: newSectionTitle,
        studentContent: newSectionStudentContent,
        lecturerContent: '',
        authorEmail: user?.email || '',
        authorName: currentUserInfo.name,
        createdAt: serverTimestamp()
      });
      setNewSectionTitle('');
      setNewSectionStudentContent('');
      setIsAddSectionOpen(false);
      toast({ title: "Đã tạo bảng thảo luận mới" });
    } catch (error) {
      toast({ title: "Lỗi khi tạo bảng", variant: "destructive" });
    }
  };

  const [activeEditingField, setActiveEditingField] = useState<{id: string, field: string, content: string} | null>(null);
  const [showAssessmentEditor, setShowAssessmentEditor] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');

  const handleUpdateSectionField = async (sectionId: string, field: 'studentContent') => {
    if (!activeEditingField || activeEditingField.id !== sectionId) return;
    try {
      const sectionRef = doc(db, 'discussion_sections', sectionId);
      await updateDoc(sectionRef, { [field]: activeEditingField.content });
      setActiveEditingField(null);
      toast({ title: "Đã cập nhật nội dung thành công" });
    } catch (error) {
      toast({ title: "Lỗi khi cập nhật", variant: "destructive" });
    }
  };

  const handleAddComment = async (sectionId: string) => {
    if (!newCommentText.trim()) return;
    try {
      const sectionRef = doc(db, 'discussion_sections', sectionId);
      const newComment = {
        id: Math.random().toString(36).substring(7),
        text: newCommentText,
        authorName: currentUserInfo.name,
        authorEmail: user?.email || '',
        createdAt: new Date().toISOString()
      };
      await updateDoc(sectionRef, {
        comments: arrayUnion(newComment)
      });
      setNewCommentText('');
      setShowAssessmentEditor(null);
      toast({ title: "Đã gửi nhận xét" });
    } catch (error) {
      toast({ title: "Lỗi khi gửi nhận xét", variant: "destructive" });
    }
  };

  const handleDeleteComment = async (sectionId: string, commentId: string) => {
    if (!confirm('Xóa nhận xét này?')) return;
    try {
      const sectionRef = doc(db, 'discussion_sections', sectionId);
      const sectionSnap = await getDoc(sectionRef);
      if (sectionSnap.exists()) {
        const comments = sectionSnap.data().comments || [];
        const updatedComments = comments.filter((c: any) => c.id !== commentId);
        await updateDoc(sectionRef, { comments: updatedComments });
        toast({ title: "Đã xóa nhận xét" });
      }
    } catch (error) {
      toast({ title: "Lỗi khi xóa", variant: "destructive" });
    }
  };

  const handleUpdateSectionTitle = async (sectionId: string) => {
    if (!editSectionTitle.trim()) return;
    try {
      const sectionRef = doc(db, 'discussion_sections', sectionId);
      await updateDoc(sectionRef, { title: editSectionTitle });
      setEditingSectionId(null);
      setEditSectionTitle('');
      toast({ title: "Đã cập nhật tên bảng" });
    } catch (error) {
      toast({ title: "Lỗi khi cập nhật", variant: "destructive" });
    }
  };

  const filteredSections = useMemo(() => {
    return sections.filter(section => {
      const matchesTitle = section.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDate = !searchDate || (section.createdAt?.toDate ? 
        format(section.createdAt.toDate(), "yyyy-MM-dd") === searchDate : 
        true);
      return matchesTitle && matchesDate;
    });
  }, [sections, searchQuery, searchDate]);

  if (loading) return <div className="flex h-screen items-center justify-center">Đang tải...</div>;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex flex-col">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <Layout className="h-8 w-8 text-primary" />
            Collaboration Board
          </h1>
          <div className="flex items-center gap-3">
            <p className="text-slate-500 text-sm font-medium">Chào mừng, <span className="text-primary font-bold">{currentUserInfo?.name || 'Người dùng'}</span></p>
            <div className={cn(
              "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
              currentUserInfo?.role === 'giảng viên' 
                ? "bg-rose-50 text-rose-600 border-rose-100" 
                : "bg-blue-50 text-blue-600 border-blue-100"
            )}>
              {currentUserInfo?.role || 'Sinh viên'}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Input 
            placeholder="Tìm tên..." 
            className="w-48 bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <DatePickerField 
            value={searchDate}
            onChange={(val) => setSearchDate(val || '')}
            className="w-40 bg-white"
          />
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredSections.map((section) => (
            <motion.div
              key={section.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col h-fit"
            >
                <Card className="border-2 border-slate-200 shadow-xl rounded-3xl overflow-hidden bg-white hover:shadow-2xl transition-all duration-500">
                  {/* 1. Thông tin user */}
                  <div className="bg-slate-50 px-6 py-4 flex items-center gap-3 border-b border-slate-100">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                      <AvatarFallback className="bg-primary text-white font-black text-xs uppercase">
                        {section.authorName?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-tighter">Tác giả bài viết</p>
                      <p className="text-sm font-black text-slate-800 truncate">{section.authorName}</p>
                    </div>
                    <div className="text-[9px] font-bold text-slate-300">
                      {section.createdAt?.toDate ? format(section.createdAt.toDate(), "HH:mm dd/MM", { locale: vi }) : 'Vừa xong'}
                    </div>
                  </div>

                  <div className="relative overflow-hidden">
                    {/* Background Accent */}
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    
                    <div className="relative p-6 border-b border-white/5">
                      {editingSectionId === section.id ? (
                        <div className="flex gap-2">
                          <Input 
                            value={editSectionTitle}
                            onChange={(e) => setEditSectionTitle(e.target.value)}
                            className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-10 font-bold focus:ring-blue-500"
                            placeholder="Nhập tiêu đề mới..."
                            autoFocus
                          />
                          <Button 
                            size="sm" 
                            onClick={async () => {
                              await updateDoc(doc(db, 'discussion_sections', section.id), { title: editSectionTitle });
                              setEditingSectionId(null);
                              toast({ title: "Đã cập nhật tiêu đề" });
                            }}
                            className="bg-blue-500 hover:bg-blue-600 shadow-lg shadow-blue-500/20 px-6 font-black uppercase text-[10px]"
                          >
                            Lưu
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-between items-center group/title gap-4">
                          <div className="flex-1">
                            <h3 className="font-black text-white text-xl uppercase tracking-tighter leading-tight drop-shadow-sm">
                              {section.title}
                            </h3>
                            <div className="h-1 w-12 bg-blue-500 mt-2 rounded-full" />
                          </div>
                          {(section.authorEmail === user?.email || currentUserInfo.role === 'giảng viên') && (
                            <button 
                              onClick={() => {
                                setEditingSectionId(section.id);
                                setEditSectionTitle(section.title);
                              }}
                              className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white/40 hover:text-white transition-all opacity-0 group-hover/title:opacity-100 backdrop-blur-sm"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3. Nội dung & 4. Nhận xét (Integrated View) */}
                  <div className="p-6 space-y-6">
                      <div className="flex items-center justify-between">
                        <label 
                          className={cn(
                            "text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2",
                            section.authorEmail === user?.email && "cursor-pointer hover:text-blue-600 transition-colors"
                          )}
                        >
                          <Edit3 className="h-4 w-4" />
                          Nội dung chi tiết
                        </label>
                        {section.authorEmail === user?.email && activeEditingField?.id === section.id && activeEditingField.field === 'studentContent' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleUpdateSectionField(section.id, 'studentContent')}
                            className="h-8 px-4 bg-blue-500 hover:bg-blue-600 text-[10px] font-black uppercase shadow-lg shadow-blue-200 transition-all active:scale-95"
                          >
                            Cập nhật nội dung
                          </Button>
                        )}
                      </div>
                      
                      {(section.authorEmail === user?.email) ? (
                        <RichTextEditor 
                          value={activeEditingField?.id === section.id && activeEditingField.field === 'studentContent' ? activeEditingField.content : (section.studentContent || '')}
                          onChange={(val) => setActiveEditingField({ id: section.id, field: 'studentContent', content: val })}
                          className="border-slate-200 shadow-inner rounded-xl min-h-[250px]"
                          placeholder="Mời bạn nhập nội dung thảo luận tại đây..."
                        />
                      ) : (
                        <div 
                          className="min-h-[250px] p-5 bg-slate-50/50 rounded-2xl border border-slate-100 text-slate-700 text-sm leading-relaxed ck-content shadow-inner overflow-y-auto"
                          dangerouslySetInnerHTML={{ __html: section.studentContent || '<p class="text-slate-400 italic font-medium">Chưa có nội dung từ người dùng...</p>' }}
                        />
                      )}

                    {(section.comments?.length || 0) > 0 || showAssessmentEditor === section.id ? (
                      <div className="pt-4 border-t border-slate-50">
                        {/* Comment List */}
                        <div className="space-y-4 mb-6">
                          {section.comments?.map((comment) => (
                            <div key={comment.id} className="flex gap-3 group/comment">
                              <Avatar className="h-8 w-8 shrink-0 shadow-sm border border-white">
                                <AvatarFallback className="bg-rose-100 text-rose-600 text-[10px] font-bold">
                                  {comment.authorName?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 space-y-1">
                                <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-rose-100 shadow-sm relative">
                                  <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-black text-slate-800 uppercase tracking-tight">{comment.authorName}</span>
                                    <span className="text-[9px] font-bold text-slate-300">
                                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: vi })}
                                    </span>
                                  </div>
                                  <div 
                                    className="text-sm text-slate-600 leading-relaxed ck-content"
                                    dangerouslySetInnerHTML={{ __html: comment.text }}
                                  />
                                  {(comment.authorEmail === user?.email || currentUserInfo.role === 'giảng viên') && (
                                    <button 
                                      onClick={() => handleDeleteComment(section.id, comment.id)}
                                      className="absolute -right-2 -top-2 bg-white shadow-md border border-slate-100 rounded-full p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover/comment:opacity-100 transition-all scale-75 group-hover/comment:scale-100"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {showAssessmentEditor === section.id && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="space-y-4 bg-white p-4 rounded-3xl border-2 border-rose-100 shadow-xl"
                          >
                            <RichTextEditor 
                              value={newCommentText}
                              onChange={(val) => setNewCommentText(val)}
                              className="border-none shadow-none focus:ring-0"
                              placeholder="Viết nhận xét của bạn..."
                            />
                            <div className="flex justify-end gap-2 pt-2 border-t border-slate-50">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-[10px] font-black uppercase text-slate-400"
                                onClick={() => {
                                  setShowAssessmentEditor(null);
                                  setNewCommentText('');
                                }}
                              >
                                Hủy
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={() => handleAddComment(section.id)}
                                className="h-8 px-6 bg-rose-500 hover:bg-rose-600 text-[10px] font-black uppercase shadow-lg shadow-rose-200"
                              >
                                Gửi phản hồi
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ) : null}
                </div>

                  {/* Footer Actions */}
                  <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end items-center gap-6">
                    {/* Integrated Lời nhận xét Trigger */}
                    <button 
                      className={cn(
                        "text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2",
                        currentUserInfo.role === 'giảng viên' ? "cursor-pointer hover:text-rose-600 transition-colors" : "opacity-50 cursor-default"
                      )}
                      onClick={() => {
                        if (currentUserInfo.role === 'giảng viên') {
                          setShowAssessmentEditor(section.id);
                        }
                      }}
                    >
                      <MessageCircle className="h-4 w-4 fill-rose-500/10" />
                      Lời nhận xét ({section.comments?.length || 0})
                    </button>

                    {(section.authorEmail === user?.email || currentUserInfo.role === 'giảng viên') && (
                      <button 
                        onClick={async () => {
                          if (confirm('Bạn có chắc chắn muốn xóa bảng thảo luận này không?')) {
                            await deleteDoc(doc(db, 'discussion_sections', section.id));
                            toast({ title: "Đã xóa bảng thảo luận thành công" });
                          }
                        }}
                        className="flex items-center gap-2 text-[10px] font-black text-slate-300 hover:text-red-500 transition-all uppercase tracking-widest"
                      >
                        <Trash2 className="h-4 w-4" />
                        Xóa bảng
                      </button>
                    )}
                  </div>
                </Card>
            </motion.div>
          ))}
          </AnimatePresence>

          {/* Add Section Button */}
          {isAddSectionOpen ? (
            <div className="col-span-full">
              <div className="bg-white p-8 rounded-3xl shadow-2xl border-2 border-primary/20">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Tạo bảng thảo luận mới</h4>
                  <Button variant="ghost" size="sm" onClick={() => setIsAddSectionOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tiêu đề bảng</label>
                    <Input 
                      autoFocus
                      placeholder="Ví dụ: Thảo luận về Audit Q1..."
                      value={newSectionTitle}
                      onChange={(e) => setNewSectionTitle(e.target.value)}
                      className="font-bold border-slate-200 h-12 text-lg"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-2 block">Nội dung khởi tạo (Sinh viên)</label>
                      <RichTextEditor 
                        value={newSectionStudentContent}
                        onChange={(val) => setNewSectionStudentContent(val)}
                        placeholder="Nhập nội dung thảo luận ban đầu..."
                        className="min-h-[250px]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <Button 
                      onClick={handleAddSection} 
                      className="bg-primary hover:bg-primary/90 font-black uppercase text-xs h-12 px-10 shadow-lg shadow-primary/20"
                    >
                      Xác nhận đăng bài
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <button 
              onClick={() => setIsAddSectionOpen(true)}
              className="h-full min-h-[300px] border-4 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:bg-white transition-all hover:border-primary hover:text-primary group"
            >
              <PlusCircle className="h-12 w-12 mb-3 group-hover:scale-110 transition-transform" />
              <span className="font-black uppercase tracking-widest text-xs">Thêm cột thảo luận</span>
            </button>
          )}
        </div>

      {/* Floating Action Button (FAB) - Padlet Style */}
      <motion.button
        whileHover={{ scale: 1.1, rotate: 90 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setIsAddSectionOpen(true);
          // Scroll to the bottom where the form appears
          window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }}
        className="fixed bottom-10 right-10 w-20 h-20 bg-[#e91e63] rounded-full shadow-[0_10px_40px_rgba(233,30,99,0.4)] flex items-center justify-center text-white z-50 hover:bg-[#d81b60] transition-all group"
      >
        <Plus className="h-10 w-10" />
        <div className="absolute right-24 bg-white text-[#e91e63] text-xs font-black px-5 py-3 rounded-2xl shadow-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all transform translate-x-4 group-hover:translate-x-0 border-2 border-[#e91e63]/10">
          ĐĂNG BÀI MỚI VÀO BẢNG
        </div>
      </motion.button>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 12px;
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #e2e8f0;
          border-radius: 12px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #94a3b8;
          border-radius: 12px;
          border: 3px solid #e2e8f0;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </div>
  );
}
