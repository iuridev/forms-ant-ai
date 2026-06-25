import { useEffect, useState } from 'react';
import { Button, Input, Form, Typography, message, Tag, Progress, Empty, Tooltip, Tabs } from 'antd';
import {
  LoginOutlined, CheckCircleOutlined, CloseCircleOutlined,
  BookOutlined, FileTextOutlined, CopyOutlined, TeamOutlined,
  PlayCircleOutlined, RightOutlined, ClockCircleOutlined,
  TrophyOutlined, FireOutlined, KeyOutlined, BellFilled, ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api';

const { Title, Text } = Typography;

const TURMA_COLORS = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#a18cd1', '#fbc2eb'],
];

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function StatChip({ icon, label, value, color = '#fff' }) {
  return (
    <div style={{ textAlign: 'center', padding: '0 20px', borderLeft: '1px solid rgba(255,255,255,0.15)' }}>
      <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginBottom: 2 }}>{label}</div>
      <div style={{ color, fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 4 }}>
        {icon}<span>{value}</span>
      </div>
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState([]);
  const [pending, setPending] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [aulas, setAulas] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [simulados, setSimulados] = useState([]);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/attempts/my').then(res => setAttempts(res.data)).catch(() => {});
    api.get('/groups/my-pending').then(res => setPending(res.data)).catch(() => {}).finally(() => setPendingLoading(false));
    api.get('/aulas/my').then(res => setAulas(res.data)).catch(() => {});
    api.get('/groups/my-groups').then(res => setMyGroups(res.data)).catch(() => {});
    api.get('/simulados/my').then(res => setSimulados(res.data)).catch(() => {});
  }, []);

  async function handleEnterExam({ code }) {
    setLoading(true);
    try {
      const res = await api.post('/attempts/start', { accessCode: code.trim().toUpperCase() });
      navigate(`/sala/${res.data.attempt.id}`);
    } catch (err) {
      message.error(err.response?.data?.error || 'Código inválido ou avaliação não disponível');
    } finally {
      setLoading(false);
    }
  }

  async function startPendingExam(item) {
    if (item.inProgressAttemptId) { navigate(`/sala/${item.inProgressAttemptId}`); return; }
    try {
      const res = await api.post('/attempts/start', { examId: item.examId });
      navigate(`/sala/${res.data.attempt.id}`);
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao iniciar avaliação');
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(user?.publicCode || '');
    message.success('Código copiado!');
  }

  const provaAttempts = attempts.filter(a => (a.exam?.type || 'PROVA') === 'PROVA');
  const tarefaAttempts = attempts.filter(a => a.exam?.type === 'TAREFA');
  const pendingCount = pending.filter(p => p.canAttempt).length;
  const avgPct = attempts.length
    ? attempts.reduce((acc, a) => acc + (a.score / a.maxScore * 100), 0) / attempts.length
    : null;
  const approvedCount = attempts.filter(a => a.score / a.maxScore >= 0.6).length;

  return (
    <div>

      {/* ── Hero banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0d2137 0%, #1a3a6b 60%, #1e4d8c 100%)',
        borderRadius: 20,
        padding: '32px 40px',
        marginBottom: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 24,
        boxShadow: '0 8px 32px rgba(13,33,55,0.25)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decoração de fundo */}
        <div style={{ position: 'absolute', right: -60, top: -60, width: 280, height: 280, borderRadius: '50%', background: 'rgba(79,156,249,0.08)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -80, width: 200, height: 200, borderRadius: '50%', background: 'rgba(102,126,234,0.1)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, zIndex: 1 }}>
          <div style={{
            width: 72, height: 72, borderRadius: 18,
            background: 'linear-gradient(135deg, #4f9cf9, #667eea)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 800, color: '#fff',
            boxShadow: '0 4px 16px rgba(79,156,249,0.4)',
            flexShrink: 0,
          }}>
            {getInitials(user?.name)}
          </div>
          <div>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, display: 'block' }}>
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </Text>
            <Title level={2} style={{ margin: '2px 0 4px', color: '#fff', fontWeight: 700 }}>
              Olá, {user?.name?.split(' ')[0]}!
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14 }}>
              Bem-vindo ao seu ambiente de aprendizagem
            </Text>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 0, zIndex: 1 }}>
          <StatChip label="Avaliações" value={attempts.length} icon={<FileTextOutlined style={{ fontSize: 16 }} />} />
          <StatChip
            label="Média geral"
            value={avgPct !== null ? (avgPct / 10).toFixed(1) : '—'}
            icon={<TrophyOutlined style={{ fontSize: 16 }} />}
            color={avgPct !== null ? (avgPct >= 60 ? '#52c41a' : '#ff7875') : '#fff'}
          />
          <StatChip label="Aprovações" value={approvedCount} icon={<CheckCircleOutlined style={{ fontSize: 16 }} />} color="#52c41a" />
        </div>
      </div>

      {/* ── Alertas de avaliações pendentes ── */}
      {!pendingLoading && pendingCount > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <BellFilled style={{ color: '#fa8c16', fontSize: 18 }} />
            <Title level={4} style={{ margin: 0 }}>Avaliações Pendentes</Title>
            <div style={{
              background: '#fa8c16', color: '#fff', borderRadius: 20,
              padding: '1px 10px', fontSize: 12, fontWeight: 700,
            }}>{pendingCount}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pending.filter(p => p.canAttempt).map(item => (
              <div key={item.examId} style={{
                background: '#fff',
                borderRadius: 14,
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                borderLeft: `4px solid ${item.type === 'TAREFA' ? '#1677ff' : '#722ed1'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: item.type === 'TAREFA' ? '#e6f4ff' : '#f9f0ff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {item.type === 'TAREFA'
                      ? <BookOutlined style={{ fontSize: 20, color: '#1677ff' }} />
                      : <FileTextOutlined style={{ fontSize: 20, color: '#722ed1' }} />}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <Text strong style={{ fontSize: 15, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.title}
                    </Text>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      <Tag color={item.type === 'TAREFA' ? 'blue' : 'purple'} style={{ margin: 0 }}>
                        {item.type === 'TAREFA' ? 'Tarefa' : 'Prova'}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        <TeamOutlined style={{ marginRight: 4 }} />{item.groupName}
                      </Text>
                      {item.type === 'TAREFA' && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          {item.remainingAttempts} tentativa(s) restante(s)
                        </Text>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  type="primary"
                  icon={item.inProgressAttemptId ? <PlayCircleOutlined /> : <LoginOutlined />}
                  onClick={() => startPendingExam(item)}
                  style={{
                    borderRadius: 10, height: 40, paddingInline: 20,
                    background: item.inProgressAttemptId ? '#fa8c16' : undefined,
                    border: 'none', flexShrink: 0,
                  }}
                >
                  {item.inProgressAttemptId ? 'Continuar' : item.attemptsUsed > 0 ? 'Tentar novamente' : 'Iniciar'}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Grid: Turmas + Código de acesso ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, marginBottom: 28 }}>

        {/* Minhas Turmas */}
        <div>
          <Title level={4} style={{ marginBottom: 14 }}>
            <TeamOutlined style={{ marginRight: 8, color: '#667eea' }} />Minhas Turmas
          </Title>
          {myGroups.length === 0 ? (
            <div style={{
              background: '#fff', borderRadius: 14, padding: 40,
              textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
            }}>
              <TeamOutlined style={{ fontSize: 36, color: '#ccc', marginBottom: 12 }} />
              <Text type="secondary" style={{ display: 'block' }}>Você ainda não está em nenhuma turma.<br />Passe seu código ao professor.</Text>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
              {myGroups.map((group, i) => {
                const [c1, c2] = TURMA_COLORS[i % TURMA_COLORS.length];
                return (
                  <div
                    key={group.id}
                    onClick={() => navigate(`/aluno/turma/${group.id}`)}
                    style={{
                      background: '#fff',
                      borderRadius: 14,
                      overflow: 'hidden',
                      cursor: 'pointer',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)'; }}
                  >
                    {/* Topo colorido */}
                    <div style={{ height: 6, background: `linear-gradient(90deg, ${c1}, ${c2})` }} />
                    <div style={{ padding: 16 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: 10,
                        background: `linear-gradient(135deg, ${c1}22, ${c2}33)`,
                        border: `2px solid ${c1}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 10,
                      }}>
                        <TeamOutlined style={{ fontSize: 18, color: c1 }} />
                      </div>
                      <Text strong style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>{group.name}</Text>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <span style={{ fontSize: 11, background: '#f5f7fa', borderRadius: 6, padding: '2px 8px', color: '#555' }}>
                          📚 {group.aulaCount} aula{group.aulaCount !== 1 ? 's' : ''}
                        </span>
                        <span style={{ fontSize: 11, background: '#f5f7fa', borderRadius: 6, padding: '2px 8px', color: '#555' }}>
                          📝 {group.examCount} aval.
                        </span>
                      </div>
                      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                        <RightOutlined style={{ color: c1, fontSize: 13 }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Painel direito */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Entrar por código */}
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '22px 24px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <KeyOutlined style={{ fontSize: 18, color: '#667eea' }} />
              <Text strong style={{ fontSize: 15 }}>Entrar com código</Text>
            </div>
            <Form form={form} onFinish={handleEnterExam} layout="vertical">
              <Form.Item
                name="code"
                style={{ marginBottom: 12 }}
                rules={[{ required: true, message: 'Informe o código' }]}
              >
                <Input
                  placeholder="Ex: AB3XY7"
                  size="large"
                  style={{
                    textTransform: 'uppercase',
                    letterSpacing: 4,
                    fontWeight: 800,
                    fontSize: 18,
                    textAlign: 'center',
                    borderRadius: 10,
                  }}
                  maxLength={6}
                />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                icon={<LoginOutlined />}
                loading={loading}
                block
                style={{ borderRadius: 10, height: 44, background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none', fontWeight: 600 }}
              >
                Iniciar Avaliação
              </Button>
            </Form>
          </div>

          {/* Código público */}
          {user?.publicCode && (
            <div style={{
              background: 'linear-gradient(135deg, #e8f4fd, #f0e6ff)',
              borderRadius: 16,
              padding: '20px 24px',
              border: '1px solid #c7d8f5',
            }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                Seu código público
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 26, fontWeight: 800, letterSpacing: 4, color: '#1677ff' }}>
                  {user.publicCode}
                </Text>
                <Tooltip title="Copiar código">
                  <Button
                    type="text"
                    icon={<CopyOutlined />}
                    onClick={copyCode}
                    style={{ color: '#1677ff' }}
                  />
                </Tooltip>
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                Compartilhe com o professor para entrar em turmas
              </Text>
            </div>
          )}

          {/* Simulados */}
          <div
            onClick={() => navigate('/aluno/simulado')}
            style={{
              background: 'linear-gradient(135deg, #0d2137, #1a3a6b)',
              borderRadius: 16, padding: '20px 24px',
              cursor: 'pointer', position: 'relative', overflow: 'hidden',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <div style={{ position: 'absolute', right: -20, top: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(79,156,249,0.12)', pointerEvents: 'none' }} />
            <ThunderboltOutlined style={{ fontSize: 24, color: '#4f9cf9', marginBottom: 8, display: 'block' }} />
            <Text strong style={{ color: '#fff', fontSize: 15, display: 'block' }}>Simulados</Text>
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, display: 'block', marginTop: 2 }}>
              {simulados.length > 0
                ? `${simulados.length} simulado${simulados.length > 1 ? 's' : ''} realizado${simulados.length > 1 ? 's' : ''}`
                : 'Pratique com questões do banco'}
            </Text>
            <div style={{ marginTop: 12 }}>
              <span style={{ fontSize: 11, background: 'rgba(79,156,249,0.25)', color: '#4f9cf9', borderRadius: 6, padding: '3px 10px', fontWeight: 600 }}>
                Praticar agora →
              </span>
            </div>
          </div>

          {/* Aulas recentes */}
          {aulas.length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
              <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 12 }}>
                📖 Aulas Recentes
              </Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {aulas.slice(0, 4).map((aula, idx) => (
                  <div
                    key={aula.id}
                    onClick={() => navigate(`/aluno/aula/${aula.id}`)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', borderRadius: 10,
                      background: '#f8faff', cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#eef3ff'}
                    onMouseLeave={e => e.currentTarget.style.background = '#f8faff'}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: '#667eea22', color: '#667eea',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700, flexShrink: 0,
                    }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ fontSize: 13, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{aula.title}</Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>{aula.groupName}</Text>
                    </div>
                    <PlayCircleOutlined style={{ color: '#667eea', fontSize: 14 }} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Histórico ── */}
      {attempts.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, padding: '24px 28px', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <Title level={4} style={{ marginBottom: 20 }}>
            <TrophyOutlined style={{ marginRight: 8, color: '#fa8c16' }} />Histórico de Avaliações
          </Title>
          <Tabs
            items={[
              {
                key: 'provas',
                label: <span><FileTextOutlined /> Provas ({provaAttempts.length})</span>,
                children: provaAttempts.length === 0
                  ? <Empty description="Nenhuma prova realizada" style={{ padding: 32 }} />
                  : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {provaAttempts.map(a => <AttemptRow key={a.id} attempt={a} navigate={navigate} />)}
                    </div>
                  ),
              },
              {
                key: 'tarefas',
                label: <span><BookOutlined /> Tarefas ({tarefaAttempts.length})</span>,
                children: tarefaAttempts.length === 0
                  ? <Empty description="Nenhuma tarefa realizada" style={{ padding: 32 }} />
                  : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {tarefaAttempts.map(a => <AttemptRow key={a.id} attempt={a} navigate={navigate} isTask />)}
                    </div>
                  ),
              },
              {
                key: 'simulados',
                label: <span><ThunderboltOutlined /> Simulados ({simulados.length})</span>,
                children: simulados.length === 0
                  ? <Empty description="Nenhum simulado realizado ainda" style={{ padding: 32 }} />
                  : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {simulados.map(s => <SimuladoRow key={s.id} simulado={s} />)}
                    </div>
                  ),
              },
            ]}
          />
        </div>
      )}

      {attempts.length === 0 && pending.length === 0 && !pendingLoading && (
        <div style={{ background: '#fff', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <FireOutlined style={{ fontSize: 48, color: '#ffa500', marginBottom: 16 }} />
          <Title level={4} style={{ color: '#555' }}>Pronto para começar!</Title>
          <Text type="secondary">Suas avaliações aparecerão aqui após você entrar em uma turma ou usar um código de acesso.</Text>
        </div>
      )}
    </div>
  );
}

function SimuladoRow({ simulado }) {
  const approved = (simulado.percentage || 0) >= 70;
  const nota = simulado.percentage !== null ? ((simulado.percentage || 0) / 10).toFixed(1) : '—';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '14px 18px', borderRadius: 12,
      background: '#fafbff', border: '1px solid #eef0f5',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: approved ? '#f0fdf4' : '#fff1f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <ThunderboltOutlined style={{ fontSize: 22, color: approved ? '#52c41a' : '#ff4d4f' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text strong style={{ fontSize: 14, display: 'block' }}>{simulado.discipline}</Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(simulado.submittedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          {' · '}{simulado.totalQuestions} questões
        </Text>
      </div>
      <div style={{ textAlign: 'center', minWidth: 80 }}>
        <Text style={{ fontSize: 22, fontWeight: 800, color: approved ? '#16a34a' : '#dc2626' }}>{nota}</Text>
        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>de 10</Text>
      </div>
      <Progress
        percent={simulado.percentage || 0}
        size="small"
        status={approved ? 'success' : 'exception'}
        style={{ width: 100 }}
      />
    </div>
  );
}

function AttemptRow({ attempt, navigate, isTask }) {
  const pct = Math.round((attempt.score / attempt.maxScore) * 100);
  const approved = pct >= 60;
  const nota = (pct / 10).toFixed(1);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 16,
      padding: '14px 18px',
      borderRadius: 12,
      background: '#fafbff',
      border: '1px solid #eef0f5',
      transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#c7d8f5'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#eef0f5'}
    >
      {/* Ícone */}
      <div style={{
        width: 44, height: 44, borderRadius: 12, flexShrink: 0,
        background: approved ? '#f0fdf4' : '#fff1f0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {approved
          ? <CheckCircleOutlined style={{ fontSize: 22, color: '#52c41a' }} />
          : <CloseCircleOutlined style={{ fontSize: 22, color: '#ff4d4f' }} />}
      </div>

      {/* Título */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text strong style={{ fontSize: 14, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {attempt.exam?.title}
        </Text>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {new Date(attempt.submittedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
          {isTask && attempt.exam && ` · Tentativa ${attempt.exam.attemptsUsed} de ${attempt.exam.maxAttempts}`}
        </Text>
      </div>

      {/* Nota */}
      <div style={{ textAlign: 'center', minWidth: 80 }}>
        <Text style={{ fontSize: 22, fontWeight: 800, color: approved ? '#16a34a' : '#dc2626' }}>{nota}</Text>
        <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>de 10</Text>
      </div>

      {/* Progress */}
      <div style={{ width: 100 }}>
        <Progress
          percent={pct}
          size="small"
          status={approved ? 'success' : 'exception'}
          showInfo={false}
        />
        <Text style={{ fontSize: 11, color: approved ? '#52c41a' : '#ff4d4f' }}>
          {approved ? 'Aprovado' : 'Reprovado'}
        </Text>
      </div>

      {/* Ação */}
      <Button
        size="small"
        onClick={() => navigate(`/aluno/resultado/${attempt.id}`)}
        style={{ borderRadius: 8, flexShrink: 0 }}
      >
        Detalhes
      </Button>
    </div>
  );
}
