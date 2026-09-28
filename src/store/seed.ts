import { AppState, Employee, TeamId } from './types';

const now = '2026-09-28T09:00:00.000Z';

function makeTeam(team: TeamId): Employee[] {
  return Array.from({ length: 15 }).map((_, index) => ({
    id: `${team}-${String(index + 1).padStart(2, '0')}`,
    team
  }));
}

export function buildSeedState(): AppState {
  const employees = [...makeTeam('T1'), ...makeTeam('T2'), ...makeTeam('T3')];

  return {
    config: {
      anchorDay1Date: '2026-09-22',
      leaveYearStartMonth: 1,
      leaveYearStartDay: 1,
      minimumStaffing: 10,
      annualDefaultAllowance: 14,
      dayCountMethod: 'SCHEDULED_ONLY'
    },
    employees,
    leaveRequests: [
      {
        id: 'L-100',
        employeeId: 'T1-02',
        type: 'ANNUAL',
        startDate: '2026-09-29',
        endDate: '2026-10-01',
        chargedDays: 2,
        status: 'APPROVED',
        createdAt: now,
        approverId: 'MGR-01',
        decidedAt: now
      },
      {
        id: 'L-101',
        employeeId: 'T2-03',
        type: 'MEDICAL',
        startDate: '2026-10-02',
        endDate: '2026-10-04',
        chargedDays: 2,
        status: 'APPROVED',
        createdAt: now,
        approverId: 'MGR-01',
        decidedAt: now
      },
      {
        id: 'L-102',
        employeeId: 'T3-07',
        type: 'OIL',
        startDate: '2026-10-05',
        endDate: '2026-10-05',
        chargedDays: 1,
        status: 'PENDING',
        createdAt: now
      },
      {
        id: 'L-103',
        employeeId: 'T1-08',
        type: 'MEDICAL',
        startDate: '2026-10-07',
        endDate: '2026-10-08',
        chargedDays: 2,
        status: 'APPROVED',
        createdAt: now,
        approverId: 'MGR-01',
        decidedAt: now
      }
    ],
    swaps: [
      {
        id: 'S-200',
        type: 'SAME_DATE',
        employeeA: 'T1-01',
        employeeB: 'T2-01',
        dateA: '2026-09-30',
        dateB: '2026-09-30',
        status: 'COMPLETED',
        createdAt: now,
        approvedAt: now,
        completedAt: now
      },
      {
        id: 'S-201',
        type: 'DATE_FOR_DATE',
        employeeA: 'T2-05',
        employeeB: 'T3-05',
        dateA: '2026-10-02',
        dateB: '2026-10-04',
        status: 'PENDING',
        createdAt: now
      }
    ],
    recalls: [
      {
        id: 'R-300',
        date: '2026-10-01',
        shift: 'MORNING',
        employeeId: 'T3-01',
        status: 'COMPLETED',
        offeredAt: now,
        acceptedAt: now,
        completedAt: now
      },
      {
        id: 'R-301',
        date: '2026-10-03',
        shift: 'AFTERNOON',
        employeeId: 'T1-04',
        status: 'OFFERED',
        offeredAt: now
      }
    ],
    annualAdjustments: [
      {
        id: 'A-400',
        employeeId: 'T1-02',
        yearLabel: '2026',
        deltaDays: 2,
        createdAt: now,
        reason: 'Demo entitlement exception'
      }
    ],
    oilLedger: [
      {
        id: 'O-500',
        employeeId: 'T3-07',
        deltaDays: 3,
        createdAt: now,
        reason: 'Manager grant'
      },
      {
        id: 'O-501',
        employeeId: 'T2-09',
        deltaDays: 2,
        createdAt: now,
        reason: 'Coverage credit'
      }
    ],
    activity: [
      {
        id: 'ACT-1',
        timestamp: now,
        actorId: 'MGR-01',
        action: 'SEED',
        detail: 'Demo initialized with 45 fictional placeholder IDs.'
      }
    ],
    rosterWindowStart: '2026-09-28'
  };
}
