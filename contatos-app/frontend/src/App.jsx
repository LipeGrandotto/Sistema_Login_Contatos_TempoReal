import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext.jsx';
import RequireAuth from './auth/RequireAuth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Contacts from './pages/Contacts.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Requests from './pages/Requests.jsx';
import Users from './pages/Users.jsx';
import Activity from './pages/Activity.jsx';

function Home() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/dashboard' : '/contacts'} replace />;
}

export default function App() {
  const { user } = useAuth();
  const admin = ['admin'];

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route path="/contacts" element={<Contacts />} />
        <Route path="/dashboard" element={<RequireAuth roles={admin}><Dashboard /></RequireAuth>} />
        <Route path="/requests" element={<RequireAuth roles={admin}><Requests /></RequireAuth>} />
        <Route path="/users" element={<RequireAuth roles={admin}><Users /></RequireAuth>} />
        <Route path="/activity" element={<RequireAuth roles={admin}><Activity /></RequireAuth>} />
      </Route>
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
