import { useEffect, useState } from 'react';
import {
  Card, Button, Typography, Tag, Space, Form, Input, Select, InputNumber,
  Switch, Divider, List, Popconfirm, message, Modal, Radio, Row, Col, Alert
} from 'antd';
import {
  ArrowLeftOutlined, PlusOutlined, DeleteOutlined, EditOutlined,
  PlayCircleOutlined, PauseCircleOutlined, StopOutlined, CopyOutlined, TeamOutlined
} from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const QUESTION_LABELS = {
  MULTIPLE_CHOICE: 'Múltipla Escolha',
  TRUE_FALSE: 'Verdadeiro/Falso',
  FILL_BLANK: 'Preencher Lacuna',
};

const STATUS_CONFIG = {
  DRAFT:  { color: 'default', label: 'Rascunho', next: 'ACTIVE', nextLabel: 'Ativar Prova', icon: <PlayCircleOutlined /> },
  ACTIVE: { color: 'success', label: 'Ativa',     next: 'CLOSED', nextLabel: 'Encerrar Prova', icon: <StopOutlined /> },
  CLOSED: { color: 'error',   label: 'Encerrada', next: null },
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

  async function fetchExam() {
    try {
      const res = await api.get(`/exams/${id}`);
      setExam(res.data);
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

  if (loading || !exam) return <Card loading />;

  const statusCfg = STATUS_CONFIG[exam.status];
  const totalPoints = exam.questions.reduce((acc, q) => acc + q.points, 0);

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
        <Col span={16}>
          <Card>
            <Space wrap>
              <Text><strong>Duração:</strong> {exam.durationMinutes} minutos</Text>
              <Divider type="vertical" />
              <Text><strong>Questões:</strong> {exam.questions.length}</Text>
              <Divider type="vertical" />
              <Text><strong>Total de pontos:</strong> {totalPoints}</Text>
            </Space>
            {exam.description && <Paragraph style={{ marginTop: 8, color: '#666' }}>{exam.description}</Paragraph>}
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Text type="secondary" style={{ fontSize: 12 }}>Código de acesso dos alunos</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <Text style={{ fontSize: 28, fontWeight: 700, letterSpacing: 4, color: '#1677ff' }}>{exam.accessCode}</Text>
              <Button type="text" icon={<CopyOutlined />} onClick={copyCode} />
            </div>
          </Card>
        </Col>
      </Row>

      {exam.status === 'DRAFT' && exam.questions.length === 0 && (
        <Alert message="Adicione pelo menos uma questão antes de ativar a prova." type="warning" showIcon style={{ marginBottom: 16 }} />
      )}

      <Card
        title={<Space><Text strong>Questões</Text><Tag>{exam.questions.length}</Tag></Space>}
        extra={exam.status !== 'CLOSED' && <Button type="primary" icon={<PlusOutlined />} onClick={openAddQuestion}>Adicionar Questão</Button>}
      >
        {exam.questions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            <p>Nenhuma questão adicionada ainda.</p>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddQuestion}>Adicionar Primeira Questão</Button>
          </div>
        ) : (
          <List
            dataSource={exam.questions}
            renderItem={(q, idx) => (
              <List.Item
                actions={exam.status !== 'CLOSED' ? [
                  <Button size="small" icon={<EditOutlined />} onClick={() => openEditQuestion(q)}>Editar</Button>,
                  <Popconfirm title="Excluir questão?" onConfirm={() => deleteQuestion(q.id)} okText="Sim" cancelText="Não">
                    <Button size="small" danger icon={<DeleteOutlined />} />
                  </Popconfirm>
                ] : []}
                style={{ alignItems: 'flex-start' }}
              >
                <List.Item.Meta
                  avatar={<div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1677ff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{idx + 1}</div>}
                  title={
                    <Space>
                      <Text strong>{q.text}</Text>
                      <Tag color="blue">{QUESTION_LABELS[q.type]}</Tag>
                      <Tag>{q.points} pt{q.points !== 1 ? 's' : ''}</Tag>
                    </Space>
                  }
                  description={
                    q.type !== 'FILL_BLANK' ? (
                      <Space wrap style={{ marginTop: 4 }}>
                        {q.options.map(o => (
                          <Tag key={o.id} color={o.isCorrect ? 'success' : 'default'}>{o.text}</Tag>
                        ))}
                      </Space>
                    ) : (
                      <Text type="secondary">Resposta: <Text code>{q.correctBlank}</Text></Text>
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
                bodyStyle={{ padding: '12px 16px' }}
              >
                <Space style={{ justifyContent: 'space-between', width: '100%' }}>
                  <Space direction="vertical" size={0}>
                    <Text strong>{g.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{g.memberCount} aluno(s)</Text>
                  </Space>
                  <Switch
                    checked={g.linked}
                    checkedChildren="Vinculada"
                    unCheckedChildren="Desvincular"
                    onChange={checked => toggleGroupLink(g, checked)}
                  />
                </Space>
              </Card>
            ))}
          </Space>
        </Card>
      )}

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
            </Select>
          </Form.Item>

          <Form.Item name="text" label="Enunciado" rules={[{ required: true, message: 'Enunciado obrigatório' }]}>
            <TextArea rows={3} placeholder="Digite o enunciado da questão..." />
          </Form.Item>

          <Form.Item name="points" label="Pontuação" initialValue={1} rules={[{ required: true }]}>
            <InputNumber min={0.5} max={100} step={0.5} style={{ width: 150 }} />
          </Form.Item>

          {(questionType === 'MULTIPLE_CHOICE') && (
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

          <Divider />
          <Space>
            <Button type="primary" htmlType="submit">Salvar Questão</Button>
            <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
          </Space>
        </Form>
      </Modal>
    </>
  );
}
