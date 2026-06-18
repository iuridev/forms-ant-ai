import { useEffect, useState } from 'react';
import { Form, Input, Button, Card, Typography, InputNumber, message, Space } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';

const { Title } = Typography;
const { TextArea } = Input;

export default function ExamForm() {
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  useEffect(() => {
    if (isEditing) {
      api.get(`/exams/${id}`).then(res => {
        form.setFieldsValue({
          title: res.data.title,
          description: res.data.description,
          durationMinutes: res.data.durationMinutes,
        });
      }).catch(() => message.error('Erro ao carregar prova'));
    }
  }, [id]);

  async function handleSubmit(values) {
    setLoading(true);
    try {
      if (isEditing) {
        await api.put(`/exams/${id}`, values);
        message.success('Prova atualizada!');
        navigate(`/professor/prova/${id}`);
      } else {
        const res = await api.post('/exams', values);
        message.success('Prova criada! Agora adicione as questões.');
        navigate(`/professor/prova/${res.data.id}`);
      }
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao salvar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/professor')}>Voltar</Button>
        <Title level={3} style={{ margin: 0 }}>{isEditing ? 'Editar Prova' : 'Nova Prova'}</Title>
      </div>

      <Card style={{ maxWidth: 600 }}>
        <Form form={form} layout="vertical" onFinish={handleSubmit} size="large">
          <Form.Item name="title" label="Título da Prova" rules={[{ required: true, message: 'Título obrigatório' }]}>
            <Input placeholder="Ex: Avaliação de Matemática - 3° Bimestre" />
          </Form.Item>

          <Form.Item name="description" label="Descrição (opcional)">
            <TextArea rows={3} placeholder="Instruções gerais para o aluno..." />
          </Form.Item>

          <Form.Item name="durationMinutes" label="Duração (minutos)" initialValue={60} rules={[{ required: true }]}>
            <InputNumber min={5} max={480} style={{ width: '100%' }} />
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
              {isEditing ? 'Salvar Alterações' : 'Criar Prova'}
            </Button>
            <Button onClick={() => navigate('/professor')}>Cancelar</Button>
          </Space>
        </Form>
      </Card>
    </>
  );
}
