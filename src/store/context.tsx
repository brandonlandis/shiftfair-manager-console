import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { buildSeedState } from './seed';
import {
  AppState,
  Banner,
  DayCountMethod,
  LeaveRequest,
  RecallRecord,
  SwapRequest,
  WorkShift
} from './types';
import { addDays, getChargedDaysForLeave, getLeaveYearLabel } from './scheduler';
import {
  validateLeaveRequest,
  validateSwapCompletion
} from './selectors';

const STORAGE_KEY = 'shiftfair-demo-v4';

interface ContextValue {
  state: AppState;
  loading: boolean;
  error: string | null;
  banner: Banner | null;
  dismissBanner: () => void;
  moveWindow: (delta: number) => void;
  setWindowStart: (date: string) => void;
  setAnchorDay1Date: (date: string) => void;
  setDayCountMethod: (method: DayCountMethod) => void;
  createLeaveRequest: (payload: {
    employeeId: string;
    type: LeaveRequest['type'];
    startDate: string;
    endDate: string;
  }) => void;
  approveLeave: (id: string) => void;
  declineLeave: (id: string) => void;
  approveLeaveBulk: (ids: string[]) => void;
  createSwap: (payload: {
    type: SwapRequest['type'];
    employeeA: string;
    employeeB: string;
    dateA: string;
    dateB: string;
  }) => void;
  approveSwap: (id: string) => void;
  completeSwap: (id: string) => void;
  offerRecall: (payload: { date: string; shift: WorkShift; employeeId: string }) => void;
  updateRecall: (id: string, status: RecallRecord['status']) => void;
  addAnnualAdjustment: (employeeId: string, deltaDays: number, reason: string) => void;
  addOilCredit: (employeeId: string, deltaDays: number, reason: string) => void;
  importState: (next: AppState) => void;
  resetDemo: () => void;
}

const AppStateContext = createContext<ContextValue | undefined>(undefined);

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function appendAudit(state: AppState, action: string, detail: string): AppState {
  return {
    ...state,
    activity: [
      {
        id: uid('ACT'),
        timestamp: new Date().toISOString(),
        actorId: 'MGR-01',
        action,
        detail
      },
      ...state.activity
    ]
  };
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(buildSeedState());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          setState(JSON.parse(raw) as AppState);
        }
      } catch {
        setError('Could not load saved local data. Demo defaults were restored.');
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, loading]);

  const value = useMemo<ContextValue>(
    () => ({
      state,
      loading,
      error,
      banner,
      dismissBanner: () => setBanner(null),
      moveWindow: (delta) => {
        setState((prev) => ({ ...prev, rosterWindowStart: addDays(prev.rosterWindowStart, delta) }));
      },
      setWindowStart: (date) => {
        setState((prev) => ({ ...prev, rosterWindowStart: date }));
      },
      setAnchorDay1Date: (date) => {
        setState((prev) => appendAudit({ ...prev, config: { ...prev.config, anchorDay1Date: date } }, 'CONFIG', `Set Day 1 anchor to ${date}`));
        setBanner({ tone: 'success', message: `Cycle Day 1 anchor updated to ${date}.` });
      },
      setDayCountMethod: (method) => {
        setState((prev) => appendAudit({ ...prev, config: { ...prev.config, dayCountMethod: method } }, 'CONFIG', `Set leave day count method to ${method}`));
        setBanner({ tone: 'info', message: `Leave day counting now uses ${method === 'SCHEDULED_ONLY' ? 'scheduled workdays only' : 'calendar days'}.` });
      },
      createLeaveRequest: ({ employeeId, type, startDate, endDate }) => {
        setState((prev) => {
          const employee = prev.employees.find((item) => item.id === employeeId);
          if (!employee) return prev;

          const chargedDays = getChargedDaysForLeave(prev, employeeId, startDate, endDate);
          const next: LeaveRequest = {
            id: uid('L'),
            employeeId,
            type,
            startDate,
            endDate,
            chargedDays,
            status: 'PENDING',
            createdAt: new Date().toISOString()
          };

          next.validationError = validateLeaveRequest(prev, next);

          const withRequest = {
            ...prev,
            leaveRequests: [next, ...prev.leaveRequests]
          };

          return appendAudit(withRequest, 'LEAVE_REQUEST', `${employeeId} ${type} ${startDate}..${endDate}`);
        });

        setBanner({ tone: 'success', message: 'Leave request created.' });
      },
      approveLeave: (id) => {
        setState((prev) => {
          const request = prev.leaveRequests.find((item) => item.id === id);
          if (!request) return prev;

          const validationError = validateLeaveRequest(prev, request);
          if (validationError) {
            const leaveRequests: LeaveRequest[] = prev.leaveRequests.map((item) =>
              item.id === id ? { ...item, validationError } : item
            );
            setBanner({ tone: 'error', message: validationError });
            return { ...prev, leaveRequests };
          }

          const leaveRequests: LeaveRequest[] = prev.leaveRequests.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'APPROVED' as const,
                  approverId: 'MGR-01',
                  decidedAt: new Date().toISOString(),
                  validationError: undefined
                }
              : item
          );

          setBanner({ tone: 'success', message: `Approved ${id}.` });
          return appendAudit({ ...prev, leaveRequests }, 'LEAVE_APPROVE', id);
        });
      },
      declineLeave: (id) => {
        setState((prev) => {
          const leaveRequests: LeaveRequest[] = prev.leaveRequests.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'DECLINED' as const,
                  approverId: 'MGR-01',
                  decidedAt: new Date().toISOString()
                }
              : item
          );
          return appendAudit({ ...prev, leaveRequests }, 'LEAVE_DECLINE', id);
        });
        setBanner({ tone: 'info', message: `Declined ${id}.` });
      },
      approveLeaveBulk: (ids) => {
        ids.forEach((id) => {
          value.approveLeave(id);
        });
      },
      createSwap: ({ type, employeeA, employeeB, dateA, dateB }) => {
        setState((prev) => {
          const nextSwap: SwapRequest = {
            id: uid('S'),
            type,
            employeeA,
            employeeB,
            dateA,
            dateB,
            status: 'PENDING',
            createdAt: new Date().toISOString()
          };

          return appendAudit({ ...prev, swaps: [nextSwap, ...prev.swaps] }, 'SWAP_REQUEST', `${employeeA}<->${employeeB}`);
        });

        setBanner({ tone: 'success', message: 'Swap request created as pending.' });
      },
      approveSwap: (id) => {
        setState((prev) => {
          const swaps: SwapRequest[] = prev.swaps.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'APPROVED' as const,
                  approvedAt: new Date().toISOString()
                }
              : item
          );
          return appendAudit({ ...prev, swaps }, 'SWAP_APPROVE', id);
        });
        setBanner({ tone: 'success', message: `Approved swap ${id}.` });
      },
      completeSwap: (id) => {
        setState((prev) => {
          const blockReason = validateSwapCompletion(prev, id);
          if (blockReason) {
            setBanner({ tone: 'error', message: blockReason });
            return prev;
          }

          const swaps: SwapRequest[] = prev.swaps.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: 'COMPLETED' as const,
                  completedAt: new Date().toISOString()
                }
              : item
          );

          setBanner({ tone: 'success', message: `Completed swap ${id}.` });
          return appendAudit({ ...prev, swaps }, 'SWAP_COMPLETE', id);
        });
      },
      offerRecall: ({ date, shift, employeeId }) => {
        setState((prev) => {
          const recall: RecallRecord = {
            id: uid('R'),
            date,
            shift,
            employeeId,
            status: 'OFFERED',
            offeredAt: new Date().toISOString()
          };

          return appendAudit({ ...prev, recalls: [recall, ...prev.recalls] }, 'RECALL_OFFER', `${employeeId} ${date} ${shift}`);
        });
        setBanner({ tone: 'info', message: `Offered recall to ${employeeId}.` });
      },
      updateRecall: (id, status) => {
        setState((prev) => {
          const recalls = prev.recalls.map((record) => {
            if (record.id !== id) return record;
            if (status === 'ACCEPTED') return { ...record, status, acceptedAt: new Date().toISOString() };
            if (status === 'COMPLETED') return { ...record, status, completedAt: new Date().toISOString() };
            return { ...record, status };
          });
          return appendAudit({ ...prev, recalls }, 'RECALL_UPDATE', `${id}:${status}`);
        });
        setBanner({ tone: 'success', message: `Recall ${id} updated to ${status}.` });
      },
      addAnnualAdjustment: (employeeId, deltaDays, reason) => {
        setState((prev) => {
          const yearLabel = getLeaveYearLabel(prev, new Date().toISOString().slice(0, 10));
          const annualAdjustments = [
            {
              id: uid('AA'),
              employeeId,
              yearLabel,
              deltaDays,
              createdAt: new Date().toISOString(),
              reason
            },
            ...prev.annualAdjustments
          ];

          return appendAudit({ ...prev, annualAdjustments }, 'ANNUAL_ADJUST', `${employeeId} ${deltaDays}`);
        });
        setBanner({ tone: 'success', message: `Annual adjustment saved for ${employeeId}.` });
      },
      addOilCredit: (employeeId, deltaDays, reason) => {
        setState((prev) => {
          const oilLedger = [
            {
              id: uid('OIL'),
              employeeId,
              deltaDays,
              createdAt: new Date().toISOString(),
              reason
            },
            ...prev.oilLedger
          ];

          return appendAudit({ ...prev, oilLedger }, 'OIL_CREDIT', `${employeeId} ${deltaDays}`);
        });
        setBanner({ tone: 'success', message: `Off-In-Lieu credit saved for ${employeeId}.` });
      },
      importState: (next) => {
        setState(next);
        setBanner({ tone: 'success', message: 'State imported from JSON.' });
      },
      resetDemo: () => {
        const reset = buildSeedState();
        setState(reset);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reset));
        setBanner({ tone: 'info', message: 'Demo state reset to seed data.' });
      }
    }),
    [state, loading, error, banner]
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): ContextValue {
  const context = useContext(AppStateContext);
  if (!context) throw new Error('useAppState must be used inside AppStateProvider');
  return context;
}
