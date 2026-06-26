import { useEffect, useState } from 'react';
import {
  Card, Button, Checkbox, Typography, Space, Tag, Radio, Input, Progress,
  Spin, Alert, Row, Col, Statistic,
} from 'antd';
import {
  RocketOutlined, CheckCircleOutlined, CloseCircleOutlined,
  BookOutlined, ArrowLeftOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
} from 'recharts';
import api from '../../api';

const { Title, Text } = Typography;

const TYPE_LABELS = { MULTIPLE_CHOICE: 'Múltipla Escolha', TRUE_FALSE: 'V ou F', FILL_BLANK: 'Preencher' };

// ─── Tela 1: Seleção de disciplinas (multi) ────────────────────────────────
function SetupScreen({ onStart }) {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [count, setCount] = useState(10);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/simulados/tags').then(r => setTags(r.data)).finally(() => setLoading(false));
  }, []);

  function toggleDisc(name) {
    setSelected(prev =>
      prev.includes(name) ? prev.filter(d => d !== name) : [...prev, name]
    );
  }

  const totalAvailable = tags
    .filter(t => selected.includes(t.tag))
    .reduce((acc, t) => acc + t.questionCount, 0);

  async function handleStart() {
    if (selected.length === 0) return;
    setStarting(true); setError('');
    try {
      const res = await api.post('/simulados/start', { disciplines: selected, count });
      onStart(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao iniciar simulado');
      setStarting(false);
    }
  }

  if (loading) return <div style={{ textAlign: 'center', paddingTop: 80 }}><Spin size="large" /></div>;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: '24px 0' }}>
      {/* Hero */}
      <div style={{
        background: 'linear-gradient(135deg, #0d2137 0%, #1a3a6b 60%, #1e4d8c 100%)',
        borderRadius: 16, padding: '36px 40px', marginBottom: 28, color: '#fff', textAlign: 'center',
      }}>
        <ThunderboltOutlined style={{ fontSize: 48, color: '#4f9cf9', marginBottom: 12 }} />
        <Title level={2} style={{ color: '#fff', margin: 0 }}>Simulados</Title>
        <p style={{ color: 'rgba(255,255,255,0.75)', marginTop: 8, marginBottom: 0 }}>
          Pratique com questões do banco e veja seu desempenho por disciplina
        </p>
      </div>

      <Card style={{ borderRadius: 12, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <Title level={4} style={{ marginTop: 0 }}>Configurar Simulado</Title>

        {/* Disciplinas */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text strong>Selecione as disciplinas</Text>
            {selected.length > 0 && (
              <Button size="small" type="link" onClick={() => setSelected([])}>Limpar seleção</Button>
            )}
          </div>

          {tags.length === 0 ? (
            <Alert
              type="warning"
              message="Nenhuma disciplina disponível. Peça ao professor para cadastrar disciplinas no Banco de Questões."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tags.map(t => {
                const isSelected = selected.includes(t.tag);
                const hasQuestions = t.questionCount >= 1;
                return (
                  <div
                    key={t.tag}
                    onClick={() => hasQuestions && toggleDisc(t.tag)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '14px 18px', borderRadius: 10,
                      cursor: hasQuestions ? 'pointer' : 'not-allowed',
                      border: `2px solid ${isSelected ? '#1677ff' : '#e8e8e8'}`,
                      background: isSelected ? '#e6f4ff' : hasQuestions ? '#fafafa' : '#f5f5f5',
                      transition: 'all 0.15s',
                      opacity: hasQuestions ? 1 : 0.5,
                    }}
                  >
                    <Space>
                      <Checkbox
                        checked={isSelected}
                        disabled={!hasQuestions}
                        onChange={() => hasQuestions && toggleDisc(t.tag)}
                        onClick={e => e.stopPropagation()}
                      />
                      <BookOutlined style={{ color: isSelected ? '#1677ff' : '#999' }} />
                      <Text strong style={{ color: isSelected ? '#1677ff' : '#333' }}>{t.tag}</Text>
                    </Space>
                    <Tag color={t.questionCount >= 3 ? 'blue' : 'warning'}>
                      {t.questionCount} questão{t.questionCount !== 1 ? 'ões' : ''}
                    </Tag>
                  </div>
                );
              })}
            </div>
          )}

          {selected.length > 0 && (
            <div style={{ marginTop: 10, padding: '8px 14px', background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae0ff' }}>
              <Text style={{ color: '#1677ff', fontSize: 13 }}>
                <ThunderboltOutlined style={{ marginRight: 6 }} />
                {selected.length} disciplina{selected.length > 1 ? 's' : ''} selecionada{selected.length > 1 ? 's' : ''} · {totalAvailable} questões disponíveis
              </Text>
            </div>
          )}
        </div>

        {/* Número de questões */}
        <div style={{ marginBottom: 24 }}>
          <Text strong>Número de questões</Text>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {[5, 10, 15, 20].map(n => (
              <Button
                key={n}
                type={count === n ? 'primary' : 'default'}
                onClick={() => setCount(n)}
                style={{ flex: 1 }}
                disabled={selected.length > 0 && totalAvailable > 0 && n > totalAvailable}
              >
                {n}
              </Button>
            ))}
          </div>
          {totalAvailable > 0 && totalAvailable < count && (
            <Text type="secondary" style={{ fontSize: 12, marginTop: 6, display: 'block' }}>
              O simulado usará todas as {totalAvailable} questões disponíveis.
            </Text>
          )}
        </div>

        {error && <Alert type="error" message={error} style={{ marginBottom: 16 }} showIcon />}

        <Button
          type="primary" size="large" block
          icon={<RocketOutlined />}
          onClick={handleStart}
          loading={starting}
          disabled={selected.length === 0 || totalAvailable < 3}
          style={{ borderRadius: 8, height: 48, fontSize: 16 }}
        >
          {selected.length === 0
            ? 'Selecione ao menos uma disciplina'
            : totalAvailable < 3
              ? 'Questões insuficientes (mínimo 3)'
              : `Iniciar Simulado`
          }
        </Button>
      </Card>
    </div>
  );
}

// ─── Tela 2: Responder questões ─────────────────────────────────────────────
function TakingScreen({ simuladoId, questions, onSubmit }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const q = questions[current];
  const total = questions.length;
  const answered = Object.keys(answers).length;

  function setAnswer(bankQuestionId, value) {
    setAnswers(prev => ({ ...prev, [bankQuestionId]: value }));
  }

  async function handleSubmit() {
    setSubmitting(true);
    const payload = questions.map(q => ({
      bankQuestionId: q.bankQuestionId,
      selectedOptionId: q.type !== 'FILL_BLANK' ? (answers[q.bankQuestionId] || null) : undefined,
      textAnswer: q.type === 'FILL_BLANK' ? (answers[q.bankQuestionId] || '') : undefined,
    }));
    try {
      const res = await api.post(`/simulados/${simuladoId}/submit`, { answers: payload });
      onSubmit(res.data);
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '24px 0' }}>
      <Card style={{ marginBottom: 20, borderRadius: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text strong style={{ fontSize: 15 }}>Questão {current + 1} de {total}</Text>
          <Space>
            <Tag color="blue">{answered}/{total} respondidas</Tag>
            <Tag color="default">{TYPE_LABELS[q.type] || q.type}</Tag>
          </Space>
        </div>
        <Progress percent={Math.round((answered / total) * 100)} showInfo={false} strokeColor="#1677ff" />
      </Card>

      <Card style={{ borderRadius: 12, marginBottom: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
        <p style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.6, marginBottom: 24 }}>
          {q.text}
        </p>

        {(q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE') && (
          <Radio.Group
            value={answers[q.bankQuestionId]}
            onChange={e => setAnswer(q.bankQuestionId, e.target.value)}
            style={{ width: '100%' }}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              {q.options.map(opt => (
                <div
                  key={opt.id}
                  onClick={() => setAnswer(q.bankQuestionId, opt.id)}
                  style={{
                    border: `2px solid ${answers[q.bankQuestionId] === opt.id ? '#1677ff' : '#e8e8e8'}`,
                    borderRadius: 10, padding: '14px 18px', cursor: 'pointer',
                    background: answers[q.bankQuestionId] === opt.id ? '#e6f4ff' : '#fafafa',
                    transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 12,
                  }}
                >
                  <Radio value={opt.id} style={{ pointerEvents: 'none' }} />
                  <Text style={{ fontSize: 15 }}>{opt.text}</Text>
                </div>
              ))}
            </Space>
          </Radio.Group>
        )}

        {q.type === 'FILL_BLANK' && (
          <Input
            size="large"
            placeholder="Digite sua resposta..."
            value={answers[q.bankQuestionId] || ''}
            onChange={e => setAnswer(q.bankQuestionId, e.target.value)}
            style={{ borderRadius: 8 }}
          />
        )}
      </Card>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button icon={<ArrowLeftOutlined />} disabled={current === 0} onClick={() => setCurrent(c => c - 1)} size="large">
          Anterior
        </Button>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', maxWidth: 340 }}>
          {questions.map((_, i) => (
            <div
              key={i}
              onClick={() => setCurrent(i)}
              style={{
                width: 32, height: 32, borderRadius: 6, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: i === current ? '#1677ff' : answers[questions[i].bankQuestionId] ? '#52c41a' : '#e8e8e8',
                color: (i === current || answers[questions[i].bankQuestionId]) ? '#fff' : '#666',
                fontSize: 12, fontWeight: 600,
              }}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {current < total - 1 ? (
          <Button type="primary" size="large" onClick={() => setCurrent(c => c + 1)}>Próxima</Button>
        ) : (
          <Button
            type="primary" size="large" onClick={handleSubmit} loading={submitting}
            style={{ background: '#52c41a', borderColor: '#52c41a' }}
          >
            Entregar Simulado
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Tela 3: Resultado ──────────────────────────────────────────────────────
function ResultScreen({ result, discipline, onNew }) {
  const { simulado, answers } = result;
  const pct = simulado.maxScore > 0 ? parseFloat(((simulado.score / simulado.maxScore) * 100).toFixed(1)) : 0;
  const correct = answers.filter(a => a.isCorrect).length;
  const wrong = answers.filter(a => !a.isCorrect).length;
  const statusColor = pct >= 70 ? '#52c41a' : pct >= 50 ? '#fa8c16' : '#ff4d4f';

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', padding: '24px 0' }}>
      <Card style={{
        borderRadius: 16, marginBottom: 20, textAlign: 'center',
        background: 'linear-gradient(135deg, #0d2137, #1a3a6b)', border: 'none',
      }}>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>Resultado — {discipline}</Text>
        <div style={{ fontSize: 72, fontWeight: 900, color: statusColor, lineHeight: 1.1, marginTop: 8, marginBottom: 4 }}>
          {pct}%
        </div>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>{simulado.score} de {simulado.maxScore} pontos</Text>
        <div style={{ marginTop: 16 }}>
          {pct >= 70
            ? <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 14, padding: '4px 12px' }}>Ótimo desempenho!</Tag>
            : pct >= 50
              ? <Tag color="warning" style={{ fontSize: 14, padding: '4px 12px' }}>Continue praticando</Tag>
              : <Tag color="error" style={{ fontSize: 14, padding: '4px 12px' }}>Precisa revisar o conteúdo</Tag>
          }
        </div>
      </Card>

      <Row gutter={16} style={{ marginBottom: 20 }}>
        <Col span={8}>
          <Card style={{ borderRadius: 12, textAlign: 'center' }}>
            <Statistic title="Acertos" value={correct} suffix={`/ ${answers.length}`}
              valueStyle={{ color: '#52c41a', fontWeight: 800 }} prefix={<CheckCircleOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ borderRadius: 12, textAlign: 'center' }}>
            <Statistic title="Erros" value={wrong} suffix={`/ ${answers.length}`}
              valueStyle={{ color: '#ff4d4f', fontWeight: 800 }} prefix={<CloseCircleOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card style={{ borderRadius: 12, textAlign: 'center' }}>
            <Statistic title="Aproveitamento" value={pct} suffix="%" valueStyle={{ color: statusColor, fontWeight: 800 }} />
          </Card>
        </Col>
      </Row>

      <Card style={{ borderRadius: 12, marginBottom: 20 }}>
        <Title level={5} style={{ marginTop: 0 }}>Desempenho por Questão</Title>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart
            data={answers.map((a, i) => ({ name: `Q${i + 1}`, isCorrect: a.isCorrect, val: a.maxPoints }))}
            margin={{ top: 4, right: 8, left: -20, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v, _, p) => [p.payload.isCorrect ? 'Correto' : 'Errado', '']} />
            <Bar dataKey="val" radius={[4, 4, 0, 0]}>
              {answers.map((a, i) => <Cell key={i} fill={a.isCorrect ? '#52c41a' : '#ff4d4f'} opacity={0.85} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card style={{ borderRadius: 12, marginBottom: 24 }}>
        <Title level={5} style={{ marginTop: 0 }}>Gabarito</Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          {answers.map((a, i) => (
            <div key={a.id || i} style={{
              border: `1px solid ${a.isCorrect ? '#b7eb8f' : '#ffa39e'}`,
              borderRadius: 8, padding: '12px 16px',
              background: a.isCorrect ? '#f6ffed' : '#fff2f0',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text strong style={{ fontSize: 13, flex: 1, marginRight: 8 }}>{i + 1}. {a.questionText}</Text>
                {a.isCorrect
                  ? <Tag color="success" icon={<CheckCircleOutlined />}>Correto</Tag>
                  : <Tag color="error" icon={<CloseCircleOutlined />}>Errado</Tag>
                }
              </div>
              {!a.isCorrect && (
                <div style={{ marginTop: 6 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>Sua resposta: </Text>
                  <Text style={{ fontSize: 12, color: '#ff4d4f' }}>{a.selectedAnswer || '(sem resposta)'}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}> · Correta: </Text>
                  <Text style={{ fontSize: 12, color: '#52c41a' }}>{a.correctAnswer}</Text>
                </div>
              )}
            </div>
          ))}
        </Space>
      </Card>

      <div style={{ display: 'flex', gap: 12 }}>
        <Button size="large" block onClick={() => window.location.href = '/aluno'}>Voltar ao Início</Button>
        <Button type="primary" size="large" block icon={<RocketOutlined />} onClick={onNew}>Novo Simulado</Button>
      </div>
    </div>
  );
}

// ─── Componente principal ───────────────────────────────────────────────────
export default function SimuladoPage() {
  const [stage, setStage] = useState('setup');
  const [simuladoData, setSimuladoData] = useState(null);
  const [resultData, setResultData] = useState(null);
  const [discipline, setDiscipline] = useState('');

  function handleStart(data) {
    setSimuladoData(data);
    setDiscipline(data.simulado.discipline);
    setStage('taking');
  }

  function handleSubmit(result) {
    setResultData(result);
    setStage('result');
  }

  function handleNew() {
    setStage('setup');
    setSimuladoData(null);
    setResultData(null);
    setDiscipline('');
  }

  if (stage === 'setup') return <SetupScreen onStart={handleStart} />;
  if (stage === 'taking') return <TakingScreen simuladoId={simuladoData.simulado.id} questions={simuladoData.questions} onSubmit={handleSubmit} />;
  if (stage === 'result') return <ResultScreen result={resultData} discipline={discipline} onNew={handleNew} />;
  return null;
}
