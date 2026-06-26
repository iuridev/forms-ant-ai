import { useEffect, useState } from 'react';
import {
  Button, Tag, Space, Typography, Popconfirm, message, Empty, Tabs, Progress, Tooltip,
} from 'antd';
import {
  PlusOutlined, EyeOutlined, BarChartOutlined, DeleteOutlined, CopyOutlined,
  FileTextOutlined, BookOutlined, TeamOutlined, CheckCircleOutlined,
  ClockCircleOutlined, RocketOutlined, BankOutlined, LineChartOutlined,
  ExclamationCircleOutlined, CalendarOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api';

const { Title, Text } = Typography;

const STATUS_CONFIG = {
  DRAFT:  { color: '#8c8c8c', bg: '#fafafa', label: 'Rascunho', icon: <ExclamationCircleOutlined /> },
  ACTIVE: { color: '#52c41a', bg: '#f6ffed', label: 'Ativa',    icon: <CheckCircleOutlined /> },
  CLOSED: { color: '#ff4d4f', bg: '#fff2f0', label: 'Encerrada', icon: <ClockCircleOutlined /> },
};

const BIMESTRE_CONFIG = {
  '1':   { label: '1º Bim', color: '#1677ff', bg: '#e6f4ff' },
  '2':   { label: '2º Bim', color: '#52c41a', bg: '#f6ffed' },
  '3':   { label: '3º Bim', color: '#fa8c16', bg: '#fff7e6' },
  '4':   { label: '4º Bim', color: '#722ed1', bg: '#f9f0ff' },
  'REC': { label: 'Rec.',   color: '#f5222d', bg: '#fff1f0' },
};

function StatCard({ icon, label, value, color, sub, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 16,
        padding: '24px 28px',
        cursor: onClick ? 'pointer' : 'default',
        border: '1px solid #eaecf0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'all 0.18s',
        flex: 1,
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8, fontWeight: 500 }}>{label}</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: color || '#1a1a2e', lineHeight: 1 }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>{sub}</div>}
        </div>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: `${color || '#1677ff'}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color: color || '#1677ff',
          flexShrink: 0,
        }}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function QuickAction({ icon, label, desc, color, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 14,
        padding: '18px 20px',
        cursor: 'pointer',
        border: `1px solid #eaecf0`,
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'all 0.15s',
        flex: 1,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.boxShadow = `0 4px 16px ${color}22`; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = '#eaecf0'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1a1a2e' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{desc}</div>
      </div>
    </div>
  );
}

function ExamCard({ exam, onDelete, navigate }) {
  const cfg = STATUS_CONFIG[exam.status] || STATUS_CONFIG.DRAFT;
  const isTask = exam.type === 'TAREFA';
  const attempts = exam._count?.attempts || 0;
  const questions = exam._count?.questions || 0;

  function copyCode(e) {
    e.stopPropagation();
    navigator.clipboard.writeText(exam.accessCode);
    message.success('Código copiado!');
  }

  return (
    <div style={{
      background: '#fff',
      borderRadius: 14,
      border: '1px solid #eaecf0',
      overflow: 'hidden',
      transition: 'all 0.18s',
      cursor: 'pointer',
      boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.09)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'none'; }}
      onClick={() => navigate(`/professor/prova/${exam.id}`)}
    >
      {/* Barra de cor no topo */}
      <div style={{ height: 4, background: isTask ? 'linear-gradient(90deg,#1677ff,#4f9cf9)' : 'linear-gradient(90deg,#667eea,#764ba2)' }} />

      <div style={{ padding: '18px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              <Tag
                color={isTask ? 'blue' : 'purple'}
                style={{ fontSize: 11, margin: 0, borderRadius: 4 }}
              >
                {isTask ? 'Tarefa' : 'Prova'}
              </Tag>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, color: cfg.color, background: cfg.bg,
                border: `1px solid ${cfg.color}40`, borderRadius: 4, padding: '1px 8px',
              }}>
                {cfg.icon} {cfg.label}
              </div>
              {exam.bimestre && BIMESTRE_CONFIG[exam.bimestre] && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontSize: 11, color: BIMESTRE_CONFIG[exam.bimestre].color,
                  background: BIMESTRE_CONFIG[exam.bimestre].bg,
                  border: `1px solid ${BIMESTRE_CONFIG[exam.bimestre].color}40`,
                  borderRadius: 4, padding: '1px 8px',
                }}>
                  <CalendarOutlined style={{ fontSize: 10 }} />
                  {BIMESTRE_CONFIG[exam.bimestre].label}
                </div>
              )}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {exam.title}
            </div>
          </div>
        </div>

        {/* Métricas */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1677ff' }}>{questions}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>questões</div>
          </div>
          <div style={{ width: 1, background: '#f0f0f0' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#52c41a' }}>{attempts}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>tentativas</div>
          </div>
          <div style={{ width: 1, background: '#f0f0f0' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fa8c16' }}>{exam.durationMinutes}</div>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>min</div>
          </div>
        </div>

        {/* Código de acesso */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8faff', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Código de acesso</div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 4, color: '#1677ff', fontFamily: 'monospace' }}>{exam.accessCode}</div>
          </div>
          <Tooltip title="Copiar código">
            <Button
              type="text" size="small" icon={<CopyOutlined />}
              onClick={copyCode}
              style={{ color: '#1677ff' }}
            />
          </Tooltip>
        </div>

        {/* Ações */}
        <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
          <Button
            size="small" icon={<EyeOutlined />}
            onClick={() => navigate(`/professor/prova/${exam.id}`)}
            style={{ flex: 1, borderRadius: 8 }}
          >
            Editar
          </Button>
          <Button
            size="small" icon={<BarChartOutlined />}
            onClick={() => navigate(`/professor/prova/${exam.id}/resultados`)}
            style={{ flex: 1, borderRadius: 8, color: '#52c41a', borderColor: '#b7eb8f' }}
          >
            {isTask ? 'Resultados' : 'Notas'}
          </Button>
          <Popconfirm title="Excluir avaliação?" onConfirm={() => onDelete(exam.id)} okText="Sim" cancelText="Não" okButtonProps={{ danger: true }}>
            <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 8 }} />
          </Popconfirm>
        </div>
      </div>
    </div>
  );
}

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('PROVA');
  const navigate = useNavigate();

  async function fetchExams() {
    try {
      const res = await api.get('/exams');
      setExams(res.data);
    } catch { message.error('Erro ao carregar avaliações'); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchExams(); }, []);

  async function deleteExam(id) {
    try {
      await api.delete(`/exams/${id}`);
      message.success('Excluído com sucesso');
      setExams(prev => prev.filter(e => e.id !== id));
    } catch { message.error('Erro ao excluir'); }
  }

  const provas = exams.filter(e => (e.type || 'PROVA') === 'PROVA');
  const tarefas = exams.filter(e => e.type === 'TAREFA');
  const filtered = tab === 'PROVA' ? provas : tarefas;

  const activeCount = exams.filter(e => e.status === 'ACTIVE').length;
  const totalAttempts = exams.reduce((acc, e) => acc + (e._count?.attempts || 0), 0);
  const totalQuestions = exams.reduce((acc, e) => acc + (e._count?.questions || 0), 0);

  return (
    <div>
      {/* ── Hero banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0d1b2e 0%, #0f2444 50%, #1a3a6b 100%)',
        borderRadius: 20,
        padding: '32px 40px',
        marginBottom: 28,
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(13,27,46,0.2)',
      }}>
        {/* Decoração */}
        <div style={{ position: 'absolute', right: -40, top: -40, width: 240, height: 240, borderRadius: '50%', background: 'rgba(79,156,249,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 120, bottom: -60, width: 160, height: 160, borderRadius: '50%', background: 'rgba(102,126,234,0.09)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20, position: 'relative', zIndex: 1 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, marginBottom: 6 }}>Portal do Professor</div>
            <Title level={2} style={{ color: '#fff', margin: 0, fontWeight: 700 }}>
              {exams.length === 0 ? 'Bem-vindo!' : `${exams.length} avaliação${exams.length > 1 ? 'ões' : ''} cadastrada${exams.length > 1 ? 's' : ''}`}
            </Title>
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, marginTop: 4 }}>
              {activeCount > 0
                ? <><span style={{ color: '#52c41a', fontWeight: 600 }}>{activeCount}</span> ativa{activeCount > 1 ? 's' : ''} agora</>
                : 'Nenhuma avaliação ativa no momento'}
            </div>
          </div>

          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => navigate('/professor/nova-prova')}
            style={{
              background: 'linear-gradient(135deg, #4f9cf9, #667eea)',
              border: 'none', borderRadius: 12,
              height: 48, paddingInline: 28,
              fontSize: 15, fontWeight: 600,
              boxShadow: '0 4px 16px rgba(79,156,249,0.4)',
            }}
          >
            Nova Avaliação
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard icon={<FileTextOutlined />} label="Provas" value={provas.length} color="#667eea" sub={`${provas.filter(e => e.status === 'ACTIVE').length} ativas`} onClick={() => setTab('PROVA')} />
        <StatCard icon={<BookOutlined />} label="Tarefas" value={tarefas.length} color="#1677ff" sub={`${tarefas.filter(e => e.status === 'ACTIVE').length} ativas`} onClick={() => setTab('TAREFA')} />
        <StatCard icon={<RocketOutlined />} label="Tentativas Totais" value={totalAttempts} color="#fa8c16" sub="por alunos" />
        <StatCard icon={<CheckCircleOutlined />} label="Questões Criadas" value={totalQuestions} color="#52c41a" sub="no total" />
      </div>

      {/* ── Ações rápidas ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Acesso Rápido</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <QuickAction icon={<PlusOutlined />} label="Nova Avaliação" desc="Criar prova ou tarefa" color="#667eea" onClick={() => navigate('/professor/nova-prova')} />
          <QuickAction icon={<TeamOutlined />} label="Turmas" desc="Gerenciar grupos de alunos" color="#1677ff" onClick={() => navigate('/professor/turmas')} />
          <QuickAction icon={<LineChartOutlined />} label="Desempenho" desc="Ver progresso dos alunos" color="#52c41a" onClick={() => navigate('/professor/alunos')} />
          <QuickAction icon={<BankOutlined />} label="Banco de Questões" desc="Gerenciar questões salvas" color="#fa8c16" onClick={() => navigate('/professor/banco-questoes')} />
        </div>
      </div>

      {/* ── Lista de avaliações ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #eaecf0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
        {/* Header da seção */}
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #f0f2f5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Title level={5} style={{ margin: 0, color: '#1a1a2e' }}>Minhas Avaliações</Title>
            <Button size="small" type="text" icon={<PlusOutlined />} onClick={() => navigate('/professor/nova-prova')} style={{ color: '#1677ff' }}>
              Adicionar
            </Button>
          </div>
          <Tabs
            activeKey={tab}
            onChange={setTab}
            size="small"
            items={[
              {
                key: 'PROVA',
                label: (
                  <span style={{ fontWeight: tab === 'PROVA' ? 600 : 400 }}>
                    <FileTextOutlined style={{ marginRight: 6 }} />Provas
                    <span style={{ marginLeft: 6, background: tab === 'PROVA' ? '#667eea' : '#f0f0f0', color: tab === 'PROVA' ? '#fff' : '#666', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{provas.length}</span>
                  </span>
                ),
              },
              {
                key: 'TAREFA',
                label: (
                  <span style={{ fontWeight: tab === 'TAREFA' ? 600 : 400 }}>
                    <BookOutlined style={{ marginRight: 6 }} />Tarefas
                    <span style={{ marginLeft: 6, background: tab === 'TAREFA' ? '#1677ff' : '#f0f0f0', color: tab === 'TAREFA' ? '#fff' : '#666', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{tarefas.length}</span>
                  </span>
                ),
              },
            ]}
          />
        </div>

        {/* Grid de cards */}
        <div style={{ padding: 24 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af' }}>Carregando avaliações...</div>
          ) : filtered.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <span style={{ color: '#9ca3af' }}>
                  {tab === 'TAREFA' ? 'Nenhuma tarefa criada ainda' : 'Nenhuma prova criada ainda'}
                </span>
              }
              style={{ padding: '40px 0' }}
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/professor/nova-prova')}>
                Criar {tab === 'TAREFA' ? 'Tarefa' : 'Prova'}
              </Button>
            </Empty>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 16,
            }}>
              {filtered.map(exam => (
                <ExamCard
                  key={exam.id}
                  exam={exam}
                  onDelete={deleteExam}
                  navigate={navigate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
