import { useEffect, useState } from 'react';
import {
  Card, Table, Tag, Typography, Space, Button, Progress, Statistic,
  Row, Col, Tooltip, Alert, InputNumber, message,
} from 'antd';
import {
  ArrowLeftOutlined, WarningOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ClockCircleOutlined, DownloadOutlined,
  EditOutlined, SaveOutlined,
} from '@ant-design/icons';
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

function EssayGrader({ answer, examId, onSaved }) {
  const [pts, setPts] = useState(Number(answer.pointsEarned) || 0);
  const [saving, setSaving] = useState(false);
  const maxPts = Number(answer.question?.points) || 0;

  async function save() {
    setSaving(true);
    try {
      await api.put(`/exams/${examId}/answers/${answer.id}/grade-essay`, { pointsEarned: pts });
      message.success('Nota salva!');
      onSaved();
    } catch {
      message.error('Erro ao salvar nota');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <Tag color="orange" icon={<EditOutlined />}>Dissertativa — correção manual</Tag>
      <InputNumber
        min={0}
        max={maxPts}
        step={0.5}
        value={pts}
        onChange={v => setPts(v ?? 0)}
        size="small"
        style={{ width: 80 }}
        addonAfter={`/ ${maxPts}`}
      />
      <Button
        size="small"
        type="primary"
        icon={<SaveOutlined />}
        loading={saving}
        onClick={save}
      >
        Salvar
      </Button>
    </div>
  );
}

export default function ExamResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState([]);
  const [examTitle, setExamTitle] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const [res, examRes] = await Promise.all([
        api.get(`/exams/${id}/results`),
        api.get(`/exams/${id}`),
      ]);
      setAttempts(res.data);
      setExamTitle(examRes.data.title);
    } catch {} finally { setLoading(false); }
  }

  useEffect(() => { loadData(); }, [id]);

  const submitted = attempts.filter(a => a.status === 'SUBMITTED');
  const avg = submitted.length
    ? submitted.reduce((acc, a) => acc + (a.score / a.maxScore * 100), 0) / submitted.length
    : 0;
  const passing = submitted.filter(a => (a.score / a.maxScore) >= 0.6).length;
  const suspicious = submitted.filter(a => (a.totalFocusLostSeconds || 0) >= 20 || (a.violations?.length || 0) > 5).length;

  function exportCSV() {
    const headers = ['Aluno', 'Email', 'Nota', 'Máximo', '%', 'Situação', 'Tempo fora (s)', 'Violações', 'Entregue em'];
    const rows = submitted.map(a => [
      a.student?.name || '',
      a.student?.email || '',
      (a.score ?? 0).toFixed(1),
      (a.maxScore ?? 0).toFixed(1),
      a.maxScore > 0 ? ((a.score / a.maxScore) * 100).toFixed(1) : '0',
      a.score / a.maxScore >= 0.6 ? 'Aprovado' : 'Reprovado',
      a.totalFocusLostSeconds || 0,
      a.violations?.length || 0,
      a.submittedAt ? new Date(a.submittedAt).toLocaleString('pt-BR') : '',
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resultados-${examTitle}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns = [
    {
      title: 'Aluno', key: 'student',
      render: (_, r) => <Text strong>{r.student?.name || '—'}</Text>,
    },
    {
      title: 'Nota', key: 'score',
      render: (_, r) => {
        if (r.status !== 'SUBMITTED') return <Tag color="processing">Em andamento</Tag>;
        const hasEssay = r.answers?.some(a => a.question?.type === 'ESSAY' && !a.pointsEarned);
        return (
          <Space>
            <Text strong style={{ fontSize: 18 }}>{Number(r.score)?.toFixed(1)}</Text>
            <Text type="secondary">/ {Number(r.maxScore)?.toFixed(1)}</Text>
            {hasEssay && <Tag color="orange">Dissertativa pendente</Tag>}
          </Space>
        );
      },
    },
    {
      title: '%', key: 'pct',
      render: (_, r) => r.status === 'SUBMITTED'
        ? <Progress percent={Math.round((r.score / r.maxScore) * 100)} size="small" status={r.score / r.maxScore >= 0.6 ? 'success' : 'exception'} style={{ width: 120 }} />
        : null,
    },
    {
      title: 'Tempo fora',
      key: 'focusLost',
      render: (_, r) => {
        const s = r.totalFocusLostSeconds || 0;
        return (
          <Tooltip title={s >= 20 ? 'Alto tempo fora — suspeito' : s >= 5 ? 'Algum tempo fora' : 'Normal'}>
            <Tag color={focusLostColor(s)} icon={<ClockCircleOutlined />}>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/professor/prova/${id}`)}>Voltar</Button>
          <Title level={3} style={{ margin: 0 }}>Resultados — {examTitle}</Title>
        </Space>
        <Button icon={<DownloadOutlined />} onClick={exportCSV} disabled={submitted.length === 0}>
          Exportar CSV
        </Button>
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
          description="Alunos com mais de 20 segundos fora da tela ou mais de 5 violações são sinalizados."
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
                {(record.totalFocusLostSeconds || 0) > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <Tag icon={<ClockCircleOutlined />} color={focusLostColor(record.totalFocusLostSeconds)}>
                      Total fora da prova: <strong>{formatSeconds(record.totalFocusLostSeconds)}</strong>
                    </Tag>
                  </div>
                )}

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

                <Text strong>Respostas:</Text>
                <div style={{ marginTop: 8 }}>
                  {record.answers?.map((a, i) => {
                    const isEssay = a.question?.type === 'ESSAY';
                    return (
                      <div key={i} style={{ marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        {isEssay
                          ? <EditOutlined style={{ color: '#fa8c16', marginTop: 3 }} />
                          : a.isCorrect
                            ? <CheckCircleOutlined style={{ color: '#52c41a', marginTop: 3 }} />
                            : <CloseCircleOutlined style={{ color: '#ff4d4f', marginTop: 3 }} />
                        }
                        <div style={{ flex: 1 }}>
                          <Text>{a.question?.text}</Text>
                          <br />
                          <Text type="secondary">Resposta: </Text>
                          <Text strong>{a.selectedOption?.text || a.textAnswer || '(sem resposta)'}</Text>
                          {!isEssay && (
                            <Tag color={a.isCorrect ? 'success' : 'error'} style={{ marginLeft: 8 }}>
                              {a.pointsEarned} pts
                            </Tag>
                          )}
                          {isEssay && (
                            <EssayGrader answer={a} examId={id} onSaved={loadData} />
                          )}
                        </div>
                      </div>
                    );
                  })}
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
