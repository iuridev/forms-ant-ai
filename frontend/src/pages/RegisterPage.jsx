import { useState } from 'react';
import { Form, Input, Button, Card, Typography, Divider, Select, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, BookOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import GoogleLoginButton from '../components/GoogleLoginButton';
import api from '../api';

const { Title, Text } = Typography;

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(values) {
    setLoading(true);
    try {
      const res = await api.post('/auth/register', values);
      login(res.data.token, res.data.user);
      navigate(res.data.user.role === 'TEACHER' ? '/professor' : '/aluno');
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)' }}>
      <Card style={{ width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <BookOutlined style={{ fontSize: 48, color: '#1677ff' }} />
          <Title level={3} style={{ margin: '12px 0 4px' }}>Criar Conta</Title>
          <Text type="secondary">ProvaFácil</Text>
        </div>

        <GoogleLoginButton />

        <Divider plain><Text type="secondary" style={{ fontSize: 12 }}>ou cadastre com email</Text></Divider>

        <Form layout="vertical" onFinish={handleSubmit} size="large">
          <Form.Item name="name" rules={[{ required: true, message: 'Nome obrigatório' }]}>
            <Input prefix={<UserOutlined />} placeholder="Nome completo" />
          </Form.Item>
          <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Email válido obrigatório' }]}>
            <Input prefix={<MailOutlined />} placeholder="Email" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, min: 6, message: 'Senha com mínimo 6 caracteres' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Senha" />
          </Form.Item>
          <Form.Item name="role" initialValue="STUDENT" rules={[{ required: true }]}>
            <Select size="large">
              <Select.Option value="STUDENT">Sou Aluno</Select.Option>
              <Select.Option value="TEACHER">Sou Professor</Select.Option>
            </Select>
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Cadastrar
          </Button>
        </Form>

        <Divider />
        <div style={{ textAlign: 'center' }}>
          <Text type="secondary">Já tem conta? </Text>
          <Link to="/login">Entrar</Link>
        </div>
      </Card>
    </div>
  );
}
