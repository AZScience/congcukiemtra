
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
    { id: 'violation', name: 'Vi phạm', note: 'Ghi nhận các hành vi vi phạm' }
];

export const incidentCategories: IncidentCategory[] = [
    { id: 'cheating', recognitionId: 'violation', name: 'Gian lận thi cử', note: '' },
    { id: 'asset-return', recognitionId: 'good-deed', name: 'Nhặt của rơi trả người mất', note: '' }
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

export const roles: Role[] = [
  { id: 'system', name: 'Hệ thống', note: 'Quản trị viên cao nhất, có tất cả các quyền.', permissions: {} },
  { id: 'staff', name: 'Nhân viên', note: 'Nhân viên phòng ban, quyền hạn giới hạn.', permissions: {} },
];

export const employees: Employee[] = [
  { id: 'W6sN5jiSMDOiK4lk8AfZKMXQsAp2', name: 'Nguyễn Vĩnh Phúc', nickname: 'Phúc', position: 'Chuyên viên', birthDate: '15/07/1992', address: 'Quận 12, TP.HCM', phone: '0987654321', role: 'Hệ thống', email: 'ngviphuc@gmail.com', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&h=500&fit=crop' },
  { id: 'NTT-01234', name: 'Trần Thị B', nickname: 'B', position: 'Chuyên viên', birthDate: '20/11/1995', address: 'Quận 1, TP.HCM', phone: '0912345678', role: 'Nhân viên', email: 'b.tt@ntt.edu.vn', avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=500&h=500&fit=crop' },
];

export const sentMessages: Message[] = [];
export const deletedMessages: Message[] = [];
export const petitions: Petition[] = [];
export const requests: Request[] = [];
export const assetReceptions: AssetReception[] = [];
export const assetGratitudes: AssetGratitude[] = [];
export const activityLogs: ActivityLog[] = [];
export const schedules: DailySchedule[] = [];
