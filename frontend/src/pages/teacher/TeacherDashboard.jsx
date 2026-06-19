import { useEffect, useState } from 'react';
import { Card, Button, Table, Tag, Space, Typography, Statistic, Row, Col, Popconfirm, message, Empty, Badge, Tabs } from 'antd';
import { PlusOutlined, EyeOutlined, BarChartOutlined, DeleteOutlined, CopyOutlined, FileTextOutlined, BookOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const { Title, Text } = Typography;

const STATUS_CONFIG = {
  DRAFT:  { color: 'default', label: 'Rascunho' },
  ACTIVE: { color: 'success', label: 'Ativa' },
  CLOSED: { color: 'error',   label: 'Encerrada' },
};

export default function TeacherDashboard() {
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

  function copyCode(code) {
    navigator.clipboard.writeText(code);
    message.success('Código copiado!');
  }

  const provas = exams.filter(e => (e.type || 'PROVA') === 'PROVA');
  const tarefas = exams.filter(e => e.type === 'TAREFA');
  const filtered = tab === 'PROVA' ? provas : tarefas;

  const activeProvas = provas.filter(e => e.status === 'ACTIVE').length;
  const activeTarefas = tarefas.filter(e => e.status === 'ACTIVE').length;
  const totalAttempts = exams.reduce((acc, e) => acc + (e._count?.attempts || 0), 0);

  const columns = [
    {
      title: tab === 'TAREFA' ? 'Tarefa' : 'Prova',
      dataIndex: 'title', key: 'title',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Space>
            <Tag>{record.durationMinutes} min</Tag>
            {record.type === 'TAREFA' && <Tag color="blue">3 tentativas</Tag>}
            <Text type="secondary" style={{ fontSize: 12 }}>{record._count?.questions || 0} questões</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Código', dataIndex: 'accessCode', key: 'accessCode',
      render: (code) => (
        <Space>
          <Text code style={{ fontSize: 16, letterSpacing: 2 }}>{code}</Text>
          <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copyCode(code)} />
        </Space>
      ),
    },
    {
      title: 'Status', dataIndex: 'status', key: 'status',
      render: (status) => <Tag color={STATUS_CONFIG[status]?.color}>{STATUS_CONFIG[status]?.label}</Tag>,
    },
    {
      title: 'Tentativas', key: 'attempts',
      render: (_, record) => <Badge count={record._count?.attempts || 0} showZero style={{ backgroundColor: '#1677ff' }} />,
    },
    {
      title: 'Ações', key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/professor/prova/${record.id}`)}>Ver</Button>
          <Button size="small" icon={<BarChartOutlined />} onClick={() => navigate(`/professor/prova/${record.id}/resultados`)}>
            {record.type === 'TAREFA' ? 'Resultados' : 'Notas'}
          </Button>
          <Popconfirm title="Excluir?" onConfirm={() => deleteExam(record.id)} okText="Sim" cancelText="Não">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Minhas Avaliações</Title>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => navigate('/professor/nova-prova')}>
          Nova Avaliação
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card><Statistic title="Provas" value={provas.length} prefix={<FileTextOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="Tarefas" value={tarefas.length} prefix={<BookOutlined />} /></Card></Col>
        <Col span={6}><Card><Statistic title="Ativas" value={activeProvas + activeTarefas} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Tentativas" value={totalAttempts} /></Card></Col>
      </Row>

      <Card>
        <Tabs
          activeKey={tab}
          onChange={setTab}
          items={[
            { key: 'PROVA', label: <Space><FileTextOutlined />Provas ({provas.length})</Space> },
            { key: 'TAREFA', label: <Space><BookOutlined />Tarefas ({tarefas.length})</Space> },
          ]}
        />
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: <Empty description={tab === 'TAREFA' ? 'Nenhuma tarefa criada ainda' : 'Nenhuma prova criada ainda'} /> }}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </>
  );
}
