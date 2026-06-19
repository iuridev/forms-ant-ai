import { useEffect, useState } from 'react';
import { Card, Table, Typography, Space, Button, Tag, Input, Empty, Avatar, Progress } from 'antd';
import { UserOutlined, SearchOutlined, LineChartOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../../api';

const { Title, Text } = Typography;

function scoreColor(avg) {
  if (avg === null) return 'default';
  if (avg >= 70) return 'success';
  if (avg >= 50) return 'warning';
  return 'error';
}

export default function StudentProgress() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/exams/students')
      .then(res => setStudents(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: 'Aluno', key: 'name',
      render: (_, r) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ background: '#1677ff' }} />
          <Space direction="vertical" size={0}>
            <Text strong>{r.name}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Avaliações', dataIndex: 'totalAttempts', key: 'totalAttempts',
      render: v => <Tag>{v}</Tag>,
      align: 'center',
    },
    {
      title: 'Aprovações', key: 'approved',
      align: 'center',
      render: (_, r) => (
        <Text>{r.approvedCount} / {r.totalAttempts}</Text>
      ),
    },
    {
      title: 'Média Geral', key: 'avg',
      align: 'center',
      render: (_, r) => r.avgScore !== null ? (
        <Space direction="vertical" size={2} style={{ width: 100 }}>
          <Progress
            percent={r.avgScore}
            size="small"
            status={r.avgScore >= 60 ? 'success' : 'exception'}
            format={p => `${p}%`}
          />
        </Space>
      ) : <Text type="secondary">—</Text>,
    },
    {
      title: 'Última Atividade', key: 'last',
      render: (_, r) => r.lastActivity
        ? <Text type="secondary">{new Date(r.lastActivity).toLocaleDateString('pt-BR')}</Text>
        : <Text type="secondary">—</Text>,
    },
    {
      title: '', key: 'action',
      render: (_, r) => (
        <Button
          type="primary"
          size="small"
          icon={<LineChartOutlined />}
          onClick={() => navigate(`/professor/alunos/${r.id}`)}
        >
          Ver desenvolvimento
        </Button>
      ),
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0 }}>Desenvolvimento dos Alunos</Title>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Buscar aluno..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: 240 }}
        />
      </div>

      <Card>
        <Table
          dataSource={filtered}
          columns={columns}
          rowKey="id"
          loading={loading}
          locale={{ emptyText: <Empty description="Nenhum aluno realizou suas avaliações ainda" /> }}
          pagination={{ pageSize: 15 }}
        />
      </Card>
    </>
  );
}
