'use client';

import React, { useState, useMemo, useEffect } from 'react';
import PageHeader from "@/components/page-header";
import { Mail, Send, Trash2, Inbox, Plus, Search, Archive, Clock, AlertCircle, Paperclip, FileText, X as XIcon, Loader2 } from "lucide-react";
import { ClientOnly } from "@/components/client-only";
import { useLanguage } from "@/hooks/use-language";
import { RichTextEditor } from "@/components/rich-text-editor";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatTimeAgo } from "@/lib/utils";
import { useCollection, useFirestore, useUser, useStorage } from "@/firebase";
import { collection, query, where, orderBy, doc, setDoc, deleteDoc, addDoc, serverTimestamp, or, arrayUnion, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import type { Message } from "@/lib/types";
import { useMasterData } from "@/providers/master-data-provider";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import { 
    Popover, 
    PopoverContent, 
    PopoverTrigger 
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { sendEmailNotification } from "@/ai/flows/email-service";

type Folder = 'inbox' | 'sent' | 'trash';

export default function MessagingPage() {
    const { t } = useLanguage();
    const { user } = useUser();
    const firestore = useFirestore();
    const { employees, positions } = useMasterData();
    const [systemParams] = useLocalStorage<any>("system_parameters", {});
    
    const [activeFolder, setActiveFolder] = useState<Folder>('inbox');
    const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isComposeOpen, setIsComposeOpen] = useState(false);

    // Queries
    const messagesRef = useMemo(() => (firestore ? collection(firestore, 'messages') : null), [firestore]);
    
    // Individual queries to avoid complex index requirements
    const inboxQuery = useMemo(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, 'messages'),
            where('recipientIds', 'array-contains', user.uid)
        );
    }, [firestore, user]);

    const sentQuery = useMemo(() => {
        if (!firestore || !user) return null;
        return query(
            collection(firestore, 'messages'),
            where('senderId', '==', user.uid)
        );
    }, [firestore, user]);

    const { data: inboxMessages, loading: inboxLoading } = useCollection<Message>(inboxQuery as any);
    const { data: sentMessages, loading: sentLoading } = useCollection<Message>(sentQuery as any);
    const loading = inboxLoading || sentLoading;

    useEffect(() => {
        if (inboxMessages || sentMessages) {
            console.log(`[Messaging] Inbox: ${inboxMessages?.length || 0}, Sent: ${sentMessages?.length || 0}`);
        }
    }, [inboxMessages, sentMessages]);

    // Merge and filter in memory
    const messages = useMemo(() => {
        if (!user) return [];
        
        const allMap = new Map<string, Message>();
        inboxMessages?.forEach(m => allMap.set(m.id, m));
        sentMessages?.forEach(m => allMap.set(m.id, m));
        
        const allList = Array.from(allMap.values()).sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        return allList.filter(m => {
            const isTrash = (m as any).trashBy?.includes(user.uid);
            const isSent = m.senderId === user.uid;
            const isInbox = m.recipientIds?.includes(user.uid);

            if (activeFolder === 'trash') return isTrash;
            if (isTrash) return false;

            if (activeFolder === 'inbox') return isInbox;
            if (activeFolder === 'sent') return isSent;
            return true;
        });
    }, [inboxMessages, sentMessages, user, activeFolder]);

    const employeeMap = useMemo(() => {
        return new Map(employees.map(e => [e.id, e]));
    }, [employees]);

    const filteredMessages = useMemo(() => {
        if (!messages) return [];
        if (!searchQuery) return messages;
        
        return messages.filter(m => {
            const sender = employeeMap.get(m.senderId);
            const contentMatches = m.subject.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                 m.body.toLowerCase().includes(searchQuery.toLowerCase());
            const senderMatches = sender?.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false;
            return contentMatches || senderMatches;
        });
    }, [messages, searchQuery, employeeMap]);

    const selectedMessage = useMemo(() => {
        return messages?.find(m => m.id === selectedMessageId);
    }, [messages, selectedMessageId]);

    const handleSelectMessage = async (id: string) => {
        setSelectedMessageId(id);
        const msg = messages?.find(m => m.id === id);
        if (msg && !msg.isRead && activeFolder === 'inbox') {
            await setDoc(doc(firestore!, 'messages', id), { isRead: true }, { merge: true });
        }
    };

    const handleDelete = async (id: string) => {
        if (!firestore || !user) return;
        try {
            const messageRef = doc(firestore, 'messages', id);
            
            if (activeFolder === 'trash') {
                // Permanent delete if already in trash
                await deleteDoc(messageRef);
                toast({ title: t('Đã xóa vĩnh viễn tin nhắn') });
            } else {
                // Move to trash (Soft delete)
                await updateDoc(messageRef, {
                    trashBy: arrayUnion(user.uid)
                });
                toast({ title: t('Đã chuyển vào thùng rác') });
            }
            
            if (selectedMessageId === id) setSelectedMessageId(null);
        } catch (e: any) {
            console.error("Delete error:", e);
            toast({ 
                variant: 'destructive', 
                title: t('Lỗi khi xóa'), 
                description: e.message || t('Vui lòng thử lại sau')
            });
        }
    };

    const handleSendMessage = async (payload: { recipientIds: string[], subject: string, body: string, attachments: { name: string, url: string }[] }) => {
        if (!firestore || !user) return;
        try {
            // 1. Send internal message
            await addDoc(collection(firestore, 'messages'), {
                senderId: user.uid,
                recipientIds: payload.recipientIds,
                subject: payload.subject,
                body: payload.body,
                attachments: payload.attachments || [],
                timestamp: new Date().toISOString(),
                isRead: false
            });

            // 2. Send email notification if SMTP is configured
            if (systemParams.smtpHost && systemParams.smtpUser) {
                const recipientEmails = payload.recipientIds
                    .map(id => employees.find(e => e.id === id)?.email)
                    .filter(email => !!email) as string[];

                if (recipientEmails.length > 0) {
                    // We run this in background or just wait
                    sendEmailNotification(
                        recipientEmails,
                        payload.subject,
                        payload.body,
                        payload.attachments,
                        {
                            host: systemParams.smtpHost,
                            port: systemParams.smtpPort,
                            user: systemParams.smtpUser,
                            pass: systemParams.smtpPass,
                            fromName: systemParams.smtpFromName
                        }
                    ).then(res => {
                        if (res.success) {
                            toast({ title: t('Gửi Email thành công'), description: res.message });
                        }
                        else {
                            toast({ 
                                variant: 'destructive', 
                                title: t('Lỗi gửi Email'), 
                                description: res.message + t('. Tuy nhiên tin nhắn nội bộ vẫn được gửi.') 
                            });
                        }
                    });
                } else {
                    toast({ 
                        variant: 'default', 
                        title: t('Thông báo'), 
                        description: t('Người nhận chưa có thông tin Email. Chỉ gửi tin nội bộ.') 
                    });
                }
            } else {
                toast({ 
                    variant: 'default', 
                    title: t('Thông báo'), 
                    description: t('Chưa cấu hình SMTP. Chỉ gửi tin nội bộ.') 
                });
            }

            setIsComposeOpen(false);
            toast({ title: t('Đã gửi tin nhắn thành công') });
        } catch (e) {
            toast({ variant: 'destructive', title: t('Lỗi khi gửi tin nhắn') });
        }
    };

    return (
        <ClientOnly>
            <div className="flex flex-col h-[calc(100vh-64px-55px)] overflow-hidden">
                <div className="p-4 border-b bg-card shrink-0">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Mail className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight uppercase">{t('Hộp thư nội bộ')}</h1>
                                <p className="text-xs text-muted-foreground">{t('Trao đổi thông tin giữa các thành viên trong hệ thống.')}</p>
                            </div>
                        </div>
                            <ComposeDialog 
                                isOpen={isComposeOpen} 
                                setIsOpen={setIsComposeOpen} 
                                onSend={handleSendMessage}
                                employees={employees}
                                positions={positions}
                                t={t}
                            />
                    </div>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar */}
                    <aside className="w-64 border-r bg-muted/20 flex flex-col pt-4">
                        <div className="px-3 space-y-1">
                            <SidebarItem 
                                icon={Inbox} 
                                label={t('Hộp thư đến')} 
                                active={activeFolder === 'inbox'} 
                                onClick={() => setActiveFolder('inbox')} 
                                badge={messages?.filter(m => !m.isRead && m.recipientIds.includes(user?.uid || '')).length}
                            />
                            <SidebarItem 
                                icon={Send} 
                                label={t('Đã gửi')} 
                                active={activeFolder === 'sent'} 
                                onClick={() => setActiveFolder('sent')} 
                            />
                            <SidebarItem 
                                icon={Trash2} 
                                label={t('Thùng rác')} 
                                active={activeFolder === 'trash'} 
                                onClick={() => setActiveFolder('trash')} 
                            />
                        </div>
                    </aside>

                    {/* Message List */}
                    <div className="w-96 border-r flex flex-col bg-card">
                        <div className="p-4 border-b space-y-3">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder={t('Tìm kiếm tin nhắn...')} 
                                    className="pl-9 bg-muted/40"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <ScrollArea className="flex-1">
                            {loading ? (
                                <div className="p-8 text-center"><Clock className="h-6 w-6 animate-spin mx-auto mb-2 opacity-20" /></div>
                            ) : filteredMessages.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    <Inbox className="h-10 w-10 mx-auto mb-2 opacity-10" />
                                    <p className="text-sm">{t('Không có tin nhắn nào.')}</p>
                                </div>
                            ) : (
                                filteredMessages.map(msg => (
                                    <MessageListItem 
                                        key={msg.id}
                                        message={msg}
                                        isActive={selectedMessageId === msg.id}
                                        onClick={() => handleSelectMessage(msg.id)}
                                        sender={employeeMap.get(msg.senderId)}
                                        t={t}
                                    />
                                ))
                            )}
                        </ScrollArea>
                    </div>

                    {/* Content View */}
                    <main className="flex-1 flex flex-col bg-card">
                        {selectedMessage ? (
                            <div className="flex flex-col h-full">
                                <div className="p-4 border-b flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <Avatar className="h-12 w-12 border shadow-sm">
                                            <AvatarImage src={employeeMap.get(selectedMessage.senderId)?.avatarUrl} />
                                            <AvatarFallback>{employeeMap.get(selectedMessage.senderId)?.name.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <h2 className="font-bold text-lg leading-tight">{selectedMessage.subject}</h2>
                                            <p className="text-sm text-muted-foreground">
                                                {t('Từ')}: <span className="font-medium text-foreground">{employeeMap.get(selectedMessage.senderId)?.name}</span> 
                                                <span className="mx-2">•</span>
                                                {formatTimeAgo(selectedMessage.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(selectedMessage.id)}>
                                            <Trash2 className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                                <ScrollArea className="flex-1 p-6">
                                    <div className="max-w-3xl mx-auto prose prose-sm dark:prose-invert">
                                        <div 
                                            className="whitespace-pre-wrap text-foreground/90 text-base leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: selectedMessage.body }}
                                        />
                                        
                                        {selectedMessage.attachments && selectedMessage.attachments.length > 0 && (
                                            <div className="mt-8 pt-6 border-t">
                                                <h4 className="text-sm font-bold flex items-center gap-2 mb-3">
                                                    <Paperclip className="h-4 w-4" /> {t('Tệp đính kèm')} ({selectedMessage.attachments.length})
                                                </h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {selectedMessage.attachments.map((file, idx) => (
                                                        <a 
                                                            key={idx}
                                                            href={file.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted transition-colors group"
                                                        >
                                                            <div className="h-10 w-10 rounded bg-background flex items-center justify-center border shadow-sm group-hover:bg-primary/10 transition-colors">
                                                                <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium truncate">{file.name}</p>
                                                                <p className="text-[10px] text-muted-foreground uppercase">{t('Tải xuống')}</p>
                                                            </div>
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                                <div className="p-4 border-t bg-muted/10">
                                    <div className="max-w-3xl mx-auto flex items-center gap-2">
                                        <Input placeholder={t('Trả lời nhanh...')} disabled />
                                        <Button disabled>{t('Gửi')}</Button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12">
                                <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                                    <Mail className="h-10 w-10 opacity-20" />
                                </div>
                                <h3 className="font-bold text-lg mb-1">{t('Chọn một tin nhắn để xem')}</h3>
                                <p className="text-sm text-center max-w-xs">{t('Dữ liệu được bảo mật và chỉ người nhận mới có thể xem nội dung.')}</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </ClientOnly>
    );
}

function SidebarItem({ icon: Icon, label, active, onClick, badge }: any) {
    return (
        <button 
            onClick={onClick}
            className={cn(
                "w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                active 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "text-muted-foreground hover:bg-muted"
            )}
        >
            <div className="flex items-center gap-3">
                <Icon className={cn("h-4 w-4", active ? "" : "text-muted-foreground group-hover:text-primary")} />
                {label}
            </div>
            {badge > 0 && (
                <Badge variant={active ? "secondary" : "destructive"} className="h-5 min-w-[20px] px-1.5 font-bold">
                    {badge}
                </Badge>
            )}
        </button>
    );
}

function MessageListItem({ message, isActive, onClick, sender, t }: any) {
    const { positions } = useMasterData();
    const positionName = useMemo(() => {
        if (!sender?.position) return '';
        const pos = positions.find(p => p.id === sender.position);
        return pos ? pos.name : sender.position;
    }, [sender, positions]);

    return (
        <button 
            onClick={onClick}
            className={cn(
                "w-full text-left p-4 border-b transition-all hover:bg-muted/50",
                isActive ? "bg-primary/5 border-l-4 border-l-primary" : "border-l-4 border-l-transparent",
                !message.isRead && "font-bold"
            )}
        >
            <div className="flex items-center justify-between gap-2 mb-1">
                <p className="text-sm text-primary truncate max-w-[140px]">{sender?.name || t('Người dùng')}</p>
                <span className="text-[10px] text-muted-foreground font-normal">{formatTimeAgo(message.timestamp)}</span>
            </div>
            <h4 className="text-sm mb-1 truncate text-foreground">{message.subject}</h4>
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed flex-1">
                    {message.body.replace(/<[^>]*>?/gm, '')}
                </p>
                {positionName && (
                    <Badge variant="outline" className="text-[10px] px-1 h-4 font-normal whitespace-nowrap">
                        {positionName}
                    </Badge>
                )}
            </div>
        </button>
    );
}

function ComposeDialog({ isOpen, setIsOpen, onSend, employees, positions, t }: any) {
    const storage = useStorage();
    const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [attachments, setAttachments] = useState<{ name: string, url: string }[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [recipientSearch, setRecipientSearch] = useState('');
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const filteredEmployees = useMemo(() => {
        return employees.filter((emp: any) => 
            emp.name.toLowerCase().includes(recipientSearch.toLowerCase()) ||
            emp.position.toLowerCase().includes(recipientSearch.toLowerCase())
        );
    }, [employees, recipientSearch]);

    const toggleRecipient = (id: string) => {
        setSelectedRecipients(prev => 
            prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
        );
    };

    const toggleAllRecipients = () => {
        if (selectedRecipients.length === employees.length) {
            setSelectedRecipients([]);
        } else {
            setSelectedRecipients(employees.map((e: any) => e.id));
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !storage) return;

        setIsUploading(true);
        const newAttachments = [...attachments];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const storageRef = ref(storage, `attachments/${Date.now()}_${file.name}`);
                const snapshot = await uploadBytes(storageRef, file);
                const url = await getDownloadURL(snapshot.ref);
                newAttachments.push({ name: file.name, url });
            }
            setAttachments(newAttachments);
            toast({ title: t('Đã tải tệp lên thành công') });
        } catch (error) {
            toast({ variant: 'destructive', title: t('Lỗi khi tải tệp lên') });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedRecipients.length === 0 || !subject || !body) {
            toast({ variant: 'destructive', title: t('Vui lòng chọn người nhận và điền đầy đủ thông tin') });
            return;
        }
        
        // In Firestore, we store recipientIds as an array
        onSend({ recipientIds: selectedRecipients, subject, body, attachments });
        
        // Reset form
        setSelectedRecipients([]);
        setSubject('');
        setBody('');
        setAttachments([]);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 shadow-lg shadow-primary/20">
                    <Plus className="h-4 w-4" />
                    {t('Soạn tin mới')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0 overflow-hidden">
                <DialogHeader className="p-6 border-b bg-muted/10">
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5 text-primary" />
                        {t('Soạn tin nhắn mới')}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
                    <ScrollArea className="flex-1 p-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">{t('Người nhận')}</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between font-normal">
                                            <span className="truncate">
                                                {selectedRecipients.length === 0 
                                                    ? t('Chọn người nhận...') 
                                                    : selectedRecipients.length === employees.length 
                                                        ? t('Tất cả nhân viên') 
                                                        : `${t('Đã chọn')} ${selectedRecipients.length} ${t('người nhận')}`}
                                            </span>
                                            <Plus className="h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0" align="start">
                                        <div className="p-2 border-b">
                                            <Input 
                                                placeholder={t('Tìm nhân viên...')} 
                                                value={recipientSearch}
                                                onChange={e => setRecipientSearch(e.target.value)}
                                                className="h-8 text-xs"
                                            />
                                        </div>
                                        <div className="p-2 border-b flex items-center justify-between bg-muted/20">
                                            <span className="text-xs font-bold uppercase tracking-wider">{t('Danh sách nhân viên')}</span>
                                            <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={toggleAllRecipients}>
                                                {selectedRecipients.length === employees.length ? t('Bỏ chọn hết') : t('Chọn tất cả')}
                                            </Button>
                                        </div>
                                        <ScrollArea className="h-60">
                                            <div className="p-1">
                                                {filteredEmployees.map((emp: any) => (
                                                    <div 
                                                        key={emp.id} 
                                                        className="flex items-center gap-2 p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                                                        onClick={() => toggleRecipient(emp.id)}
                                                    >
                                                        <Checkbox 
                                                            checked={selectedRecipients.includes(emp.id)} 
                                                            onCheckedChange={() => toggleRecipient(emp.id)}
                                                        />
                                                        <Avatar className="h-6 w-6">
                                                            <AvatarImage src={emp.avatarUrl} />
                                                            <AvatarFallback>{emp.name.charAt(0)}</AvatarFallback>
                                                        </Avatar>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">{emp.name}</p>
                                                            <p className="text-[10px] text-muted-foreground truncate">
                                                                {positions.find((p: any) => p.id === emp.position)?.name || emp.position}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </PopoverContent>
                                </Popover>
                                {selectedRecipients.length > 0 && selectedRecipients.length < employees.length && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {selectedRecipients.slice(0, 5).map(id => {
                                            const emp = employees.find((e: any) => e.id === id);
                                            return emp ? (
                                                <Badge key={id} variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                                                    {emp.name}
                                                </Badge>
                                            ) : null;
                                        })}
                                        {selectedRecipients.length > 5 && (
                                            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal">
                                                +{selectedRecipients.length - 5}
                                            </Badge>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">{t('Tiêu đề')}</label>
                                <Input 
                                    value={subject} 
                                    onChange={(e) => setSubject(e.target.value)} 
                                    placeholder={t('Nhập tiêu đề tin nhắn...')} 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">{t('Nội dung')}</label>
                                <RichTextEditor 
                                    value={body}
                                    onChange={setBody}
                                    placeholder={t('Viết nội dung tin nhắn tại đây...')}
                                    className="min-h-[250px]"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-sm font-semibold flex items-center gap-2">
                                    <Paperclip className="h-4 w-4" /> {t('Tệp đính kèm')}
                                </label>
                                
                                <div className="flex flex-wrap gap-2">
                                    {attachments.map((file, index) => (
                                        <div key={index} className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full text-xs border shadow-sm">
                                            <FileText className="h-3.5 w-3.5 text-primary" />
                                            <span className="truncate max-w-[150px] font-medium">{file.name}</span>
                                            <button type="button" onClick={() => removeAttachment(index)} className="text-muted-foreground hover:text-red-500 transition-colors">
                                                <XIcon className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 rounded-full border-dashed"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Plus className="h-3 w-3 mr-2" />}
                                        {t('Đính kèm tệp')}
                                    </Button>
                                    <input 
                                        type="file" 
                                        multiple 
                                        className="hidden" 
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                    />
                                </div>
                            </div>
                        </div>
                    </ScrollArea>
                    <DialogFooter className="p-6 border-t bg-muted/10">
                        <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>{t('Hủy')}</Button>
                        <Button type="submit" className="gap-2 px-8" disabled={isUploading}>
                            <Send className="h-4 w-4" />
                            {t('Gửi tin nhắn')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
