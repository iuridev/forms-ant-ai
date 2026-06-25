import { useEffect, useState } from 'react';
import {
  Card, Button, Typography, Tag, Space, Form, Input, Select, InputNumber,
  Switch, Divider, List, Popconfirm, message, Modal, Radio, Empty, Row, Col,
} from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined, BankOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../../api';

const { Title, Text } = Typography;
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

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [questionType, setQuestionType] = useState('MULTIPLE_CHOICE');
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();

  async function fetchBank() {
    setLoading(true);
    try {
      const res = await api.get('/question-bank');
      setQuestions(res.data);
    } catch { message.error('Erro ao carregar banco'); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchBank(); }, []);

  function openAdd() {
    setEditing(null);
    form.resetFields();
    setQuestionType('MULTIPLE_CHOICE');
    setModalOpen(true);
  }

  function openEdit(q) {
    setEditing(q);
    setQuestionType(q.type);
    form.setFieldsValue({
      text: q.text,
      type: q.type,
      points: q.points,
      tags: q.tags,
      correctBlank: q.correctBlank,
      options: q.options?.length ? q.options : [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
      trueFalseAnswer: q.type === 'TRUE_FALSE'
        ? (q.options?.find(o => o.isCorrect)?.text ?? 'Verdadeiro')
        : undefined,
    });
    setModalOpen(true);
  }

  async function handleSave(values) {
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
      if (editing) {
        await api.put(`/question-bank/${editing.id}`, values);
        message.success('Questão atualizada!');
      } else {
        await api.post('/question-bank', values);
        message.success('Questão adicionada ao banco!');
      }
      setModalOpen(false);
      fetchBank();
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar');
    }
  }

  async function handleDelete(qId) {
    try {
      await api.delete(`/question-bank/${qId}`);
      message.success('Questão removida do banco');
      fetchBank();
    } catch { message.error('Erro ao excluir'); }
  }

  const filtered = questions.filter(q =>
    !search || q.text.toLowerCase().includes(search.toLowerCase()) || (q.tags || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <BankOutlined style={{ fontSize: 24, color: '#667eea' }} />
          <Title level={3} style={{ margin: 0 }}>Banco de Questões</Title>
          <Tag color="purple">{questions.length} questões</Tag>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>
          Nova Questão
        </Button>
      </div>

      <Card>
        <Input
          prefix={<SearchOutlined style={{ color: '#aaa' }} />}
          placeholder="Buscar por texto ou tags..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 16, maxWidth: 400 }}
          allowClear
        />

        {filtered.length === 0 && !loading && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              search
                ? 'Nenhuma questão encontrada com este filtro.'
                : 'Banco vazio. Adicione questões ou salve questões de uma prova clicando no ícone de banco.'
            }
          >
            {!search && <Button type="primary" icon={<PlusOutlined />} onClick={openAdd}>Criar primeira questão</Button>}
          </Empty>
        )}

        <List
          loading={loading}
          dataSource={filtered}
          renderItem={(q, idx) => (
            <List.Item
              actions={[
                <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(q)}>Editar</Button>,
                <Popconfirm title="Remover do banco?" onConfirm={() => handleDelete(q.id)} okText="Sim" cancelText="Não">
                  <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>,
              ]}
              style={{ alignItems: 'flex-start' }}
            >
              <List.Item.Meta
                avatar={
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#667eea', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                    {idx + 1}
                  </div>
                }
                title={
                  <Space wrap>
                    <Text strong>{q.text}</Text>
                    <Tag color={QUESTION_COLORS[q.type]}>{QUESTION_LABELS[q.type]}</Tag>
                    <Tag>{q.points} pt{q.points !== 1 ? 's' : ''}</Tag>
                    {q.tags && q.tags.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                      <Tag key={t} color="geekblue" style={{ fontSize: 11 }}>{t}</Tag>
                    ))}
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
                    <Text type="secondary" style={{ fontStyle: 'italic' }}>Correção manual</Text>
                  )
                }
              />
            </List.Item>
          )}
        />
      </Card>

      <Modal
        title={editing ? 'Editar Questão do Banco' : 'Nova Questão no Banco'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={680}
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="type" label="Tipo de Questão" initialValue="MULTIPLE_CHOICE" rules={[{ required: true }]}>
            <Select onChange={type => {
              setQuestionType(type);
              if (type === 'TRUE_FALSE') form.setFieldValue('trueFalseAnswer', 'Verdadeiro');
              else if (type === 'MULTIPLE_CHOICE') form.setFieldValue('options', [{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }]);
            }}>
              <Select.Option value="MULTIPLE_CHOICE">Múltipla Escolha</Select.Option>
              <Select.Option value="TRUE_FALSE">Verdadeiro ou Falso</Select.Option>
              <Select.Option value="FILL_BLANK">Preencher Lacuna</Select.Option>
              <Select.Option value="ESSAY">Dissertativa</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="text" label="Enunciado" rules={[{ required: true, message: 'Enunciado obrigatório' }]}>
            <TextArea rows={3} placeholder="Digite o enunciado da questão..." />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="points" label="Pontuação" initialValue={1} rules={[{ required: true }]}>
                <InputNumber min={0.5} max={100} step={0.5} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="tags" label="Tags (separadas por vírgula)">
                <Input placeholder="Ex: matemática, frações, 8º ano" />
              </Form.Item>
            </Col>
          </Row>

          {questionType === 'MULTIPLE_CHOICE' && (
            <Form.Item label="Alternativas" required>
              <Form.List name="options" initialValue={[{ text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }, { text: '', isCorrect: false }]}>
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field, idx) => (
                      <Space key={field.key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                        <Text style={{ width: 20 }}>{String.fromCharCode(65 + idx)})</Text>
                        <Form.Item {...field} name={[field.name, 'text']} rules={[{ required: true, message: 'Texto obrigatório' }]} style={{ marginBottom: 0, flex: 1 }}>
                          <Input placeholder={`Alternativa ${String.fromCharCode(65 + idx)}`} style={{ width: 340 }} />
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
            <Form.Item name="trueFalseAnswer" label="Resposta Correta" initialValue="Verdadeiro" rules={[{ required: true }]}>
              <Radio.Group>
                <Radio.Button value="Verdadeiro" style={{ width: 140, textAlign: 'center', fontWeight: 600 }}>✓ Verdadeiro</Radio.Button>
                <Radio.Button value="Falso" style={{ width: 140, textAlign: 'center', fontWeight: 600 }}>✗ Falso</Radio.Button>
              </Radio.Group>
            </Form.Item>
          )}

          {questionType === 'FILL_BLANK' && (
            <Form.Item name="correctBlank" label="Resposta Correta" rules={[{ required: true, message: 'Resposta obrigatória' }]}>
              <Input placeholder="A resposta exata" />
            </Form.Item>
          )}

          <Divider />
          <Space>
            <Button type="primary" htmlType="submit">{editing ? 'Salvar alterações' : 'Adicionar ao banco'}</Button>
            <Button onClick={() => setModalOpen(false)}>Cancelar</Button>
          </Space>
        </Form>
      </Modal>
    </>
  );
}
