import { FormEvent, useMemo, useState } from 'react';
import { useAppState } from '../store/context';
import { getLeaveYearLabel } from '../store/scheduler';
import { getAnnualBalance, getEmployeeTeamMap, getMedicalStats, getOilBalance } from '../store/selectors';
import { LeaveType } from '../store/types';
import { EmptyState } from '../components/ui/EmptyState';

export function LeaveBalancesPage() {
  const {
    state,
    createLeaveRequest,
    approveLeave,
    declineLeave,
    approveLeaveBulk,
    addAnnualAdjustment,
    addOilCredit
  } = useAppState();

  const [employeeId, setEmployeeId] = useState('T1-01');
  const [type, setType] = useState<LeaveType>('ANNUAL');
  const [startDate, setStartDate] = useState(state.rosterWindowStart);
  const [endDate, setEndDate] = useState(state.rosterWindowStart);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const pending = state.leaveRequests.filter((request) => request.status === 'PENDING');
  const teamMap = getEmployeeTeamMap(state.employees);

  const leaveYear = getLeaveYearLabel(state, startDate);
  const annual = useMemo(() => getAnnualBalance(state, employeeId, leaveYear), [state, employeeId, leaveYear]);
  const oil = useMemo(() => getOilBalance(state, employeeId), [state, employeeId]);
  const medical = useMemo(() => getMedicalStats(state, employeeId, leaveYear), [state, employeeId, leaveYear]);

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    createLeaveRequest({ employeeId, type, startDate, endDate });
  }

  function approveEligible() {
    const eligibleIds = pending.filter((item) => !item.validationError).map((item) => item.id);
    if (eligibleIds.length === 0) return;
    const confirmed = window.confirm(`Approve ${eligibleIds.length} eligible request(s)?`);
    if (confirmed) approveLeaveBulk(eligibleIds);
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="text-xl font-semibold">Leave & Balances</h2>
        <p className="mt-1 text-sm text-slate-600">
          Leave types: Annual Leave, Medical Leave, Off-In-Lieu. Medical is tracked without entitlement balance; AL and OIL enforce balance validation.
        </p>
      </div>

      <form className="card grid gap-3 p-4 md:grid-cols-4" onSubmit={onSubmit}>
        <label className="text-sm">
          Employee
          <select className="input" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
            {state.employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.id}</option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          Leave type
          <select className="input" value={type} onChange={(event) => setType(event.target.value as LeaveType)}>
            <option value="ANNUAL">Annual Leave</option>
            <option value="MEDICAL">Medical Leave</option>
            <option value="OIL">Off-In-Lieu</option>
          </select>
        </label>

        <label className="text-sm">
          Start date
          <input className="input" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </label>

        <label className="text-sm">
          End date
          <input className="input" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </label>

        <div className="md:col-span-4">
          <button className="btn-primary" type="submit">Create employee request</button>
        </div>
      </form>

      <section className="card p-4">
        <h3 className="text-base font-semibold">{employeeId} balance panel</h3>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-3">
          <div className="rounded bg-slate-50 p-3">
            <p className="font-semibold text-slate-700">Annual Leave ({leaveYear})</p>
            <p>Allowance: {annual.allowance}</p>
            <p>Approved used: {annual.approvedUsed}</p>
            <p>Pending: {annual.pending}</p>
            <p>Remaining: {annual.remaining}</p>
            <p>Remaining after pending: {annual.remainingAfterPending}</p>
          </div>

          <div className="rounded bg-slate-50 p-3">
            <p className="font-semibold text-slate-700">Medical Leave</p>
            <p>Approved (year): {medical.approvedCurrentYear}</p>
            <p>Pending (year): {medical.pendingCurrentYear}</p>
            <p>Approved (all-time): {medical.approvedAllTime}</p>
          </div>

          <div className="rounded bg-slate-50 p-3">
            <p className="font-semibold text-slate-700">Off-In-Lieu</p>
            <p>Credits: {oil.credits}</p>
            <p>Approved used: {oil.approvedUsed}</p>
            <p>Pending: {oil.pending}</p>
            <p>Remaining: {oil.remaining}</p>
            <p>Remaining after pending: {oil.remainingAfterPending}</p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => addAnnualAdjustment(employeeId, 1, 'Manager entitlement adjustment')}>+1 AL adjustment</button>
          <button className="btn-ghost" onClick={() => addOilCredit(employeeId, 1, 'Manager OIL grant')}>+1 OIL credit</button>
        </div>
      </section>

      <section className="card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-semibold">Approval inbox</h3>
          <div className="flex gap-2">
            <button className="btn-approve" disabled={selectedIds.length === 0} onClick={() => approveLeaveBulk(selectedIds)}>
              Approve selected
            </button>
            <button className="btn-approve" onClick={approveEligible}>Approve all eligible</button>
          </div>
        </div>

        {pending.length === 0 ? (
          <EmptyState title="No pending leave requests" hint="New requests will appear here for per-row and bulk approval." />
        ) : (
          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-3 py-2"></th>
                  <th className="px-3 py-2">Employee</th>
                  <th className="px-3 py-2">Team</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Dates</th>
                  <th className="px-3 py-2">Charged days</th>
                  <th className="px-3 py-2">Validation</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((request) => (
                  <tr key={request.id} className="border-t border-slate-200">
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={Boolean(selected[request.id])}
                        onChange={(event) =>
                          setSelected((prev) => ({ ...prev, [request.id]: event.target.checked }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2">{request.employeeId}</td>
                    <td className="px-3 py-2">{teamMap[request.employeeId]}</td>
                    <td className="px-3 py-2">{request.type}</td>
                    <td className="px-3 py-2">{request.startDate}..{request.endDate}</td>
                    <td className="px-3 py-2">{request.chargedDays}</td>
                    <td className="px-3 py-2">
                      {request.validationError ? (
                        <span className="badge bg-red-100 text-danger">{request.validationError}</span>
                      ) : (
                        <span className="badge bg-emerald-100 text-emerald-700">Eligible</span>
                      )}
                    </td>
                    <td className="px-3 py-2 space-x-2">
                      <button className="btn-approve" disabled={Boolean(request.validationError)} onClick={() => approveLeave(request.id)}>
                        Approve
                      </button>
                      <button className="btn-ghost" onClick={() => declineLeave(request.id)}>
                        Decline
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
