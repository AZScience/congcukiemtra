
"use client";

import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserNav } from "./user-nav";
import { Button } from "@/components/ui/button";
import { Bell, Languages, Menu, Mail } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/hooks/use-language";
import type { Message, Employee } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import * as React from "react";
import { useCollection, useFirestore, useUser } from "@/firebase";
import { collection, doc, setDoc, query, where, writeBatch } from "firebase/firestore";
import { formatTimeAgo } from "@/lib/utils";
import { useMasterData } from "@/providers/master-data-provider";

const VnFlag = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 900 600"
    width="20"
    height="14"
  >
    <path fill="#da251d" d="M0 0h900v600H0z" />
    <path
      fill="#ff0"
      d="M450 150l52.5 162.5H675l-135 97.5 52.5 162.5L450 460l-142.5 112.5 52.5-162.5-135-97.5h172.5z"
    />
  </svg>
);

const EnFlag = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 60 30"
    width="20"
    height="14"
  >
    <clipPath id="s-clip-en-flag">
      <path d="M0 0v30h60V0z" />
    </clipPath>
    <clipPath id="t-clip-en-flag">
      <path d="M30 15h30v15H30zV15h-30v-15H30z" />
    </clipPath>
    <g clipPath="url(#s-clip-en-flag)">
      <path d="M0 0v30h60V0z" fill="#012169" />
      <path
        d="M0 0l60 30m0-30L0 30"
        stroke="#fff"
        strokeWidth="6"
      />
      <path
        d="M0 0l60 30m0-30L0 30"
        clipPath="url(#t-clip-en-flag)"
        stroke="#C8102E"
        strokeWidth="4"
      />
      <path
        d="M30 0v30M0 15h60"
        stroke="#fff"
        strokeWidth="10"
      />
      <path
        d="M30 0v30M0 15h60"
        stroke="#C8102E"
        strokeWidth="6"
      />
    </g>
  </svg>
);




function NotificationItem({ message, onMarkAsRead, t, employeeMap }: { message: Message; onMarkAsRead: (id: string) => void; t: (key: string) => string; employeeMap: Map<string, Employee> }) {
    const sender = employeeMap.get(message.senderId);
    const router = useRouter();

    const handleClick = () => {
        onMarkAsRead(message.id);
        router.push('/messaging');
    };

    return (
        <DropdownMenuItem onClick={handleClick} className="flex items-start gap-3 cursor-pointer p-3 focus:bg-muted/50 transition-colors">
            <div className="relative shrink-0">
                <Avatar className="h-10 w-10 border shadow-sm">
                    <AvatarImage src={sender?.avatarUrl} alt={sender?.name} />
                    <AvatarFallback className="bg-primary/10 text-primary">{sender?.name?.charAt(0) || '?'}</AvatarFallback>
                </Avatar>
                {!message.isRead && <div className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-red-500 rounded-full border-2 border-background animate-pulse" />}
            </div>
            <div className="grid gap-0.5 flex-1 min-w-0">
                <div className="flex justify-between items-center gap-2">
                    <p className="text-sm font-semibold text-foreground truncate">{sender?.name || t('Hệ thống')}</p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{formatTimeAgo(message.timestamp)}</span>
                </div>
                <p className="text-xs font-medium text-foreground truncate">{message.subject}</p>
                <p className="text-[11px] text-muted-foreground truncate opacity-80">{message.body}</p>
            </div>
        </DropdownMenuItem>
    );
}

function Notifications() {
  const { t } = useLanguage();
  const { user } = useUser();
  const firestore = useFirestore();
  const { employees } = useMasterData();

  const messagesQuery = React.useMemo(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'messages'), where('recipientIds', 'array-contains', user.uid));
  }, [firestore, user]);
  
  const { data: messages } = useCollection<Message>(messagesQuery);
  
  const employeeMap = React.useMemo(() => {
    if (!employees) return new Map();
    return new Map(employees.map(e => [e.id || e.employeeId, e]))
  }, [employees]);

  const unreadMessages = React.useMemo(() => {
    if (!messages || !user) return [];
    return messages.filter(m => !m.isRead).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [messages, user]);

  const handleMarkAsRead = async (messageId: string) => {
    if (!firestore) return;
    await setDoc(doc(firestore, 'messages', messageId), { isRead: true }, { merge: true });
  };

  const markAllAsRead = async () => {
      if (!firestore || unreadMessages.length === 0) return;
      const batch = writeBatch(firestore);
      unreadMessages.forEach(msg => {
          batch.update(doc(firestore, 'messages', msg.id), { isRead: true });
      });
      await batch.commit();
  };
  
  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-muted transition-colors">
                <Bell className={cn("h-5 w-5 transition-all text-muted-foreground", unreadMessages.length > 0 && "text-yellow-500 animate-bounce-slow")} />
                {unreadMessages.length > 0 && (
                  <Badge variant="destructive" className="absolute -top-0.5 -right-0.5 h-5 min-w-[20px] px-1 justify-center border-2 border-background font-bold text-[10px]">{unreadMessages.length}</Badge>
                )}
                <span className="sr-only">{t('Thông báo')}</span>
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('Thông báo')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent className="w-[340px] p-0 overflow-hidden shadow-xl" align="end">
        <div className="p-4 flex items-center justify-between bg-muted/30 border-b">
            <h3 className="font-bold text-sm tracking-tight">{t('Thông báo')}</h3>
            {unreadMessages.length > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead} className="h-7 text-[10px] font-bold text-primary hover:text-primary/80 px-2 uppercase hover:bg-transparent">
                    {t('Đánh dấu tất cả là đã đọc')}
                </Button>
            )}
        </div>
        <div className="max-h-[400px] overflow-y-auto divide-y divide-muted/50">
          {unreadMessages.length > 0 ? (
            unreadMessages.map(msg => <NotificationItem key={msg.id} message={msg} onMarkAsRead={handleMarkAsRead} t={t} employeeMap={employeeMap} />)
          ) : (
            <div className="flex flex-col items-center justify-center p-8 text-center gap-2">
                <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center">
                    <Bell className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground font-medium">{t('Không có thông báo mới.')}</p>
            </div>
          )}
        </div>
        <DropdownMenuSeparator className="m-0" />
        <Link href="/messaging" className="block p-3 text-center text-xs font-bold text-primary hover:bg-muted transition-colors uppercase tracking-wider">
            {t('Xem tất cả tin nhắn')}
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header() {
  const { setLanguage, t } = useLanguage();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-4 sm:px-6">
      <SidebarTrigger />
      
      <div className="flex-1 text-center">
        <h1 className="hidden md:block text-xl font-bold tracking-wider uppercase text-foreground">
          {t('KIỂM TRA NỘI BỘ')}
        </h1>
        <h1 className="block md:hidden text-base font-bold tracking-wider uppercase text-foreground">
          {t('KIỂM TRA NỘI BỘ')}
        </h1>
      </div>

      <TooltipProvider>
        <div className="flex items-center gap-1">
           <Notifications />

          <UserNav />
          
          <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                      <Languages className="h-5 w-5 text-primary" />
                      <span className="sr-only">{t('Chuyển đổi ngôn ngữ')}</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('Ngôn ngữ')}</p>
                </TooltipContent>
              </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setLanguage('vi')}>
                <VnFlag />
                <span className="ml-2">{t('Tiếng Việt')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('en')}>
                <EnFlag />
                <span className="ml-2">{t('English')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TooltipProvider>
    </header>
  );
}
