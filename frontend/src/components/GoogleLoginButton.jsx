import { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { Button, Modal, Select, Typography, message } from 'antd';
import { GoogleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api';

const { Text } = Typography;

export default function GoogleLoginButton() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [roleModal, setRoleModal] = useState(false);
  const [pendingCredential, setPendingCredential] = useState(null);
  const [selectedRole, setSelectedRole] = useState('STUDENT');

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        // Troca o access_token pelo id_token via userinfo
        const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        }).then(r => r.json());

        // Envia para o backend como credential (email + name)
        const res = await api.post('/auth/google', {
          credential: tokenResponse.access_token,
          googleUserInfo: userInfo,
        });

        if (res.data.needsRole) {
          setPendingCredential({ access_token: tokenResponse.access_token, userInfo });
          setRoleModal(true);
          return;
        }

        login(res.data.token, res.data.user);
        navigate(res.data.user.role === 'TEACHER' ? '/professor' : '/aluno');
      } catch (err) {
        message.error(err.response?.data?.error || 'Erro ao autenticar com Google');
      } finally {
        setLoading(false);
      }
    },
    onError: () => message.error('Login com Google cancelado'),
  });

  async function confirmRole() {
    setLoading(true);
    try {
      const res = await api.post('/auth/google', {
        credential: pendingCredential.access_token,
        googleUserInfo: pendingCredential.userInfo,
        role: selectedRole,
      });
      login(res.data.token, res.data.user);
      navigate(res.data.user.role === 'TEACHER' ? '/professor' : '/aluno');
    } catch (err) {
      message.error(err.response?.data?.error || 'Erro ao criar conta');
    } finally {
      setLoading(false);
      setRoleModal(false);
    }
  }

  return (
    <>
      <Button
        block
        size="large"
        icon={<GoogleOutlined />}
        loading={loading}
        onClick={() => googleLogin()}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, border: '1px solid #d9d9d9', color: '#444' }}
      >
        Entrar com Google
      </Button>

      <Modal
        title="Qual é o seu papel?"
        open={roleModal}
        onOk={confirmRole}
        onCancel={() => setRoleModal(false)}
        okText="Criar Conta"
        cancelText="Cancelar"
        confirmLoading={loading}
      >
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          É a primeira vez que você acessa com essa conta Google. Selecione seu papel:
        </Text>
        <Select
          value={selectedRole}
          onChange={setSelectedRole}
          size="large"
          style={{ width: '100%' }}
        >
          <Select.Option value="STUDENT">Sou Aluno</Select.Option>
          <Select.Option value="TEACHER">Sou Professor</Select.Option>
        </Select>
      </Modal>
    </>
  );
}
