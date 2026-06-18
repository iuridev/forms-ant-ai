import { Outlet, useNavigate } from 'react-router-dom';
import { Layout, Avatar, Dropdown, Typography, Space, Button } from 'antd';
import { UserOutlined, LogoutOutlined, BookOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Header, Content } = Layout;
const { Text } = Typography;

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const userMenu = {
    items: [{ key: 'logout', icon: <LogoutOutlined />, label: 'Sair', danger: true }],
    onClick: ({ key }) => { if (key === 'logout') { logout(); navigate('/login'); } },
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <Space>
          <BookOutlined style={{ fontSize: 24, color: '#1677ff' }} />
          <Text strong style={{ fontSize: 18 }}>ProvaFácil</Text>
        </Space>
        <Dropdown menu={userMenu} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar icon={<UserOutlined />} style={{ background: '#1677ff' }} />
            <Text strong>{user?.name}</Text>
          </Space>
        </Dropdown>
      </Header>

      <Content style={{ maxWidth: 900, margin: '32px auto', padding: '0 16px', width: '100%' }}>
        <Outlet />
      </Content>
    </Layout>
  );
}
