export type TeamId = 'T1' | 'T2' | 'T3';
export type Shift = 'MORNING' | 'AFTERNOON' | 'REST';
export type WorkShift = Exclude<Shift, 'REST'>;
export type LeaveType = 'ANNUAL' | 'MEDICAL' | 'OIL';
export type LeaveStatus = 'PENDING' | 'APPROVED' | 'DECLINED';
export type SwapType = 'SAME_DATE' | 'DATE_FOR_DATE';
export type SwapStatus = 'PENDING' | 'APPROVED' | 'COMPLETED' | 'DECLINED' | 'CANCELLED';
export type RecallStatus = 'OFFERED' | 'DECLINED' | 'ACCEPTED' | 'COMPLETED';
export type DayCountMethod = 'SCHEDULED_ONLY' | 'CALENDAR_DAYS';

export interface Employee {
  id: string;
  team: TeamId;
}

export interface Config {
  anchorDay1Date: string;
  leaveYearStartMonth: number;
  leaveYearStartDay: number;
  minimumStaffing: number;
  annualDefaultAllowance: number;
  dayCountMethod: DayCountMethod;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
  chargedDays: number;
  status: LeaveStatus;
  createdAt: string;
  approverId?: string;
  decidedAt?: string;
  validationError?: string;
}

export interface SwapRequest {
  id: string;
  type: SwapType;
  employeeA: string;
  employeeB: string;
  dateA: string;
  dateB: string;
  status: SwapStatus;
  createdAt: string;
  approvedAt?: string;
  completedAt?: string;
}

export interface RecallRecord {
  id: string;
  date: string;
  shift: WorkShift;
  employeeId: string;
  status: RecallStatus;
  offeredAt: string;
  acceptedAt?: string;
  completedAt?: string;
}

export interface AnnualAdjustment {
  id: string;
  employeeId: string;
  yearLabel: string;
  deltaDays: number;
  createdAt: string;
  reason: string;
}

export interface OilLedgerEntry {
  id: string;
  employeeId: string;
  deltaDays: number;
  createdAt: string;
  reason: string;
}

export interface AuditItem {
  id: string;
  timestamp: string;
  actorId: string;
  action: string;
  detail: string;
}

export interface AppState {
  config: Config;
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  swaps: SwapRequest[];
  recalls: RecallRecord[];
  annualAdjustments: AnnualAdjustment[];
  oilLedger: OilLedgerEntry[];
  activity: AuditItem[];
  rosterWindowStart: string;
}

export interface Banner {
  tone: 'success' | 'error' | 'info';
  message: string;
}
