import { useMemo } from 'react';
import { useAppState } from '../store/context';
import { getWindowShortages, getRankedRecallCandidates } from '../store/selectors';
import { EmptyState } from '../components/ui/EmptyState';

export function RecallsPage() {
  const { state, offerRecall, updateRecall } = useAppState();
  const shortages = useMemo(
    () => getWindowShortages(state, state.rosterWindowStart, 14),
    [state]
  );

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="text-xl font-semibold">Recalls</h2>
        <p className="mt-1 text-sm text-slate-600">
          Ranking priority: fewest completed recalls, longest since last completed recall, then fewest recent offers.
        </p>
      </div>

      {shortages.length === 0 ? (
        <EmptyState title="No shortages in this 14-day window" hint="Coverage currently meets the minimum staffing target of 10 on all shifts." />
      ) : (
        <section className="card overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Shift</th>
                <th className="px-3 py-2">Available vs min</th>
                <th className="px-3 py-2">Deficit</th>
                <th className="px-3 py-2">Next ranked</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {shortages.map((item) => {
                const ranked = getRankedRecallCandidates(state, item.date);
                const nextCandidate = ranked[0];

                return (
                  <tr key={`${item.date}-${item.shift}`} className="border-t border-slate-200">
                    <td className="px-3 py-2">{item.date}</td>
                    <td className="px-3 py-2">{item.shift}</td>
                    <td className="px-3 py-2">{item.available}/10</td>
                    <td className="px-3 py-2 text-danger font-semibold">{item.shortage}</td>
                    <td className="px-3 py-2">
                      {nextCandidate ? `${nextCandidate.employeeId} · recalls ${nextCandidate.completedCount}` : 'No eligible candidate'}
                    </td>
                    <td className="px-3 py-2">
                      {nextCandidate ? (
                        <button
                          className="btn-primary"
                          onClick={() => offerRecall({ date: item.date, shift: item.shift, employeeId: nextCandidate.employeeId })}
                        >
                          Offer next
                        </button>
                      ) : (
                        <span className="badge bg-red-100 text-danger">Unfilled gap</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      <section className="card overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="px-3 py-2">Recall ID</th>
              <th className="px-3 py-2">Date / Shift</th>
              <th className="px-3 py-2">Employee</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {state.recalls.map((recall) => (
              <tr key={recall.id} className="border-t border-slate-200">
                <td className="px-3 py-2">{recall.id}</td>
                <td className="px-3 py-2">{recall.date} · {recall.shift}</td>
                <td className="px-3 py-2">{recall.employeeId}</td>
                <td className="px-3 py-2">{recall.status}</td>
                <td className="px-3 py-2 space-x-2">
                  {recall.status === 'OFFERED' && <button className="btn-ghost" onClick={() => updateRecall(recall.id, 'DECLINED')}>Declined</button>}
                  {recall.status === 'OFFERED' && <button className="btn-approve" onClick={() => updateRecall(recall.id, 'ACCEPTED')}>Accepted</button>}
                  {recall.status === 'ACCEPTED' && <button className="btn-primary" onClick={() => updateRecall(recall.id, 'COMPLETED')}>Complete shift</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
