
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
  lecturer?: string;
  department?: string;
  resolution?: string;
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
  id: string; // Internal UID
  employeeId: string; // Mã nhân viên (Mã số thực tế)
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
  content: string;
  status: string;
  time?: string;
  proctor1?: string;
  proctor2?: string;
  proctor3?: string;
  note?: string;
  recognitionDate?: string;
  employee?: string;
  attendingStudents?: number | null;
  incident?: string;
  isNotification?: boolean;
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
    attachments?: { name: string, url: string }[];
    isRead?: boolean;
};

export type Petition = {
  id: string;
  receptionDate: string;
  buildingBlock: string;
  recipient: string;
  citizenName: string;
  citizenId?: string;
  citizenAddress?: string;
  citizenPhone?: string;
  summary: string;
  petitionType: 'Khiếu nại' | 'Tố cáo' | 'Kiến nghị' | 'Phản ánh';
  numberOfPeople: number | null;
  previousAuthority?: string;
  isAccepted: boolean;
  isReturned: boolean;
  isForwarded: boolean;
  resolutionFollowUp: string;
  note?: string;
  evidence?: string; // Minh chứng đính kèm
};

export type Request = {
  id: string;
  ticketNumber?: string; // Số phiếu (hiển thị)
  buildingBlock: string; // Dãy nhà
  studentName: string; // Họ và tên
  studentId: string; // MSSV
  class: string; // Lớp
  department: string; // Khoa/Đơn vị
  phone: string; // Số điện thoại
  content: string; // Nội dung yêu cầu
  attachmentsNote?: string; // Ghi chú hồ sơ kèm theo
  attachments?: string; // Hồ sơ kèm theo (file/link)
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
  createdAt?: string; // Ngày tạo (hệ thống)
  status?: string; // Trạng thái
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
  evidence?: string; // Minh chứng
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
  isGratitude?: boolean; // Được vinh danh Tri ân (Người tốt việc tốt)
  returnWitness?: string; // Người chứng kiến lúc trả
  gratitudeStatus?: string; // Trạng thái tri ân
  gratitudeNumber?: string; // Số thư tri ân (VD: 0001/TTA)
  gratitudeGift?: string; // Quà trao tặng
  gratitudeDate?: string; // Ngày phát quà
  gratitudeStaff?: string; // Cán bộ phát quà
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
  userEmail?: string;
  ipAddress?: string;
  previousData?: any;
  newData?: any;
};

export type StudentViolation = {
  id: string;
  fullName: string;
  class: string;
  studentId: string;
  violationDate: string;
  violationType: string;
  signed: string;
  officer: string;
  note?: string;
  building?: string;
  department?: string;
  identifier?: string;
  signatureBase64?: string;
  portraitPhoto?: string; // Ảnh chân dung
  documentPhoto?: string; // Ảnh giấy tờ
};

export type Engagement = {
  id: string;
  dailyVisitors: number;
  weeklyVisitors: number;
  monthlyVisitors: number;
  onlineUsers: number;
};
