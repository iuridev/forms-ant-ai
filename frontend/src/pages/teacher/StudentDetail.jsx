import { useEffect, useState } from 'react';
import { Card, Typography, Space, Button, Tag, Row, Col, Statistic, Table, Progress, Empty, Tooltip, Alert } from 'antd';
import {
  ArrowLeftOutlined, UserOutlined, TrophyOutlined, WarningOutlined,
  CheckCircleOutlined, CloseCircleOutlined, BookOutlined, FileTextOutlined,
} from '@ant-design/icons';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';

const { Title, Text } = Typography;

const VIOLATION_LABELS = {
  FOCUS_LOSS: 'Perda de foco',
  FULLSCREEN_EXIT: 'Saiu da tela cheia',
  TAB_SWITCH: 'Troca de aba',
  COPY_PASTE: 'Copiar/Colar',
  RIGHT_CLICK: 'Clique direito',
  KEYBOARD_SHORTCUT: 'Atalho de teclado',
};

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function ScoreTag({ pct }) {
  if (pct === null || pct === undefined) return <Tag>—</Tag>;
  return <Tag color={pct >= 60 ? 'success' : 'error'}>{pct}%</Tag>;
}

export default function StudentDetail() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/exams/students/${studentId}`)
      .then(res => setData(res.data))
      .catch(() => navigate('/professor/alunos'))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading || !data) return null;

  const { student, stats, timeline, examPerformance, weakQuestions, violations } = data;

  // Dados para o gráfico de evolução
  const evolutionData = timeline.map((t, i) => ({
    name: fmtDate(t.submittedAt),
    label: `${t.examTitle} (${i + 1})`,
    Prova: t.examType === 'PROVA' ? t.pct : null,
    Tarefa: t.examType === 'TAREFA' ? t.pct : null,
  }));

  // Dados para o gráfico de barras por avaliação
  const barData = examPerformance.map(e => ({
    name: e.examTitle.length > 20 ? e.examTitle.slice(0, 20) + '…' : e.examTitle,
    fullName: e.examTitle,
    nota: e.bestPct,
    type: e.examType,
  }));

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/professor/alunos')} style={{ marginBottom: 16 }}>
        Voltar
      </Button>

      {/* Cabeçalho do aluno */}
      <Card style={{ marginBottom: 16 }}>
        <Space>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: '#1677ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <UserOutlined style={{ fontSize: 28, color: '#fff' }} />
          </div>
          <Space direction="vertical" size={0}>
            <Title level={3} style={{ margin: 0 }}>{student.name}</Title>
            <Text type="secondary">{student.email}</Text>
          </Space>
        </Space>
      </Card>

      {/* Cards de estatísticas */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card>
            <Statistic title="Avaliações" value={stats.totalAttempts} />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title="Média Geral"
              value={stats.avgScore !== null ? `${stats.avgScore}%` : '—'}
              valueStyle={{ color: stats.avgScore >= 60 ? '#52c41a' : stats.avgScore < 60 ? '#ff4d4f' : undefined }}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title="Melhor Nota"
              value={stats.bestScore !== null ? `${stats.bestScore}%` : '—'}
              valueStyle={{ color: '#52c41a' }}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title="Aprovações"
              value={`${stats.approvedCount} / ${stats.totalAttempts}`}
              valueStyle={{ color: stats.approvedCount === stats.totalAttempts ? '#52c41a' : '#fa8c16' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
        </Col>
        <Col span={5}>
          <Card>
            <Statistic
              title="Violações"
              value={stats.totalViolations}
              valueStyle={{ color: stats.totalViolations > 10 ? '#ff4d4f' : '#fa8c16' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        {/* Gráfico de evolução */}
        <Col span={14}>
          <Card title="Evolução das Notas" style={{ height: 320 }}>
            {timeline.length < 2 ? (
              <Empty description="São necessárias pelo menos 2 avaliações para exibir a evolução" style={{ marginTop: 40 }} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={evolutionData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                  <ReferenceLine y={60} stroke="#faad14" strokeDasharray="4 4" label={{ value: 'Mínimo 60%', position: 'right', fontSize: 10, fill: '#faad14' }} />
                  <RTooltip formatter={(v, name) => [`${v}%`, name]} />
                  <Legend />
                  <Line type="monotone" dataKey="Prova" stroke="#1677ff" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                  <Line type="monotone" dataKey="Tarefa" stroke="#52c41a" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        {/* Gráfico por avaliação */}
        <Col span={10}>
          <Card title="Nota por Avaliação" style={{ height: 320 }}>
            {barData.length === 0 ? (
              <Empty style={{ marginTop: 40 }} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                  <ReferenceLine y={60} stroke="#faad14" strokeDasharray="4 4" />
                  <RTooltip
                    formatter={(v, _, props) => [`${v}%`, props.payload.fullName]}
                    labelFormatter={() => ''}
                  />
                  <Bar dataKey="nota" radius={[4, 4, 0, 0]}>
                    {barData.map((entry, i) => (
                      <Cell key={i} fill={entry.nota >= 60 ? '#52c41a' : '#ff4d4f'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        {/* Questões com mais dificuldade */}
        <Col span={14}>
          <Card title="Questões com Mais Dificuldade">
            {weakQuestions.length === 0 ? (
              <Alert type="success" message="Aluno acertou todas as questões!" showIcon />
            ) : (
              <div>
                {weakQuestions.map((q, i) => (
                  <div key={q.questionId} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                      <Space direction="vertical" size={0} style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 13 }}>{q.text.length > 80 ? q.text.slice(0, 80) + '…' : q.text}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {q.examTitle} · {q.timesCorrect}/{q.timesAnswered} acertos
                        </Text>
                      </Space>
                      <Tag color={q.errorRate >= 70 ? 'error' : 'warning'}>{q.errorRate}% erro</Tag>
                    </div>
                    <Progress
                      percent={q.errorRate}
                      size="small"
                      status="exception"
                      showInfo={false}
                    />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>

        {/* Violações */}
        <Col span={10}>
          <Card title="Registro de Violações">
            {Object.keys(violations).length === 0 ? (
              <Alert type="success" message="Nenhuma violação registrada" showIcon />
            ) : (
              <Space direction="vertical" style={{ width: '100%' }}>
                {Object.entries(violations)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => (
                    <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text>{VIOLATION_LABELS[type] || type}</Text>
                      <Tag color={count > 5 ? 'error' : count > 2 ? 'warning' : 'default'}>{count}x</Tag>
                    </div>
                  ))
                }
              </Space>
            )}
          </Card>
        </Col>
      </Row>

      {/* Histórico completo */}
      <Card title="Histórico Completo de Tentativas">
        <Table
          dataSource={[...timeline].reverse()}
          rowKey="attemptId"
          size="small"
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: 'Avaliação', key: 'exam',
              render: (_, r) => (
                <Space>
                  {r.examType === 'TAREFA' ? <BookOutlined style={{ color: '#1677ff' }} /> : <FileTextOutlined />}
                  <Text>{r.examTitle}</Text>
                  <Tag color={r.examType === 'TAREFA' ? 'blue' : 'default'} style={{ fontSize: 11 }}>
                    {r.examType === 'TAREFA' ? 'Tarefa' : 'Prova'}
                  </Tag>
                </Space>
              ),
            },
            {
              title: 'Data', dataIndex: 'submittedAt', key: 'date',
              render: v => new Date(v).toLocaleDateString('pt-BR'),
            },
            {
              title: 'Nota', key: 'score',
              render: (_, r) => (
                <Space>
                  <Text strong>{r.score?.toFixed(1)}</Text>
                  <Text type="secondary">/ {r.maxScore?.toFixed(1)}</Text>
                </Space>
              ),
            },
            {
              title: 'Percentual', key: 'pct',
              render: (_, r) => <ScoreTag pct={r.pct} />,
            },
            {
              title: 'Situação', key: 'result',
              render: (_, r) => r.pct !== null
                ? r.pct >= 60
                  ? <Tag color="success" icon={<CheckCircleOutlined />}>Aprovado</Tag>
                  : <Tag color="error" icon={<CloseCircleOutlined />}>Reprovado</Tag>
                : null,
            },
            {
              title: 'Tempo fora', key: 'focus',
              render: (_, r) => {
                const s = r.totalFocusLostSeconds;
                if (!s) return <Tag color="success">0s</Tag>;
                const min = Math.floor(s / 60), sec = s % 60;
                return <Tag color={s >= 20 ? 'error' : s >= 5 ? 'warning' : 'default'}>{min > 0 ? `${min}m ` : ''}{sec}s</Tag>;
              },
            },
          ]}
        />
      </Card>
    </div>
  );
}
