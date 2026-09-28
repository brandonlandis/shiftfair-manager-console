import { ChangeEvent, useState } from 'react';
import { useAppState } from '../store/context';
import { DayCountMethod } from '../store/types';

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

function toLeaveCsv(stateJson: ReturnType<typeof JSON.parse>): string {
  const header = 'id,employeeId,type,startDate,endDate,chargedDays,status,createdAt,approverId,decidedAt\n';
  const lines = stateJson.leaveRequests.map((request: any) =>
    [
      request.id,
      request.employeeId,
      request.type,
      request.startDate,
      request.endDate,
      request.chargedDays,
      request.status,
      request.createdAt,
      request.approverId || '',
      request.decidedAt || ''
    ].join(',')
  );
  return header + lines.join('\n');
}

export function SettingsPage() {
  const { state, setAnchorDay1Date, setDayCountMethod, importState, resetDemo } = useAppState();
  const [anchorDate, setAnchorDate] = useState(state.config.anchorDay1Date);

  function exportRosterCsv() {
    const header = 'employeeId,team\n';
    const lines = state.employees.map((employee) => `${employee.id},${employee.team}`).join('\n');
    downloadFile('shiftfair-roster.csv', `${header}${lines}`, 'text/csv');
  }

  function exportLeavesCsv() {
    const csv = toLeaveCsv(JSON.parse(JSON.stringify(state)));
    downloadFile('shiftfair-leave.csv', csv, 'text/csv');
  }

  function exportFullJson() {
    downloadFile('shiftfair-data.json', JSON.stringify(state, null, 2), 'application/json');
  }

  function importFullJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = JSON.parse(String(reader.result));
        importState(next);
      } catch {
        window.alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  }

  function importLeaveCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      const rows = text.split(/\r?\n/).filter(Boolean);
      if (rows.length <= 1) {
        window.alert('CSV contains no data rows.');
        return;
      }
      window.alert(`Loaded ${rows.length - 1} leave row(s). Use full JSON import for state restoration in this prototype.`);
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="text-xl font-semibold">Settings</h2>
        <p className="mt-1 text-sm text-slate-600">Cycle anchor, leave day counting mode, import/export controls, and demo reset.</p>
      </div>

      <section className="card grid gap-3 p-4 md:grid-cols-2">
        <label className="text-sm">
          Cycle Day 1 anchor date
          <input className="input" type="date" value={anchorDate} onChange={(event) => setAnchorDate(event.target.value)} />
        </label>

        <div className="flex items-end gap-2">
          <button className="btn-primary" onClick={() => setAnchorDay1Date(anchorDate)}>Apply anchor</button>
        </div>

        <label className="text-sm">
          Leave day counting method
          <select
            className="input"
            value={state.config.dayCountMethod}
            onChange={(event) => setDayCountMethod(event.target.value as DayCountMethod)}
          >
            <option value="SCHEDULED_ONLY">Scheduled Morning/Afternoon only (exclude Rest)</option>
            <option value="CALENDAR_DAYS">Calendar days</option>
          </select>
        </label>
      </section>

      <section className="card p-4">
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={exportRosterCsv}>Export roster CSV</button>
          <button className="btn-ghost" onClick={exportLeavesCsv}>Export leave CSV</button>
          <button className="btn-ghost" onClick={exportFullJson}>Export full JSON</button>
          <label className="btn-ghost cursor-pointer">
            Import full JSON
            <input className="hidden" type="file" accept="application/json" onChange={importFullJson} />
          </label>
          <label className="btn-ghost cursor-pointer">
            Import leave CSV
            <input className="hidden" type="file" accept="text/csv" onChange={importLeaveCsv} />
          </label>
          <button className="btn" style={{ backgroundColor: '#dc2626', color: '#ffffff' }} onClick={resetDemo}>Reset demo</button>
        </div>
      </section>

      <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-slate-700">
        Prototype warning: this app lacks authentication, role-based access control, and centralized secure storage. Do not use real employee medical data.
      </div>
    </div>
  );
}
