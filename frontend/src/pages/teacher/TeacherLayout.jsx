import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Avatar, Dropdown, Typography, Space, Tooltip } from 'antd';
import {
  BookOutlined, PlusOutlined, LogoutOutlined, LineChartOutlined,
  TeamOutlined, BankOutlined, DashboardOutlined, MenuFoldOutlined, MenuUnfoldOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../contexts/AuthContext';

const { Text } = Typography;

const NAV_ITEMS = [
  { key: '/professor', icon: <DashboardOutlined />, label: 'Painel' },
  { key: '/professor/nova-prova', icon: <PlusOutlined />, label: 'Nova Avaliação' },
  { key: '/professor/turmas', icon: <TeamOutlined />, label: 'Turmas' },
  { key: '/professor/alunos', icon: <LineChartOutlined />, label: 'Desempenho' },
  { key: '/professor/banco-questoes', icon: <BankOutlined />, label: 'Banco de Questões' },
];

function getInitials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function TeacherLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const selectedKey = NAV_ITEMS
    .slice()
    .reverse()
    .find(item => location.pathname.startsWith(item.key))?.key || '/professor';

  const userMenu = {
    items: [{ key: 'logout', icon: <LogoutOutlined />, label: 'Sair da conta', danger: true }],
    onClick: ({ key }) => { if (key === 'logout') { logout(); navigate('/login'); } },
  };

  const SIDEBAR_W = collapsed ? 72 : 240;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f2f7', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: SIDEBAR_W,
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #0d1b2e 0%, #0f2444 40%, #0d2137 100%)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0, top: 0, bottom: 0,
        zIndex: 200,
        transition: 'width 0.22s cubic-bezier(.4,0,.2,1)',
        boxShadow: '4px 0 24px rgba(0,0,0,0.25)',
        overflow: 'hidden',
      }}>

        {/* Logo */}
        <div style={{
          padding: collapsed ? '20px 0' : '24px 20px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          justifyContent: collapsed ? 'center' : 'flex-start',
          flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: 'linear-gradient(135deg, #4f9cf9, #667eea)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 900, color: '#fff',
            boxShadow: '0 4px 12px rgba(79,156,249,0.4)',
          }}>P</div>
          {!collapsed && (
            <div>
              <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, letterSpacing: 0.3 }}>ProvaFácil</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 1 }}>Portal do Professor</div>
            </div>
          )}
        </div>

        {/* Professor card */}
        {!collapsed && (
          <div style={{
            margin: '16px 12px',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: 12,
            padding: '14px 16px',
            border: '1px solid rgba(255,255,255,0.07)',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #4f9cf9, #667eea)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15, fontWeight: 700, color: '#fff',
              }}>
                {getInitials(user?.name)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.name}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginTop: 1 }}>Professor</div>
              </div>
            </div>
          </div>
        )}
        {collapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0', flexShrink: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: 'linear-gradient(135deg, #4f9cf9, #667eea)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700, color: '#fff',
            }}>
              {getInitials(user?.name)}
            </div>
          </div>
        )}

        {/* Divisor */}
        {!collapsed && (
          <div style={{ margin: '0 16px 8px', fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: 1 }}>
            Menu
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex: 1, padding: '4px 8px', overflow: 'hidden' }}>
          {NAV_ITEMS.map(item => {
            const active = selectedKey === item.key;
            return (
              <Tooltip key={item.key} title={collapsed ? item.label : ''} placement="right">
                <div
                  onClick={() => navigate(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: collapsed ? '11px 0' : '11px 14px',
                    borderRadius: 10,
                    marginBottom: 2,
                    cursor: 'pointer',
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    background: active ? 'linear-gradient(90deg, rgba(79,156,249,0.22), rgba(102,126,234,0.12))' : 'transparent',
                    borderLeft: active ? '3px solid #4f9cf9' : '3px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ fontSize: 17, color: active ? '#4f9cf9' : 'rgba(255,255,255,0.55)', flexShrink: 0 }}>
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <span style={{ fontSize: 13.5, fontWeight: active ? 600 : 400, color: active ? '#fff' : 'rgba(255,255,255,0.65)', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </span>
                  )}
                </div>
              </Tooltip>
            );
          })}
        </nav>

        {/* Bottom: collapse + logout */}
        <div style={{ padding: '8px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
          <Tooltip title={collapsed ? 'Expandir' : ''} placement="right">
            <div
              onClick={() => setCollapsed(c => !c)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: collapsed ? '10px 0' : '10px 14px',
                borderRadius: 8, cursor: 'pointer', marginBottom: 4,
                justifyContent: collapsed ? 'center' : 'flex-start',
                color: 'rgba(255,255,255,0.4)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,0.7)'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.4)'}
            >
              <span style={{ fontSize: 16 }}>{collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}</span>
              {!collapsed && <span style={{ fontSize: 12 }}>Recolher menu</span>}
            </div>
          </Tooltip>

          <Tooltip title={collapsed ? 'Sair' : ''} placement="right">
            <div
              onClick={() => { logout(); navigate('/login'); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: collapsed ? '10px 0' : '10px 14px',
                borderRadius: 8, cursor: 'pointer',
                justifyContent: collapsed ? 'center' : 'flex-start',
                color: 'rgba(255,100,100,0.6)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#ff6b6b'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,100,100,0.6)'}
            >
              <LogoutOutlined style={{ fontSize: 16 }} />
              {!collapsed && <span style={{ fontSize: 12 }}>Sair da conta</span>}
            </div>
          </Tooltip>
        </div>
      </aside>

      {/* ── Main area ── */}
      <div style={{ marginLeft: SIDEBAR_W, flex: 1, display: 'flex', flexDirection: 'column', transition: 'margin-left 0.22s cubic-bezier(.4,0,.2,1)', minWidth: 0 }}>

        {/* Topbar */}
        <header style={{
          height: 60,
          background: '#fff',
          borderBottom: '1px solid #eaecf0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
        }}>
          <div>
            <span style={{ color: '#888', fontSize: 13 }}>{getGreeting()}, </span>
            <span style={{ color: '#1a1a2e', fontSize: 13, fontWeight: 600 }}>
              Prof. {user?.name?.split(' ')[0]}
            </span>
            <span style={{ color: '#bbb', fontSize: 12, marginLeft: 10 }}>
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>

          <Dropdown menu={userMenu} placement="bottomRight">
            <Space style={{ cursor: 'pointer', gap: 8 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                background: 'linear-gradient(135deg, #4f9cf9, #667eea)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: '#fff',
              }}>
                {getInitials(user?.name)}
              </div>
              <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>{user?.name?.split(' ')[0]}</div>
                <div style={{ fontSize: 11, color: '#888' }}>Professor</div>
              </div>
            </Space>
          </Dropdown>
        </header>

        {/* Content */}
        <main style={{ flex: 1, padding: '28px 28px 40px', maxWidth: 1280, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
