import { useEffect, useState } from 'react';
import { Card, Button, Table, Tag, Space, Typography, Statistic, Row, Col, Popconfirm, message, Empty, Badge } from 'antd';
import { PlusOutlined, EyeOutlined, BarChartOutlined, DeleteOutlined, EditOutlined, CopyOutlined } from '@ant-design/icons';
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
  const navigate = useNavigate();

  async function fetchExams() {
    try {
      const res = await api.get('/exams');
      setExams(res.data);
    } catch { message.error('Erro ao carregar provas'); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchExams(); }, []);

  async function deleteExam(id) {
    try {
      await api.delete(`/exams/${id}`);
      message.success('Prova excluída');
      setExams(prev => prev.filter(e => e.id !== id));
    } catch { message.error('Erro ao excluir'); }
  }

  function copyCode(code) {
    navigator.clipboard.writeText(code);
    message.success('Código copiado!');
  }

  const total = exams.length;
  const active = exams.filter(e => e.status === 'ACTIVE').length;
  const totalAttempts = exams.reduce((acc, e) => acc + (e._count?.attempts || 0), 0);

  const columns = [
    {
      title: 'Prova', dataIndex: 'title', key: 'title',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Space>
            <Tag>{record.durationMinutes} min</Tag>
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
          <Button size="small" icon={<BarChartOutlined />} onClick={() => navigate(`/professor/prova/${record.id}/resultados`)}>Notas</Button>
          <Popconfirm title="Excluir esta prova?" onConfirm={() => deleteExam(record.id)} okText="Sim" cancelText="Não">
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Minhas Provas</Title>
        <Button type="primary" icon={<PlusOutlined />} size="large" onClick={() => navigate('/professor/nova-prova')}>
          Nova Prova
        </Button>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}><Card><Statistic title="Total de Provas" value={total} /></Card></Col>
        <Col span={8}><Card><Statistic title="Provas Ativas" value={active} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={8}><Card><Statistic title="Tentativas Totais" value={totalAttempts} /></Card></Col>
      </Row>

      <Card>
        <Table
          dataSource={exams}
          columns={columns}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: <Empty description="Nenhuma prova criada ainda" /> }}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </>
  );
}
