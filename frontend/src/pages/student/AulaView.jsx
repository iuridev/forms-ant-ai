import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Typography, Spin, Result, Tag } from 'antd';
import { ArrowLeftOutlined, TeamOutlined } from '@ant-design/icons';
import api from '../../api';

const { Title, Text } = Typography;

function toEmbedUrl(url) {
  if (!url) return '';
  try {
    const match = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (!match) return url;
    return `https://docs.google.com/presentation/d/${match[1]}/embed?start=false&loop=false&delayms=3000`;
  } catch {
    return url;
  }
}

export default function AulaView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [aula, setAula] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get('/aulas/my')
      .then(res => {
        const found = res.data.find(a => a.id === id);
        if (!found) { setError(true); return; }
        setAula(found);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !aula) {
    return (
      <Result
        status="403"
        title="Aula não disponível"
        subTitle="Esta aula não está vinculada a nenhuma turma que você pertence."
        extra={<Button onClick={() => navigate('/aluno')}>Voltar</Button>}
      />
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{
        background: '#fff',
        padding: '12px 24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/aluno')}>
          Voltar
        </Button>
        <div style={{ flex: 1 }}>
          <Title level={5} style={{ margin: 0 }}>{aula.title}</Title>
          {aula.description && <Text type="secondary" style={{ fontSize: 13 }}>{aula.description}</Text>}
        </div>
        <Tag icon={<TeamOutlined />} color="blue">{aula.groupName}</Tag>
      </div>

      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
        <div style={{
          width: '100%',
          maxWidth: 960,
          background: '#fff',
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          aspectRatio: '16/9',
        }}>
          <iframe
            src={toEmbedUrl(aula.slideUrl)}
            width="100%"
            height="100%"
            frameBorder="0"
            allowFullScreen
            title={aula.title}
            style={{ display: 'block' }}
          />
        </div>
      </div>
    </div>
  );
}
