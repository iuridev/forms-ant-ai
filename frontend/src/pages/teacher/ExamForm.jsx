import { useEffect, useState } from 'react';
import { Form, Input, Button, Card, Typography, InputNumber, message, Space, Radio, Alert } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, FileTextOutlined, BookOutlined, CalendarOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';

const { Title } = Typography;
const { TextArea } = Input;

const BIMESTRE_OPTIONS = [
  { value: '1', label: '1º Bimestre', color: '#1677ff' },
  { value: '2', label: '2º Bimestre', color: '#52c41a' },
  { value: '3', label: '3º Bimestre', color: '#fa8c16' },
  { value: '4', label: '4º Bimestre', color: '#722ed1' },
  { value: 'REC', label: 'Recuperação', color: '#f5222d' },
];

function BimestreSelector({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {BIMESTRE_OPTIONS.map(opt => {
        const selected = value === opt.value;
        return (
          <div
            key={opt.value}
            onClick={() => onChange(opt.value)}
            style={{
              padding: '8px 18px',
              borderRadius: 8,
              border: `2px solid ${selected ? opt.color : '#e8e8e8'}`,
              background: selected ? `${opt.color}18` : '#fafafa',
              cursor: 'pointer',
              color: selected ? opt.color : '#666',
              fontWeight: selected ? 700 : 400,
              fontSize: 14,
              transition: 'all 0.15s',
              userSelect: 'none',
            }}
          >
            {opt.label}
          </div>
        );
      })}
    </div>
  );
}

export default function ExamForm() {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('PROVA');
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  useEffect(() => {
    if (isEditing) {
      api.get(`/exams/${id}`).then(res => {
        const t = res.data.type || 'PROVA';
        setType(t);
        form.setFieldsValue({
          title: res.data.title,
          description: res.data.description,
          durationMinutes: res.data.durationMinutes,
          type: t,
          bimestre: res.data.bimestre || undefined,
        });
      }).catch(() => message.error('Erro ao carregar'));
    }
  }, [id]);

  async function handleSubmit(values) {
    setLoading(true);
    try {
      if (isEditing) {
        await api.put(`/exams/${id}`, values);
        message.success('Avaliação atualizada!');
        navigate(`/professor/prova/${id}`);
      } else {
        const res = await api.post('/exams', values);
        message.success(`${values.type === 'TAREFA' ? 'Tarefa' : 'Prova'} criada! Agora adicione as questões.`);
        navigate(`/professor/prova/${res.data.id}`);
      }
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  const isTask = type === 'TAREFA';

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/professor')}>Voltar</Button>
        <Title level={3} style={{ margin: 0 }}>
          {isEditing ? `Editar ${isTask ? 'Tarefa' : 'Prova'}` : 'Nova Avaliação'}
        </Title>
      </div>

      <Card style={{ maxWidth: 620 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} size="large" initialValues={{ type: 'PROVA', durationMinutes: 60 }}>

          <Form.Item name="type" label="Tipo de Avaliação" rules={[{ required: true }]}>
            <Radio.Group onChange={e => setType(e.target.value)} optionType="button" buttonStyle="solid">
              <Radio.Button value="PROVA">
                <Space><FileTextOutlined /> Prova</Space>
              </Radio.Button>
              <Radio.Button value="TAREFA">
                <Space><BookOutlined /> Tarefa</Space>
              </Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Alert
            type={isTask ? 'info' : 'warning'}
            showIcon
            style={{ marginBottom: 16 }}
            message={isTask
              ? 'Tarefa: o aluno terá 3 tentativas. A melhor nota será exibida.'
              : 'Prova: o aluno terá apenas 1 tentativa. Todas as violações são registradas.'}
          />

          <Form.Item
            name="title"
            label={`Título ${isTask ? 'da Tarefa' : 'da Prova'}`}
            rules={[{ required: true, message: 'Título obrigatório' }]}
          >
            <Input placeholder={isTask ? 'Ex: Tarefa de Matemática — Cap. 3' : 'Ex: Avaliação de Português'} />
          </Form.Item>

          <Form.Item
            name="bimestre"
            label={
              <Space>
                <CalendarOutlined style={{ color: '#667eea' }} />
                <span>Bimestre</span>
              </Space>
            }
            rules={[{ required: true, message: 'Selecione o bimestre' }]}
          >
            <BimestreSelector />
          </Form.Item>

          <Form.Item name="description" label="Descrição (opcional)">
            <TextArea rows={3} placeholder="Instruções gerais para o aluno..." />
          </Form.Item>

          <Form.Item name="durationMinutes" label="Duração (minutos)" rules={[{ required: true }]}>
            <InputNumber min={5} max={480} style={{ width: '100%' }} />
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              {isEditing ? 'Salvar Alterações' : `Criar ${isTask ? 'Tarefa' : 'Prova'}`}
            </Button>
            <Button onClick={() => navigate('/professor')}>Cancelar</Button>
          </Space>
        </Form>
      </Card>
    </>
  );
}
