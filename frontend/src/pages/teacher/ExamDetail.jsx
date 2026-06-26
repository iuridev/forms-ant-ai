import { useEffect, useState } from 'react';
import {
  Card, Button, Typography, Tag, Space, Form, Input, Select, InputNumber,
  Switch, Divider, List, Popconfirm, message, Modal, Radio, Row, Col, Alert,
  DatePicker, Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined, EditOutlined,
  PlayCircleOutlined, StopOutlined, CopyOutlined, TeamOutlined,
  BankOutlined, DownloadOutlined, CalendarOutlined, SaveOutlined,
  SafetyOutlined, SwapOutlined, OrderedListOutlined, LockOutlined,
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../../api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const QUESTION_LABELS = {
  MULTIPLE_CHOICE: 'Múltipla Escolha',
  TRUE_FALSE: 'Verdadeiro/Falso',
  FILL_BLANK: 'Preencher Lacuna',
  ESSAY: 'Dissertativa',
};

const QUESTION_COLORS = {
  MULTIPLE_CHOICE: 'blue',
  TRUE_FALSE: 'purple',
  FILL_BLANK: 'cyan',
  ESSAY: 'orange',
};

const STATUS_CONFIG = {
  DRAFT:  { color: 'default', label: 'Rascunho', next: 'ACTIVE', nextLabel: 'Ativar Prova', icon: <PlayCircleOutlined /> },
  ACTIVE: { color: 'success', label: 'Ativa',     next: 'CLOSED', nextLabel: 'Encerrar Prova', icon: <StopOutlined /> },
  CLOSED: { color: 'error',   label: 'Encerrada', next: null },
};

const BIMESTRE_CONFIG = {
  '1':   { label: '1º Bimestre',  color: '#1677ff', bg: '#e6f4ff' },
  '2':   { label: '2º Bimestre',  color: '#52c41a', bg: '#f6ffed' },
  '3':   { label: '3º Bimestre',  color: '#fa8c16', bg: '#fff7e6' },
  '4':   { label: '4º Bimestre',  color: '#722ed1', bg: '#f9f0ff' },
  'REC': { label: 'Recuperação',  color: '#f5222d', bg: '#fff1f0' },
};

export default function ExamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [form] = Form.useForm();
  const [questionType, setQuestionType] = useState('MULTIPLE_CHOICE');
  const [groups, setGroups] = useState([]);

  // Banco de questões
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [bankQuestions, setBankQuestions] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSearch, setBankSearch] = useState('');

  // Agendamento
  const [scheduleRange, setScheduleRange] = useState([null, null]);
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Anti-cola
  const [shuffleQ, setShuffleQ] = useState(true);
  const [shuffleO, setShuffleO] = useState(true);
  const [savingAnticola, setSavingAnticola] = useState(false);

  // Bimestre
  const [bimestre, setBimestre] = useState('');
  const [savingBimestre, setSavingBimestre] = useState(false);

  async function fetchExam() {
    try {
      const res = await api.get(`/exams/${id}`);
      setExam(res.data);
      setScheduleRange([
        res.data.scheduledStart ? dayjs(res.data.scheduledStart) : null,
        res.data.scheduledEnd ? dayjs(res.data.scheduledEnd) : null,
      ]);
      setShuffleQ(res.data.shuffleQuestions !== 'false');
      setShuffleO(res.data.shuffleOptions !== 'false');
      setBimestre(res.data.bimestre || '');
    } catch { message.error('Erro ao carregar prova'); }
    finally { setLoading(false); }
  }

  async function fetchGroups() {
    try {
      const res = await api.get(`/groups/for-exam/${id}`);
      setGroups(res.data);
    } catch {}
  }

  useEffect(() => { fetchExam(); fetchGroups(); }, [id]);

  function openAddQuestion() {
    setEditingQuestion(null);
    form.resetFields();
    setQuestionType('MULTIPLE_CHOICE');
    setModalOpen(true);
  }

  function openEditQuestion(q) {
    setEditingQuestion(q);
    setQuestionType(q.type);
    form.setFieldsValue({
      text: q.text,
      type: q.type,
      points: q.points,
      correctBlank: q.correctBlank,
      options: q.options?.length ? q.options : [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
      trueFalseAnswer: q.type === 'TRUE_FALSE'
        ? (q.options?.find(o => o.isCorrect)?.text ?? 'Verdadeiro')
        : undefined,
    });
    setModalOpen(true);
  }

  async function handleSaveQuestion(values) {
    if (values.type === 'TRUE_FALSE') {
      const correct = values.trueFalseAnswer ?? 'Verdadeiro';
      values.options = [
        { text: 'Verdadeiro', isCorrect: correct === 'Verdadeiro' },
        { text: 'Falso', isCorrect: correct === 'Falso' },
      ];
      delete values.trueFalseAnswer;
    }
    if (values.type === 'ESSAY') {
      delete values.options;
      delete values.correctBlank;
    }
    try {
      if (editingQuestion) {
        await api.put(`/exams/${id}/questions/${editingQuestion.id}`, values);
        message.success('Questão atualizada!');
      } else {
        await api.post(`/exams/${id}/questions`, values);
        message.success('Questão adicionada!');
      }
      setModalOpen(false);
      fetchExam();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar questão');
    }
  }

  async function deleteQuestion(qId) {
    try {
      await api.delete(`/exams/${id}/questions/${qId}`);
      message.success('Questão excluída');
      fetchExam();
    } catch { message.error('Erro ao excluir'); }
  }

  async function saveToBank(q) {
    try {
      await api.post(`/question-bank/from-exam/${id}/questions/${q.id}`);
      message.success('Questão salva no banco!');
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar no banco');
    }
  }

  async function changeStatus(newStatus) {
    try {
      await api.put(`/exams/${id}`, { status: newStatus });
      message.success(newStatus === 'ACTIVE' ? 'Prova ativada! Os alunos já podem acessar.' : 'Prova encerrada.');
      fetchExam();
    } catch { message.error('Erro ao alterar status'); }
  }

  async function toggleGroupLink(group, linked) {
    try {
      if (linked) {
        await api.post(`/groups/${group.id}/exams`, { examId: id });
        message.success(`Vinculada à turma "${group.name}"`);
      } else {
        await api.delete(`/groups/${group.id}/exams/${id}`);
        message.success(`Desvinculada da turma "${group.name}"`);
      }
      setGroups(prev => prev.map(g => g.id === group.id ? { ...g, linked } : g));
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao alterar vínculo');
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(exam.accessCode);
    message.success('Código copiado!');
  }

  async function saveSchedule() {
    setSavingSchedule(true);
    try {
      await api.put(`/exams/${id}`, {
        scheduledStart: scheduleRange[0] ? scheduleRange[0].toISOString() : '',
        scheduledEnd: scheduleRange[1] ? scheduleRange[1].toISOString() : '',
      });
      message.success('Agendamento salvo!');
      fetchExam();
    } catch { message.error('Erro ao salvar agendamento'); }
    finally { setSavingSchedule(false); }
  }

  async function saveBimestre(value) {
    setSavingBimestre(true);
    try {
      await api.put(`/exams/${id}`, { bimestre: value });
      setBimestre(value);
      message.success('Bimestre atualizado!');
      fetchExam();
    } catch { message.error('Erro ao salvar bimestre'); }
    finally { setSavingBimestre(false); }
  }

  async function saveAnticola() {
    setSavingAnticola(true);
    try {
      await api.put(`/exams/${id}`, { shuffleQuestions: shuffleQ, shuffleOptions: shuffleO });
      message.success('Configurações anti-cola salvas!');
    } catch { message.error('Erro ao salvar configurações'); }
    finally { setSavingAnticola(false); }
  }

  async function openBankModal() {
    setBankModalOpen(true);
    setBankLoading(true);
    try {
      const res = await api.get('/question-bank');
      setBankQuestions(res.data);
    } catch { message.error('Erro ao carregar banco'); }
    finally { setBankLoading(false); }
  }

  async function importFromBank(bankQ) {
    try {
      await api.post(`/question-bank/import-to-exam/${id}`, { bankQuestionId: bankQ.id });
      message.success('Questão importada!');
      setBankModalOpen(false);
      fetchExam();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao importar');
    }
  }

  if (loading || !exam) return <Card loading />;

  const statusCfg = STATUS_CONFIG[exam.status];
  const totalPoints = exam.questions.reduce((acc, q) => acc + q.points, 0);
  const filteredBank = bankQuestions.filter(q =>
    !bankSearch || q.text.toLowerCase().includes(bankSearch.toLowerCase()) || (q.tags || '').toLowerCase().includes(bankSearch.toLowerCase())
  );

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/professor')}>Voltar</Button>
          <Title level={3} style={{ margin: 0 }}>{exam.title}</Title>
          <Tag color={statusCfg.color}>{statusCfg.label}</Tag>
        </Space>
        <Space>
          <Button onClick={() => navigate(`/professor/prova/${id}/resultados`)}>Ver Notas</Button>
          {statusCfg.next && (
            <Popconfirm
              title={statusCfg.next === 'ACTIVE' ? 'Ativar a prova? Os alunos poderão acessá-la.' : 'Encerrar a prova? Os alunos não poderão mais respondê-la.'}
              onConfirm={() => changeStatus(statusCfg.next)}
              okText="Sim" cancelText="Não"
            >
              <Button type={statusCfg.next === 'ACTIVE' ? 'primary' : 'danger'} icon={statusCfg.icon}>
                {statusCfg.nextLabel}
              </Button>
            </Popconfirm>
          )}
        </Space>
      </div>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        {/* Info básica */}
        <Col span={8}>
          <Card style={{ height: '100%' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>Código de acesso dos alunos</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 12px' }}>
              <Text style={{ fontSize: 30, fontWeight: 800, letterSpacing: 5, color: '#1677ff', fontFamily: 'monospace' }}>{exam.accessCode}</Text>
              <Button type="text" icon={<CopyOutlined />} onClick={copyCode} />
            </div>
            <Space wrap style={{ marginBottom: 10 }}>
              <Tag icon={<OrderedListOutlined />}>{exam.questions.length} questões</Tag>
              <Tag>{exam.durationMinutes} min</Tag>
              <Tag color="blue">{totalPoints} pts totais</Tag>
            </Space>

            {/* Bimestre */}
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>
                <CalendarOutlined style={{ marginRight: 4 }} />Bimestre
              </Text>
              <Space wrap size={4}>
                {Object.entries(BIMESTRE_CONFIG).map(([val, cfg]) => (
                  <div
                    key={val}
                    onClick={() => saveBimestre(val)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 6,
                      border: `1.5px solid ${bimestre === val ? cfg.color : '#e8e8e8'}`,
                      background: bimestre === val ? cfg.bg : '#fafafa',
                      cursor: savingBimestre ? 'wait' : 'pointer',
                      color: bimestre === val ? cfg.color : '#999',
                      fontWeight: bimestre === val ? 700 : 400,
                      fontSize: 12,
                      transition: 'all 0.15s',
                      userSelect: 'none',
                    }}
                  >
                    {cfg.label}
                  </div>
                ))}
              </Space>
            </div>

            {exam.description && <Paragraph style={{ marginTop: 10, color: '#666', fontSize: 13 }}>{exam.description}</Paragraph>}
          </Card>
        </Col>

        {/* Agendamento */}
        <Col span={8}>
          <Card style={{ height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#667eea18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalendarOutlined style={{ color: '#667eea', fontSize: 16 }} />
              </div>
              <div>
                <Text strong style={{ fontSize: 14 }}>Agendamento</Text>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Define quando a prova abre e fecha</div>
              </div>
            </div>

            <DatePicker.RangePicker
              showTime
              format="DD/MM/YYYY HH:mm"
              value={scheduleRange}
              onChange={val => setScheduleRange(val || [null, null])}
              placeholder={['Data/hora de início', 'Data/hora de fim']}
              size="small"
              style={{ width: '100%', marginBottom: 10 }}
            />

            {(exam.scheduledStart || exam.scheduledEnd) && (
              <div style={{ background: '#f8faff', borderRadius: 8, padding: '8px 12px', marginBottom: 10, fontSize: 12 }}>
                {exam.scheduledStart && (
                  <div style={{ color: '#52c41a' }}>▶ Abre: {new Date(exam.scheduledStart).toLocaleString('pt-BR')}</div>
                )}
                {exam.scheduledEnd && (
                  <div style={{ color: '#ff4d4f', marginTop: 2 }}>■ Fecha: {new Date(exam.scheduledEnd).toLocaleString('pt-BR')}</div>
                )}
              </div>
            )}

            <Button size="small" icon={<SaveOutlined />} onClick={saveSchedule} loading={savingSchedule} block type="primary" ghost>
              {scheduleRange[0] || scheduleRange[1] ? 'Salvar agendamento' : 'Sem agendamento (salvar)'}
            </Button>
          </Card>
        </Col>

        {/* Anti-cola */}
        <Col span={8}>
          <Card style={{ height: '100%', border: '1px solid #d9f7be' }} styles={{ body: { background: '#f6ffed', borderRadius: 8 } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#52c41a18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SafetyOutlined style={{ color: '#52c41a', fontSize: 16 }} />
              </div>
              <div>
                <Text strong style={{ fontSize: 14 }}>Mecanismos Anti-Cola</Text>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Impede que alunos se copiem</div>
              </div>
            </div>

            <Space direction="vertical" style={{ width: '100%', marginBottom: 14 }}>
              {/* Embaralhar questões */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid #d9f7be' }}>
                <Space>
                  <SwapOutlined style={{ color: shuffleQ ? '#52c41a' : '#d9d9d9', fontSize: 16 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Embaralhar questões</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>Ordem diferente para cada aluno</div>
                  </div>
                </Space>
                <Switch checked={shuffleQ} onChange={setShuffleQ} checkedChildren="ON" unCheckedChildren="OFF" />
              </div>

              {/* Embaralhar alternativas */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid #d9f7be' }}>
                <Space>
                  <OrderedListOutlined style={{ color: shuffleO ? '#52c41a' : '#d9d9d9', fontSize: 16 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Embaralhar alternativas</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>Opções A/B/C/D em ordem aleatória</div>
                  </div>
                </Space>
                <Switch checked={shuffleO} onChange={setShuffleO} checkedChildren="ON" unCheckedChildren="OFF" />
              </div>

              {/* Tela cheia — sempre ativo */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: 8, padding: '10px 14px', border: '1px solid #d9f7be', opacity: 0.7 }}>
                <Space>
                  <LockOutlined style={{ color: '#52c41a', fontSize: 16 }} />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>Tela cheia obrigatória</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>Saída registrada como violação</div>
                  </div>
                </Space>
                <Tag color="success" style={{ margin: 0 }}>Sempre ativo</Tag>
              </div>
            </Space>

            <Button size="small" icon={<SaveOutlined />} onClick={saveAnticola} loading={savingAnticola} block type="primary" style={{ background: '#52c41a', borderColor: '#52c41a' }}>
              Salvar configurações
            </Button>
          </Card>
        </Col>
      </Row>

      {exam.status === 'DRAFT' && exam.questions.length === 0 && (
        <Alert message="Adicione pelo menos uma questão antes de ativar a prova." type="warning" showIcon style={{ marginBottom: 16 }} />
      )}

      <Card
        title={<Space><Text strong>Questões</Text><Tag>{exam.questions.length}</Tag></Space>}
        extra={exam.status !== 'CLOSED' && (
          <Space>
            <Tooltip title="Importar do banco de questões">
              <Button icon={<BankOutlined />} onClick={openBankModal}>Banco</Button>
            </Tooltip>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddQuestion}>Adicionar Questão</Button>
          </Space>
        )}
      >
        {exam.questions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            <p>Nenhuma questão adicionada ainda.</p>
            <Space>
              <Button icon={<BankOutlined />} onClick={openBankModal}>Importar do Banco</Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={openAddQuestion}>Adicionar Questão</Button>
            </Space>
          </div>
        ) : (
          <List
            dataSource={exam.questions}
            renderItem={(q, idx) => (
              <List.Item
                actions={exam.status !== 'CLOSED' ? [
                  <Tooltip title="Salvar no banco de questões">
                    <Button size="small" icon={<BankOutlined />} onClick={() => saveToBank(q)} />
                  </Tooltip>,
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEditQuestion(q)}>Editar</Button>,
                  <Popconfirm title="Excluir questão?" onConfirm={() => deleteQuestion(q.id)} okText="Sim" cancelText="Não">
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>,
                ] : []}
                style={{ alignItems: 'flex-start' }}
              >
                <List.Item.Meta
                  avatar={<div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1677ff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{idx + 1}</div>}
                  title={
                    <Space>
                      <Text strong>{q.text}</Text>
                      <Tag color={QUESTION_COLORS[q.type]}>{QUESTION_LABELS[q.type]}</Tag>
                      <Tag>{q.points} pt{q.points !== 1 ? 's' : ''}</Tag>
                    </Space>
                  }
                  description={
                    q.type === 'MULTIPLE_CHOICE' || q.type === 'TRUE_FALSE' ? (
                      <Space wrap style={{ marginTop: 4 }}>
                        {q.options.map(o => (
                          <Tag key={o.id} color={o.isCorrect ? 'success' : 'default'}>{o.text}</Tag>
                        ))}
                      </Space>
                    ) : q.type === 'FILL_BLANK' ? (
                      <Text type="secondary">Resposta: <Text code>{q.correctBlank}</Text></Text>
                    ) : (
                      <Text type="secondary" style={{ fontStyle: 'italic' }}>Resposta aberta — correção manual pelo professor</Text>
                    )
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {groups.length > 0 && (
        <Card
          title={<Space><TeamOutlined /><Text strong>Turmas Vinculadas</Text></Space>}
          style={{ marginTop: 16 }}
          extra={<Text type="secondary" style={{ fontSize: 12 }}>Alunos dessas turmas verão esta avaliação no painel</Text>}
        >
          <Space wrap>
            {groups.map(g => (
              <Card
                key={g.id}
                size="small"
                style={{ minWidth: 200 }}
                styles={{ body: { padding: '12px 16px' } }}
              >
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                  <Space direction="vertical" size={0}>
                    <Text strong>{g.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{g.memberCount} aluno(s)</Text>
                  </Space>
                  <Switch
                    checked={g.linked}
                    checkedChildren="Vinculada"
                    unCheckedChildren="Vincular"
                    onChange={checked => toggleGroupLink(g, checked)}
                  />
                </Space>
              </Card>
            ))}
          </Space>
        </Card>
      )}

      {/* Modal de nova/editar questão */}
      <Modal
        title={editingQuestion ? 'Editar Questão' : 'Nova Questão'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={680}
      >
        <Form form={form} layout="vertical" onFinish={handleSaveQuestion}>
          <Form.Item name="type" label="Tipo de Questão" initialValue="MULTIPLE_CHOICE" rules={[{ required: true }]}>
            <Select onChange={type => {
              setQuestionType(type);
              if (type === 'TRUE_FALSE') {
                form.setFieldValue('trueFalseAnswer', 'Verdadeiro');
              } else if (type === 'MULTIPLE_CHOICE') {
                form.setFieldValue('options', [{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }]);
              }
            }}>
              <Select.Option value="MULTIPLE_CHOICE">Múltipla Escolha</Select.Option>
              <Select.Option value="TRUE_FALSE">Verdadeiro ou Falso</Select.Option>
              <Select.Option value="FILL_BLANK">Preencher Lacuna</Select.Option>
              <Select.Option value="ESSAY">Dissertativa (correção manual)</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="text" label="Enunciado" rules={[{ required: true, message: 'Enunciado obrigatório' }]}>
            <TextArea rows={3} placeholder="Digite o enunciado da questão..." />
          </Form.Item>

          <Form.Item name="points" label="Pontuação" initialValue={1} rules={[{ required: true }]}>
            <InputNumber min={0.5} max={100} step={0.5} style={{ width: 150 }} />
          </Form.Item>

          {questionType === 'MULTIPLE_CHOICE' && (
            <Form.Item label="Alternativas" required>
              <Form.List name="options" initialValue={[{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }]}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field, idx) => (
                      <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                        <Text style={{ width: 20 }}>{String.fromCharCode(65 + idx)})</Text>
                        <Form.Item {...field} name={[field.name, 'text']} rules={[{ required: true, message: 'Texto obrigatório' }]} style={{ marginBottom: 0, flex: 1 }}>
                          <Input placeholder={`Alternativa ${String.fromCharCode(65 + idx)}`} style={{ width: 360 }} />
                        </Form.Item>
                        <Form.Item {...field} name={[field.name, 'isCorrect']} valuePropName="checked" style={{ marginBottom: 0 }}>
                          <Switch checkedChildren="Correta" unCheckedChildren="Errada" />
                        </Form.Item>
                        {fields.length > 2 && <Button type="text" danger onClick={() => remove(field.name)}>X</Button>}
                      </Space>
                    ))}
                    {fields.length < 5 && <Button type="dashed" onClick={() => add({ text: '', isCorrect: false })} icon={<PlusOutlined />}>Adicionar alternativa</Button>}
                  </>
                )}
              </Form.List>
            </Form.Item>
          )}

          {questionType === 'TRUE_FALSE' && (
            <Form.Item
              name="trueFalseAnswer"
              label="Resposta Correta"
              initialValue="Verdadeiro"
              rules={[{ required: true, message: 'Selecione a resposta correta' }]}
            >
              <Radio.Group>
                <Radio.Button value="Verdadeiro" style={{ width: 140, textAlign: 'center', fontWeight: 600 }}>
                  ✓ Verdadeiro
                </Radio.Button>
                <Radio.Button value="Falso" style={{ width: 140, textAlign: 'center', fontWeight: 600 }}>
                  ✗ Falso
                </Radio.Button>
              </Radio.Group>
            </Form.Item>
          )}

          {questionType === 'FILL_BLANK' && (
            <Form.Item name="correctBlank" label="Resposta Correta" rules={[{ required: true, message: 'Resposta obrigatória' }]}>
              <Input placeholder="A resposta exata que o aluno deve digitar" />
            </Form.Item>
          )}

          {questionType === 'ESSAY' && (
            <Alert
              type="info"
              showIcon
              message="Questão dissertativa"
              description="O aluno digitará uma resposta livre. Você deverá corrigi-la manualmente na tela de resultados e atribuir a pontuação."
              style={{ marginBottom: 16 }}
            />
          )}

          <Divider />
          <Space>
            <Button type="primary" htmlType="submit">Salvar Questão</Button>
            <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
          </Space>
        </Form>
      </Modal>

      {/* Modal do banco de questões */}
      <Modal
        title={<Space><BankOutlined /><span>Banco de Questões</span></Space>}
        open={bankModalOpen}
        onCancel={() => { setBankModalOpen(false); setBankSearch(''); }}
        footer={<Button onClick={() => navigate('/professor/banco-questoes')} icon={<DownloadOutlined />}>Gerenciar banco completo</Button>}
        width={700}
      >
        <Input.Search
          placeholder="Buscar por texto ou tags..."
          value={bankSearch}
          onChange={e => setBankSearch(e.target.value)}
          style={{ marginBottom: 16 }}
        />
        {bankQuestions.length === 0 && !bankLoading && (
          <div style={{ textAlign: 'center', padding: 32, color: '#999' }}>
            <BankOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
            <Text type="secondary">Nenhuma questão no banco ainda.<br />Crie questões e salve no banco clicando em <BankOutlined /> em cada questão.</Text>
          </div>
        )}
        <List
          loading={bankLoading}
          dataSource={filteredBank}
          renderItem={q => (
            <List.Item
              actions={[
                <Button type="primary" size="small" onClick={() => importFromBank(q)}>Importar</Button>
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text>{q.text}</Text>
                    <Tag color={QUESTION_COLORS[q.type]}>{QUESTION_LABELS[q.type]}</Tag>
                    <Tag>{q.points} pt{q.points !== 1 ? 's' : ''}</Tag>
                  </Space>
                }
                description={q.tags ? <Text type="secondary" style={{ fontSize: 12 }}>Tags: {q.tags}</Text> : null}
              />
            </List.Item>
          )}
        />
      </Modal>
    </>
  );
}
