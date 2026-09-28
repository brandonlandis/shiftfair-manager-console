import { useMemo, useState } from 'react';
import { useAppState } from '../store/context';
import { addDays, formatDateLabel, getHeadcount, SHIFT_TIME } from '../store/scheduler';
import { getDailyOverviewRows } from '../store/selectors';

export function OverviewPage() {
  const { state, moveWindow, setWindowStart } = useAppState();
  const rows = useMemo(() => getDailyOverviewRows(state, state.rosterWindowStart, 14), [state]);
  const [selectedDate, setSelectedDate] = useState(state.rosterWindowStart);

  const morning = getHeadcount(state, selectedDate, 'MORNING');
  const afternoon = getHeadcount(state, selectedDate, 'AFTERNOON');

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-warning/30 bg-warning/10 p-3 text-sm text-slate-700">
        Demo data only. This prototype uses local browser storage and is not secure centralized multi-user infrastructure.
      </div>

      <section className="card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-navy">Overview</h2>
            <p className="mt-1 text-sm text-slate-600">
              14-day rolling roster · Day 1 anchor: {state.config.anchorDay1Date}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={() => moveWindow(-14)}>Previous 14</button>
            <button className="btn-ghost" onClick={() => moveWindow(14)}>Next 14</button>
            <input
              className="input w-auto"
              type="date"
              value={state.rosterWindowStart}
              onChange={(event) => setWindowStart(event.target.value)}
              aria-label="Window start date"
            />
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Morning Breakdown</h3>
            <span className="badge bg-slate-100 text-slate-700">{SHIFT_TIME.MORNING}</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">Scheduled team: {morning.scheduledTeam} · normal roster 15 · minimum 10</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded bg-slate-50 p-2">Available <span className="font-semibold">{morning.available.length}</span></div>
            <div className="rounded bg-slate-50 p-2">Approved leave <span className="font-semibold">{morning.approvedAbsences.length}</span></div>
            <div className="rounded bg-slate-50 p-2">Required minimum <span className="font-semibold">{state.config.minimumStaffing}</span></div>
            <div className={`rounded p-2 ${morning.shortage ? 'bg-red-50 text-danger' : 'bg-emerald-50 text-emerald-700'}`}>
              Shortage/Recall need <span className="font-semibold">{morning.shortage}</span>
            </div>
          </div>
        </article>

        <article className="card p-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Afternoon Breakdown</h3>
            <span className="badge bg-slate-100 text-slate-700">{SHIFT_TIME.AFTERNOON}</span>
          </div>
          <p className="mt-1 text-sm text-slate-600">Scheduled team: {afternoon.scheduledTeam} · normal roster 15 · minimum 10</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded bg-slate-50 p-2">Available <span className="font-semibold">{afternoon.available.length}</span></div>
            <div className="rounded bg-slate-50 p-2">Approved leave <span className="font-semibold">{afternoon.approvedAbsences.length}</span></div>
            <div className="rounded bg-slate-50 p-2">Required minimum <span className="font-semibold">{state.config.minimumStaffing}</span></div>
            <div className={`rounded p-2 ${afternoon.shortage ? 'bg-red-50 text-danger' : 'bg-emerald-50 text-emerald-700'}`}>
              Shortage/Recall need <span className="font-semibold">{afternoon.shortage}</span>
            </div>
          </div>
        </article>
      </div>

      <section className="card overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-700">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Morning</th>
              <th className="px-3 py-2">Afternoon</th>
              <th className="px-3 py-2">Rest Team</th>
              <th className="px-3 py-2">Leave chips</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.date}
                className={`border-t border-slate-200 cursor-pointer ${selectedDate === row.date ? 'bg-teal/5' : ''}`}
                onClick={() => setSelectedDate(row.date)}
              >
                <td className="px-3 py-2 font-medium">{formatDateLabel(row.date)}</td>
                <td className="px-3 py-2">
                  {row.morningTeam} · {row.morningAvailable}/15{' '}
                  {row.morningShortage > 0 ? (
                    <span className="badge bg-red-100 text-danger">-{row.morningShortage}</span>
                  ) : (
                    <span className="badge bg-emerald-100 text-emerald-700">OK</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {row.afternoonTeam} · {row.afternoonAvailable}/15{' '}
                  {row.afternoonShortage > 0 ? (
                    <span className="badge bg-red-100 text-danger">-{row.afternoonShortage}</span>
                  ) : (
                    <span className="badge bg-emerald-100 text-emerald-700">OK</span>
                  )}
                </td>
                <td className="px-3 py-2">{row.restTeam}</td>
                <td className="px-3 py-2">
                  {row.approvedLeaveCount > 0 ? (
                    <span className="badge bg-amber-100 text-amber-800">Leave {row.approvedLeaveCount}</span>
                  ) : (
                    <span className="text-slate-400">None</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-slate-500">
        Active window: {state.rosterWindowStart} to {addDays(state.rosterWindowStart, 13)}
      </p>
    </div>
  );
}
