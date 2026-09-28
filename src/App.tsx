import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { useAppState } from './store/context';
import { NoticeBanner } from './components/ui/NoticeBanner';
import { OverviewPage } from './pages/OverviewPage';
import { SwapsPage } from './pages/SwapsPage';
import { RecallsPage } from './pages/RecallsPage';
import { LeaveBalancesPage } from './pages/LeaveBalancesPage';
import { TeamMembersPage } from './pages/TeamMembersPage';
import { ActivityPage } from './pages/ActivityPage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  const { loading, error, banner, dismissBanner } = useAppState();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-600">
        Loading ShiftFair demo state...
      </div>
    );
  }

  return (
    <AppShell>
      {error && (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {banner && <NoticeBanner banner={banner} onClose={dismissBanner} />}

      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/swaps" element={<SwapsPage />} />
        <Route path="/recalls" element={<RecallsPage />} />
        <Route path="/leave" element={<LeaveBalancesPage />} />
        <Route path="/teams" element={<TeamMembersPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
