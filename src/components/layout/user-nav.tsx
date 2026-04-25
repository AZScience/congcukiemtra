"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Send, LogOut, Settings, User, UserCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useLanguage } from "@/hooks/use-language";
import { useAuth, useUser, useFirestore, useDoc } from "@/firebase";
import { signOut } from "firebase/auth";
import { useMasterData } from "@/providers/master-data-provider";
import { Employee } from "@/lib/types";
import { doc } from "firebase/firestore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { logActivity } from "@/lib/activity-logger";

export function UserNav() {
  const { t } = useLanguage();
  const auth = useAuth();
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { employees, positions } = useMasterData();

  const employee = React.useMemo(() => {
    return employees.find(e => e.id === authUser?.uid || e.email === authUser?.email);
  }, [employees, authUser]);

  const handleSignOut = async () => {
    if (auth && authUser) {
      // Log the activity
      await logActivity(
        authUser.uid,
        'logout',
        'System',
        `Người dùng ${authUser.email} đăng xuất.`,
        { userEmail: authUser.email || undefined }
      );
      
      await signOut(auth);
      router.push('/login');
    }
  };
  
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full border-2 border-primary/20 hover:border-primary/50 transition-all p-0">
              <Avatar className="h-9 w-9">
                <AvatarImage src={employee?.avatarUrl} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {employee?.name ? employee.name.charAt(0) : <UserCircle className="h-6 w-6" />}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('Tài khoản')}: {employee?.name || authUser?.email}</p>
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1 p-2">
            <p className="text-sm font-bold leading-none">{employee?.name || t('Người dùng')}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {authUser?.email}
            </p>
            {employee?.position && (
              <p className="text-[10px] mt-1 uppercase tracking-wider font-bold text-primary">
                {positions.find(p => p.id === employee.position)?.name || employee.position}
              </p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <Link href="/profile" passHref>
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4 text-blue-500" />
              <span>{t('Hồ sơ')}</span>
            </DropdownMenuItem>
          </Link>
          <Link href="/messaging" passHref>
            <DropdownMenuItem>
              <Send className="mr-2 h-4 w-4 text-green-500" />
              <span>{t('Gửi tin')}</span>
            </DropdownMenuItem>
          </Link>
          <Link href="/settings" passHref>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4 text-gray-500" />
              <span>{t('Cài đặt')}</span>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4 text-red-500" />
          <span>{t('Đăng xuất')}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
