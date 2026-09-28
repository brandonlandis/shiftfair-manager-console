import { AppState, Employee, LeaveRequest, RecallRecord, Shift, SwapRequest, TeamId, WorkShift } from './types';
import {
  buildEffectiveShiftMap,
  dateRange,
  getEmployeeShift,
  getHeadcount,
  getLeaveYearLabel,
  getRestTeam,
  isOnApprovedLeave
} from './scheduler';

function key(employeeId: string, date: string): string {
  return `${employeeId}::${date}`;
}

export interface AnnualBalance {
  allowance: number;
  approvedUsed: number;
  pending: number;
  remaining: number;
  remainingAfterPending: number;
}

export interface OilBalance {
  credits: number;
  approvedUsed: number;
  pending: number;
  remaining: number;
  remainingAfterPending: number;
}

export interface MedicalStats {
  approvedCurrentYear: number;
  approvedAllTime: number;
  pendingCurrentYear: number;
}

export function getAnnualBalance(state: AppState, employeeId: string, yearLabel: string): AnnualBalance {
  const approvedUsed = state.leaveRequests
    .filter(
      (request) =>
        request.employeeId === employeeId &&
        request.type === 'ANNUAL' &&
        request.status === 'APPROVED' &&
        getLeaveYearLabel(state, request.startDate) === yearLabel
    )
    .reduce((sum, request) => sum + request.chargedDays, 0);

  const pending = state.leaveRequests
    .filter(
      (request) =>
        request.employeeId === employeeId &&
        request.type === 'ANNUAL' &&
        request.status === 'PENDING' &&
        getLeaveYearLabel(state, request.startDate) === yearLabel
    )
    .reduce((sum, request) => sum + request.chargedDays, 0);

  const adjustment = state.annualAdjustments
    .filter((item) => item.employeeId === employeeId && item.yearLabel === yearLabel)
    .reduce((sum, item) => sum + item.deltaDays, 0);

  const allowance = state.config.annualDefaultAllowance + adjustment;

  return {
    allowance,
    approvedUsed,
    pending,
    remaining: allowance - approvedUsed,
    remainingAfterPending: allowance - approvedUsed - pending
  };
}

export function getOilBalance(state: AppState, employeeId: string): OilBalance {
  const credits = state.oilLedger
    .filter((item) => item.employeeId === employeeId)
    .reduce((sum, item) => sum + item.deltaDays, 0);

  const approvedUsed = state.leaveRequests
    .filter((request) => request.employeeId === employeeId && request.type === 'OIL' && request.status === 'APPROVED')
    .reduce((sum, request) => sum + request.chargedDays, 0);

  const pending = state.leaveRequests
    .filter((request) => request.employeeId === employeeId && request.type === 'OIL' && request.status === 'PENDING')
    .reduce((sum, request) => sum + request.chargedDays, 0);

  return {
    credits,
    approvedUsed,
    pending,
    remaining: credits - approvedUsed,
    remainingAfterPending: credits - approvedUsed - pending
  };
}

export function getMedicalStats(state: AppState, employeeId: string, yearLabel: string): MedicalStats {
  const approvedCurrentYear = state.leaveRequests
    .filter(
      (request) =>
        request.employeeId === employeeId &&
        request.type === 'MEDICAL' &&
        request.status === 'APPROVED' &&
        getLeaveYearLabel(state, request.startDate) === yearLabel
    )
    .reduce((sum, request) => sum + request.chargedDays, 0);

  const approvedAllTime = state.leaveRequests
    .filter(
      (request) => request.employeeId === employeeId && request.type === 'MEDICAL' && request.status === 'APPROVED'
    )
    .reduce((sum, request) => sum + request.chargedDays, 0);

  const pendingCurrentYear = state.leaveRequests
    .filter(
      (request) =>
        request.employeeId === employeeId &&
        request.type === 'MEDICAL' &&
        request.status === 'PENDING' &&
        getLeaveYearLabel(state, request.startDate) === yearLabel
    )
    .reduce((sum, request) => sum + request.chargedDays, 0);

  return {
    approvedCurrentYear,
    approvedAllTime,
    pendingCurrentYear
  };
}

export function validateLeaveRequest(state: AppState, request: LeaveRequest): string | undefined {
  if (request.endDate < request.startDate) return 'End date must be on or after start date.';
  if (!state.employees.some((employee) => employee.id === request.employeeId)) return 'Unknown employee.';

  if (request.type === 'MEDICAL') return undefined;

  const yearLabel = getLeaveYearLabel(state, request.startDate);

  if (request.type === 'ANNUAL') {
    const balance = getAnnualBalance(state, request.employeeId, yearLabel);
    const pendingWithoutSelf = state.leaveRequests
      .filter(
        (item) =>
          item.id !== request.id &&
          item.employeeId === request.employeeId &&
          item.type === 'ANNUAL' &&
          item.status === 'PENDING' &&
          getLeaveYearLabel(state, item.startDate) === yearLabel
      )
      .reduce((sum, item) => sum + item.chargedDays, 0);

    if (balance.remaining - pendingWithoutSelf - request.chargedDays < 0) {
      return 'Annual Leave overdraw. Add entitlement adjustment before approval.';
    }
  }

  if (request.type === 'OIL') {
    const balance = getOilBalance(state, request.employeeId);
    const pendingWithoutSelf = state.leaveRequests
      .filter(
        (item) =>
          item.id !== request.id &&
          item.employeeId === request.employeeId &&
          item.type === 'OIL' &&
          item.status === 'PENDING'
      )
      .reduce((sum, item) => sum + item.chargedDays, 0);

    if (balance.remaining - pendingWithoutSelf - request.chargedDays < 0) {
      return 'Off-In-Lieu balance would go negative.';
    }
  }

  return undefined;
}

export interface RankedSwapCandidate {
  employeeId: string;
  medicalApprovedDays: number;
  completedSwapCount: number;
  lastCompletedSwapAt: string;
}

function countCompletedSwaps(swaps: SwapRequest[], employeeId: string): { count: number; last: string } {
  const completed = swaps
    .filter((swap) => swap.status === 'COMPLETED' && (swap.employeeA === employeeId || swap.employeeB === employeeId))
    .sort((a, b) => (a.completedAt || '').localeCompare(b.completedAt || ''));

  return {
    count: completed.length,
    last: completed.length ? completed[completed.length - 1].completedAt || '1970-01-01T00:00:00.000Z' : '1970-01-01T00:00:00.000Z'
  };
}

function blocksByLeave(state: AppState, employeeId: string, date: string): boolean {
  return isOnApprovedLeave(state.leaveRequests, employeeId, date);
}

export function getRankedSwapCandidates(
  state: AppState,
  sourceEmployeeId: string,
  type: 'SAME_DATE' | 'DATE_FOR_DATE',
  dateA: string,
  dateB: string
): RankedSwapCandidate[] {
  const sourceEmployee = state.employees.find((employee) => employee.id === sourceEmployeeId);
  if (!sourceEmployee) return [];

  const sourceYear = getLeaveYearLabel(state, dateA);

  return state.employees
    .filter((employee) => employee.team !== sourceEmployee.team)
    .filter((employee) => {
      if (type === 'SAME_DATE') {
        return !blocksByLeave(state, employee.id, dateA) && !blocksByLeave(state, sourceEmployeeId, dateA);
      }
      return (
        !blocksByLeave(state, employee.id, dateA) &&
        !blocksByLeave(state, sourceEmployeeId, dateB) &&
        !blocksByLeave(state, employee.id, dateB) &&
        !blocksByLeave(state, sourceEmployeeId, dateA)
      );
    })
    .map((employee) => {
      const medDays = state.leaveRequests
        .filter(
          (request) =>
            request.employeeId === employee.id &&
            request.type === 'MEDICAL' &&
            request.status === 'APPROVED' &&
            getLeaveYearLabel(state, request.startDate) === sourceYear
        )
        .reduce((sum, request) => sum + request.chargedDays, 0);

      const swapStat = countCompletedSwaps(state.swaps, employee.id);

      return {
        employeeId: employee.id,
        medicalApprovedDays: medDays,
        completedSwapCount: swapStat.count,
        lastCompletedSwapAt: swapStat.last
      };
    })
    .sort((a, b) => {
      if (b.medicalApprovedDays !== a.medicalApprovedDays) return b.medicalApprovedDays - a.medicalApprovedDays;
      if (a.completedSwapCount !== b.completedSwapCount) return a.completedSwapCount - b.completedSwapCount;
      return a.lastCompletedSwapAt.localeCompare(b.lastCompletedSwapAt);
    });
}

function simulateSwapCompletion(state: AppState, swap: SwapRequest): AppState {
  const swaps = state.swaps.map((item) =>
    item.id === swap.id
      ? {
          ...item,
          status: 'COMPLETED' as const,
          completedAt: new Date().toISOString()
        }
      : item
  );
  return { ...state, swaps };
}

export function validateSwapCompletion(state: AppState, swapId: string): string | undefined {
  const swap = state.swaps.find((item) => item.id === swapId);
  if (!swap) return 'Swap not found.';
  if (swap.status !== 'APPROVED') return 'Swap must be approved before completion.';

  const simulationState = simulateSwapCompletion(state, swap);
  const affectedDates = [...new Set([swap.dateA, swap.dateB])];

  for (const date of affectedDates) {
    for (const shift of ['MORNING', 'AFTERNOON'] as WorkShift[]) {
      const headcount = getHeadcount(simulationState, date, shift);
      if (headcount.shortage > 0) {
        return `Cannot complete swap: ${date} ${shift} would be below minimum staffing.`;
      }
    }
  }

  return undefined;
}

export interface RankedRecallCandidate {
  employeeId: string;
  completedCount: number;
  lastCompletedAt: string;
  recentOffersCount: number;
}

function getRecallStats(records: RecallRecord[], employeeId: string): {
  completed: number;
  lastCompletedAt: string;
  recentOffers: number;
} {
  const completedItems = records
    .filter((record) => record.employeeId === employeeId && record.status === 'COMPLETED')
    .sort((a, b) => (a.completedAt || '').localeCompare(b.completedAt || ''));

  const recentThreshold = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;

  const recentOffers = records.filter((record) => {
    if (record.employeeId !== employeeId) return false;
    const offeredAt = new Date(record.offeredAt).getTime();
    return offeredAt >= recentThreshold;
  }).length;

  return {
    completed: completedItems.length,
    lastCompletedAt: completedItems.length
      ? completedItems[completedItems.length - 1].completedAt || '1970-01-01T00:00:00.000Z'
      : '1970-01-01T00:00:00.000Z',
    recentOffers
  };
}

export function getRankedRecallCandidates(state: AppState, date: string): RankedRecallCandidate[] {
  const restTeam = getRestTeam(state, date);
  const reserved = new Set(
    state.recalls
      .filter(
        (record) =>
          record.date === date &&
          (record.status === 'OFFERED' || record.status === 'ACCEPTED' || record.status === 'COMPLETED')
      )
      .map((record) => record.employeeId)
  );

  return state.employees
    .filter((employee) => employee.team === restTeam)
    .filter((employee) => getEmployeeShift(state, employee.id, date) === 'REST')
    .filter((employee) => !reserved.has(employee.id))
    .filter((employee) => !isOnApprovedLeave(state.leaveRequests, employee.id, date))
    .map((employee) => {
      const stats = getRecallStats(state.recalls, employee.id);
      return {
        employeeId: employee.id,
        completedCount: stats.completed,
        lastCompletedAt: stats.lastCompletedAt,
        recentOffersCount: stats.recentOffers
      };
    })
    .sort((a, b) => {
      if (a.completedCount !== b.completedCount) return a.completedCount - b.completedCount;
      if (a.lastCompletedAt !== b.lastCompletedAt) return a.lastCompletedAt.localeCompare(b.lastCompletedAt);
      return a.recentOffersCount - b.recentOffersCount;
    });
}

export interface WindowShortage {
  date: string;
  shift: WorkShift;
  available: number;
  shortage: number;
}

export function getWindowShortages(state: AppState, startDate: string, days: number): WindowShortage[] {
  const dates = dateRange(startDate, days);
  const rows: WindowShortage[] = [];

  for (const date of dates) {
    for (const shift of ['MORNING', 'AFTERNOON'] as WorkShift[]) {
      const headcount = getHeadcount(state, date, shift);
      if (headcount.shortage > 0) {
        rows.push({
          date,
          shift,
          available: headcount.available.length,
          shortage: headcount.shortage
        });
      }
    }
  }

  return rows;
}

export interface DailyOverviewRow {
  date: string;
  morningAvailable: number;
  morningShortage: number;
  afternoonAvailable: number;
  afternoonShortage: number;
  morningTeam: TeamId;
  afternoonTeam: TeamId;
  restTeam: TeamId;
  approvedLeaveCount: number;
}

export function getDailyOverviewRows(state: AppState, startDate: string, days: number): DailyOverviewRow[] {
  const dates = dateRange(startDate, days);
  const shiftMap = buildEffectiveShiftMap(state, dates);

  return dates.map((date) => {
    const morning = getHeadcount(state, date, 'MORNING');
    const afternoon = getHeadcount(state, date, 'AFTERNOON');

    const approvedLeaveCount = state.leaveRequests.filter(
      (request) =>
        request.status === 'APPROVED' && request.startDate <= date && request.endDate >= date &&
        (shiftMap.get(key(request.employeeId, date)) || 'REST') !== 'REST'
    ).length;

    return {
      date,
      morningAvailable: morning.available.length,
      morningShortage: morning.shortage,
      afternoonAvailable: afternoon.available.length,
      afternoonShortage: afternoon.shortage,
      morningTeam: morning.scheduledTeam,
      afternoonTeam: afternoon.scheduledTeam,
      restTeam: getRestTeam(state, date),
      approvedLeaveCount
    };
  });
}

export function getEmployeeTeamMap(employees: Employee[]): Record<string, TeamId> {
  return employees.reduce<Record<string, TeamId>>((acc, employee) => {
    acc[employee.id] = employee.team;
    return acc;
  }, {});
}
