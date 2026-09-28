import { AppState, LeaveRequest, Shift, TeamId, WorkShift } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const TEAM_IDS: TeamId[] = ['T1', 'T2', 'T3'];

const CYCLE: Record<TeamId, Shift[]> = {
  T1: ['AFTERNOON', 'AFTERNOON', 'MORNING', 'MORNING', 'REST', 'REST'],
  T2: ['MORNING', 'MORNING', 'REST', 'REST', 'AFTERNOON', 'AFTERNOON'],
  T3: ['REST', 'REST', 'AFTERNOON', 'AFTERNOON', 'MORNING', 'MORNING']
};

export const SHIFT_TIME: Record<WorkShift, string> = {
  MORNING: '07:45-14:35',
  AFTERNOON: '14:35-21:35'
};

export function addDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00`).getTime();
  return new Date(base + days * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string): number {
  const a = new Date(`${start}T00:00:00`).getTime();
  const b = new Date(`${end}T00:00:00`).getTime();
  return Math.floor((b - a) / DAY_MS);
}

export function dateRange(start: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => addDays(start, i));
}

export function formatDateLabel(date: string): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

export function getBaseShift(team: TeamId, date: string, anchorDay1Date: string): Shift {
  const offset = daysBetween(anchorDay1Date, date);
  const index = ((offset % 6) + 6) % 6;
  return CYCLE[team][index];
}

function key(employeeId: string, date: string): string {
  return `${employeeId}::${date}`;
}

export function isOnApprovedLeave(leaveRequests: LeaveRequest[], employeeId: string, date: string): boolean {
  return leaveRequests.some(
    (request) =>
      request.employeeId === employeeId &&
      request.status === 'APPROVED' &&
      request.startDate <= date &&
      request.endDate >= date
  );
}

export function buildEffectiveShiftMap(state: AppState, dates: string[]): Map<string, Shift> {
  const map = new Map<string, Shift>();

  for (const employee of state.employees) {
    for (const date of dates) {
      map.set(key(employee.id, date), getBaseShift(employee.team, date, state.config.anchorDay1Date));
    }
  }

  const completedSwaps = [...state.swaps]
    .filter((swap) => swap.status === 'COMPLETED')
    .sort((a, b) => (a.completedAt || '').localeCompare(b.completedAt || ''));

  for (const swap of completedSwaps) {
    if (swap.type === 'SAME_DATE') {
      const date = swap.dateA;
      if (!dates.includes(date)) continue;
      const aKey = key(swap.employeeA, date);
      const bKey = key(swap.employeeB, date);
      const aShift = map.get(aKey);
      const bShift = map.get(bKey);
      if (aShift && bShift) {
        map.set(aKey, bShift);
        map.set(bKey, aShift);
      }
      continue;
    }

    const aKey = key(swap.employeeA, swap.dateA);
    const bKey = key(swap.employeeB, swap.dateB);
    const aShift = map.get(aKey);
    const bShift = map.get(bKey);
    if (aShift && bShift) {
      map.set(aKey, bShift);
      map.set(bKey, aShift);
    }
  }

  const completedRecalls = [...state.recalls]
    .filter((recall) => recall.status === 'COMPLETED')
    .sort((a, b) => (a.completedAt || '').localeCompare(b.completedAt || ''));

  for (const recall of completedRecalls) {
    if (!dates.includes(recall.date)) continue;
    map.set(key(recall.employeeId, recall.date), recall.shift);
  }

  return map;
}

export function getEmployeeShift(state: AppState, employeeId: string, date: string): Shift {
  const shiftMap = buildEffectiveShiftMap(state, [date]);
  return shiftMap.get(key(employeeId, date)) || 'REST';
}

export function getScheduledTeamForShift(state: AppState, date: string, shift: WorkShift): TeamId {
  const team = TEAM_IDS.find((teamId) => getBaseShift(teamId, date, state.config.anchorDay1Date) === shift);
  return team || 'T1';
}

export function getRestTeam(state: AppState, date: string): TeamId {
  const team = TEAM_IDS.find((teamId) => getBaseShift(teamId, date, state.config.anchorDay1Date) === 'REST');
  return team || 'T3';
}

export interface HeadcountResult {
  scheduledTeam: TeamId;
  assigned: string[];
  approvedAbsences: string[];
  available: string[];
  shortage: number;
}

export function getHeadcount(state: AppState, date: string, shift: WorkShift): HeadcountResult {
  const map = buildEffectiveShiftMap(state, [date]);
  const assigned = state.employees
    .filter((employee) => map.get(key(employee.id, date)) === shift)
    .map((employee) => employee.id);

  const approvedAbsences = assigned.filter((employeeId) =>
    isOnApprovedLeave(state.leaveRequests, employeeId, date)
  );

  const available = assigned.filter((employeeId) => !approvedAbsences.includes(employeeId));

  return {
    scheduledTeam: getScheduledTeamForShift(state, date, shift),
    assigned,
    approvedAbsences,
    available,
    shortage: Math.max(0, state.config.minimumStaffing - available.length)
  };
}

export function getLeaveYearLabel(
  state: AppState,
  date: string
): string {
  const d = new Date(`${date}T00:00:00`);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const started =
    month > state.config.leaveYearStartMonth ||
    (month === state.config.leaveYearStartMonth && day >= state.config.leaveYearStartDay);
  return String(started ? year : year - 1);
}

export function getChargedDaysForLeave(
  state: AppState,
  employeeId: string,
  startDate: string,
  endDate: string
): number {
  const count = daysBetween(startDate, endDate) + 1;
  if (count <= 0) return 0;
  if (state.config.dayCountMethod === 'CALENDAR_DAYS') return count;

  const dates = dateRange(startDate, count);
  const map = buildEffectiveShiftMap(state, dates);
  return dates.filter((date) => (map.get(key(employeeId, date)) || 'REST') !== 'REST').length;
}
