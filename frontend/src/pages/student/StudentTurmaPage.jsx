import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Tabs, Typography, Space, Tag, Button, Table, Empty, Spin,
  List, Avatar, Progress, Result, Statistic, Row, Col,
} from 'antd';
import {
  ArrowLeftOutlined, PlayCircleOutlined, FileTextOutlined,
  BookOutlined, LineChartOutlined, CheckCircleOutlined,
  CloseCircleOutlined, SlidersFilled, TeamOutlined,
} from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../../api';

const { Title, Text } = Typography;

function toEmbedUrl(url) {
  if (!url) return '';
  try {
    const match = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return url;
    return `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false&delayms=3000`;
  } catch {
    return url;
  }
}

export default function StudentTurmaPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aulaPreview, setAulaPreview] = useState(null);

  useEffect(() => {
    api.get(`/groups/${id}/my-progress`)
      .then(res => setData(res.data))
      .catch(() => navigate('/aluno'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spin size="large" style={{ display: 'block', marginTop: 80, textAlign: 'center' }} />;
  if (!data) return null;

  const { group, aulas, exams } = data;

  const gradedExams = exams.filter(e => e.attemptsCount > 0);
  const avgPct = gradedExams.length > 0
    ? Math.round(gradedExams.reduce((sum, e) => sum + (e.bestScore / e.bestMaxScore) * 100, 0) / gradedExams.length)
    : null;

  const chartData = gradedExams.map(e => ({
    name: e.title.length > 14 ? e.title.slice(0, 14) + '…' : e.title,
    pct: Math.round((e.bestScore / e.bestMaxScore) * 100),
  }));

  const examColumns = [
    {
      title: 'Avaliação', key: 'title',
      render: (_, e) => (
        <Space>
          {e.type === 'TAREFA' ? <BookOutlined style={{ color: '#1677ff' }} /> : <FileTextOutlined />}
          <Text strong>{e.title}</Text>
          <Tag color={e.type === 'TAREFA' ? 'blue' : 'default'} style={{ fontSize: 11 }}>
            {e.type === 'TAREFA' ? 'Tarefa' : 'Prova'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Melhor nota', key: 'score',
      render: (_, e) => e.bestScore !== null
        ? <Space><Text strong>{e.bestScore.toFixed(1)}</Text><Text type="secondary">/ {e.bestMaxScore.toFixed(1)}</Text></Space>
        : <Tag color="default">Não realizada</Tag>,
    },
    {
      title: 'Resultado', key: 'pct',
      render: (_, e) => {
        if (e.bestScore === null) return '—';
        const pct = Math.round((e.bestScore / e.bestMaxScore) * 100);
        return <Progress percent={pct} size="small" status={pct >= 60 ? 'success' : 'exception'} style={{ width: 120 }} />;
      },
    },
    {
      title: 'Situação', key: 'status',
      render: (_, e) => {
        if (e.bestScore === null) return <Tag color="default">Pendente</Tag>;
        const pct = (e.bestScore / e.bestMaxScore) * 100;
        return pct >= 60
          ? <Tag color="success" icon={<CheckCircleOutlined />}>Aprovado</Tag>
          : <Tag color="error" icon={<CloseCircleOutlined />}>Reprovado</Tag>;
      },
    },
    {
      title: '', key: 'action',
      render: (_, e) => e.latestAttemptId
        ? <Button size="small" onClick={() => navigate(`/aluno/resultado/${e.latestAttemptId}`)}>Ver resultado</Button>
        : null,
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/aluno')} />
        <div>
          <Title level={4} style={{ margin: 0 }}>{group.name}</Title>
          <Text type="secondary">
            <TeamOutlined style={{ marginRight: 4 }} />
            {aulas.length} aula(s) · {exams.length} avaliação(ões)
          </Text>
        </div>
      </div>

      <Tabs
        items={[
          {
            key: 'aulas',
            label: <Space><SlidersFilled />Aulas ({aulas.length})</Space>,
            children: aulas.length === 0 ? (
              <Empty description="Nenhuma aula disponível nesta turma ainda" />
            ) : (
              <List
                dataSource={aulas}
                rowKey="id"
                renderItem={(aula, idx) => (
                  <List.Item
                    actions={[
                      <Button
                        key="preview"
                        size="small"
                        icon={<PlayCircleOutlined />}
                        onClick={() => setAulaPreview(aula)}
                      >
                        Prévia
                      </Button>,
                      <Button
                        key="open"
                        type="primary"
                        size="small"
                        icon={<PlayCircleOutlined />}
                        onClick={() => navigate(`/aluno/aula/${aula.id}`)}
                      >
                        Abrir
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar style={{ background: '#52c41a', fontWeight: 700 }}>{idx + 1}</Avatar>}
                      title={<Text strong>{aula.title}</Text>}
                      description={aula.description || <Text type="secondary" style={{ fontSize: 12 }}>Sem descrição</Text>}
                    />
                  </List.Item>
                )}
              />
            ),
          },
          {
            key: 'notas',
            label: <Space><FileTextOutlined />Notas ({exams.length})</Space>,
            children: exams.length === 0 ? (
              <Empty description="Nenhuma avaliação vinculada a esta turma" />
            ) : (
              <>
                {avgPct !== null && (
                  <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col xs={12} sm={8}>
                      <Card size="small">
                        <Statistic
                          title="Média geral"
                          value={avgPct}
                          suffix="%"
                          valueStyle={{ color: avgPct >= 60 ? '#52c41a' : '#ff4d4f' }}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={8}>
                      <Card size="small">
                        <Statistic
                          title="Avaliações realizadas"
                          value={gradedExams.length}
                          suffix={`/ ${exams.length}`}
                        />
                      </Card>
                    </Col>
                    <Col xs={12} sm={8}>
                      <Card size="small">
                        <Statistic
                          title="Aprovações"
                          value={gradedExams.filter(e => (e.bestScore / e.bestMaxScore) >= 0.6).length}
                          suffix={`/ ${gradedExams.length}`}
                          valueStyle={{ color: '#52c41a' }}
                        />
                      </Card>
                    </Col>
                  </Row>
                )}
                <Table
                  dataSource={exams}
                  rowKey="examId"
                  columns={examColumns}
                  size="small"
                  pagination={false}
                  locale={{ emptyText: <Empty description="Nenhuma avaliação" /> }}
                />
              </>
            ),
          },
          {
            key: 'evolucao',
            label: <Space><LineChartOutlined />Evolução</Space>,
            children: gradedExams.length === 0 ? (
              <Empty description="Realize avaliações para ver sua evolução" />
            ) : (
              <Card title="Desempenho por avaliação (melhor tentativa)">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-35} textAnchor="end" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={v => [`${v}%`, 'Aproveitamento']} />
                    <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.pct >= 60 ? '#52c41a' : '#ff4d4f'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{ marginTop: 16 }}>
                  {exams.filter(e => e.attemptsCount > 0 && e.attempts.length > 1).map(e => (
                    <Card key={e.examId} size="small" style={{ marginBottom: 8 }} title={e.title}>
                      <Text type="secondary" style={{ fontSize: 12 }}>Tentativas: </Text>
                      <Space wrap>
                        {e.attempts.map((a, i) => {
                          const pct = Math.round((a.score / a.maxScore) * 100);
                          return (
                            <Tag
                              key={a.id}
                              color={pct >= 60 ? 'success' : 'error'}
                              style={{ cursor: 'pointer' }}
                              onClick={() => navigate(`/aluno/resultado/${a.id}`)}
                            >
                              #{e.attempts.length - i} — {pct}%
                            </Tag>
                          );
                        })}
                      </Space>
                    </Card>
                  ))}
                </div>
              </Card>
            ),
          },
        ]}
      />

      {/* Modal prévia */}
      {aulaPreview && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setAulaPreview(null)}
        >
          <div
            style={{ width: '80vw', maxWidth: 860, background: '#fff', borderRadius: 8, overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
              <Text strong>{aulaPreview.title}</Text>
              <Button size="small" onClick={() => setAulaPreview(null)}>Fechar</Button>
            </div>
            <iframe
              src={toEmbedUrl(aulaPreview.slideUrl)}
              width="100%" height="460"
              frameBorder="0" allowFullScreen
              title={aulaPreview.title}
              style={{ display: 'block' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
