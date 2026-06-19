import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Typography, Space } from 'antd';
import { BookOutlined, PlusOutlined, LogoutOutlined, UserOutlined, LineChartOutlined, TeamOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export default function TeacherLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKey = location.pathname.startsWith('/professor/alunos')
    ? '/professor/alunos'
    : location.pathname.startsWith('/professor/turmas')
    ? '/professor/turmas'
    : location.pathname;

  const menuItems = [
    { key: '/professor', icon: <BookOutlined />, label: 'Minhas Avaliações' },
    { key: '/professor/nova-prova', icon: <PlusOutlined />, label: 'Nova Avaliação' },
    { key: '/professor/turmas', icon: <TeamOutlined />, label: 'Turmas' },
    { key: '/professor/alunos', icon: <LineChartOutlined />, label: 'Desenvolvimento' },
  ];

  const userMenu = {
    items: [{ key: 'logout', icon: <LogoutOutlined />, label: 'Sair', danger: true }],
    onClick: ({ key }) => { if (key === 'logout') { logout(); navigate('/login'); } },
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="dark" width={220} breakpoint="lg" collapsedWidth={0}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <Text strong style={{ color: '#fff', fontSize: 18 }}>ProvaFácil</Text>
          <br />
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Professor</Text>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ marginTop: 8 }}
        />
      </Sider>

      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <Dropdown menu={userMenu} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ background: '#1677ff' }} />
              <Text strong>{user?.name}</Text>
            </Space>
          </Dropdown>
        </Header>

        <Content style={{ margin: 24, padding: 24, background: '#f5f5f5', minHeight: 'calc(100vh - 112px)' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
