import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Spin, Tag, Progress } from 'antd';
import {
  ThunderboltOutlined, UserOutlined, TrophyOutlined,
  StarFilled, RightOutlined, PlayCircleOutlined, CrownOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../api';

const { Title, Text } = Typography;

const GAMES = [
  {
    id: 'database-quest',
    title: 'DataBase Quest',
    subtitle: 'Aventura de Modelagem de Dados',
    description: 'Explore o mundo da modelagem de banco de dados! Responda perguntas, colete estrelas e enfrente o Boss final para concluir a Fase 1.',
    icon: '🗄️',
    color: '#667eea',
    bgGradient: 'linear-gradient(135deg, #0d2137, #1a3a6b)',
    phases: 3,
    totalQuestions: 10,
  },
];

export default function GameLibrary() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [avatar, setAvatar] = useState(null);
  const [progress, setProgress] = useState([]);
  const [records, setRecords] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/games/avatar'),
      api.get('/games/progress'),
      ...GAMES.map(g => api.get(`/games/leaderboard/${g.id}`, { params: { phase: '1' } })),
    ])
      .then(([avatarRes, progressRes, ...leaderboardResArr]) => {
        setAvatar(avatarRes.data);
        setProgress(progressRes.data);
        const rec = {};
        GAMES.forEach((g, i) => { rec[g.id] = leaderboardResArr[i]?.data?.[0] || null; });
        setRecords(rec);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <Title level={3} style={{ margin: 0 }}>
          🎮 Biblioteca de Jogos
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          Aprenda enquanto joga e desafie seus colegas!
        </Text>
      </div>

      {/* Recordes (melhor pontuação entre todos os alunos, por fase) */}
      <div
        style={{
          background: 'linear-gradient(135deg, #ffd70022, #ffa94622)',
          borderRadius: 16,
          padding: '16px 24px',
          marginBottom: 20,
          border: '1px solid #ffc10740',
        }}
      >
        <Text strong style={{ display: 'block', marginBottom: 10, fontSize: 13 }}>
          🏆 Recorde da Fase 1 (entre todos os alunos)
        </Text>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {GAMES.map(game => {
            const record = records[game.id];
            return (
              <div
                key={game.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: '8px 14px', flexWrap: 'wrap', gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{game.icon}</span>
                  <Text style={{ fontSize: 13 }}>{game.title}</Text>
                </div>
                {record ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CrownOutlined style={{ color: '#ffa940' }} />
                    <Text strong style={{ fontSize: 13 }}>{record.studentName}</Text>
                    <Tag color="gold" style={{ borderRadius: 6, margin: 0 }}>{record.score} pts</Tag>
                  </div>
                ) : (
                  <Text type="secondary" style={{ fontSize: 12 }}>Nenhum recorde ainda — seja o primeiro!</Text>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Avatar Status */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea22, #764ba222)',
          borderRadius: 16,
          padding: '20px 24px',
          marginBottom: 24,
          border: '1px solid #667eea40',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: avatar ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#e8e8e8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24,
          }}>
            {avatar ? avatar.name?.charAt(0).toUpperCase() : <UserOutlined style={{ color: '#999', fontSize: 24 }} />}
          </div>
          <div>
            <Text strong style={{ fontSize: 15, display: 'block' }}>
              {avatar ? avatar.name : 'Nenhum avatar criado'}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {avatar ? 'Avatar pronto! 🎉' : 'Crie seu avatar para começar a jogar'}
            </Text>
          </div>
        </div>
        <Button
          type={avatar ? 'default' : 'primary'}
          icon={<UserOutlined />}
          onClick={() => navigate('/aluno/jogos/avatar')}
          style={{ borderRadius: 10 }}
        >
          {avatar ? 'Editar Avatar' : 'Criar Avatar'}
        </Button>
      </div>

      {/* Game Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {GAMES.map(game => {
          const gameProgress = progress.filter(p => p.gameId === game.id);
          const bestPhase1 = gameProgress.find(p => p.phase === '1');
          const totalStars = gameProgress.reduce((acc, p) => acc + p.stars, 0);
          const hasCompleted = gameProgress.some(p => p.phase === '1');

          return (
            <div
              key={game.id}
              style={{
                background: game.bgGradient,
                borderRadius: 20,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {/* Decorative circles */}
              <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(79,156,249,0.08)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', right: 80, bottom: -60, width: 150, height: 150, borderRadius: '50%', background: 'rgba(102,126,234,0.1)', pointerEvents: 'none' }} />

              <div style={{ padding: '28px 32px', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 20, flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: 16,
                      background: 'rgba(255,255,255,0.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 32, flexShrink: 0,
                    }}>
                      {game.icon}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <Title level={4} style={{ color: '#fff', margin: 0, marginBottom: 2 }}>
                        {game.title}
                      </Title>
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, display: 'block', marginBottom: 8 }}>
                        {game.subtitle}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, display: 'block', marginBottom: 12 }}>
                        {game.description}
                      </Text>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <Tag color="blue" style={{ borderRadius: 6 }}>{game.phases} fases</Tag>
                        <Tag color="purple" style={{ borderRadius: 6 }}>{game.totalQuestions} questões</Tag>
                        {hasCompleted && (
                          <Tag color="green" style={{ borderRadius: 6 }}>
                            <StarFilled /> {totalStars} estrelas
                          </Tag>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    {bestPhase1 ? (
                      <div style={{ marginBottom: 8 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, display: 'block' }}>Melhor pontuação</Text>
                        <Text style={{ color: '#52c41a', fontSize: 24, fontWeight: 800 }}>
                          {bestPhase1.score}/{bestPhase1.maxScore}
                        </Text>
                        <Progress
                          percent={bestPhase1.maxScore > 0 ? Math.round((bestPhase1.score / bestPhase1.maxScore) * 100) : 0}
                          size="small"
                          style={{ width: 100 }}
                          strokeColor="#52c41a"
                        />
                      </div>
                    ) : (
                      <div style={{ marginBottom: 8 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, display: 'block' }}>Não iniciado</Text>
                        <TrophyOutlined style={{ fontSize: 28, color: 'rgba(255,255,255,0.2)' }} />
                      </div>
                    )}
                    <Button
                      type="primary"
                      size="large"
                      icon={<PlayCircleOutlined />}
                      onClick={() => navigate(`/aluno/jogos/${game.id}`)}
                      style={{
                        borderRadius: 12, height: 44, paddingInline: 24,
                        background: 'linear-gradient(135deg, #4f9cf9, #667eea)',
                        border: 'none', fontWeight: 600,
                        minWidth: 140,
                      }}
                    >
                      {hasCompleted ? 'Jogar novamente' : 'Jogar agora'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
