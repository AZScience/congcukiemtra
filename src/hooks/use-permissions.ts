import * as React from "react";
import { useUser } from "@/firebase";
import { useMasterData } from "@/providers/master-data-provider";
import type { Employee, Role, Permissions } from "@/lib/types";
import { roles as staticRoles, employees as staticEmployees } from "@/lib/data";

export function usePermissions(pageId?: string) {
  const { user: authUser, loading: authLoading } = useUser();
  const { employees: masterEmployees, roles: masterRoles, loading: masterLoading } = useMasterData();

  // Find user data
  const user = React.useMemo(() => {
    if (!authUser) return null;
    
    // Check Firestore data from MasterDataProvider first
    const firestoreUser = masterEmployees.find(e => 
      e.id === authUser.uid || e.email?.toLowerCase() === authUser.email?.toLowerCase()
    );
    if (firestoreUser) return firestoreUser;
    
    // Fallback to static data
    return staticEmployees.find(e => e.email?.toLowerCase() === authUser.email?.toLowerCase()) || null;
  }, [masterEmployees, authUser]);

  // Determine if Super Admin
  const isSuperAdmin = React.useMemo(() => {
    // Check by email
    const superAdminEmails = [
      "ngviphuc@gmail.com", 
      "nguyen.phuc@ntt.edu.vn",
      "phucn@ntt.edu.vn",
      "vinhphuc@ntt.edu.vn",
      "ngviphuc@ntt.edu.vn"
    ];
    if (authUser?.email && superAdminEmails.some(e => e.toLowerCase() === authUser.email!.toLowerCase())) return true;
    
    // Check by role name from user object
    const roleName = String(user?.role || "").trim().toLowerCase();
    const superAdminRoles = ['hệ thống', 'quản trị viên', 'admin', 'system', 'administrator'];
    return superAdminRoles.includes(roleName);
  }, [authUser, user]);

  // Merge roles
  const allRoles = React.useMemo(() => {
    if (!masterRoles || masterRoles.length === 0) return staticRoles as Role[];
    
    const merged = [...masterRoles];
    staticRoles.forEach((sr: any) => {
      if (!merged.find(r => r.id.toLowerCase() === sr.id.toLowerCase() || r.name.toLowerCase() === sr.name.toLowerCase())) {
        merged.push(sr);
      }
    });
    return merged;
  }, [masterRoles]);

  // Find specific role for user
  const userRole = React.useMemo(() => {
    if (!user || !allRoles) {
      if (!user && !masterLoading && authUser && isSuperAdmin) {
        return { name: "Super Admin", permissions: {} } as any; 
      }
      return null;
    }
    const searchRole = String(user.role || "").trim().toLowerCase();
    
    // Exact match
    let matched = allRoles.find((r) => 
      r.id.toLowerCase() === searchRole || 
      r.name.trim().toLowerCase() === searchRole
    );

    // Partial match fallback
    if (!matched) {
      matched = allRoles.find(r => {
        const n = r.name.toLowerCase();
        return n.includes(searchRole) || searchRole.includes(n);
      });
    }

    if (process.env.NODE_ENV === 'development' && authUser) {
      console.log(`[usePermissions] User: ${user.name}, Role In DB: "${user.role}", Matched Role: ${matched?.name || 'None'}`);
    }

    return matched;
  }, [allRoles, user, masterLoading, authUser, isSuperAdmin]);

  // Special System Role check
  const isSystemRole = React.useMemo(() => {
    const roleName = userRole?.name?.toLowerCase() || "";
    const systemNames = ["hệ thống", "admin", "administrator", "quản trị hệ thống", "quản trị viên"];
    return systemNames.includes(roleName.trim());
  }, [userRole]);
  
  const hasFullAccess = isSuperAdmin || isSystemRole;

  // Resolve all permissions with fallback to static defaults
  const allPermissions = React.useMemo(() => {
    const firestorePerms = userRole?.permissions || {};
    
    // Find corresponding static role to get defaults
    const staticRole = staticRoles.find(sr => 
      (userRole && sr.id.toLowerCase() === userRole.id.toLowerCase()) || 
      (userRole && sr.name.trim().toLowerCase() === userRole.name.trim().toLowerCase())
    );
    
    if (staticRole) {
      const combined: Permissions = { ...staticRole.permissions };
      
      // Override with Firestore only if it has meaningful data
      Object.keys(firestorePerms).forEach(key => {
        const fp = firestorePerms[key];
        const hasAnyPermission = fp.access || fp.view || fp.add || fp.edit || fp.delete || fp.import || fp.export;
        if (hasAnyPermission) {
          combined[key] = { ...combined[key], ...fp };
        }
      });
      return combined;
    }
    
    return firestorePerms;
  }, [userRole]);

  // Get permissions for a specific page
  const getPagePermissions = React.useCallback((pid: string) => {
    if (hasFullAccess) {
      return { access: true, view: true, add: true, edit: true, delete: true, import: true, export: true };
    }
    
    const perms = allPermissions[pid];
    
    if (process.env.NODE_ENV === 'development' && pageId === pid) {
      console.log(`[usePermissions] Page: ${pid}, Resolved Perms:`, perms);
    }

    if (!perms) return { access: false, view: false, add: false, edit: false, delete: false, import: false, export: false };
    
    return {
      access: !!perms.access,
      view: !!perms.view,
      add: !!perms.add,
      edit: !!perms.edit,
      delete: !!perms.delete,
      import: !!perms.import,
      export: !!perms.export
    };
  }, [allPermissions, hasFullAccess, pageId]);

  // Legacy helper function used by Sidebar and other components
  const hasPermission = React.useCallback((pid: string, key: keyof Permissions[string]) => {
    const p = getPagePermissions(pid);
    return !!(p as any)[key];
  }, [getPagePermissions]);

  const isLoading = authLoading || masterLoading;

  return {
    permissions: getPagePermissions(pageId || ""),
    getPagePermissions,
    hasPermission,
    isSuperAdmin: hasFullAccess,
    user,
    isLoading,
    userRole
  };
}
