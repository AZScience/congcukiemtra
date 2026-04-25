

export type Student = {
  id: string; // MSSV
  name: string; // Họ và tên
  avatarUrl?: string; // Hình
  gender: 'Nam' | 'Nữ'; // Giới tính
  birthDate: string; // Ngày sinh
  birthPlace?: string; // Nơi sinh
  hometown?: string; // Nguyên quán
  ethnicity?: string; // Dân tộc
  religion?: string; // Tôn giáo
  permanentAddress?: string; // Thường trú
  temporaryAddress?: string; // Tạm trú
  citizenId?: string; // CCCD
  class: string; // Lớp
  major: string; // Ngành
  fatherName?: string; // Tên cha
  fatherOccupation?: string; // Nghề nghiệp cha
  motherName?: string; // Tên mẹ
  motherOccupation?: string; // Nghề nghiệp mẹ
  parentPhone?: string; // ĐT Phụ huynh
  phone: string; // Điện thoại
  email: string; // Email
  note?: string; // Ghi chú
};

export type Lecturer = {
  id: string; // Mã giảng viên
  name: string; // Họ và tên
  department?: string; // Đơn vị
  position?: string; // Chức vụ
  birthDate?: string; // Sinh nhật
  address?: string; // Địa chỉ
  phone?: string; // Điện thoại
  email?: string; // Email
  note?: string; // Ghi chú
  avatarUrl?: string; // Hình
};

export type Incident = {
  id: string;
  description: string;
  date: string;
  status: 'New' | 'In Progress' | 'Resolved';
  assignedTo: string;
};

export type Department = {
  id: string;
  departmentId: string;
  name: string;
  head: string;
  deputyHead: string;
  secretary: string;
  spokesperson: string;
  phone: string;
  email: string;
  note: string;
};


export type Recognition = {
  id: string;
  name: string;
  note: string;
};

export type IncidentCategory = {
  id: string;
  recognitionId: string;
  name:string;
  note: string;
};

export type Position = {
  id: string;
  name: string;
  note: string;
};

export type Gift = {
  id: string;
  name: string;
  note: string;
};

export type BuildingBlock = {
  id: string;
  code: string;
  name: string;
  isInactive: boolean;
  note: string;
};

export type Classroom = {
  id: string;
  name: string;
  buildingBlockId: string;
  seatingCapacity: number | null;
  tableCount: number | null;
  examCapacity: number | null;
  roomType: string;
  subjectNature?: string;
  hasProjector: boolean;
  isInactive: boolean;
  note: string;
};

export type Permissions = {
  [page: string]: {
    access?: boolean;
    view?: boolean;
    add?: boolean;
    edit?: boolean;
    delete?: boolean;
    import?: boolean;
    export?: boolean;
  }
};

export type Role = {
  id: string;
  name: string;
  note: string;
  permissions: Permissions;
};

export type Employee = {
  id: string; // Mã số
  name: string; // Họ và tên
  nickname: string; // Biệt danh
  position: string; // Chức vụ
  birthDate: string; // Sinh nhật
  address?: string; // Địa chỉ
  phone: string; // Điện thoại
  role: string; // Vai trò
  email: string; // Email
  password?: string; // Mật khẩu
  note?: string; // Ghi chú
  avatarUrl?: string; // Hình đại diện
};

export type DailySchedule = {
  id: string;
  date: string;
  building: string;
  room: string;
  period: string;
  type: 'LT' | 'TH' | '';
  department: string;
  class: string;
  studentCount: number | null;
  lecturer: string;
  proctor1?: string;
  proctor2?: string;
  proctor3?: string;
  content: string;
  status: string;
  note?: string;
  recognitionDate?: string;
  employee?: string;
  attendingStudents?: number | null;
  incident?: string;
  incidentDetail?: string;
  evidence?: string;
};

export type Message = {
    id: string;
    senderId: string;
    recipientIds: string[];
    subject: string;
    body: string;
    timestamp: string; // ISO 8601 format
    attachments?: string[];
    isRead?: boolean;
};

export type Petition = {
  id: string;
  receptionDate: string;
  buildingBlock: string;
  recipient: string;
  citizenInfo: string;
  summary: string;
  petitionType: 'Khiếu nại' | 'Tố cáo' | 'Kiến nghị' | 'Phản ánh';
  numberOfPeople: number | null;
  previousAuthority?: string;
  isAccepted: boolean;
  isReturned: boolean;
  isForwarded: boolean;
  resolutionFollowUp: string;
  note?: string;
};

export type Request = {
  id: string; // Số phiếu
  buildingBlock: string; // Dãy nhà
  studentName: string; // Họ và tên
  studentId: string; // MSSV
  class: string; // Lớp
  department: string; // Khoa/Đơn vị
  phone: string; // Số điện thoại
  content: string; // Nội dung yêu cầu
  attachments?: string; // Hồ sơ kèm theo
  requestDate: string; // Ngày yêu cầu
  requesterName?: string; // Người yêu cầu
  receptionDate: string; // Ngày tiếp nhận
  recipient: string; // Người tiếp nhận
  isProcessedImmediately: boolean; // Xử lý ngay
  appointmentDate?: string; // Hẹn ngày
  otherNote?: string; // Khác
  resolutionDate?: string; // Ngày giải quyết
  resolverName?: string; // Cán bộ giải quyết
  feedback?: string; // Ý kiến phản hồi
};

export type AssetReception = {
  id: string;
  entryNumber: string; // Số tiếp nhận
  receptionDate: string; // Ngày tiếp nhận
  buildingBlock?: string; // Dãy nhà
  giverName: string; // Họ và tên người giao
  giverId: string; // MSSV/CCCD người giao
  giverClass?: string; // Lớp người giao
  giverUnit?: string; // Khoa/Đơn vị/Địa chỉ người giao
  giverPhone?: string; // SĐT người giao
  content: string; // Nội dung tiếp nhận
  assetState: string; // Tình trạng tài sản lúc nhận
  assetImageUrls?: string[]; // Ảnh tài sản
  returnStatus: 'Đã trả' | 'Chưa trả' | 'Đã xử lý';
  receivingStaff: string; // Cán bộ tiếp nhận
  witness?: string; // Người làm chứng lúc nhận

  resolutionDate?: string; // Ngày trả
  returnStaff?: string; // Cán bộ bàn giao (trả)
  receiverName?: string; // Người nhận lại TS/ĐV
  receiverId?: string; // MSSV/CCCD người nhận
  receiverClass?: string; // Lớp người nhận
  receiverUnit?: string; // Khoa/Đơn vị/Địa chỉ người nhận
  receiverPhone?: string; // SĐT người nhận
  returnAssetState?: string; // Tình trạng tài sản lúc trả
  receiverFeedback?: string; // Ý kiến người nhận lại
  returnWitness?: string; // Người chứng kiến lúc trả
  gratitudeStatus?: string; // Trạng thái tri ân
};


export type AssetGratitude = {
  id: string;
  entryNumber: string; // Số vào sổ
  location: string; // Dãy nhà
  receiverName: string; // Người giao
  receptionDate: string; // Ngày tiếp nhận
  giveawayDate: string; // Ngày tri ân
  gift: string; // Quà
  citizenId: string;
  phone: string;
  department: string; // Đơn vị
  assetEntryNumber: string; // Số tiếp nhận
  note?: string; // Ghi chú
  giftGiver?: string; // Người trao quà
  giftWitness?: string; // Người chứng kiến
  giveawayStatus?: 'Đã trao' | 'Chưa trao'; // Trạng thái trao quà
};

export type ActivityLog = {
  id: string;
  timestamp: string; // ISO 8601 format
  userId: string;
  action: 'login' | 'logout' | 'view' | 'create' | 'update' | 'delete' | 'import' | 'export';
  targetType: string; // e.g., 'Student', 'Lecturer', 'Incident'
  details: string;
};
