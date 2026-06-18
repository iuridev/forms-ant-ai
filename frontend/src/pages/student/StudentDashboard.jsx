import { useEffect, useState } from 'react';
import { Card, Button, Input, Form, Typography, message, Space, Table, Tag, Progress, Empty, Alert } from 'antd';
import { LoginOutlined, HistoryOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
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
      message.error(err.response?.data?.error || 'Código inválido ou prova não disponível');
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    { title: 'Prova', key: 'exam', render: (_, r) => <Text strong>{r.exam?.title}</Text> },
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
      render: (_, r) => <Button size="small" onClick={() => navigate(`/aluno/resultado/${r.id}`)}>Detalhar</Button>,
    },
  ];

  return (
    <>
      <Title level={3}>Bem-vindo!</Title>

      <Card title="Entrar em uma Prova" style={{ marginBottom: 24 }}>
        <Alert
          message="Atenção: ao iniciar a prova, ela abrirá em tela cheia. Todas as violações (sair da tela cheia, trocar de janela etc.) serão registradas e enviadas ao professor."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={form} onFinish={handleEnterExam} layout="inline">
          <Form.Item name="code" rules={[{ required: true, message: 'Informe o código' }]}>
            <Input
              placeholder="Código da prova (ex: AB3XY7)"
              size="large"
              style={{ width: 220, textTransform: 'uppercase', letterSpacing: 2, fontWeight: 700 }}
              maxLength={6}
            />
          </Form.Item>
          <Button type="primary" htmlType="submit" size="large" icon={<LoginOutlined />} loading={loading}>
            Iniciar Prova
          </Button>
        </Form>
      </Card>

      <Card title={<Space><HistoryOutlined /> Histórico de Provas</Space>}>
        <Table
          dataSource={attempts}
          columns={columns}
          rowKey="id"
          locale={{ emptyText: <Empty description="Nenhuma prova realizada ainda" /> }}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </>
  );
}
