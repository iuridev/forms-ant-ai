import { Button, Typography, Space, Row, Col, Card } from 'antd';
import {
  BookOutlined, SafetyOutlined, BarChartOutlined,
  CheckCircleOutlined, ClockCircleOutlined, TeamOutlined,
  LoginOutlined, UserAddOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

const features = [
  {
    icon: <BookOutlined style={{ fontSize: 32, color: '#1677ff' }} />,
    title: 'Provas Personalizadas',
    desc: 'Crie provas com questões de múltipla escolha, verdadeiro/falso e preenchimento de lacuna. Organize por turma e disciplina.',
  },
  {
    icon: <CheckCircleOutlined style={{ fontSize: 32, color: '#52c41a' }} />,
    title: 'Correção Automática',
    desc: 'As notas são calculadas instantaneamente ao aluno entregar. Sem gastar tempo corrigindo papel por papel.',
  },
  {
    icon: <SafetyOutlined style={{ fontSize: 32, color: '#fa8c16' }} />,
    title: 'Anti-Cola Inteligente',
    desc: 'Prova em tela cheia obrigatória. Cada segundo fora da janela é registrado e reportado ao professor em tempo real.',
  },
  {
    icon: <ClockCircleOutlined style={{ fontSize: 32, color: '#eb2f96' }} />,
    title: 'Tempo Controlado',
    desc: 'Defina o tempo limite de cada prova. O sistema entrega automaticamente quando o tempo acaba.',
  },
  {
    icon: <BarChartOutlined style={{ fontSize: 32, color: '#722ed1' }} />,
    title: 'Relatórios Detalhados',
    desc: 'Veja a nota de cada aluno, quais questões erraram, quantos segundos ficaram fora da prova e uma linha do tempo de violações.',
  },
  {
    icon: <TeamOutlined style={{ fontSize: 32, color: '#13c2c2' }} />,
    title: 'Acesso por Código',
    desc: 'O aluno entra na prova com um código de 6 letras. Simples, sem precisar criar login antecipado.',
  },
];

const steps = [
  { num: '01', role: 'Professor', text: 'Crie a prova e adicione as questões com o gabarito.' },
  { num: '02', role: 'Professor', text: 'Ative a prova e compartilhe o código de 6 letras com a turma.' },
  { num: '03', role: 'Aluno', text: 'Entre com o código, inicie em tela cheia e responda as questões.' },
  { num: '04', role: 'Professor', text: 'Veja as notas e o relatório de comportamento de cada aluno.' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', borderBottom: '1px solid #f0f0f0', padding: '0 48px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Space>
          <BookOutlined style={{ fontSize: 22, color: '#1677ff' }} />
          <Text strong style={{ fontSize: 18 }}>ProvaFácil</Text>
        </Space>
        <Space>
          <Button onClick={() => navigate('/login')}>Entrar</Button>
          <Button type="primary" icon={<UserAddOutlined />} onClick={() => navigate('/cadastro')}>Criar Conta</Button>
        </Space>
      </nav>

      {/* Hero */}
      <section style={{ background: 'linear-gradient(135deg, #0a1628 0%, #0d2550 50%, #0a1628 100%)', padding: '100px 48px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(22,119,255,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(82,196,26,0.1) 0%, transparent 50%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 760, margin: '0 auto' }}>
          <div style={{ display: 'inline-block', background: 'rgba(22,119,255,0.15)', border: '1px solid rgba(22,119,255,0.3)', borderRadius: 20, padding: '4px 16px', marginBottom: 24 }}>
            <Text style={{ color: '#69b1ff', fontSize: 13, fontWeight: 600 }}>Sistema de Avaliações Online</Text>
          </div>
          <Title level={1} style={{ color: '#fff', fontSize: 54, fontWeight: 800, lineHeight: 1.15, margin: '0 0 20px' }}>
            Aplique provas online<br />
            <span style={{ background: 'linear-gradient(90deg, #1677ff, #52c41a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              com Correção automática!
            </span>
          </Title>
          <Paragraph style={{ color: '#8ba3c7', fontSize: 18, maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.7 }}>
            Crie provas, gere um código de acesso e deixe o sistema corrigir automaticamente. Com monitoramento anti-cola em tempo real.
          </Paragraph>
          <Space size={16} wrap style={{ justifyContent: 'center' }}>
            <Button type="primary" size="large" icon={<UserAddOutlined />} onClick={() => navigate('/cadastro')} style={{ height: 48, paddingInline: 32, fontSize: 16, fontWeight: 600 }}>
              Começar Gratuitamente
            </Button>
            <Button size="large" onClick={() => navigate('/login')} style={{ height: 48, paddingInline: 32, fontSize: 16, background: 'transparent', borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>
              Já tenho conta
            </Button>
          </Space>
        </div>
      </section>

      {/* Estatísticas */}
      <section style={{ background: '#fafafa', borderBottom: '1px solid #f0f0f0', padding: '32px 48px' }}>
        <Row justify="center" gutter={[48, 0]}>
          {[
            { value: '3', label: 'Tipos de questão' },
            { value: '100%', label: 'Correção automática' },
            { value: '6', label: 'Letras para entrar na prova' },
            { value: '0', label: 'Papel necessário' },
          ].map(s => (
            <Col key={s.label} style={{ textAlign: 'center', padding: '8px 32px' }}>
              <Text style={{ fontSize: 36, fontWeight: 800, color: '#1677ff', display: 'block' }}>{s.value}</Text>
              <Text type="secondary" style={{ fontSize: 13 }}>{s.label}</Text>
            </Col>
          ))}
        </Row>
      </section>

      {/* Funcionalidades */}
      <section style={{ padding: '80px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <Title level={2} style={{ margin: '0 0 12px' }}>Tudo que você precisa em um só lugar</Title>
          <Text type="secondary" style={{ fontSize: 16 }}>Do cadastro da prova até o relatório de notas — sem complicação.</Text>
        </div>
        <Row gutter={[24, 24]}>
          {features.map(f => (
            <Col xs={24} sm={12} lg={8} key={f.title}>
              <Card hoverable style={{ height: '100%', borderRadius: 12 }} bodyStyle={{ padding: 28 }}>
                <div style={{ marginBottom: 16 }}>{f.icon}</div>
                <Title level={5} style={{ margin: '0 0 8px' }}>{f.title}</Title>
                <Text type="secondary" style={{ lineHeight: 1.6 }}>{f.desc}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </section>

      {/* Como funciona */}
      <section style={{ background: '#f5f7ff', padding: '80px 48px' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <Title level={2} style={{ margin: '0 0 12px' }}>Como funciona</Title>
            <Text type="secondary" style={{ fontSize: 16 }}>Quatro passos do início ao resultado.</Text>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 24, alignItems: 'flex-start', background: '#fff', borderRadius: 12, padding: '20px 28px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ minWidth: 48, height: 48, borderRadius: 12, background: i % 2 === 0 ? '#1677ff' : '#52c41a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Text strong style={{ color: '#fff', fontSize: 15 }}>{s.num}</Text>
                </div>
                <div>
                  <Text style={{ fontSize: 11, fontWeight: 700, color: i % 2 === 0 ? '#1677ff' : '#52c41a', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>{s.role}</Text>
                  <Text style={{ fontSize: 15 }}>{s.text}</Text>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Anti-cola destaque */}
      <section style={{ padding: '80px 48px', maxWidth: 1000, margin: '0 auto' }}>
        <Row gutter={[48, 32]} align="middle">
          <Col xs={24} md={12}>
            <div style={{ display: 'inline-block', background: '#fff7e6', borderRadius: 8, padding: '4px 12px', marginBottom: 16 }}>
              <Text style={{ color: '#fa8c16', fontWeight: 600, fontSize: 12 }}>ANTI-COLA</Text>
            </div>
            <Title level={2} style={{ margin: '0 0 16px' }}>Registra cada segundo fora da prova</Title>
            <Paragraph style={{ fontSize: 15, color: '#555', lineHeight: 1.8, margin: '0 0 24px' }}>
              O sistema detecta quando o aluno sai da tela cheia, troca de aba ou muda de janela — inclusive se abrir programas externos como uma IA.
            </Paragraph>
            <Space direction="vertical" size={12}>
              {[
                'Tela cheia obrigatória ao iniciar',
                'Copiar, colar e atalhos bloqueados',
                'Tempo fora da prova contado em segundos',
                'Linha do tempo de violações por aluno',
                'Alunos suspeitos destacados no relatório',
              ].map(item => (
                <Space key={item}>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <Text>{item}</Text>
                </Space>
              ))}
            </Space>
          </Col>
          <Col xs={24} md={12}>
            <div style={{ background: '#0f1923', borderRadius: 16, padding: 24, fontFamily: 'monospace' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, borderBottom: '1px solid #1f2d3d', paddingBottom: 12 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f56' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbd2e' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27c93f' }} />
                <Text style={{ color: '#8899aa', fontSize: 12, marginLeft: 8 }}>Relatório do Aluno — João Silva</Text>
              </div>
              {[
                { label: 'Nota', value: '7.5 / 10', color: '#52c41a' },
                { label: 'Tempo fora da prova', value: '01m 43s', color: '#faad14' },
                { label: 'Violações', value: '5 eventos', color: '#ff7875' },
                { label: 'Situação', value: '⚠ Suspeito', color: '#ff7875' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1f2d3d' }}>
                  <Text style={{ color: '#8899aa', fontSize: 13 }}>{r.label}</Text>
                  <Text style={{ color: r.color, fontWeight: 600, fontSize: 13 }}>{r.value}</Text>
                </div>
              ))}
              <div style={{ marginTop: 16 }}>
                <Text style={{ color: '#8899aa', fontSize: 11, display: 'block', marginBottom: 8 }}>LINHA DO TEMPO</Text>
                {[
                  ['09:03:12', 'Saiu da tela cheia', '8s fora'],
                  ['09:07:45', 'Troca de aba', '35s fora'],
                  ['09:12:01', 'Perda de foco', '60s fora'],
                ].map(([time, event, dur]) => (
                  <div key={time} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ color: '#4a5568', fontSize: 11, minWidth: 60 }}>{time}</Text>
                    <Text style={{ color: '#faad14', fontSize: 12 }}>{event}</Text>
                    <Text style={{ color: '#ff7875', fontSize: 11 }}>{dur}</Text>
                  </div>
                ))}
              </div>
            </div>
          </Col>
        </Row>
      </section>

      {/* CTA Final */}
      <section style={{ background: 'linear-gradient(135deg, #1677ff 0%, #0958d9 100%)', padding: '80px 48px', textAlign: 'center' }}>
        <Title level={2} style={{ color: '#fff', margin: '0 0 16px' }}>Pronto para começar?</Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16, margin: '0 auto 40px', maxWidth: 480 }}>
          Crie sua conta gratuitamente e aplique sua primeira prova em minutos.
        </Paragraph>
        <Space size={16} wrap style={{ justifyContent: 'center' }}>
          <Button size="large" onClick={() => navigate('/cadastro')} style={{ height: 48, paddingInline: 36, fontSize: 16, fontWeight: 700, background: '#fff', color: '#1677ff', border: 'none' }} icon={<UserAddOutlined />}>
            Criar Conta de Professor
          </Button>
          <Button size="large" onClick={() => navigate('/login')} icon={<LoginOutlined />} style={{ height: 48, paddingInline: 36, fontSize: 16, background: 'transparent', borderColor: 'rgba(255,255,255,0.4)', color: '#fff' }}>
            Já tenho conta
          </Button>
        </Space>
      </section>

      {/* Footer */}
      <footer style={{ background: '#0a1628', padding: '28px 48px', textAlign: 'center' }}>
        <Space>
          <BookOutlined style={{ color: '#1677ff' }} />
          <Text style={{ color: '#4a5568' }}>ProvaFácil © {new Date().getFullYear()} — Sistema de Avaliações Online</Text>
        </Space>
      </footer>
    </div>
  );
}
