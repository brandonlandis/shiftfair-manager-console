import { FormEvent, useMemo, useState } from 'react';
import { useAppState } from '../store/context';
import { getEmployeeShift } from '../store/scheduler';
import { getRankedSwapCandidates } from '../store/selectors';
import { SwapType } from '../store/types';
import { EmptyState } from '../components/ui/EmptyState';

export function SwapsPage() {
  const { state, createSwap, approveSwap, completeSwap } = useAppState();
  const [type, setType] = useState<SwapType>('SAME_DATE');
  const [employeeA, setEmployeeA] = useState('T1-01');
  const [employeeB, setEmployeeB] = useState('');
  const [dateA, setDateA] = useState(state.rosterWindowStart);
  const [dateB, setDateB] = useState(state.rosterWindowStart);

  const candidates = useMemo(
    () => getRankedSwapCandidates(state, employeeA, type, dateA, type === 'SAME_DATE' ? dateA : dateB),
    [state, employeeA, type, dateA, dateB]
  );

  const preview = useMemo(() => {
    if (!employeeB) return null;
    const targetDate = type === 'SAME_DATE' ? dateA : dateB;
    return {
      aBefore: getEmployeeShift(state, employeeA, dateA),
      bBefore: getEmployeeShift(state, employeeB, targetDate)
    };
  }, [state, employeeA, employeeB, dateA, dateB, type]);

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!employeeB) return;
    createSwap({
      type,
      employeeA,
      employeeB,
      dateA,
      dateB: type === 'SAME_DATE' ? dateA : dateB
    });
    setEmployeeB('');
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="text-xl font-semibold">Swaps</h2>
        <p className="mt-1 text-sm text-slate-600">
          Candidate ranking: highest approved Medical Leave days in current leave year, then fewest completed swaps, then longest since last completed swap.
        </p>
      </div>

      <form className="card grid gap-3 p-4 md:grid-cols-2" onSubmit={onSubmit}>
        <label className="text-sm">
          Swap type
          <select className="input" value={type} onChange={(event) => setType(event.target.value as SwapType)}>
            <option value="SAME_DATE">Same-date exchange</option>
            <option value="DATE_FOR_DATE">Date-for-date exchange</option>
          </select>
        </label>

        <label className="text-sm">
          Employee A
          <select className="input" value={employeeA} onChange={(event) => setEmployeeA(event.target.value)}>
            {state.employees.map((employee) => (
              <option key={employee.id} value={employee.id}>{employee.id}</option>
            ))}
          </select>
        </label>

        <label className="text-sm">
          Date A
          <input className="input" type="date" value={dateA} onChange={(event) => setDateA(event.target.value)} />
        </label>

        {type === 'DATE_FOR_DATE' && (
          <label className="text-sm">
            Date B
            <input className="input" type="date" value={dateB} onChange={(event) => setDateB(event.target.value)} />
          </label>
        )}

        <label className="text-sm md:col-span-2">
          Employee B suggestions (manager-only medical ranking)
          <select className="input" value={employeeB} onChange={(event) => setEmployeeB(event.target.value)}>
            <option value="">Select candidate</option>
            {candidates.map((candidate) => (
              <option key={candidate.employeeId} value={candidate.employeeId}>
                {candidate.employeeId} · medical {candidate.medicalApprovedDays} · swaps {candidate.completedSwapCount}
              </option>
            ))}
          </select>
        </label>

        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <button className="btn-primary" type="submit" disabled={!employeeB}>Create pending swap</button>
          {preview && (
            <span className="text-xs text-slate-600">
              Preview: {employeeA} {preview.aBefore} ↔ {employeeB} {preview.bBefore}
            </span>
          )}
        </div>
      </form>

      {state.swaps.length === 0 ? (
        <EmptyState title="No swaps yet" hint="Create a swap request to start cross-team balancing." />
      ) : (
        <section className="card overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">Pair</th>
                <th className="px-3 py-2">Dates</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {state.swaps.map((swap) => (
                <tr key={swap.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">{swap.employeeA} ↔ {swap.employeeB}</td>
                  <td className="px-3 py-2">{swap.dateA}{swap.type === 'DATE_FOR_DATE' ? ` / ${swap.dateB}` : ''}</td>
                  <td className="px-3 py-2">{swap.type}</td>
                  <td className="px-3 py-2">{swap.status}</td>
                  <td className="px-3 py-2 space-x-2">
                    {swap.status === 'PENDING' && (
                      <button className="btn-approve" onClick={() => approveSwap(swap.id)}>
                        Approve
                      </button>
                    )}
                    {swap.status === 'APPROVED' && (
                      <button className="btn-primary" onClick={() => completeSwap(swap.id)}>
                        Complete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
