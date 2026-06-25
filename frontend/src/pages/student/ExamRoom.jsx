import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Typography, Radio, Input, Space, Progress, Modal, Alert, Badge, message, Spin, Tag, Tooltip } from 'antd';
import {
  FullscreenOutlined, WarningOutlined, CheckOutlined,
  ClockCircleOutlined, LeftOutlined, RightOutlined,
  FontSizeOutlined,
} from '@ant-design/icons';
import api from '../../api';

const { Text, Paragraph } = Typography;

const TYPE_LABELS = {
  MULTIPLE_CHOICE: 'Múltipla Escolha',
  TRUE_FALSE: 'Verdadeiro ou Falso',
  FILL_BLANK: 'Preencher Lacuna',
};

const TYPE_COLORS = {
  MULTIPLE_CHOICE: '#1677ff',
  TRUE_FALSE: '#722ed1',
  FILL_BLANK: '#13c2c2',
};

const FONT_SIZES = [14, 16, 18, 20, 22];

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
  const [fontSizeIdx, setFontSizeIdx] = useState(1); // default 16px

  const [totalFocusLostMs, setTotalFocusLostMs] = useState(0);
  const focusLostAtRef = useRef(null);
  const totalFocusLostRef = useRef(0);

  const timerRef = useRef(null);
  const saveDebounce = useRef({});
  const startedRef = useRef(false);

  const fontSize = FONT_SIZES[fontSizeIdx];
  const optionFontSize = Math.max(fontSize - 1, 13);

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

  function onBlur() {
    if (!startedRef.current) return;
    focusLostAtRef.current = Date.now();
    logViolation('FOCUS_LOSS', 'Janela perdeu foco', 0);
  }

  function onFocus() {
    if (!startedRef.current || !focusLostAtRef.current) return;
    const duration = Math.round((Date.now() - focusLostAtRef.current) / 1000);
    focusLostAtRef.current = null;
    if (duration < 1) return;
    totalFocusLostRef.current += duration;
    setTotalFocusLostMs(s => s + duration);
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
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fa' }}>
        <Spin size="large" tip="Carregando prova..." />
      </div>
    );
  }

  if (!started) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Card style={{ maxWidth: 560, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', borderRadius: 20, border: 'none' }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #667eea, #764ba2)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckOutlined style={{ fontSize: 28, color: '#fff' }} />
            </div>
            <Text strong style={{ fontSize: 24, display: 'block', marginBottom: 6 }}>{exam?.title}</Text>
            <Space size={16}>
              <Tag color="blue" style={{ fontSize: 13, padding: '2px 10px' }}>
                <ClockCircleOutlined /> {exam?.durationMinutes} min
              </Tag>
              <Tag color="purple" style={{ fontSize: 13, padding: '2px 10px' }}>
                {exam?.questions?.length} questões
              </Tag>
            </Space>
          </div>

          <Alert
            type="warning"
            showIcon
            message={<Text strong>Leia antes de iniciar</Text>}
            description={
              <ul style={{ paddingLeft: 18, margin: '8px 0 0', lineHeight: 2 }}>
                <li>A prova abrirá em <strong>tela cheia</strong>.</li>
                <li>Sair da tela cheia, trocar de aba ou minimizar será <strong>registrado</strong> com o tempo exato.</li>
                <li>Copiar, colar, clique direito e atalhos estão <strong>bloqueados</strong>.</li>
                <li>O professor verá <strong>quantos segundos</strong> você ficou fora da prova.</li>
                <li>Suas respostas são <strong>salvas automaticamente</strong>.</li>
              </ul>
            }
            style={{ marginBottom: 24, borderRadius: 12 }}
          />

          <Button
            type="primary"
            size="large"
            block
            icon={<FullscreenOutlined />}
            onClick={startExamFullscreen}
            style={{ height: 52, fontSize: 16, borderRadius: 12, background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none' }}
          >
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
  const isUrgent = (timeLeft ?? Infinity) < 300000;
  const isWarning = (timeLeft ?? Infinity) < 600000;
  const timeColor = isUrgent ? '#ff4d4f' : isWarning ? '#faad14' : '#52c41a';

  return (
    <div style={{ height: '100vh', background: '#f0f2f5', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header moderno */}
      <div style={{
        background: '#fff',
        padding: '0 24px',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e8ecf0',
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        {/* Título + progresso */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0 }}>
          <Text strong style={{ fontSize: 15, color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 280 }}>
            {exam.title}
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Progress
              percent={Math.round((answered / total) * 100)}
              size="small"
              style={{ width: 100, margin: 0 }}
              strokeColor={{ '0%': '#667eea', '100%': '#52c41a' }}
            />
            <Text style={{ fontSize: 12, color: '#666', whiteSpace: 'nowrap' }}>{answered}/{total}</Text>
          </div>
        </div>

        {/* Controles do lado direito */}
        <Space size={12}>
          {/* Controle de fonte */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f5f7fa', borderRadius: 8, padding: '4px 8px' }}>
            <Tooltip title="Diminuir fonte">
              <button
                onClick={() => setFontSizeIdx(i => Math.max(0, i - 1))}
                disabled={fontSizeIdx === 0}
                style={{ background: 'none', border: 'none', cursor: fontSizeIdx === 0 ? 'not-allowed' : 'pointer', color: fontSizeIdx === 0 ? '#ccc' : '#555', padding: '2px 6px', borderRadius: 4, fontSize: 13, fontWeight: 700 }}
              >
                A-
              </button>
            </Tooltip>
            <FontSizeOutlined style={{ color: '#888', fontSize: 13 }} />
            <Tooltip title="Aumentar fonte">
              <button
                onClick={() => setFontSizeIdx(i => Math.min(FONT_SIZES.length - 1, i + 1))}
                disabled={fontSizeIdx === FONT_SIZES.length - 1}
                style={{ background: 'none', border: 'none', cursor: fontSizeIdx === FONT_SIZES.length - 1 ? 'not-allowed' : 'pointer', color: fontSizeIdx === FONT_SIZES.length - 1 ? '#ccc' : '#555', padding: '2px 6px', borderRadius: 4, fontSize: 15, fontWeight: 700 }}
              >
                A+
              </button>
            </Tooltip>
          </div>

          {!isFullscreen && (
            <Tooltip title="Entrar em tela cheia">
              <Button size="small" icon={<FullscreenOutlined />} onClick={() => document.documentElement.requestFullscreen().then(() => setIsFullscreen(true))}>
                Tela Cheia
              </Button>
            </Tooltip>
          )}

          {totalFocusLostMs > 0 && (
            <Tag color="warning" icon={<ClockCircleOutlined />} style={{ fontFamily: 'monospace', margin: 0 }}>
              Fora: {String(Math.floor(totalFocusLostMs / 60)).padStart(2, '0')}:{String(totalFocusLostMs % 60).padStart(2, '0')}
            </Tag>
          )}

          {violations.length > 0 && (
            <Badge count={violations.length} color={violations.length > 3 ? 'red' : 'orange'} size="small">
              <Tag color={violations.length > 3 ? 'error' : 'warning'} style={{ margin: 0 }}>
                <WarningOutlined /> {violations.length}
              </Tag>
            </Badge>
          )}

          {/* Timer */}
          <div style={{
            background: isUrgent ? '#fff1f0' : isWarning ? '#fffbe6' : '#f6ffed',
            border: `1px solid ${timeColor}`,
            borderRadius: 10,
            padding: '4px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}>
            <ClockCircleOutlined style={{ color: timeColor, fontSize: 14 }} />
            <Text style={{ color: timeColor, fontSize: 20, fontWeight: 800, fontFamily: 'monospace', lineHeight: 1 }}>
              {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </Text>
          </div>
        </Space>
      </div>

      {/* Barra de alerta de violação */}
      {violationMsg && (
        <div style={{ background: '#ff4d4f', padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <WarningOutlined style={{ color: '#fff', fontSize: 16 }} />
          <Text style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>VIOLAÇÃO REGISTRADA: {violationMsg}</Text>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Sidebar de navegação */}
        <div style={{ width: 200, background: '#fff', padding: '20px 16px', borderRight: '1px solid #e8ecf0', overflowY: 'auto', flexShrink: 0 }}>
          <Text style={{ color: '#888', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 12 }}>
            Questões
          </Text>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 20 }}>
            {exam.questions.map((q, idx) => {
              const isActive = currentIdx === idx;
              const isDone = !!answers[q.id];
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  title={`Questão ${idx + 1}`}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    borderRadius: 8,
                    border: isActive ? '2px solid #667eea' : '1px solid #e0e0e0',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: 12,
                    background: isActive ? '#667eea' : isDone ? '#f0fdf4' : '#fafafa',
                    color: isActive ? '#fff' : isDone ? '#16a34a' : '#666',
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 2px 8px rgba(102,126,234,0.4)' : 'none',
                  }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div style={{ background: '#f5f7fa', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 11, color: '#888' }}>Progresso</Text>
              <Text style={{ fontSize: 11, fontWeight: 700, color: '#667eea' }}>{Math.round((answered / total) * 100)}%</Text>
            </div>
            <Progress
              percent={Math.round((answered / total) * 100)}
              showInfo={false}
              size="small"
              strokeColor={{ '0%': '#667eea', '100%': '#52c41a' }}
            />
            <Text style={{ fontSize: 11, color: '#666', display: 'block', marginTop: 6 }}>
              {answered} de {total} respondidas
            </Text>
          </div>

          <Button
            type="primary"
            danger
            block
            onClick={handleSubmit}
            loading={submitting}
            style={{ borderRadius: 8, height: 40, fontWeight: 600 }}
          >
            Entregar Prova
          </Button>
        </div>

        {/* Área da questão */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px 24px', background: '#f0f2f5' }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>

            {/* Cabeçalho da questão */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Space>
                <Tag
                  color={TYPE_COLORS[question.type]}
                  style={{ borderRadius: 20, padding: '2px 12px', fontWeight: 600, fontSize: 12 }}
                >
                  {TYPE_LABELS[question.type]}
                </Tag>
                <Text style={{ color: '#888', fontSize: 13 }}>
                  Questão <strong style={{ color: '#333' }}>{currentIdx + 1}</strong> de {total}
                </Text>
              </Space>
              <Tag
                style={{ borderRadius: 20, padding: '2px 12px', fontWeight: 700, fontSize: 13, background: '#fff7e6', borderColor: '#ffd591', color: '#d46b08' }}
              >
                {question.points} {question.points === 1 ? 'ponto' : 'pontos'}
              </Tag>
            </div>

            {/* Card da questão */}
            <Card
              style={{
                marginBottom: 16,
                borderRadius: 16,
                border: '1px solid #e8ecf0',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                background: '#fff',
              }}
              styles={{ body: { padding: '28px 32px' } }}
            >
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{
                  width: 40,
                  height: 40,
                  minWidth: 40,
                  borderRadius: 10,
                  background: `${TYPE_COLORS[question.type]}18`,
                  border: `2px solid ${TYPE_COLORS[question.type]}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: 15,
                  color: TYPE_COLORS[question.type],
                }}>
                  {currentIdx + 1}
                </div>
                <Paragraph style={{
                  fontSize: fontSize,
                  lineHeight: 1.8,
                  margin: 0,
                  color: '#1a1a2e',
                  fontWeight: 400,
                  flex: 1,
                }}>
                  {question.text}
                </Paragraph>
              </div>
            </Card>

            {/* Opções de múltipla escolha */}
            {question.type === 'MULTIPLE_CHOICE' && (
              <Radio.Group
                value={answers[question.id]}
                onChange={e => saveAnswer(question.id, e.target.value, 'MULTIPLE_CHOICE')}
                style={{ width: '100%' }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size={10}>
                  {question.options.map((opt, i) => {
                    const isSelected = answers[question.id] === opt.id;
                    const letter = String.fromCharCode(65 + i);
                    return (
                      <div
                        key={opt.id}
                        onClick={() => saveAnswer(question.id, opt.id, 'MULTIPLE_CHOICE')}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 14,
                          padding: '16px 20px',
                          borderRadius: 12,
                          border: isSelected ? '2px solid #667eea' : '2px solid #e8ecf0',
                          background: isSelected ? '#f0f3ff' : '#fff',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 4px 16px rgba(102,126,234,0.2)' : '0 1px 4px rgba(0,0,0,0.04)',
                        }}
                      >
                        <div style={{
                          width: 34,
                          height: 34,
                          minWidth: 34,
                          borderRadius: 8,
                          background: isSelected ? '#667eea' : '#f0f2f5',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: 13,
                          color: isSelected ? '#fff' : '#666',
                          transition: 'all 0.15s ease',
                        }}>
                          {isSelected ? <CheckOutlined style={{ fontSize: 14 }} /> : letter}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                          <Radio value={opt.id} style={{ display: 'none' }} />
                          <Text style={{ fontSize: optionFontSize, lineHeight: 1.6, color: isSelected ? '#3730a3' : '#333' }}>
                            {opt.text}
                          </Text>
                        </div>
                      </div>
                    );
                  })}
                </Space>
              </Radio.Group>
            )}

            {/* Verdadeiro ou Falso */}
            {question.type === 'TRUE_FALSE' && (
              <Radio.Group
                value={answers[question.id]}
                onChange={e => saveAnswer(question.id, e.target.value, 'TRUE_FALSE')}
                style={{ width: '100%' }}
              >
                <div style={{ display: 'flex', gap: 16 }}>
                  {question.options.map((opt) => {
                    const isSelected = answers[question.id] === opt.id;
                    const isTrue = opt.text?.toLowerCase().includes('verdadeiro') || opt.text?.toLowerCase().includes('true') || opt.text === 'V';
                    const accent = isTrue ? '#52c41a' : '#ff4d4f';
                    return (
                      <div
                        key={opt.id}
                        onClick={() => saveAnswer(question.id, opt.id, 'TRUE_FALSE')}
                        style={{
                          flex: 1,
                          padding: '28px 20px',
                          borderRadius: 16,
                          border: isSelected ? `2px solid ${accent}` : '2px solid #e8ecf0',
                          background: isSelected ? `${accent}12` : '#fff',
                          cursor: 'pointer',
                          textAlign: 'center',
                          transition: 'all 0.2s ease',
                          boxShadow: isSelected ? `0 4px 16px ${accent}30` : '0 1px 4px rgba(0,0,0,0.04)',
                        }}
                      >
                        <Radio value={opt.id} style={{ display: 'none' }} />
                        <div style={{
                          fontSize: 36,
                          marginBottom: 10,
                          filter: isSelected ? 'none' : 'grayscale(60%) opacity(0.5)',
                        }}>
                          {isTrue ? '✓' : '✗'}
                        </div>
                        <Text style={{ fontSize: fontSize + 2, fontWeight: 700, color: isSelected ? accent : '#666', display: 'block' }}>
                          {opt.text}
                        </Text>
                        {isSelected && (
                          <div style={{ marginTop: 8 }}>
                            <CheckOutlined style={{ color: accent, fontSize: 16 }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Radio.Group>
            )}

            {/* Preencher Lacuna */}
            {question.type === 'FILL_BLANK' && (
              <div>
                <div style={{ background: '#fff', borderRadius: 12, padding: '4px', border: '2px solid #e8ecf0', transition: 'border-color 0.2s' }}
                  onFocusCapture={e => e.currentTarget.style.borderColor = '#667eea'}
                  onBlurCapture={e => e.currentTarget.style.borderColor = '#e8ecf0'}
                >
                  <Input
                    size="large"
                    placeholder="Digite sua resposta aqui..."
                    value={answers[question.id] || ''}
                    onChange={e => saveAnswer(question.id, e.target.value, 'FILL_BLANK')}
                    style={{
                      border: 'none',
                      boxShadow: 'none',
                      fontSize: fontSize,
                      lineHeight: 1.8,
                      padding: '14px 16px',
                      borderRadius: 10,
                    }}
                  />
                </div>
                <Text style={{ fontSize: 12, color: '#aaa', marginTop: 8, display: 'block' }}>
                  Resposta salva automaticamente enquanto você digita.
                </Text>
              </div>
            )}

            {/* Navegação entre questões */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 32 }}>
              <Button
                size="large"
                icon={<LeftOutlined />}
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx(i => i - 1)}
                style={{ borderRadius: 10, paddingInline: 20, height: 44 }}
              >
                Anterior
              </Button>

              <div style={{ display: 'flex', gap: 6 }}>
                {[...Array(Math.min(total, 7))].map((_, dotIdx) => {
                  const qIdx = total <= 7 ? dotIdx : Math.round(dotIdx * (total - 1) / 6);
                  return (
                    <div
                      key={dotIdx}
                      style={{
                        width: currentIdx === qIdx ? 20 : 8,
                        height: 8,
                        borderRadius: 4,
                        background: currentIdx === qIdx ? '#667eea' : answers[exam.questions[qIdx]?.id] ? '#52c41a' : '#d0d5dd',
                        transition: 'all 0.2s ease',
                      }}
                    />
                  );
                })}
              </div>

              {currentIdx < total - 1 ? (
                <Button
                  type="primary"
                  size="large"
                  icon={<RightOutlined />}
                  iconPosition="end"
                  onClick={() => setCurrentIdx(i => i + 1)}
                  style={{ borderRadius: 10, paddingInline: 20, height: 44, background: '#667eea', border: 'none' }}
                >
                  Próxima
                </Button>
              ) : (
                <Button
                  type="primary"
                  danger
                  size="large"
                  icon={<CheckOutlined />}
                  onClick={handleSubmit}
                  loading={submitting}
                  style={{ borderRadius: 10, paddingInline: 20, height: 44 }}
                >
                  Entregar Prova
                </Button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
