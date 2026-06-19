import { useEffect, useState } from 'react';
import { Card, Typography, Progress, Tag, Space, Button, Divider, Alert, Statistic, Row, Col } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ArrowLeftOutlined, WarningOutlined, RedoOutlined } from '@ant-design/icons';
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

export default function AttemptResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    api.get(`/attempts/${id}`).then(res => setAttempt(res.data)).catch(() => navigate('/aluno'));
  }, [id]);

  if (!attempt) return null;

  const pct = attempt.maxScore > 0 ? Math.round((attempt.score / attempt.maxScore) * 100) : 0;
  const approved = pct >= 60;
  const isTask = attempt.exam?.type === 'TAREFA';
  const remainingAttempts = attempt.exam?.remainingAttempts || 0;

  async function handleRetry() {
    setRetrying(true);
    try {
      const res = await api.post('/attempts/start', { accessCode: attempt.exam.accessCode });
      navigate(`/sala/${res.data.attempt.id}`);
    } catch (err) {
      navigate('/aluno');
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div style={{ maxWidth: 720, margin: '32px auto', padding: '0 16px' }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/aluno')} style={{ marginBottom: 16 }}>Voltar</Button>

      <Card style={{ textAlign: 'center', marginBottom: 16, borderRadius: 12 }}>
        <Title level={2}>{attempt.exam?.title}</Title>
        {isTask && (
          <Tag color="blue" style={{ marginBottom: 12 }}>
            Tarefa — Tentativa {attempt.exam.attemptsUsed} de {attempt.exam.maxAttempts}
          </Tag>
        )}
        <Progress
          type="circle"
          percent={pct}
          size={160}
          status={approved ? 'success' : 'exception'}
          format={() => (
            <>
              <Text style={{ fontSize: 32, fontWeight: 700 }}>{pct}%</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 13 }}>{attempt.score?.toFixed(1)} / {attempt.maxScore?.toFixed(1)} pts</Text>
            </>
          )}
          style={{ marginBottom: 16 }}
        />
        <div>
          {approved
            ? <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 16, padding: '6px 16px' }}>APROVADO</Tag>
            : <Tag color="error" icon={<CloseCircleOutlined />} style={{ fontSize: 16, padding: '6px 16px' }}>REPROVADO</Tag>
          }
        </div>

        {isTask && remainingAttempts > 0 && (
          <div style={{ marginTop: 20 }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 10 }}>
              Você ainda tem <strong>{remainingAttempts}</strong> tentativa{remainingAttempts > 1 ? 's' : ''} restante{remainingAttempts > 1 ? 's' : ''}.
            </Text>
            <Button
              type="primary"
              size="large"
              icon={<RedoOutlined />}
              loading={retrying}
              onClick={handleRetry}
            >
              Tentar Novamente
            </Button>
          </div>
        )}

        {isTask && remainingAttempts === 0 && (
          <div style={{ marginTop: 16 }}>
            <Tag color="default">Todas as tentativas utilizadas</Tag>
          </div>
        )}
      </Card>

      {attempt.violations?.length > 0 && (
        <Alert
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          message={`${attempt.violations.length} violação(ões) registrada(s)`}
          description={attempt.violations.map((v, i) => (
            <Tag key={i} style={{ margin: 2 }}>{VIOLATION_LABELS[v.type] || v.type}</Tag>
          ))}
          style={{ marginBottom: 16 }}
        />
      )}

      <Card title="Gabarito — suas respostas" style={{ borderRadius: 12 }}>
        {attempt.answers?.map((a, idx) => (
          <div
            key={a.id}
            style={{
              marginBottom: 16, padding: '12px 16px', borderRadius: 8,
              background: a.isCorrect ? '#f6ffed' : '#fff2f0',
              border: `1px solid ${a.isCorrect ? '#b7eb8f' : '#ffccc7'}`,
            }}
          >
            <Space>
              {a.isCorrect
                ? <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 18 }} />
                : <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />}
              <Text strong>Questão {idx + 1}</Text>
              <Tag color={a.isCorrect ? 'success' : 'error'}>{a.pointsEarned}/{a.question?.points} pts</Tag>
            </Space>
            <div style={{ marginTop: 6, marginLeft: 26 }}>
              <Text style={{ fontSize: 14 }}>{a.question?.text}</Text>
              <div style={{ marginTop: 4 }}>
                <Text type="secondary">Sua resposta: </Text>
                <Text strong>{a.selectedOption?.text || a.textAnswer || '(sem resposta)'}</Text>
              </div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}
