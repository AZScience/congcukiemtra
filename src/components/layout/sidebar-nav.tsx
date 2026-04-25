
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  AreaChart,
  BookUser,
  BrainCircuit,
  Briefcase,
  Building,
  CalendarCheck,
  ClipboardPaste,
  Cog,
  Eye,
  FilePenLine,
  FileSearch,
  History,
  Landmark,
  LayoutDashboard,
  Library,
  Lightbulb,
  Lock,
  MailQuestion,
  MonitorCheck,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  UserCog,
  UserX,
  Laptop,
  Truck,
  BookOpenCheck,
  DoorOpen,
  CalendarCog,
  ChevronDown,
  Users,
  HeartHandshake,
  UserSquare,
  Mail,
  Palette,
  BellRing,
  UserCircle,
  FolderArchive,
  MessageSquare,
  Gift,
  UploadCloud,
  DatabaseZap,
  FileCheck,
  MapPin,
  Video,
  Layout,
  Camera,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/hooks/use-language";
import type { Employee, Role } from "@/lib/types";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { collection, doc } from "firebase/firestore";

export const menuItems = [
  {
    label: "Tổng quan",
    href: "/dashboard",
    icon: LayoutDashboard,
    iconColor: "text-sky-500",
  },
  {
    label: "Bộ danh mục",
    icon: Library,
    iconColor: "text-orange-500",
    subItems: [
      { label: "Chức vụ", href: "/personnel/positions", icon: Briefcase, iconColor: "text-indigo-500" },
      { label: "Dãy nhà", href: "/personnel/building-blocks", icon: Building, iconColor: "text-amber-500" },
      { label: "Đơn vị", href: "/personnel/departments", icon: Landmark, iconColor: "text-rose-500" },
      { label: "Giảng viên", href: "/personnel/lecturers", icon: BookUser, iconColor: "text-cyan-500" },
      { label: "Nhân viên", href: "/personnel/employees", icon: UserCog, iconColor: "text-fuchsia-500" },
      { label: "Phòng học", href: "/personnel/classrooms", icon: DoorOpen, iconColor: "text-yellow-500" },
      { label: "Quà tặng", href: "/personnel/gifts", icon: Gift, iconColor: "text-pink-500" },
      { label: "Sinh viên", href: "/personnel/students", icon: Users, iconColor: "text-lime-500" },
      { label: "Vai trò", href: "/personnel/roles", icon: Shield, iconColor: "text-purple-500" },
      { label: "Việc ghi nhận", href: "/personnel/recognitions", icon: FilePenLine, iconColor: "text-teal-500" },
      { label: "Việc phát sinh", href: "/personnel/incident-categories", icon: FolderArchive, iconColor: "text-pink-500" },
    ],
  },
  {
    label: "Công cụ kiểm tra",
    icon: ClipboardPaste,
    iconColor: "text-green-500",
    subItems: [
      { label: "Cố vấn học tập", href: "/monitoring/homeroom", icon: BookUser, iconColor: "text-lime-500" },
      { label: "Lớp học online", href: "/monitoring/online", icon: Laptop, iconColor: "text-blue-500" },
      { label: "Lớp học trực tiếp", href: "/monitoring/in-person", icon: MonitorCheck, iconColor: "text-green-500" },
      { label: "Thi kết thúc môn", href: "/monitoring/exams", icon: BookOpenCheck, iconColor: "text-purple-500" },
      { label: "Thực hành ngoài", href: "/monitoring/external-practice", icon: Truck, iconColor: "text-orange-500" },
      { label: "Sinh viên vi phạm", href: "/monitoring/student-violations", icon: ShieldAlert, iconColor: "text-rose-500" },
      { label: "Nhận - Trả tài sản", href: "/monitoring/asset-check", icon: ClipboardPaste, iconColor: "text-pink-500" },
      { label: "Tiếp nhận yêu cầu", href: "/monitoring/requests", icon: MailQuestion, iconColor: "text-teal-500" },
      { label: "Tiếp nhận đơn thư", href: "/monitoring/petitions", icon: UserX, iconColor: "text-red-500" },
    ],
  },
  {
    label: "Báo cáo thống kê",
    icon: AreaChart,
    iconColor: "text-purple-500",
    subItems: [
      { label: "Báo cáo cuối ngày", href: "/reports/daily", icon: CalendarCheck, iconColor: "text-sky-500" },
      { label: "Việc không phù hợp", href: "/reports/comprehensive", icon: FileSearch, iconColor: "text-indigo-500" },
      { label: "Sinh viên vi phạm", href: "/reports/student-violations", icon: ShieldAlert, iconColor: "text-rose-500" },
      { label: "Người tốt việc tốt", href: "/reports/good-deeds", icon: HeartHandshake, iconColor: "text-green-500" },
      { label: "Tiếp nhận yêu cầu", href: "/reports/request-reports", icon: MailQuestion, iconColor: "text-teal-500" },
      { label: "Tiếp nhận đơn thư", href: "/reports/incident-reports", icon: ShieldAlert, iconColor: "text-red-500" },
    ],
  },
   {
    label: "Thiết lập hệ thống",
    icon: Cog,
    iconColor: "text-gray-500",
    subItems: [
      { label: "Lịch học theo ngày", href: "/settings/schedule", icon: CalendarCog, iconColor: "text-pink-500" },
      { label: "Tham số hệ thống", href: "/settings/parameters", icon: SlidersHorizontal, iconColor: "text-lime-500" },
      { label: "Phân quyền truy cập", href: "/settings/permissions", icon: Lock, iconColor: "text-orange-500" },
      { label: "Nhật ký truy cập", href: "/settings/access-log", icon: History, iconColor: "text-cyan-500" },
    ],
  },
  {
    label: "Công cụ hỗ trợ",
    icon: BrainCircuit,
    iconColor: "text-rose-500",
    subItems: [
      { label: "Giám sát thực hành", href: "/monitoring/external-checkins", icon: MapPin, iconColor: "text-blue-500" },
      { label: "Giám sát Online", href: "/monitoring/online-classes", icon: Video, iconColor: "text-purple-500" },
      { label: "Minh chứng ca trực", href: "/feedback", icon: FileCheck, iconColor: "text-amber-500" },
      { label: "Kho minh chứng", href: "/monitoring/evidence", icon: Camera, iconColor: "text-blue-500" },
      { label: "Tra cứu thông tin", href: "/ai/assistant", icon: FileSearch, iconColor: "text-blue-500" },
      { label: "Bảng thảo luận", href: "/discussion", icon: Layout, iconColor: "text-pink-500" },
      { label: "Hộp thư nội bộ", href: "/messaging", icon: Mail, iconColor: "text-teal-500" },
    ],
  },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { open } = useSidebar();
  const { t } = useLanguage();
  const { user: authUser } = useUser();
  const firestore = useFirestore();

  const employeeDocRef = React.useMemo(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, 'employees', authUser.uid);
  }, [firestore, authUser]);
  const { data: user } = useDoc<Employee>(employeeDocRef);

  const rolesCollectionRef = React.useMemo(() => {
    if (!firestore) return null;
    return collection(firestore, 'roles');
  }, [firestore]);
  const { data: allRoles } = useCollection<Role>(rolesCollectionRef);

  const userRole = React.useMemo(() => {
    if (!user || !allRoles) return null;
    return allRoles.find(r => r.name === user.role);
  }, [allRoles, user]);
  
  const userPermissions = React.useMemo(() => userRole?.permissions || {}, [userRole]);

  const filteredMenuItems = React.useMemo(() => {
    if (!userRole || userRole.name === 'Hệ thống') return menuItems;

    return menuItems.map(item => {
      if (item.subItems) {
        const filteredSubItems = item.subItems.filter(subItem => userPermissions[subItem.href]?.access !== false);
        if (filteredSubItems.length === 0) return null;
        return { ...item, subItems: filteredSubItems };
      }
      
      if (userPermissions[item.href]?.access === false) {
        return null;
      }
      return item;
    }).filter(Boolean) as typeof menuItems;
  }, [userPermissions, userRole]);
  
  const [openMenu, setOpenMenu] = React.useState<string | null>(null);

  React.useEffect(() => {
    const activeMenu =
      filteredMenuItems.find(
        (item) =>
          item.subItems &&
          item.subItems.some((sub) => pathname.startsWith(sub.href))
      )?.label || null;
    setOpenMenu(activeMenu);
  }, [pathname, filteredMenuItems]);

  const isSubItemActive = (subItems: any[]) => subItems.some(item => pathname.startsWith(item.href));

  const handleMenuToggle = (label: string) => {
    setOpenMenu(prevMenu => (prevMenu === label ? null : label));
  };

  return (
    <SidebarMenu>
        {filteredMenuItems.map((item) =>
        item.subItems ? (
            <Collapsible 
            key={item.label} 
            open={openMenu === item.label}
            onOpenChange={() => handleMenuToggle(item.label)}
            >
            <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                <SidebarMenuButton
                    tooltip={t(item.label)}
                    isActive={isSubItemActive(item.subItems)}
                    className="justify-between"
                    >
                    <div className="flex items-center gap-3">
                    <item.icon size={18} className={item.iconColor} />
                    <span className="group-data-[collapsible=icon]:hidden">{t(item.label)}</span>
                    </div>
                    <ChevronDown
                    className={cn(
                        "h-4 w-4 transition-transform group-data-[collapsible=icon]:hidden",
                        openMenu === item.label && "-rotate-180",
                        open === false && "hidden",
                        item.iconColor
                    )}
                    />
                </SidebarMenuButton>
                </CollapsibleTrigger>
            </SidebarMenuItem>
            <CollapsibleContent>
                <SidebarMenuSub>
                {item.subItems.map((subItem) => (
                    <SidebarMenuSubItem key={subItem.href}>
                    <Link href={subItem.href}>
                        <SidebarMenuSubButton
                        tooltip={t(subItem.label)}
                        isActive={pathname === subItem.href}
                        title={t(subItem.label)}
                        >
                            {subItem.icon && <subItem.icon size={16} className={subItem.iconColor} />}
                            <span>{t(subItem.label)}</span>
                        </SidebarMenuSubButton>
                    </Link>
                    </SidebarMenuSubItem>
                ))}
                </SidebarMenuSub>
            </CollapsibleContent>
            </Collapsible>
        ) : (
            <SidebarMenuItem key={item.href}>
            <Link href={item.href}>
                <SidebarMenuButton
                tooltip={t(item.label)}
                isActive={pathname.startsWith(item.href)}
                >
                <item.icon size={18} className={item.iconColor} />
                <span className="group-data-[collapsible=icon]:hidden">{t(item.label)}</span>
                </SidebarMenuButton>
            </Link>
            </SidebarMenuItem>
        )
        )}
    </SidebarMenu>
  );
}

export function UserFooter() {
    const { user: authUser } = useUser();
    const firestore = useFirestore();
    const employeeDocRef = React.useMemo(() => {
        if (!firestore || !authUser) return null;
        return doc(firestore, 'employees', authUser.uid);
    }, [firestore, authUser]);
    const { data: user } = useDoc<Employee>(employeeDocRef);
    const { open } = useSidebar();
    
    return (
        <div className="flex items-center gap-3 cursor-pointer w-full p-2 hover:bg-muted rounded-md">
            <UserCircle className="h-8 w-8 text-primary shrink-0" />
            <div className={cn("flex flex-col group-data-[collapsible=icon]:hidden", !open && "hidden")}>
                <span className="text-sm font-medium text-foreground">{user?.name || "Admin"}</span>
            </div>
        </div>
    )
}
