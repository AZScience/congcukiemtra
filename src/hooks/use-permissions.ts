
import * as React from "react";
import { useUser, useFirestore, useDoc, useCollection } from "@/firebase";
import { collection, doc, query, where } from "firebase/firestore";
import type { Employee, Role, Permissions } from "@/lib/types";

export function usePermissions(pageId?: string) {
  const { user: authUser, loading: authLoading } = useUser();
  const firestore = useFirestore();

  const isSuperAdmin = React.useMemo(() => {
    if (!authUser?.email) return false;
    const superAdminEmails = [
      "ngviphuc@gmail.com", 
      "nguyen.phuc@ntt.edu.vn",
      "phucn@ntt.edu.vn"
    ];
    return superAdminEmails.some(e => e.toLowerCase() === authUser.email!.toLowerCase());
  }, [authUser]);

  const employeeDocRef = React.useMemo(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, "employees", authUser.uid);
  }, [firestore, authUser]);

  const { data: userByUid, loading: userByUidLoading, error: userByUidError } = useDoc<Employee>(employeeDocRef);
  
  const employeesByEmailQuery = React.useMemo(() => {
    if (!firestore || !authUser?.email || (userByUid && !userByUidLoading)) return null;
    return query(collection(firestore, "employees"), where("email", "==", authUser.email));
  }, [firestore, authUser, userByUid, userByUidLoading]);

  const { data: usersByEmail, loading: usersByEmailLoading, error: usersByEmailError } = useCollection<Employee>(employeesByEmailQuery as any);

  const user = React.useMemo(() => {
    if (userByUid) return userByUid;
    if (usersByEmail && usersByEmail.length > 0) return usersByEmail[0];
    return null;
  }, [userByUid, usersByEmail]);

  const userLoading = authLoading || userByUidLoading || (authUser?.email && !userByUid && usersByEmailLoading);
  const userError = userByUidError || usersByEmailError;

  const rolesCollectionRef = React.useMemo(() => {
    if (!firestore || !authUser) return null;
    return collection(firestore, "roles");
  }, [firestore, authUser]);

  const { data: allRoles, loading: rolesLoading, error: rolesError } = useCollection<Role>(rolesCollectionRef);

  const userRole = React.useMemo(() => {
    if (!user || !allRoles) {
      if (!user && !userLoading && authUser) {
        console.warn('[usePermissions] User document not found for UID:', authUser.uid, 'Email:', authUser.email);
        
        // Even if user doc is missing, if they are Super Admin they should have full access
        if (isSuperAdmin) {
          return { name: "Super Admin", permissions: {} } as any; 
        }
      }
      return null;
    }
    const searchRole = String(user.role || "").trim().toLowerCase();
    console.log('[usePermissions] Searching for role:', `"${searchRole}"`, 'in', allRoles.length, 'roles');
    
    // Try matching by ID first, then by Name
    let matched = allRoles.find((r) => 
      r.id.toLowerCase() === searchRole || 
      r.name.trim().toLowerCase() === searchRole
    );

    // Special case for Admin/Quản trị if still not found
    if (!matched && (searchRole === 'admin' || searchRole === 'administrator')) {
      matched = allRoles.find(r => {
        const n = r.name.toLowerCase();
        return n.includes('quản trị') || n.includes('admin');
      });
    }

    console.log('[usePermissions] Match result:', matched ? `Found "${matched.name}" (${matched.id})` : 'NOT FOUND');
    return matched;
  }, [allRoles, user, userLoading, authUser]);

  const isSystemRole = React.useMemo(() => {
    const roleName = userRole?.name?.toLowerCase() || "";
    const systemNames = ["hệ thống", "admin", "administrator", "quản trị hệ thống", "quản trị viên"];
    return systemNames.includes(roleName.trim());
  }, [userRole]);
  
  const hasFullAccess = isSuperAdmin || isSystemRole;

  const allPermissions = React.useMemo(() => {
    return userRole?.permissions || {};
  }, [userRole]);

  const getPagePermissions = React.useCallback((pid: string) => {
    if (hasFullAccess) {
      return new Proxy({}, {
        get: (_, prop) => {
          if (prop === 'access' || prop === 'view' || prop === 'add' || prop === 'edit' || prop === 'delete' || prop === 'import' || prop === 'export') {
            return true;
          }
          return undefined;
        }
      }) as any;
    }
    
    const perms = allPermissions[pid];
    console.log(`[usePermissions] Page: ${pid}, Perms:`, perms);
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
  }, [hasFullAccess, allPermissions]);

  const isLoading = authLoading || (authUser && (userLoading || rolesLoading));
  const error = userError || rolesError;

  // Convenient permissions for the requested pageId
  const permissions = React.useMemo(() => {
    return pageId ? getPagePermissions(pageId) : {};
  }, [pageId, getPagePermissions]);

  return {
    user,
    userRole,
    allPermissions,
    permissions, // Specific to pageId
    hasPermission: React.useCallback((pid: string, action: keyof Permissions[string] = "access") => {
        if (hasFullAccess) return true;
        return !!allPermissions[pid]?.[action];
    }, [hasFullAccess, allPermissions]),
    isSuperAdmin,
    isSystemRole,
    hasFullAccess,
    loading: isLoading,
    error
  };
}
