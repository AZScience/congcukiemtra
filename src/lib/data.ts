
import type { Student, Lecturer, Department, Incident, Recognition, IncidentCategory, Position, BuildingBlock, Classroom, Role, Employee, DailySchedule, Message, Petition, Request, AssetReception, AssetGratitude, ActivityLog, Gift } from './types';

export const students: Student[] = [];

export const lecturers: Lecturer[] = [
    { id: 'GV001', name: 'GS. TS. Nguyễn Văn A', department: 'Khoa Công nghệ thông tin', email: 'a.nv@ntt.edu.vn' },
    { id: 'GV002', name: 'PGS. TS. Trần Thị B', department: 'Khoa Quản trị kinh doanh', email: 'b.tt@ntt.edu.vn' },
];

export const incidents: Incident[] = [];
export const dailyReport = {
    date: new Date().toLocaleDateString('vi-VN'),
    attendance: 0,
    newIncidents: 0,
    resolvedIncidents: 0,
};
export const departments: Department[] = [
    { id: 'K-CNTT', departmentId: 'K-CNTT', name: 'Khoa Công nghệ thông tin', head: 'Nguyễn Văn A', deputyHead: 'Trần Thị B', secretary: '', spokesperson: '', phone: '', email: '', note: '' },
    { id: 'K-QTKD', departmentId: 'K-QTKD', name: 'Khoa Quản trị kinh doanh', head: 'Lê Văn C', deputyHead: '', secretary: '', spokesperson: '', phone: '', email: '', note: '' },
    { id: 'PKTNB', departmentId: 'PKTNB', name: 'Phòng kiểm tra nội bộ', head: 'Nguyễn Vĩnh Phúc', deputyHead: '', secretary: '', spokesperson: '', phone: '', email: '', note: '' }
];
export const recognitions: Recognition[] = [
    { id: 'good-deed', name: 'Việc tốt', note: 'Ghi nhận các hành động tốt' },
    { id: 'violation', name: 'Vi phạm', note: 'Ghi nhận các hành vi vi phạm' },
    { id: 'external-practice', name: 'Thực hành ngoài', note: 'Ghi nhận các buổi thực hành ngoài trường' }
];

export const incidentCategories: IncidentCategory[] = [
    { id: 'cheating', recognitionId: 'violation', name: 'Gian lận thi cử', note: '' },
    { id: 'asset-return', recognitionId: 'good-deed', name: 'Nhặt của rơi trả người mất', note: '' },
    { id: 'external-late', recognitionId: 'external-practice', name: 'Đến muộn địa điểm thực hành', note: '' },
    { id: 'external-absent', recognitionId: 'external-practice', name: 'Vắng mặt không phép', note: '' }
];

export const positions: Position[] = [
    { id: 'chuyen-vien', name: 'Chuyên viên', note: '' },
    { id: 'truong-phong', name: 'Trưởng phòng', note: '' }
];

export const gifts: Gift[] = [
    { id: 'thu-khen', name: 'Thư khen', note: '' },
    { id: 'giay-khen', name: 'Giấy khen', note: '' }
];

export const buildingBlocks: BuildingBlock[] = [
    { id: 'block-a', code: 'A', name: 'Dãy nhà A', isInactive: false, note: '' },
    { id: 'block-l', code: 'L', name: 'Dãy nhà L', isInactive: false, note: '' }
];
export const classrooms: Classroom[] = [
    { id: 'A.801', name: 'A.801', buildingBlockId: 'block-a', seatingCapacity: 60, tableCount: 30, examCapacity: 30, roomType: 'Lý thuyết', hasProjector: true, isInactive: false, note: '' },
    { id: 'L.101', name: 'L.101', buildingBlockId: 'block-l', seatingCapacity: 80, tableCount: 40, examCapacity: 40, roomType: 'Lý thuyết', hasProjector: true, isInactive: false, note: '' }
];

import { STAFF_PERMISSIONS, CONTROLLER_PERMISSIONS } from './permissions-defaults';

export const roles: Role[] = [
  { id: 'system', name: 'Hệ thống', note: 'Quản trị viên cao nhất, có tất cả các quyền.', permissions: {} },
  { id: 'controller', name: 'Kiểm soát viên', note: 'Kiểm soát viên phòng ban, có quyền ghi nhận và xem báo cáo.', permissions: CONTROLLER_PERMISSIONS },
  { id: 'staff', name: 'Nhân viên', note: 'Nhân viên phòng ban, quyền hạn giới hạn ghi nhận.', permissions: STAFF_PERMISSIONS },
];


export const employees: Employee[] = [
  { id: 'NTT-02715-UID', employeeId: 'NTT-02715', name: 'Nguyễn Vĩnh Phúc', nickname: 'Phúc', position: 'Chuyên viên', birthDate: '15/07/1992', address: 'Quận 12, TP.HCM', phone: '0987654321', role: 'Hệ thống', email: 'vinhphuc@ntt.edu.vn', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&h=500&fit=crop' },
  { id: 'NTT-01234-UID', employeeId: 'NTT-01234', name: 'Trần Thị B', nickname: 'B', position: 'Chuyên viên', birthDate: '20/11/1995', address: 'Quận 1, TP.HCM', phone: '0912345678', role: 'Nhân viên', email: 'b.tt@ntt.edu.vn', avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500&h=500&fit=crop' },
  { id: 'K4pEteCqGtWKVuVfVo3KC0SAuv72', employeeId: 'NTT-09999', name: 'Đặng Ngọc Phương', nickname: 'Phương', position: 'Nhân viên', birthDate: '01/01/1990', address: 'TP.HCM', phone: '0900000000', role: 'Nhân viên', email: 'dnphuong@ntt.edu.vn' },
];


export const sentMessages: Message[] = [];
export const deletedMessages: Message[] = [];
export const petitions: Petition[] = [];
export const requests: Request[] = [];
export const assetReceptions: AssetReception[] = [];
export const assetGratitudes: AssetGratitude[] = [];
export const activityLogs: ActivityLog[] = [];
export const schedules: DailySchedule[] = [];
