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
import StudentProgress from './pages/teacher/StudentProgress';
import StudentDetail from './pages/teacher/StudentDetail';
import GroupsPage from './pages/teacher/GroupsPage';
import QuestionBankPage from './pages/teacher/QuestionBankPage';
import StudentLayout from './pages/student/StudentLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import ExamRoom from './pages/student/ExamRoom';
import AttemptResult from './pages/student/AttemptResult';
import AulaView from './pages/student/AulaView';
import StudentTurmaPage from './pages/student/StudentTurmaPage';
import SimuladoPage from './pages/student/SimuladoPage';
import GameLibrary from './pages/student/games/GameLibrary';
import AvatarCreator from './pages/student/games/AvatarCreator';
import DatabaseQuest from './pages/student/games/DatabaseQuest';

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
        <Route path="turmas" element={<GroupsPage />} />
        <Route path="alunos" element={<StudentProgress />} />
        <Route path="alunos/:studentId" element={<StudentDetail />} />
        <Route path="banco-questoes" element={<QuestionBankPage />} />
      </Route>

      <Route path="/aluno" element={<PrivateRoute role="STUDENT"><StudentLayout /></PrivateRoute>}>
        <Route index element={<StudentDashboard />} />
        <Route path="resultado/:id" element={<AttemptResult />} />
        <Route path="simulado" element={<SimuladoPage />} />
        <Route path="jogos" element={<GameLibrary />} />
        <Route path="jogos/avatar" element={<AvatarCreator />} />
        <Route path="jogos/database-quest" element={<DatabaseQuest />} />
      </Route>

      <Route path="/aluno/aula/:id" element={<PrivateRoute role="STUDENT"><AulaView /></PrivateRoute>} />
      <Route path="/aluno/turma/:id" element={<PrivateRoute role="STUDENT"><StudentTurmaPage /></PrivateRoute>} />

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
