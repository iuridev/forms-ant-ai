import { useEffect, useState } from 'react';
import {
  Card, Button, Input, Form, Typography, message, Space, Table, Tag, Progress,
  Empty, Alert, Tooltip, Badge, List, Avatar,
} from 'antd';
import {
  LoginOutlined, HistoryOutlined, CheckCircleOutlined, CloseCircleOutlined,
  BookOutlined, FileTextOutlined, CopyOutlined, TeamOutlined, BellOutlined,
  PlayCircleOutlined, SlidersFilled, RightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api';

const { Title, Text } = Typography;

export default function StudentDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState([]);
  const [pending, setPending] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [aulas, setAulas] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/attempts/my').then(res => setAttempts(res.data)).catch(() => {});
    api.get('/groups/my-pending').then(res => setPending(res.data)).catch(() => {}).finally(() => setPendingLoading(false));
    api.get('/aulas/my').then(res => setAulas(res.data)).catch(() => {});
    api.get('/groups/my-groups').then(res => setMyGroups(res.data)).catch(() => {});
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
    if (item.inProgressAttemptId) {
      navigate(`/sala/${item.inProgressAttemptId}`);
      return;
    }
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

  const pendingColumns = [
    {
      title: 'Avaliação', key: 'title',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Space>
            {r.type === 'TAREFA' ? <BookOutlined style={{ color: '#1677ff' }} /> : <FileTextOutlined />}
            <Text strong>{r.title}</Text>
            <Tag color={r.type === 'TAREFA' ? 'blue' : 'default'} style={{ fontSize: 11 }}>
              {r.type === 'TAREFA' ? 'Tarefa' : 'Prova'}
            </Tag>
          </Space>
          <Text type="secondary" style={{ fontSize: 12 }}>
            <TeamOutlined style={{ marginRight: 4 }} />{r.groupName}
            {r.type === 'TAREFA' && ` · ${r.remainingAttempts} tentativa(s) restante(s)`}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Situação', key: 'status',
      render: (_, r) => {
        if (!r.canAttempt) return <Tag color="default">Concluída</Tag>;
        if (r.inProgressAttemptId) return <Tag color="processing">Em andamento</Tag>;
        if (r.attemptsUsed > 0) return <Tag color="warning">{r.attemptsUsed} tentativa(s) feita(s)</Tag>;
        return <Tag color="blue">Pendente</Tag>;
      },
    },
    {
      title: '', key: 'action',
      render: (_, r) => {
        if (!r.canAttempt) return null;
        return (
          <Button
            type="primary"
            size="small"
            icon={<LoginOutlined />}
            onClick={() => startPendingExam(r)}
          >
            {r.inProgressAttemptId ? 'Continuar' : r.attemptsUsed > 0 ? 'Tentar novamente' : 'Iniciar'}
          </Button>
        );
      },
    },
  ];

  const columns = (isTask = false) => [
    {
      title: isTask ? 'Tarefa' : 'Prova',
      key: 'exam',
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{r.exam?.title}</Text>
          {isTask && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              Tentativa {r.exam?.attemptsUsed} de {r.exam?.maxAttempts}
              {r.exam?.remainingAttempts > 0 && (
                <Tag color="blue" style={{ marginLeft: 6 }}>{r.exam.remainingAttempts} restante(s)</Tag>
              )}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: 'Nota', key: 'score',
      render: (_, r) => <Space><Text strong>{r.score?.toFixed(1)}</Text><Text type="secondary">/ {r.maxScore?.toFixed(1)}</Text></Space>,
    },
    {
      title: 'Resultado', key: 'pct',
      render: (_, r) => {
        const pct = Math.round((r.score / r.maxScore) * 100);
        return <Progress percent={pct} size="small" status={pct >= 60 ? 'success' : 'exception'} style={{ width: 120 }} />;
      },
    },
    {
      title: 'Situação', key: 'status',
      render: (_, r) => (r.score / r.maxScore) >= 0.6
        ? <Tag color="success" icon={<CheckCircleOutlined />}>Aprovado</Tag>
        : <Tag color="error" icon={<CloseCircleOutlined />}>Reprovado</Tag>,
    },
    {
      title: '', key: 'action',
      render: (_, r) => (
        <Space>
          <Button size="small" onClick={() => navigate(`/aluno/resultado/${r.id}`)}>Detalhar</Button>
          {isTask && r.exam?.remainingAttempts > 0 && (
            <Button
              size="small"
              type="primary"
              onClick={() => {
                form.setFieldsValue({ code: r.exam.accessCode });
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Tentar novamente
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const pendingCount = pending.filter(p => p.canAttempt).length;

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>Bem-vindo, {user?.name?.split(' ')[0]}!</Title>
        {user?.publicCode && (
          <Card size="small" style={{ background: '#f0f5ff', border: '1px solid #adc6ff' }}>
            <Space direction="vertical" size={0} style={{ textAlign: 'right' }}>
              <Text type="secondary" style={{ fontSize: 11 }}>Seu código público</Text>
              <Space>
                <Text style={{ fontSize: 20, fontWeight: 700, letterSpacing: 3, color: '#1677ff' }}>
                  {user.publicCode}
                </Text>
                <Tooltip title="Copiar código">
                  <Button type="text" size="small" icon={<CopyOutlined />} onClick={copyCode} />
                </Tooltip>
              </Space>
              <Text type="secondary" style={{ fontSize: 11 }}>Passe ao professor para entrar em turmas</Text>
            </Space>
          </Card>
        )}
      </div>

      {/* Minhas Turmas */}
      {myGroups.length > 0 && (
        <Card
          title={<Space><TeamOutlined style={{ color: '#1677ff' }} /><Text strong>Minhas Turmas</Text></Space>}
          style={{ marginBottom: 16 }}
        >
          <List
            dataSource={myGroups}
            rowKey="id"
            renderItem={group => (
              <List.Item
                style={{ cursor: 'pointer', padding: '10px 0' }}
                onClick={() => navigate(`/aluno/turma/${group.id}`)}
                actions={[<RightOutlined key="go" style={{ color: '#1677ff' }} />]}
              >
                <List.Item.Meta
                  avatar={<Avatar icon={<TeamOutlined />} style={{ background: '#1677ff' }} />}
                  title={<Text strong>{group.name}</Text>}
                  description={
                    <Space>
                      <Tag icon={<SlidersFilled />} color="green">{group.aulaCount} aula(s)</Tag>
                      <Tag icon={<BookOutlined />}>{group.examCount} avaliação(ões)</Tag>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Aulas da turma */}
      {aulas.length > 0 && (
        <Card
          title={<Space><SlidersFilled style={{ color: '#52c41a' }} /><Text strong>Aulas da Turma</Text></Space>}
          style={{ marginBottom: 16 }}
        >
          <List
            dataSource={aulas}
            rowKey="id"
            renderItem={(aula, idx) => (
              <List.Item
                actions={[
                  <Button
                    key="open"
                    type="primary"
                    size="small"
                    icon={<PlayCircleOutlined />}
                    onClick={() => navigate(`/aluno/aula/${aula.id}`)}
                  >
                    Assistir
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  avatar={<Avatar style={{ background: '#52c41a', fontWeight: 700 }}>{idx + 1}</Avatar>}
                  title={<Text strong>{aula.title}</Text>}
                  description={
                    <Space>
                      <Tag icon={<TeamOutlined />} color="blue">{aula.groupName}</Tag>
                      {aula.description && <Text type="secondary" style={{ fontSize: 12 }}>{aula.description}</Text>}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}

      {/* Avaliações pendentes da turma */}
      {!pendingLoading && pending.length > 0 && (
        <Badge count={pendingCount} offset={[-8, 8]}>
          <Card
            title={<Space><BellOutlined style={{ color: '#fa8c16' }} /><Text strong>Avaliações da Turma</Text></Space>}
            style={{ marginBottom: 16, borderColor: pendingCount > 0 ? '#fa8c16' : undefined }}
          >
            <Table
              dataSource={pending}
              rowKey="examId"
              columns={pendingColumns}
              size="small"
              pagination={false}
              locale={{ emptyText: <Empty description="Nenhuma avaliação pendente" /> }}
            />
          </Card>
        </Badge>
      )}

      <Card title="Entrar por Código" style={{ marginBottom: 24 }}>
        <Alert
          message="Ao iniciar, a avaliação abrirá em tela cheia. Todas as violações serão registradas e enviadas ao professor."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={form} onFinish={handleEnterExam} layout="inline">
          <Form.Item name="code" rules={[{ required: true, message: 'Informe o código' }]}>
            <Input
              placeholder="Código de acesso (ex: AB3XY7)"
              size="large"
              style={{ width: 240, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}
              maxLength={6}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" icon={<LoginOutlined />} loading={loading}>
            Iniciar
          </Button>
        </Form>
      </Card>

      {provaAttempts.length > 0 && (
        <Card title={<Space><FileTextOutlined /> Histórico de Provas</Space>} style={{ marginBottom: 16 }}>
          <Table
            dataSource={provaAttempts}
            columns={columns(false)}
            rowKey="id"
            locale={{ emptyText: <Empty description="Nenhuma prova realizada ainda" /> }}
            pagination={{ pageSize: 5 }}
          />
        </Card>
      )}

      {tarefaAttempts.length > 0 && (
        <Card title={<Space><BookOutlined /> Histórico de Tarefas</Space>}>
          <Table
            dataSource={tarefaAttempts}
            columns={columns(true)}
            rowKey="id"
            locale={{ emptyText: <Empty description="Nenhuma tarefa realizada ainda" /> }}
            pagination={{ pageSize: 5 }}
          />
        </Card>
      )}

      {attempts.length === 0 && pending.length === 0 && (
        <Card title={<Space><HistoryOutlined /> Histórico</Space>}>
          <Empty description="Nenhuma avaliação realizada ainda" />
        </Card>
      )}
    </>
  );
}
