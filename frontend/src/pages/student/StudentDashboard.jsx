import { useEffect, useState } from 'react';
import { Card, Button, Input, Form, Typography, message, Space, Table, Tag, Progress, Empty, Alert } from 'antd';
import { LoginOutlined, HistoryOutlined, CheckCircleOutlined, CloseCircleOutlined, BookOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const { Title, Text } = Typography;

export default function StudentDashboard() {
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState([]);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/attempts/my').then(res => setAttempts(res.data)).catch(() => {});
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

  const provaAttempts = attempts.filter(a => (a.exam?.type || 'PROVA') === 'PROVA');
  const tarefaAttempts = attempts.filter(a => a.exam?.type === 'TAREFA');

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
              {r.exam?.remainingAttempts > 0 && <Tag color="blue" style={{ marginLeft: 6 }}>{r.exam.remainingAttempts} restante(s)</Tag>}
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

  return (
    <>
      <Title level={3}>Bem-vindo!</Title>

      <Card title="Entrar em uma Avaliação" style={{ marginBottom: 24 }}>
        <Alert
          message="Ao iniciar, a avaliação abrirá em tela cheia. Todas as violações serão registradas e enviadas ao professor."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={form} onFinish={handleEnterExam} layout="inline">
          <Form.Item name="code" rules={[{ required: true, message: 'Informe o código' }]}>
            <Input
              placeholder="Código (ex: AB3XY7)"
              size="large"
              style={{ width: 220, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}
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

      {attempts.length === 0 && (
        <Card title={<Space><HistoryOutlined /> Histórico</Space>}>
          <Empty description="Nenhuma avaliação realizada ainda" />
        </Card>
      )}
    </>
  );
}
