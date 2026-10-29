import { ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import type { Role } from './lib/types';
import Layout from './components/Layout';
import Login from './pages/Login';
import Workspaces from './pages/Workspaces';
import Dashboard from './pages/Dashboard';
import FeedbackList from './pages/FeedbackList';
import FeedbackForm from './pages/FeedbackForm';
import FeedbackDetail from './pages/FeedbackDetail';
import Taxonomy from './pages/Taxonomy';
import Roadmap from './pages/Roadmap';
import PublicRoadmap from './pages/PublicRoadmap';
import ReleaseNotes from './pages/ReleaseNotes';
import Team from './pages/Team';
import Subscription from './pages/Subscription';
import Settings from './pages/Settings';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const loc = useLocation();
  return user ? <>{children}</> : <Navigate to="/login" state={{ from: loc.pathname }} replace />;
}

/** Role-based route protection inside a workspace. */
export function Guard({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { role } = useWorkspace();
  return roles.includes(role) ? <>{children}</> : <Navigate to=".." replace />;
}

function Home() {
  const { role } = useWorkspace();
  return role === 'customer' ? <Navigate to="feedback" replace /> : <Dashboard />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/public/:slug" element={<PublicRoadmap />} />
      <Route path="/" element={<RequireAuth><Workspaces /></RequireAuth>} />
      <Route path="/w/:wid" element={<RequireAuth><WorkspaceProvider><Layout /></WorkspaceProvider></RequireAuth>}>
        <Route index element={<Home />} />
        <Route path="feedback" element={<FeedbackList />} />
        <Route path="feedback/new" element={<FeedbackForm />} />
        <Route path="feedback/:id" element={<FeedbackDetail />} />
        <Route path="feedback/:id/edit" element={<FeedbackForm />} />
        <Route path="roadmap" element={<Roadmap />} />
        <Route path="releases" element={<ReleaseNotes />} />
        <Route path="taxonomy" element={<Guard roles={['owner', 'admin']}><Taxonomy /></Guard>} />
        <Route path="team" element={<Guard roles={['owner', 'admin']}><Team /></Guard>} />
        <Route path="subscription" element={<Guard roles={['owner']}><Subscription /></Guard>} />
        <Route path="settings" element={<Guard roles={['owner']}><Settings /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
