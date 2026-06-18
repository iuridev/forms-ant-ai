import { useEffect, useState } from 'react';
import { Card, Table, Tag, Typography, Space, Button, Progress, Statistic, Row, Col, Tooltip, Alert } from 'antd';
import { ArrowLeftOutlined, WarningOutlined, CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';

const { Title, Text } = Typography;

const VIOLATION_LABELS = {
  FOCUS_LOSS:        'Perda de foco',
  FULLSCREEN_EXIT:   'Saiu da tela cheia',
  TAB_SWITCH:        'Troca de aba',
  COPY_PASTE:        'Copiar/Colar',
  RIGHT_CLICK:       'Clique direito',
  KEYBOARD_SHORTCUT: 'Atalho de teclado',
};

function formatSeconds(s) {
  if (!s || s < 1) return '0s';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  if (m === 0) return `${sec}s`;
  return `${m}m ${sec}s`;
}

function focusLostColor(seconds) {
  if (seconds >= 60) return 'red';
  if (seconds >= 20) return 'orange';
  return 'default';
}

export default function ExamResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [examTitle, setExamTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/exams/${id}/results`),
      api.get(`/exams/${id}`),
    ]).then(([res, examRes]) => {
      setAttempts(res.data);
      setExamTitle(examRes.data.title);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  const submitted = attempts.filter(a => a.status === 'SUBMITTED');
  const avg = submitted.length ? submitted.reduce((acc, a) => acc + (a.score / a.maxScore * 100), 0) / submitted.length : 0;
  const passing = submitted.filter(a => (a.score / a.maxScore) >= 0.6).length;
  const suspicious = submitted.filter(a => (a.totalFocusLostSeconds || 0) >= 20 || (a.violations?.length || 0) > 5).length;

  const columns = [
    {
      title: 'Aluno', key: 'student',
      render: (_, r) => <Text strong>{r.student?.name || '—'}</Text>,
    },
    {
      title: 'Nota', key: 'score',
      render: (_, r) => r.status === 'SUBMITTED'
        ? <Space><Text strong style={{ fontSize: 18 }}>{Number(r.score)?.toFixed(1)}</Text><Text type="secondary">/ {Number(r.maxScore)?.toFixed(1)}</Text></Space>
        : <Tag color="processing">Em andamento</Tag>,
    },
    {
      title: '%', key: 'pct',
      render: (_, r) => r.status === 'SUBMITTED'
        ? <Progress percent={Math.round((r.score / r.maxScore) * 100)} size="small" status={r.score / r.maxScore >= 0.6 ? 'success' : 'exception'} style={{ width: 120 }} />
        : null,
    },
    {
      title: 'Tempo fora da prova',
      key: 'focusLost',
      render: (_, r) => {
        const s = r.totalFocusLostSeconds || 0;
        const color = focusLostColor(s);
        return (
          <Tooltip title={s >= 20 ? 'Alto tempo fora da prova — suspeito' : s >= 5 ? 'Algum tempo fora' : 'Normal'}>
            <Tag color={color} icon={<ClockCircleOutlined />}>
              {formatSeconds(s)}
            </Tag>
          </Tooltip>
        );
      },
      sorter: (a, b) => (a.totalFocusLostSeconds || 0) - (b.totalFocusLostSeconds || 0),
    },
    {
      title: 'Violações',
      key: 'violations',
      render: (_, r) => {
        const count = r.violations?.length || 0;
        if (count === 0) return <Tag color="success">Nenhuma</Tag>;
        const summary = r.violations.reduce((acc, v) => {
          const label = VIOLATION_LABELS[v.type] || v.type;
          acc[label] = (acc[label] || 0) + 1;
          return acc;
        }, {});
        const tip = Object.entries(summary).map(([k, v]) => `${k}: ${v}x`).join(' | ');
        return (
          <Tooltip title={tip}>
            <Tag color={count > 5 ? 'error' : 'warning'} icon={<WarningOutlined />}>{count} evento(s)</Tag>
          </Tooltip>
        );
      },
      sorter: (a, b) => (a.violations?.length || 0) - (b.violations?.length || 0),
    },
    {
      title: 'Situação', key: 'status',
      render: (_, r) => {
        if (r.status !== 'SUBMITTED') return <Tag>Em andamento</Tag>;
        return r.score / r.maxScore >= 0.6
          ? <Tag color="success" icon={<CheckCircleOutlined />}>Aprovado</Tag>
          : <Tag color="error" icon={<CloseCircleOutlined />}>Reprovado</Tag>;
      },
    },
  ];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/professor/prova/${id}`)}>Voltar</Button>
        <Title level={3} style={{ margin: 0 }}>Resultados — {examTitle}</Title>
      </div>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}><Card><Statistic title="Alunos que fizeram" value={submitted.length} /></Card></Col>
        <Col span={6}><Card><Statistic title="Média da turma" value={avg.toFixed(1)} suffix="%" /></Card></Col>
        <Col span={6}><Card><Statistic title="Aprovados (≥60%)" value={passing} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col span={6}><Card><Statistic title="Com suspeita de cola" value={suspicious} valueStyle={{ color: suspicious > 0 ? '#ff4d4f' : undefined }} /></Card></Col>
      </Row>

      {suspicious > 0 && (
        <Alert
          message={`${suspicious} aluno(s) com tempo excessivo fora da prova ou muitas violações.`}
          description="Alunos com mais de 20 segundos fora da tela ou mais de 5 violações são sinalizados. Expanda a linha para ver o detalhamento."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card>
        <Table
          dataSource={attempts}
          columns={columns}
          rowKey="id"
          loading={loading}
          rowClassName={r => (r.totalFocusLostSeconds || 0) >= 20 || (r.violations?.length || 0) > 5 ? 'row-suspicious' : ''}
          expandable={{
            expandedRowRender: (record) => (
              <div style={{ padding: '8px 0 8px 32px' }}>
                {/* Resumo de tempo fora */}
                {(record.totalFocusLostSeconds || 0) > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <Tag icon={<ClockCircleOutlined />} color={focusLostColor(record.totalFocusLostSeconds)}>
                      Total fora da prova: <strong>{formatSeconds(record.totalFocusLostSeconds)}</strong>
                    </Tag>
                  </div>
                )}

                {/* Linha do tempo de violações */}
                {record.violations?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <Text strong type="warning"><WarningOutlined /> Linha do tempo de violações:</Text>
                    <div style={{ marginTop: 6 }}>
                      {record.violations.map((v, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <Tag color="warning" style={{ minWidth: 140 }}>{VIOLATION_LABELS[v.type] || v.type}</Tag>
                          <Text type="secondary" style={{ fontSize: 12 }}>{new Date(v.timestamp).toLocaleTimeString()}</Text>
                          {v.durationSeconds > 0 && (
                            <Tag color={focusLostColor(v.durationSeconds)}>{formatSeconds(v.durationSeconds)} fora</Tag>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Respostas */}
                <Text strong>Respostas:</Text>
                <div style={{ marginTop: 8 }}>
                  {record.answers?.map((a, i) => (
                    <div key={i} style={{ marginBottom: 4, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      {a.isCorrect
                        ? <CheckCircleOutlined style={{ color: '#52c41a', marginTop: 3 }} />
                        : <CloseCircleOutlined style={{ color: '#ff4d4f', marginTop: 3 }} />}
                      <div>
                        <Text>{a.question?.text}</Text>
                        <br />
                        <Text type="secondary">Resposta: </Text>
                        <Text strong>{a.selectedOption?.text || a.textAnswer || '(sem resposta)'}</Text>
                        <Tag color={a.isCorrect ? 'success' : 'error'} style={{ marginLeft: 8 }}>{a.pointsEarned} pts</Tag>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ),
          }}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <style>{`.row-suspicious td { background: #fffbe6 !important; }`}</style>
    </>
  );
}
