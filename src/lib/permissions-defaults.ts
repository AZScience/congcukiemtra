import { Permissions } from './types';

export const STAFF_PERMISSIONS: Permissions = {
    // Tổng quan
    '/dashboard': { access: true, view: true },

    // Bộ danh mục (Chỉ xem)
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

    // Công cụ kiểm tra (Khớp với ma trận: Không Thêm, có Sửa/Ghi nhận)
    '/monitoring/homeroom': { access: true, view: true, add: false, edit: true },
    '/monitoring/online': { access: true, view: true, add: false, edit: true },
    '/monitoring/in-person': { access: true, view: true, add: false, edit: true },
    '/monitoring/exams': { access: true, view: true, add: false, edit: true },
    '/monitoring/external-practice': { access: true, view: true, add: false, edit: true },
    '/monitoring/student-violations': { access: true, view: true, add: false, edit: true },
    '/monitoring/asset-check': { access: true, view: true, add: false, edit: true },
    '/monitoring/requests': { access: true, view: true, add: false, edit: true },
    '/monitoring/petitions': { access: true, view: true, add: false, edit: true },

    // Báo cáo thống kê (Chỉ xem)
    '/reports/daily': { access: true, view: true },
    '/reports/comprehensive': { access: true, view: true },
    '/reports/student-violations': { access: true, view: true },
    '/reports/good-deeds': { access: true, view: true },
    '/reports/request-reports': { access: true, view: true },
    '/reports/incident-reports': { access: true, view: true },

    // Công cụ hỗ trợ (Đầy đủ quyền)
    '/monitoring/external-checkins': { access: true, view: true, add: true, edit: true },
    '/monitoring/online-classes': { access: true, view: true, add: true, edit: true },
    '/feedback': { access: true, view: true, add: true, edit: true },
    '/monitoring/evidence': { access: true, view: true, add: true, edit: true },
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
    // Quyền xem log cho Controller
    '/settings/access-log': { access: true, view: true },
};
