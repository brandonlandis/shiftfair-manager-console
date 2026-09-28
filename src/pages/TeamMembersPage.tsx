import { useAppState } from '../store/context';

export function TeamMembersPage() {
  const { state } = useAppState();

  const teams: Array<'T1' | 'T2' | 'T3'> = ['T1', 'T2', 'T3'];

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <h2 className="text-xl font-semibold">Team & Members</h2>
        <p className="mt-1 text-sm text-slate-600">Home-team affiliation is fixed. Assignment overrides happen through approved swaps, leave, and recalls.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {teams.map((team) => (
          <section key={team} className="card p-4">
            <h3 className="mb-2 text-base font-semibold">{team} roster (15)</h3>
            <ul className="space-y-1 text-sm">
              {state.employees
                .filter((employee) => employee.team === team)
                .map((employee) => (
                  <li key={employee.id} className="rounded bg-slate-50 px-2 py-1">
                    {employee.id}
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
