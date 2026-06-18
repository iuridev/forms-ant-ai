import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Typography, Radio, Input, Space, Progress, Modal, Alert, Badge, message, Spin, Tag, Statistic } from 'antd';
import { FullscreenOutlined, WarningOutlined, CheckOutlined, ClockCircleOutlined } from '@ant-design/icons';
import api from '../../api';

const { Text, Paragraph } = Typography;

const TYPE_LABELS = {
  MULTIPLE_CHOICE: 'Múltipla Escolha',
  TRUE_FALSE: 'Verdadeiro ou Falso',
  FILL_BLANK: 'Preencher Lacuna',
};

export default function ExamRoom() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [exam, setExam] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [violations, setViolations] = useState([]);
  const [violationMsg, setViolationMsg] = useState('');
  const [started, setStarted] = useState(false);

  // Rastreamento de tempo fora do foco
  const [totalFocusLostMs, setTotalFocusLostMs] = useState(0);
  const focusLostAtRef = useRef(null);
  const totalFocusLostRef = useRef(0); // ref para usar no submit sem stale closure

  const timerRef = useRef(null);
  const saveDebounce = useRef({});
  const startedRef = useRef(false);

  useEffect(() => {
    api.get(`/attempts/${id}/exam`)
      .then(res => {
        setExam(res.data.exam);
        setAnswers(res.data.savedAnswers || {});
        setStartedAt(res.data.startedAt);
      })
      .catch(err => {
        message.error(err.response?.data?.error || 'Erro ao carregar prova');
        navigate('/aluno');
      })
      .finally(() => setLoading(false));

    return () => {
      clearInterval(timerRef.current);
      teardownAntiCheat();
    };
  }, [id]);

  useEffect(() => {
    if (exam && started && startedAt && !timerRef.current) startTimer();
  }, [exam, started, startedAt]);

  function startTimer() {
    const endTime = new Date(startedAt).getTime() + exam.durationMinutes * 60 * 1000;
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeLeft(remaining);
      if (remaining === 0) { clearInterval(timerRef.current); doSubmit(); }
    }, 1000);
  }

  async function startExamFullscreen() {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch { /* usuário negou */ }
    startedRef.current = true;
    setStarted(true);
    setupAntiCheat();
  }

  function setupAntiCheat() {
    document.addEventListener('fullscreenchange', onFullscreenChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onVisibility);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onCopy);
    document.addEventListener('cut', onCopy);
  }

  function teardownAntiCheat() {
    document.removeEventListener('fullscreenchange', onFullscreenChange);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('focus', onFocus);
    document.removeEventListener('contextmenu', onContextMenu);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('visibilitychange', onVisibility);
    document.removeEventListener('copy', onCopy);
    document.removeEventListener('paste', onCopy);
    document.removeEventListener('cut', onCopy);
  }

  // Registra saída e começa a contar o tempo
  function onBlur() {
    if (!startedRef.current) return;
    focusLostAtRef.current = Date.now();
    logViolation('FOCUS_LOSS', 'Janela perdeu foco', 0);
  }

  // Quando volta: calcula duração e registra
  function onFocus() {
    if (!startedRef.current || !focusLostAtRef.current) return;
    const duration = Math.round((Date.now() - focusLostAtRef.current) / 1000);
    focusLostAtRef.current = null;
    if (duration < 1) return;
    totalFocusLostRef.current += duration;
    setTotalFocusLostMs(s => s + duration);
    // Atualiza a última violação de perda de foco com a duração real
    logViolation('FOCUS_LOSS', `Fora do foco por ${duration}s`, duration);
  }

  function onFullscreenChange() {
    if (!document.fullscreenElement) {
      setIsFullscreen(false);
      if (startedRef.current) {
        logViolation('FULLSCREEN_EXIT', 'Saiu da tela cheia', 0);
        setTimeout(() => document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {}), 500);
      }
    } else setIsFullscreen(true);
  }

  function onContextMenu(e) {
    e.preventDefault();
    if (startedRef.current) logViolation('RIGHT_CLICK', 'Clique direito', 0);
  }

  function onKeyDown(e) {
    const blocked = e.key === 'F12'
      || (e.ctrlKey && 'uUcCaApPsS'.includes(e.key))
      || (e.altKey && e.key === 'Tab')
      || e.key === 'Escape'
      || e.metaKey
      || (e.ctrlKey && e.shiftKey && 'IJC'.includes(e.key))
      || e.key === 'PrintScreen';
    if (blocked) {
      e.preventDefault();
      e.stopPropagation();
      if (startedRef.current) logViolation('KEYBOARD_SHORTCUT', `Atalho bloqueado: ${e.key}`, 0);
    }
  }

  function onVisibility() {
    if (!startedRef.current) return;
    if (document.hidden) {
      focusLostAtRef.current = Date.now();
      logViolation('TAB_SWITCH', 'Troca de aba/minimizou', 0);
    } else if (focusLostAtRef.current) {
      const duration = Math.round((Date.now() - focusLostAtRef.current) / 1000);
      focusLostAtRef.current = null;
      if (duration >= 1) {
        totalFocusLostRef.current += duration;
        setTotalFocusLostMs(s => s + duration);
        logViolation('TAB_SWITCH', `Fora da aba por ${duration}s`, duration);
      }
    }
  }

  function onCopy(e) {
    e.preventDefault();
    if (startedRef.current) logViolation('COPY_PASTE', 'Copiar/Colar bloqueado', 0);
  }

  async function logViolation(type, details, durationSeconds) {
    setViolations(prev => {
      const last = prev[prev.length - 1];
      // Evita duplicata imediata (blur + visibilitychange podem disparar juntos)
      if (last && last.type === type && Date.now() - last._ts < 500) return prev;
      return [...prev, { type, details, durationSeconds, _ts: Date.now() }];
    });
    if (details && durationSeconds === 0) {
      setViolationMsg(details);
      setTimeout(() => setViolationMsg(''), 4000);
    }
    try {
      await api.post(`/attempts/${id}/violations`, { type, details, durationSeconds });
    } catch {}
  }

  async function saveAnswer(questionId, value, type) {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    if (saveDebounce.current[questionId]) clearTimeout(saveDebounce.current[questionId]);
    saveDebounce.current[questionId] = setTimeout(async () => {
      const body = { questionId };
      if (type === 'FILL_BLANK') body.textAnswer = value;
      else body.selectedOptionId = value;
      try { await api.post(`/attempts/${id}/answers`, body); } catch {}
    }, 800);
  }

  async function handleSubmit() {
    const unanswered = exam.questions.filter(q => !answers[q.id]).length;
    if (unanswered > 0) {
      Modal.confirm({
        title: 'Questões sem resposta',
        content: `${unanswered} questão(ões) sem resposta. Deseja entregar mesmo assim?`,
        okText: 'Sim, entregar',
        cancelText: 'Voltar',
        onOk: doSubmit,
      });
      return;
    }
    doSubmit();
  }

  async function doSubmit() {
    if (submitting) return;
    setSubmitting(true);
    clearInterval(timerRef.current);
    teardownAntiCheat();
    startedRef.current = false;

    // Se estava fora quando submeteu, conta esse tempo também
    if (focusLostAtRef.current) {
      const extra = Math.round((Date.now() - focusLostAtRef.current) / 1000);
      totalFocusLostRef.current += extra;
    }

    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    try {
      await api.post(`/attempts/${id}/submit`, {
        totalFocusLostSeconds: totalFocusLostRef.current,
      });
      navigate(`/aluno/resultado/${id}`);
    } catch {
      message.error('Erro ao entregar. Tente novamente.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
        <Spin size="large" tip="Carregando prova..." />
      </div>
    );
  }

  if (!started) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
        <Card style={{ maxWidth: 520, width: '100%', boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <Text strong style={{ fontSize: 22 }}>{exam?.title}</Text>
            <br />
            <Text type="secondary">{exam?.durationMinutes} minutos · {exam?.questions?.length} questões</Text>
          </div>
          <Alert
            type="warning"
            showIcon
            message="Leia antes de iniciar"
            description={
              <ul style={{ paddingLeft: 16, margin: '8px 0 0' }}>
                <li>A prova abrirá em <strong>tela cheia</strong>.</li>
                <li>Sair da tela cheia, trocar de aba ou minimizar a janela será <strong>registrado</strong> com o tempo exato que você ficou fora.</li>
                <li>Copiar, colar, clique direito e atalhos estão <strong>bloqueados</strong>.</li>
                <li>O professor verá <strong>quantos segundos</strong> você ficou fora da prova.</li>
                <li>Suas respostas são salvas automaticamente.</li>
              </ul>
            }
            style={{ marginBottom: 24 }}
          />
          <Button type="primary" size="large" block icon={<FullscreenOutlined />} onClick={startExamFullscreen}>
            Iniciar Prova em Tela Cheia
          </Button>
        </Card>
      </div>
    );
  }

  const question = exam.questions[currentIdx];
  const total = exam.questions.length;
  const answered = Object.keys(answers).filter(k => answers[k]).length;
  const minutes = Math.floor((timeLeft ?? 0) / 60000);
  const seconds = Math.floor(((timeLeft ?? 0) % 60000) / 1000);
  const timeColor = (timeLeft ?? Infinity) < 300000 ? '#ff4d4f' : (timeLeft ?? Infinity) < 600000 ? '#faad14' : '#52c41a';

  return (
    <div style={{ height: '100vh', background: '#0f1923', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: '#141e28', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1f2d3d', flexShrink: 0 }}>
        <Text strong style={{ color: '#fff', fontSize: 16 }}>{exam.title}</Text>
        <Space>
          {!isFullscreen && (
            <Button size="small" icon={<FullscreenOutlined />} onClick={() => document.documentElement.requestFullscreen().then(() => setIsFullscreen(true))}>
              Tela Cheia
            </Button>
          )}

          {/* Contador de tempo fora do foco */}
          {totalFocusLostMs > 0 && (
            <Tag color="warning" icon={<ClockCircleOutlined />} style={{ fontFamily: 'monospace' }}>
              Fora: {String(Math.floor(totalFocusLostMs / 60)).padStart(2, '0')}:{String(totalFocusLostMs % 60).padStart(2, '0')}
            </Tag>
          )}

          {violations.length > 0 && (
            <Badge count={violations.length} color={violations.length > 3 ? 'red' : 'orange'}>
              <Tag color={violations.length > 3 ? 'error' : 'warning'}>
                <WarningOutlined /> {violations.length} violação(ões)
              </Tag>
            </Badge>
          )}

          <Text style={{ color: timeColor, fontSize: 20, fontWeight: 700, fontFamily: 'monospace', minWidth: 60 }}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </Text>
        </Space>
      </div>

      {/* Barra de alerta de violação */}
      {violationMsg && (
        <div style={{ background: '#ff4d4f', padding: '6px 24px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <WarningOutlined style={{ color: '#fff' }} />
          <Text style={{ color: '#fff', fontWeight: 600 }}>VIOLAÇÃO REGISTRADA: {violationMsg}</Text>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar de navegação */}
        <div style={{ width: 180, background: '#141e28', padding: 16, borderRight: '1px solid #1f2d3d', overflowY: 'auto', flexShrink: 0 }}>
          <Text style={{ color: '#8899aa', fontSize: 12, display: 'block', marginBottom: 6 }}>
            {answered}/{total} respondidas
          </Text>
          <Progress percent={Math.round((answered / total) * 100)} size="small" style={{ marginBottom: 12 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
            {exam.questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(idx)}
                style={{
                  width: 36, height: 36, borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 700,
                  background: currentIdx === idx ? '#1677ff' : answers[q.id] ? '#52c41a' : '#1f2d3d',
                  color: '#fff', fontSize: 12,
                }}
              >
                {idx + 1}
              </button>
            ))}
          </div>
          <Button type="primary" danger block style={{ marginTop: 16 }} onClick={handleSubmit} loading={submitting} size="small">
            Entregar
          </Button>
        </div>

        {/* Área da questão */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <Space style={{ marginBottom: 8, justifyContent: 'space-between', width: '100%' }}>
              <Space>
                <Tag color="blue">{TYPE_LABELS[question.type]}</Tag>
                <Text style={{ color: '#8899aa' }}>Questão {currentIdx + 1} de {total}</Text>
              </Space>
              <Tag>{question.points} pt(s)</Tag>
            </Space>

            <Card style={{ marginBottom: 16, borderRadius: 12 }}>
              <Paragraph style={{ fontSize: 16, margin: 0 }}>{question.text}</Paragraph>
            </Card>

            {question.type === 'MULTIPLE_CHOICE' && (
              <Radio.Group value={answers[question.id]} onChange={e => saveAnswer(question.id, e.target.value, 'MULTIPLE_CHOICE')} style={{ width: '100%' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  {question.options.map((opt, i) => (
                    <Card
                      key={opt.id}
                      onClick={() => saveAnswer(question.id, opt.id, 'MULTIPLE_CHOICE')}
                      style={{ cursor: 'pointer', borderRadius: 10, borderColor: answers[question.id] === opt.id ? '#1677ff' : undefined, background: answers[question.id] === opt.id ? '#e6f4ff' : undefined }}
                      bodyStyle={{ padding: '12px 16px' }}
                    >
                      <Space>
                        <Radio value={opt.id} />
                        <Text><Text strong style={{ color: '#1677ff' }}>{String.fromCharCode(65 + i)})</Text> {opt.text}</Text>
                      </Space>
                    </Card>
                  ))}
                </Space>
              </Radio.Group>
            )}

            {question.type === 'TRUE_FALSE' && (
              <Radio.Group value={answers[question.id]} onChange={e => saveAnswer(question.id, e.target.value, 'TRUE_FALSE')} style={{ width: '100%' }}>
                <Space style={{ width: '100%', justifyContent: 'center', gap: 16 }}>
                  {question.options.map(opt => (
                    <Card
                      key={opt.id}
                      onClick={() => saveAnswer(question.id, opt.id, 'TRUE_FALSE')}
                      style={{ width: 160, textAlign: 'center', cursor: 'pointer', borderRadius: 10, borderColor: answers[question.id] === opt.id ? '#1677ff' : undefined, background: answers[question.id] === opt.id ? '#e6f4ff' : undefined }}
                      bodyStyle={{ padding: 20 }}
                    >
                      <Radio value={opt.id}><Text strong style={{ fontSize: 16 }}>{opt.text}</Text></Radio>
                    </Card>
                  ))}
                </Space>
              </Radio.Group>
            )}

            {question.type === 'FILL_BLANK' && (
              <Input
                size="large"
                placeholder="Digite sua resposta aqui..."
                value={answers[question.id] || ''}
                onChange={e => saveAnswer(question.id, e.target.value, 'FILL_BLANK')}
                style={{ borderRadius: 10 }}
              />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <Button disabled={currentIdx === 0} onClick={() => setCurrentIdx(i => i - 1)}>Anterior</Button>
              {currentIdx < total - 1
                ? <Button type="primary" onClick={() => setCurrentIdx(i => i + 1)}>Próxima</Button>
                : <Button type="primary" icon={<CheckOutlined />} onClick={handleSubmit} loading={submitting}>Entregar Prova</Button>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
