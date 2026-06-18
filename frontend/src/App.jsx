import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import ptBR from 'antd/locale/pt_BR';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import TeacherLayout from './pages/teacher/TeacherLayout';
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import ExamForm from './pages/teacher/ExamForm';
import ExamDetail from './pages/teacher/ExamDetail';
import ExamResults from './pages/teacher/ExamResults';
import StudentLayout from './pages/student/StudentLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import ExamRoom from './pages/student/ExamRoom';
import AttemptResult from './pages/student/AttemptResult';

function PrivateRoute({ children, role }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === 'TEACHER' ? '/professor' : '/aluno'} replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to={user.role === 'TEACHER' ? '/professor' : '/aluno'} replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/cadastro" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      <Route path="/professor" element={<PrivateRoute role="TEACHER"><TeacherLayout /></PrivateRoute>}>
        <Route index element={<TeacherDashboard />} />
        <Route path="nova-prova" element={<ExamForm />} />
        <Route path="prova/:id" element={<ExamDetail />} />
        <Route path="prova/:id/editar" element={<ExamForm />} />
        <Route path="prova/:id/resultados" element={<ExamResults />} />
      </Route>

      <Route path="/aluno" element={<PrivateRoute role="STUDENT"><StudentLayout /></PrivateRoute>}>
        <Route index element={<StudentDashboard />} />
        <Route path="resultado/:id" element={<AttemptResult />} />
      </Route>

      <Route path="/sala/:id" element={<PrivateRoute role="STUDENT"><ExamRoom /></PrivateRoute>} />

      <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
    </Routes>
  );
}

export default function App() {
  return (
    <ConfigProvider locale={ptBR} theme={{ token: { colorPrimary: '#1677ff', borderRadius: 8 } }}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ConfigProvider>
  );
}
