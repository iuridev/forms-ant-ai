import { Outlet, useNavigate } from 'react-router-dom';
import { Avatar, Dropdown, Typography, Space } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Text } = Typography;

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function StudentLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const userMenu = {
    items: [{ key: 'logout', icon: <LogoutOutlined />, label: 'Sair', danger: true }],
    onClick: ({ key }) => { if (key === 'logout') { logout(); navigate('/login'); } },
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Topbar */}
      <header style={{
        background: '#0d2137',
        height: 60,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #4f9cf9, #667eea)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>P</span>
          </div>
          <Text strong style={{ color: '#fff', fontSize: 17, letterSpacing: 0.3 }}>ProvaFácil</Text>
        </div>

        {/* Logo center / spacer */}
        <div />

        {/* User */}
        <Dropdown menu={userMenu} placement="bottomRight">
          <Space style={{ cursor: 'pointer', gap: 8 }}>
            <Avatar
              style={{ background: 'linear-gradient(135deg, #4f9cf9, #667eea)', fontWeight: 700, fontSize: 14 }}
            >
              {getInitials(user?.name)}
            </Avatar>
            <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>{user?.name?.split(' ')[0]}</Text>
          </Space>
        </Dropdown>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <Outlet />
      </main>
    </div>
  );
}
