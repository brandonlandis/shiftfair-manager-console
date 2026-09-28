import { useAppState } from '../store/context';
import { EmptyState } from '../components/ui/EmptyState';

export function ActivityPage() {
  const { state } = useAppState();

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="text-xl font-semibold">Activity</h2>
        <p className="mt-1 text-sm text-slate-600">Audit log captures changes for roster window, approvals, swaps, recalls, balances, imports, and resets.</p>
      </div>

      {state.activity.length === 0 ? (
        <EmptyState title="No activity yet" hint="Actions will be logged here as manager operations occur." />
      ) : (
        <section className="card overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-3 py-2">Timestamp</th>
                <th className="px-3 py-2">Actor</th>
                <th className="px-3 py-2">Action</th>
                <th className="px-3 py-2">Detail</th>
              </tr>
            </thead>
            <tbody>
              {state.activity.map((item) => (
                <tr key={item.id} className="border-t border-slate-200">
                  <td className="px-3 py-2">{new Date(item.timestamp).toLocaleString()}</td>
                  <td className="px-3 py-2">{item.actorId}</td>
                  <td className="px-3 py-2">{item.action}</td>
                  <td className="px-3 py-2">{item.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
