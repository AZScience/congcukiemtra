import { Permissions } from './types';

// Danh sách tất cả các module ID từ Roles Page
export const ALL_MODULE_IDS = [
    '/personnel/positions', '/personnel/building-blocks', '/personnel/departments', 
    '/personnel/lecturers', '/personnel/employees', '/personnel/classrooms', 
    '/personnel/gifts', '/personnel/students', '/personnel/roles', 
    '/personnel/recognitions', '/personnel/incident-categories', '/personnel/document-types',
    '/monitoring/homeroom', '/monitoring/online', '/monitoring/in-person', 
    '/monitoring/exams', '/monitoring/external-practice', '/monitoring/student-violations', 
    '/monitoring/asset-check', '/monitoring/requests', '/monitoring/petitions',
    '/reports/daily', '/reports/comprehensive', '/reports/student-violations', 
    '/reports/good-deeds', '/reports/request-reports', '/reports/incident-reports',
    '/settings/schedule', '/settings/parameters', '/settings/permissions', '/settings/access-log',
    '/monitoring/external-checkins', '/monitoring/online-classes', '/monitoring/document-records', '/monitoring/document-lookup', '/lecturer-portal', 
    '/feedback', '/monitoring/evidence', '/ai/assistant', '/discussion', '/messaging'
];

export const STAFF_PERMISSIONS: Permissions = {
    '/dashboard': { access: true, view: true },
    '/personnel/positions': { access: true, view: true },
    '/personnel/building-blocks': { access: true, view: true },
    '/personnel/departments': { access: true, view: true },
    '/personnel/lecturers': { access: true, view: true },
    '/personnel/employees': { access: true, view: true },
    '/personnel/classrooms': { access: true, view: true },
    '/personnel/gifts': { access: true, view: true },
    '/personnel/students': { access: true, view: true },
    '/personnel/recognitions': { access: true, view: true },
    '/personnel/incident-categories': { access: true, view: true },
    '/personnel/document-types': { access: true, view: true },
    '/monitoring/homeroom': { access: true, view: true, add: false, edit: true },
    '/monitoring/online': { access: true, view: true, add: false, edit: true },
    '/monitoring/in-person': { access: true, view: true, add: false, edit: true },
    '/monitoring/exams': { access: true, view: true, add: false, edit: true },
    '/monitoring/external-practice': { access: true, view: true, add: false, edit: true },
    '/monitoring/student-violations': { access: true, view: true, add: false, edit: true },
    '/monitoring/asset-check': { access: true, view: true, add: false, edit: true },
    '/monitoring/requests': { access: true, view: true, add: false, edit: true },
    '/monitoring/petitions': { access: true, view: true, add: false, edit: true },
    '/reports/daily': { access: true, view: true },
    '/reports/comprehensive': { access: true, view: true },
    '/reports/student-violations': { access: true, view: true },
    '/reports/good-deeds': { access: true, view: true },
    '/reports/request-reports': { access: true, view: true },
    '/reports/incident-reports': { access: true, view: true },
    '/monitoring/external-checkins': { access: true, view: true, add: true, edit: true },
    '/monitoring/document-records': { access: true, view: true, add: true, edit: true },
    '/monitoring/document-lookup': { access: true, view: true },
    '/monitoring/online-classes': { access: true, view: true, add: true, edit: true },
    '/feedback': { access: true, view: true, add: true, edit: true },
    '/monitoring/evidence': { access: true, view: true, add: true, edit: true, delete: true },
    '/ai/assistant': { access: true, view: true },
    '/discussion': { access: true, view: true, add: true, edit: true },
    '/messaging': { access: true, view: true, add: true, edit: true },
    '/lecturer-portal': { access: true, view: true, add: true, edit: true },
};

export const CONTROLLER_PERMISSIONS: Permissions = {
    ...Object.keys(STAFF_PERMISSIONS).reduce((acc, key) => {
        acc[key] = { ...STAFF_PERMISSIONS[key], export: true };
        return acc;
    }, {} as Permissions),
    '/settings/access-log': { access: true, view: true },
};

export const ADMIN_PERMISSIONS: Permissions = ALL_MODULE_IDS.reduce((acc, id) => {
    acc[id] = { access: true, view: true, add: true, edit: true, delete: true, import: true, export: true };
    return acc;
}, { '/dashboard': { access: true, view: true } } as Permissions);

export const LECTURER_PERMISSIONS: Permissions = {
    '/dashboard': { access: true, view: true },
    '/lecturer-portal': { access: true, view: true, add: true, edit: true },
    '/discussion': { access: true, view: true, add: true, edit: true },
    '/messaging': { access: true, view: true, add: true, edit: true },
    '/ai/assistant': { access: true, view: true },
};

export const ADVISOR_PERMISSIONS: Permissions = {
    '/dashboard': { access: true, view: true },
    '/monitoring/homeroom': { access: true, view: true, add: true, edit: true },
    '/discussion': { access: true, view: true, add: true, edit: true },
    '/messaging': { access: true, view: true, add: true, edit: true },
    '/ai/assistant': { access: true, view: true },
};
