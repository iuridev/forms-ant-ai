import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Input, Spin, Row, Col, Card, notification } from 'antd';
import { ArrowLeftOutlined, SaveOutlined, UserOutlined } from '@ant-design/icons';
import api from '../../../api';

const { Title, Text } = Typography;

const SKIN_TONES = ['#f5d0b0', '#d4a574', '#8d5524', '#e8c39e', '#c68642', '#6b3a2a'];
const HAIR_STYLES = ['short', 'long', 'spiky', 'curly', 'ponytail', 'bald'];
const HAIR_COLORS = ['#1a1a1a', '#4a3728', '#d4a017', '#8b0000', '#ff6b6b', '#6a0dad'];
const OUTFIT_COLORS = ['#667eea', '#52c41a', '#fa8c16', '#ff4d4f', '#722ed1', '#13c2c2'];
const ACCESSORIES = ['none', 'glasses', 'hat', 'headphones', 'crown'];

const HAIR_EMOJI = { short: '💇', long: '💇‍♀️', spiky: '🦔', curly: '🦱', ponytail: '🎀', bald: '🫅' };
const ACC_EMOJI = { none: '', glasses: '👓', hat: '🧢', headphones: '🎧', crown: '👑' };

export default function AvatarCreator() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatar, setAvatar] = useState(null);
  const [name, setName] = useState('');
  const [skinTone, setSkinTone] = useState(SKIN_TONES[0]);
  const [hairStyle, setHairStyle] = useState(HAIR_STYLES[0]);
  const [hairColor, setHairColor] = useState(HAIR_COLORS[0]);
  const [outfitColor, setOutfitColor] = useState(OUTFIT_COLORS[0]);
  const [accessory, setAccessory] = useState(ACCESSORIES[0]);

  useEffect(() => {
    api.get('/games/avatar')
      .then(res => {
        if (res.data) {
          setAvatar(res.data);
          setName(res.data.name || '');
          setSkinTone(res.data.skinTone || SKIN_TONES[0]);
          setHairStyle(res.data.hairStyle || HAIR_STYLES[0]);
          setHairColor(res.data.hairColor || HAIR_COLORS[0]);
          setOutfitColor(res.data.outfitColor || OUTFIT_COLORS[0]);
          setAccessory(res.data.accessory || ACCESSORIES[0]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!name.trim()) {
      notification.error({
        message: 'Erro',
        description: 'Dê um nome ao seu avatar',
        placement: 'topRight',
        duration: 3,
      });
      return;
    }
    setSaving(true);
    try {
      await api.put('/games/avatar', {
        name: name.trim(),
        skinTone, hairStyle, hairColor, outfitColor, accessory,
      });
      notification.success({
        message: 'Sucesso',
        description: 'Avatar salvo com sucesso!',
        placement: 'topRight',
        duration: 3,
      });
      navigate('/aluno/jogos');
    } catch (err) {
      notification.error({
        message: 'Erro',
        description: err.response?.data?.error || 'Erro ao salvar avatar',
        placement: 'topRight',
        duration: 3,
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/aluno/jogos')}>
          Voltar
        </Button>
        <Title level={4} style={{ margin: 0 }}>
          {avatar ? 'Editar Avatar' : 'Criar Avatar'}
        </Title>
      </div>

      <Row gutter={24}>
        {/* Preview */}
        <Col xs={24} md={10}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <div style={{
              width: 200, height: 200, borderRadius: '50%',
              margin: '0 auto 16px',
              background: `linear-gradient(135deg, ${outfitColor}88, ${outfitColor}44)`,
              border: `4px solid ${outfitColor}`,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              position: 'relative',
            }}>
              {/* Skin face */}
              <div style={{
                width: 100, height: 100, borderRadius: '50%',
                background: skinTone,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
              }}>
                {/* Hair */}
                <div style={{
                  position: 'absolute', top: -20, fontSize: 40,
                }}>
                  {HAIR_EMOJI[hairStyle]}
                </div>
                {/* Eyes */}
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#333' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#333' }} />
                </div>
                {/* Smile */}
                <div style={{
                  position: 'absolute', bottom: 18,
                  width: 24, height: 10, borderRadius: '0 0 12px 12px',
                  borderBottom: '3px solid #333',
                }} />
              </div>
              {/* Accessory */}
              {accessory !== 'none' && (
                <div style={{ position: 'absolute', top: -10, fontSize: 28 }}>
                  {ACC_EMOJI[accessory]}
                </div>
              )}
            </div>
            <Title level={3} style={{ margin: 0 }}>{name || 'Sem nome'}</Title>
            <Text type="secondary">Seu avatar no jogo</Text>
          </Card>
        </Col>

        {/* Controls */}
        <Col xs={24} md={14}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Name */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Nome do Avatar</Text>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Aventureiro SQL"
                maxLength={20}
                size="large"
                style={{ borderRadius: 10 }}
                prefix={<UserOutlined />}
              />
            </div>

            {/* Skin Tone */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Tom de Pele</Text>
              <div style={{ display: 'flex', gap: 8 }}>
                {SKIN_TONES.map(t => (
                  <div
                    key={t}
                    onClick={() => setSkinTone(t)}
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: t, cursor: 'pointer',
                      border: skinTone === t ? '3px solid #1677ff' : '3px solid transparent',
                      boxShadow: skinTone === t ? '0 0 0 2px #fff, 0 0 0 4px #1677ff' : '0 1px 4px rgba(0,0,0,0.15)',
                      transition: 'all 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Hair Style */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Estilo de Cabelo</Text>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {HAIR_STYLES.map(h => (
                  <div
                    key={h}
                    onClick={() => setHairStyle(h)}
                    style={{
                      padding: '6px 14px', borderRadius: 10,
                      background: hairStyle === h ? '#1677ff' : '#f5f5f5',
                      color: hairStyle === h ? '#fff' : '#333',
                      cursor: 'pointer', fontSize: 13, fontWeight: 500,
                      transition: 'all 0.15s',
                    }}
                  >
                    {HAIR_EMOJI[h]} {h === 'bald' ? 'Careca' : h.charAt(0).toUpperCase() + h.slice(1)}
                  </div>
                ))}
              </div>
            </div>

            {/* Hair Color */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Cor do Cabelo</Text>
              <div style={{ display: 'flex', gap: 8 }}>
                {HAIR_COLORS.map(c => (
                  <div
                    key={c}
                    onClick={() => setHairColor(c)}
                    style={{
                      width: 36, height: 36, borderRadius: '50%',
                      background: c, cursor: 'pointer',
                      border: hairColor === c ? '3px solid #1677ff' : '3px solid transparent',
                      boxShadow: hairColor === c ? '0 0 0 2px #fff, 0 0 0 4px #1677ff' : '0 1px 4px rgba(0,0,0,0.15)',
                      transition: 'all 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Outfit Color */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Cor da Roupa</Text>
              <div style={{ display: 'flex', gap: 8 }}>
                {OUTFIT_COLORS.map(c => (
                  <div
                    key={c}
                    onClick={() => setOutfitColor(c)}
                    style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: c, cursor: 'pointer',
                      border: outfitColor === c ? '3px solid #1677ff' : '3px solid transparent',
                      boxShadow: outfitColor === c ? '0 0 0 2px #fff, 0 0 0 4px #1677ff' : '0 1px 4px rgba(0,0,0,0.15)',
                      transition: 'all 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Accessory */}
            <div>
              <Text strong style={{ display: 'block', marginBottom: 6 }}>Acessório</Text>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {ACCESSORIES.map(a => (
                  <div
                    key={a}
                    onClick={() => setAccessory(a)}
                    style={{
                      padding: '6px 14px', borderRadius: 10,
                      background: accessory === a ? '#1677ff' : '#f5f5f5',
                      color: accessory === a ? '#fff' : '#333',
                      cursor: 'pointer', fontSize: 13, fontWeight: 500,
                      transition: 'all 0.15s',
                    }}
                  >
                    {ACC_EMOJI[a]} {a === 'none' ? 'Nenhum' : a.charAt(0).toUpperCase() + a.slice(1)}
                  </div>
                ))}
              </div>
            </div>

            {/* Save */}
            <Button
              type="primary"
              size="large"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={saving}
              block
              style={{
                borderRadius: 12, height: 48,
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                border: 'none', fontWeight: 600, fontSize: 16,
              }}
            >
              {avatar ? 'Salvar Alterações' : 'Criar Avatar'}
            </Button>
          </div>
        </Col>
      </Row>
    </div>
  );
}
