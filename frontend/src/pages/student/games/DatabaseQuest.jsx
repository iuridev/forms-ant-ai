import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Button, Spin, Tag, Modal } from 'antd';
import {
  ArrowLeftOutlined, StarFilled, TrophyOutlined,
  ThunderboltOutlined, FireOutlined, CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import api from '../../../api';

const { Title, Text } = Typography;

const GAME_ID = 'database-quest';

// ─── TILE MAP (30x20 grid, each tile = 32px) ───
const TILE = 32;
const MAP_COLS = 30;
const MAP_ROWS = 20;
const CANVAS_W = MAP_COLS * TILE;  // 960
const CANVAS_H = MAP_ROWS * TILE;  // 640

// World map legend:
// 0 = grass, 1 = wall, 2 = path, 3 = water, 4 = tree, 5 = building, 6 = portal

const WORLD_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,4,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,4,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,2,0,0,0,0,0,4,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,4,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,2,2,2,2,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,4,0,6,0,0,6,4,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// ─── ZONES ───
const ZONES = [
  {
    id: 'stage1',
    name: 'Conceitos Fundamentais',
    icon: '📚',
    color: '#667eea',
    desc: 'Introducao a modelagem de dados',
    npcX: 23, npcY: 2,
    portalX: 27, portalY: 7,
    questionKey: 'stage1',
  },
  {
    id: 'stage2',
    name: 'Levantamento de Requisitos',
    icon: '📋',
    color: '#52c41a',
    desc: 'Requisitos e analise de dados',
    npcX: 24, npcY: 16,
    portalX: 21, portalY: 7,
    questionKey: 'stage2',
  },
  {
    id: 'stage3',
    name: 'Modelagem ER',
    icon: '🔗',
    color: '#fa8c16',
    desc: 'Entidade e relacionamento',
    npcX: 7, npcY: 2,
    portalX: 8, portalY: 7,
    questionKey: 'stage3',
  },
  {
    id: 'stage4',
    name: 'Ferramentas',
    icon: '🛠️',
    color: '#722ed1',
    desc: 'MySQL Workbench e outras',
    npcX: 6, npcY: 16,
    portalX: 12, portalY: 7,
    questionKey: 'stage4',
  },
];

const BOSS_ZONE = {
  name: 'Mestre dos Virus',
  icon: '👹',
  color: '#ff4444',
  bossX: 14, bossY: 9,
};

const MAX_LIVES = 3;
const QUESTION_TIME = 15; // seconds to answer before losing a life
const ACC_EMOJI = { glasses: '👓', hat: '🧢', headphones: '🎧', crown: '👑' };

// ─── Time bonus: faster + all-correct completion = higher score ───
const TIME_BONUS_MAX = 50;       // pts awarded if boss is defeated within TIME_BONUS_FULL_UNTIL
const TIME_BONUS_FULL_UNTIL = 90;  // seconds
const TIME_BONUS_ZERO_AFTER = 300; // seconds — no bonus past this
function computeTimeBonus(elapsedSec) {
  if (elapsedSec == null) return 0;
  if (elapsedSec <= TIME_BONUS_FULL_UNTIL) return TIME_BONUS_MAX;
  if (elapsedSec >= TIME_BONUS_ZERO_AFTER) return 0;
  const ratio = (TIME_BONUS_ZERO_AFTER - elapsedSec) / (TIME_BONUS_ZERO_AFTER - TIME_BONUS_FULL_UNTIL);
  return Math.round(TIME_BONUS_MAX * ratio);
}
function formatTime(sec) {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ─── Shuffle question alternatives, remapping the correct index ───
function shuffleOptions(q) {
  const idxs = q.options.map((_, i) => i);
  for (let i = idxs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
  }
  return { ...q, options: idxs.map(i => q.options[i]), correct: idxs.indexOf(q.correct) };
}

// ─── QUESTIONS ───
const STAGE_QUESTIONS = {
  'stage1': [
    { question: 'O que e modelagem de banco de dados?', options: ['Processo de criar um modelo para a estrutura dos dados', 'Ferramenta de design', 'Linguagem de programacao', 'Sistema operacional'], correct: 0 },
    { question: 'Qual NAO e um tipo de banco de dados?', options: ['Relacional', 'Nao relacional', 'Orientado a objetos', 'Sistema operacional'], correct: 3 },
    { question: 'O que e um SGBD?', options: ['Software que gerencia o banco de dados', 'Um tipo de tabela', 'Uma linguagem SQL', 'Um hardware'], correct: 0 },
  ],
  'stage2': [
    { question: 'O que e levantamento de requisitos?', options: ['Entender o que o cliente necessita', 'Criar o diagrama ER', 'Instalar o banco', 'Testar performance'], correct: 0 },
    { question: 'Qual tecnica coleta requisitos detalhados?', options: ['Entrevista', 'Jogo de dados', 'Sorteio', 'Pesquisa na internet'], correct: 0 },
    { question: 'O que a analise de dados busca?', options: ['Informacoes uteis para decisoes', 'Nome do usuario', 'Cor do sistema', 'Preco do software'], correct: 0 },
  ],
  'stage3': [
    { question: 'O que e uma entidade?', options: ['Algo sobre o qual se coletam dados', 'Um tipo de relacionamento', 'Uma chave primaria', 'Um atributo'], correct: 0 },
    { question: 'Funcao da chave primaria?', options: ['Identificar cada registro', 'Ordenar dados', 'Criar relacoes', 'Duplicar dados'], correct: 0 },
    { question: 'Como se representam entidades no diagrama ER?', options: ['Retangulos', 'Circulos', 'Triangulos', 'Losangos'], correct: 0 },
  ],
  'stage4': [
    { question: 'Ferramenta de modelagem MySQL?', options: ['MySQL Workbench', 'Blender', 'Photoshop', 'VS Code'], correct: 0 },
    { question: 'O que e MySQL Server?', options: ['Um SGBD', 'Uma ferramenta de design', 'Um editor', 'Um SO'], correct: 0 },
    { question: 'Para que serve o MySQL Workbench?', options: ['Criar diagramas ER e gerenciar DBs', 'Navegar na web', 'Editar imagens', 'Desenvolver apps'], correct: 0 },
  ],
  'boss': [
    { question: 'Quais as entidades principais de uma biblioteca?', options: ['Livro, Usuario, Emprestimo', 'Prateleira, Porta', 'ISBN, Titulo', 'Bibliotecario, Porteiro'], correct: 0 },
    { question: 'Diferenca entre dado e informacao?', options: ['Dado e bruto; informacao e processada', 'Sao a mesma coisa', 'Informacao e bruta', 'Nao ha diferenca'], correct: 0 },
    { question: 'Vantagem do banco relacional?', options: ['Integridade e suporte a transacoes', 'So dados nao estruturados', 'Sem esquema', 'Mais rapido'], correct: 0 },
  ],
};

// ─── STAR COLLECTIBLES ───
const STARS = [
  { x: 5, y: 2 }, { x: 10, y: 4 }, { x: 20, y: 3 }, { x: 25, y: 15 },
  { x: 15, y: 17 }, { x: 8, y: 15 }, { x: 3, y: 10 }, { x: 28, y: 10 },
  { x: 12, y: 12 }, { x: 18, y: 9 }, { x: 22, y: 14 }, { x: 7, y: 7 },
];

// ─── GAME COMPONENT ───
export default function DatabaseQuest() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const [avatar, setAvatar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState('menu'); // menu | playing | dialogue | victory | defeat
  const [score, setScore] = useState(0);
  const [stars, setStars] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalQuestions] = useState(Object.values(STAGE_QUESTIONS).flat().length);
  const [saving, setSaving] = useState(false);
  const [dialogue, setDialogue] = useState(null);
  const [bossHP, setBossHP] = useState(3);
  const [bossMaxHP] = useState(3);
  const [lives, setLives] = useState(MAX_LIVES);
  const [toast, setToast] = useState(null);
  const [completedStages, setCompletedStages] = useState(new Set());
  const [collectedStars, setCollectedStars] = useState(new Set());
  const [showMapLabel, setShowMapLabel] = useState('');
  const [dialogueTimeLeft, setDialogueTimeLeft] = useState(QUESTION_TIME);
  const [finalElapsedSec, setFinalElapsedSec] = useState(null);
  const [timeBonus, setTimeBonus] = useState(0);
  const answeredRef = useRef(false);

  // Toast auto-dismiss
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 2500); return () => clearTimeout(t); } }, [toast]);

  // Question countdown timer — expiring counts as a wrong answer
  useEffect(() => {
    if (gameState !== 'dialogue' || !dialogue || dialogue.answered) return;
    answeredRef.current = false;
    setDialogueTimeLeft(QUESTION_TIME);
    const start = Date.now();
    const interval = setInterval(() => {
      if (answeredRef.current) { clearInterval(interval); return; }
      const remaining = Math.max(0, QUESTION_TIME - (Date.now() - start) / 1000);
      setDialogueTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        answeredRef.current = true;
        setDialogue(prev => (prev && !prev.answered ? { ...prev, answered: true, wasCorrect: false, selected: -1, timedOut: true } : prev));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [dialogue?.openedAt]);

  // Game ref
  const gRef = useRef({
    player: null, keys: {}, stars: [], zones: [], npcs: [], portals: [],
    boss: null, particles: [], dialogueMode: false,
  });

  // Load avatar
  useEffect(() => {
    api.get('/games/avatar').then(res => setAvatar(res.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  function startGame() {
    setScore(0); setStars(0); setCorrectCount(0); setBossHP(3); setLives(MAX_LIVES);
    setCompletedStages(new Set()); setCollectedStars(new Set());
    setFinalElapsedSec(null); setTimeBonus(0);
    gRef.current.startTime = Date.now();
    setGameState('playing');
  }

  // ─── INIT WORLD ───
  const initWorld = useCallback(() => {
    const g = gRef.current;
    g.player = { x: 14.5, y: 9.5, dir: 1, moving: false, animFrame: 0, animTick: 0 };
    g.keys = {}; g.dialogueMode = false; g.particles = [];
    g.boss = { x: BOSS_ZONE.bossX + 0.5, y: BOSS_ZONE.bossY + 0.5, hp: 3, hitTimer: 0 };

    // Stars
    g.stars = STARS.map(s => ({
      x: s.x + 0.5, y: s.y + 0.5, collected: false, bob: Math.random() * Math.PI * 2,
    }));

    // NPCs
    g.npcs = ZONES.map(z => ({
      x: z.npcX + 0.5, y: z.npcY + 0.5, zone: z.id, triggered: false, talked: false,
    }));

    // Portals
    g.portals = ZONES.map(z => ({
      x: z.portalX + 0.5, y: z.portalY + 0.5, zone: z.id, active: false,
    }));
  }, []);

  // ─── SHOW QUESTION ───
  function showQuestion(key, onComplete) {
    const questions = STAGE_QUESTIONS[key];
    if (!questions) { onComplete(true); return; }
    const idx = correctCount % questions.length;
    setDialogue({ ...shuffleOptions(questions[idx]), key, onComplete, openedAt: Date.now() });
    setGameState('dialogue');
  }

  function handleAnswer(index) {
    if (!dialogue || dialogue.answered) return;
    answeredRef.current = true;
    const correct = index === dialogue.correct;
    if (correct) {
      setScore(prev => prev + 10);
      setCorrectCount(prev => prev + 1);
      setDialogue(prev => ({ ...prev, answered: true, wasCorrect: true, selected: index }));
    } else {
      setDialogue(prev => ({ ...prev, answered: true, wasCorrect: false, selected: index }));
    }
  }

  function continueAfterDialogue() {
    const wasCorrect = dialogue?.wasCorrect || false;
    const timedOut = dialogue?.timedOut || false;
    const key = dialogue?.key;
    const onComplete = dialogue?.onComplete;
    setDialogue(null);
    setGameState('playing');
    gRef.current.dialogueMode = false;

    if (!wasCorrect) {
      const newLives = Math.max(0, lives - 1);
      setLives(newLives);
      if (newLives <= 0) {
        setToast({ type: 'error', text: timedOut ? '⏰ Tempo esgotado! Sem vidas restantes...' : '💀 Sem vidas! Os virus corromperam o sistema...' });
        setTimeout(() => setGameState('defeat'), 1400);
        if (onComplete) onComplete(wasCorrect);
        return;
      }
    }

    if (key === 'boss' && wasCorrect) {
      const newHP = bossHP - 1;
      setBossHP(newHP);
      gRef.current.boss.hp = newHP;
      gRef.current.boss.hitTimer = 30;
      // Boss hit particles
      for (let i = 0; i < 20; i++) {
        gRef.current.particles.push({
          x: gRef.current.boss.x * TILE, y: gRef.current.boss.y * TILE,
          vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
          life: 30, maxLife: 30, color: '#ff4444', size: 4,
        });
      }
      if (newHP <= 0) {
        const elapsedSec = gRef.current.startTime ? (Date.now() - gRef.current.startTime) / 1000 : null;
        const bonus = computeTimeBonus(elapsedSec);
        const finalScore = score + bonus;
        setFinalElapsedSec(elapsedSec);
        setTimeBonus(bonus);
        setScore(finalScore);
        setToast({ type: 'success', text: bonus > 0 ? `🏆 Boss derrotado! +${bonus} pts de bonus por velocidade!` : '🏆 Boss derrotado!' });
        setTimeout(() => {
          const s = finalScore >= 80 ? 3 : finalScore >= 40 ? 2 : 1;
          setStars(s); setGameState('victory'); saveProgress(s, finalScore);
        }, 1500);
      } else {
        setToast({ type: 'success', text: '⚔️ Acertou! -1 vida do Boss!' });
      }
    } else if (key !== 'boss' && wasCorrect) {
      setCompletedStages(prev => new Set([...prev, key]));
      setToast({ type: 'success', text: '✅ Resposta correta! Portal liberado!' });
    } else if (key === 'boss') {
      setToast({ type: 'warning', text: timedOut
        ? `⏰ Tempo esgotado! O virus contra-atacou. -1 vida (${Math.max(0, lives - 1)}/${MAX_LIVES})`
        : `💥 Errou! O virus contra-atacou. -1 vida (${Math.max(0, lives - 1)}/${MAX_LIVES})` });
    } else {
      setToast({ type: 'warning', text: timedOut
        ? `⏰ Tempo esgotado! -1 vida (${Math.max(0, lives - 1)}/${MAX_LIVES})`
        : `❌ Resposta errada! -1 vida (${Math.max(0, lives - 1)}/${MAX_LIVES})` });
    }
    if (onComplete) onComplete(wasCorrect);
  }

  function completeLevel() {
    // All stages done = boss fight available
    setToast({ type: 'success', text: '👹 Todos os portais liberados! Encontre o Boss no centro!' });
  }

  function saveProgress(starsCount, finalScore) {
    setSaving(true);
    api.post('/games/progress', {
      gameId: GAME_ID, phase: '1', score: finalScore, maxScore: 180,
      stars: starsCount, correctAnswers: correctCount, totalQuestions,
    }).catch(() => {}).finally(() => setSaving(false));
  }

  // ─── GAME LOOP ───
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const g = gRef.current;

    if (!g.player) initWorld();

    const keys = {};

    function handleKey(e) {
      keys[e.key] = true;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
    }
    function handleKeyUp(e) { keys[e.key] = false; }

    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);

    let animId;

    function gameLoop() {
      if (gameState === 'dialogue') { animId = requestAnimationFrame(gameLoop); return; }

      const p = g.player;
      if (!p) { animId = requestAnimationFrame(gameLoop); return; }

      // ─── Movement ───
      let dx = 0, dy = 0;
      if (keys['ArrowLeft'] || keys['a'] || keys['A']) { dx = -1; p.dir = -1; }
      else if (keys['ArrowRight'] || keys['d'] || keys['D']) { dx = 1; p.dir = 1; }
      else if (keys['ArrowUp'] || keys['w'] || keys['W']) { dy = -1; }
      else if (keys['ArrowDown'] || keys['s'] || keys['S']) { dy = 1; }

      const speed = 0.08;
      p.moving = dx !== 0 || dy !== 0;

      if (p.moving) {
        p.animTick++;
        if (p.animTick > 6) { p.animTick = 0; p.animFrame = (p.animFrame + 1) % 4; }

        const newX = p.x + dx * speed;
        const newY = p.y + dy * speed;

        // Collision with walls
        const mapX1 = Math.floor(newX - 0.3);
        const mapX2 = Math.floor(newX + 0.3);
        const mapY1 = Math.floor(newY - 0.3);
        const mapY2 = Math.floor(newY + 0.3);

        const blocked = (mx, my) => {
          if (mx < 0 || mx >= MAP_COLS || my < 0 || my >= MAP_ROWS) return true;
          return [1, 3, 4, 5].includes(WORLD_MAP[my][mx]);
        };

        if (!blocked(mapX1, mapY1) && !blocked(mapX1, mapY2) && !blocked(mapX2, mapY1) && !blocked(mapX2, mapY2)) {
          p.x = newX;
          p.y = newY;
        } else {
          // Try sliding
          if (!blocked(Math.floor(newX - 0.3), Math.floor(p.y - 0.3)) && !blocked(Math.floor(newX + 0.3), Math.floor(p.y + 0.3))) {
            p.x = newX;
          } else if (!blocked(Math.floor(p.x - 0.3), Math.floor(newY - 0.3)) && !blocked(Math.floor(p.x + 0.3), Math.floor(newY + 0.3))) {
            p.y = newY;
          }
        }
      } else {
        p.animFrame = 0;
        p.animTick = 0;
      }

      // ─── NPC Interaction ─── (already-purified/completed virus won't re-fight, keeps score/time fair)
      for (const npc of g.npcs) {
        const dist = Math.hypot(p.x - npc.x, p.y - npc.y);
        if (dist < 1.2 && !npc.triggered && !g.dialogueMode && !completedStages.has(npc.zone)) {
          npc.triggered = true;
          g.dialogueMode = true;
          const zone = ZONES.find(z => z.id === npc.zone);
          if (zone) showQuestion(zone.questionKey, () => {});
        }
        if (dist >= 1.5) npc.triggered = false;
      }

      // ─── Portal Interaction ───
      for (const pt of g.portals) {
        if (!completedStages.has(pt.zone)) continue;
        const dist = Math.hypot(p.x - pt.x, p.y - pt.y);
        if (dist < 1.0) {
          setShowMapLabel(`✅ ${ZONES.find(z => z.id === pt.zone)?.name} concluido!`);
          // All portals done?
          const allDone = ZONES.every(z => completedStages.has(z.id));
          if (allDone) {
            setShowMapLabel('👹 Va ate o centro enfrentar o Boss!');
          }
        }
      }

      // ─── Boss Interaction ───
      if (completedStages.size >= ZONES.length) {
        const bossDist = Math.hypot(p.x - g.boss.x, p.y - g.boss.y);
        if (bossDist < 1.5 && g.boss.hp > 0 && !g.dialogueMode) {
          g.dialogueMode = true;
          showQuestion('boss', () => {});
        }
      }

      // ─── Collect Stars ───
      for (const star of g.stars) {
        if (star.collected) continue;
        const dist = Math.hypot(p.x - star.x, p.y - star.y);
        if (dist < 0.6) {
          star.collected = true;
          setScore(prev => prev + 5);
          setCollectedStars(prev => new Set([...prev, `${star.x},${star.y}`]));
          // Particles
          for (let i = 0; i < 12; i++) {
            g.particles.push({
              x: star.x * TILE, y: star.y * TILE,
              vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
              life: 25, maxLife: 25, color: '#ffd700', size: 3,
            });
          }
        }
      }

      // ─── Update Particles ───
      for (const pt of g.particles) {
        pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.2; pt.life--;
      }
      g.particles = g.particles.filter(pt => pt.life > 0);
      if (g.boss.hitTimer > 0) g.boss.hitTimer--;

      // ─── RENDER ───
      render(ctx, g);

      animId = requestAnimationFrame(gameLoop);
    }

    animId = requestAnimationFrame(gameLoop);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animId);
    };
  }, [gameState, initWorld, correctCount, bossHP, completedStages, lives]);

  // ─── RENDER ───
  function render(ctx, g) {
    const p = g.player;
    const time = Date.now() / 1000;

    // ─── Background ───
    ctx.fillStyle = '#1a2330';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // ─── Tile map ───
    for (let row = 0; row < MAP_ROWS; row++) {
      for (let col = 0; col < MAP_COLS; col++) {
        const tile = WORLD_MAP[row][col];
        const x = col * TILE;
        const y = row * TILE;

        switch (tile) {
          case 0: // Grass
            ctx.fillStyle = (row + col) % 2 === 0 ? '#1a3a2a' : '#1e4030';
            ctx.fillRect(x, y, TILE, TILE);
            // Grass detail
            if (Math.random() > 0.995) {
              ctx.fillStyle = '#2a5a3a';
              ctx.fillRect(x + 8, y + 10, 2, 6);
              ctx.fillRect(x + 14, y + 12, 2, 5);
            }
            break;
          case 1: // Wall
            ctx.fillStyle = '#2a2a3a';
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = '#3a3a4a';
            ctx.fillRect(x + 1, y + 1, TILE - 2, 3);
            ctx.fillStyle = '#1a1a2a';
            ctx.fillRect(x, y + TILE - 2, TILE, 2);
            break;
          case 2: // Path
            ctx.fillStyle = '#3a3a2a';
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = '#4a4a3a';
            ctx.fillRect(x + 4, y + 4, TILE - 8, 1);
            break;
          case 3: // Water
            const wave = Math.sin(time * 1.5 + col * 0.5 + row * 0.3) * 3;
            ctx.fillStyle = `rgb(${20 + wave}, ${60 + wave}, ${100 + wave})`;
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fillRect(x + 2, y + 4, TILE - 4, 2);
            break;
          case 4: // Tree
            ctx.fillStyle = '#1a3a2a';
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = '#2a4a2a';
            ctx.beginPath();
            ctx.arc(x + TILE/2, y + TILE/2, 12, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#1a3a1a';
            ctx.beginPath();
            ctx.arc(x + TILE/2 - 3, y + TILE/2 - 3, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#3a2a1a';
            ctx.fillRect(x + TILE/2 - 2, y + TILE/2 + 4, 4, 8);
            break;
          case 5: // Building
            ctx.fillStyle = '#3a3a4a';
            ctx.fillRect(x, y, TILE, TILE);
            ctx.fillStyle = '#4a4a5a';
            ctx.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
            ctx.fillStyle = '#5a5a6a';
            ctx.fillRect(x + 4, y + 4, TILE - 8, 4);
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(x + 6, y + 6, 4, 4);
            break;
          case 6: // Portal ground
            ctx.fillStyle = '#1a2330';
            ctx.fillRect(x, y, TILE, TILE);
            break;
        }
      }
    }

    // ─── Portal effects ───
    for (const pt of g.portals) {
      const zone = ZONES.find(z => z.id === pt.zone);
      const completed = completedStages.has(pt.zone);
      if (!completed) {
        // Locked portal
        const pulse = Math.sin(time * 2) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255,0,0,${0.1 * pulse})`;
        ctx.beginPath();
        ctx.arc(pt.x * TILE, pt.y * TILE, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255,0,0,${0.3 * pulse})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(pt.x * TILE, pt.y * TILE, 12, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,0,0,0.6)';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🔒', pt.x * TILE, pt.y * TILE + 5);
      } else {
        // Active portal
        const pulse = Math.sin(time * 3 + ZONES.indexOf(zone)) * 0.3 + 0.7;
        const glow = ctx.createRadialGradient(pt.x * TILE, pt.y * TILE, 2, pt.x * TILE, pt.y * TILE, 20);
        const color = zone?.color || '#00d4ff';
        glow.addColorStop(0, `${color}44`);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(pt.x * TILE, pt.y * TILE, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `${color}${Math.round(80 * pulse).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(pt.x * TILE, pt.y * TILE, 12, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // ─── Data Virus Enemies ───
    for (const npc of g.npcs) {
      const zone = ZONES.find(z => z.id === npc.zone);
      const nx = npc.x * TILE;
      const ny = npc.y * TILE + Math.sin(time * 1.5 + ZONES.indexOf(zone)) * 2;
      const color = zone?.color || '#2ed573';
      const defeated = completedStages.has(npc.zone);

      if (!defeated) {
        // Menacing glow
        const nGlow = ctx.createRadialGradient(nx, ny, 2, nx, ny, 26);
        nGlow.addColorStop(0, `${color}55`);
        nGlow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = nGlow;
        ctx.beginPath();
        ctx.arc(nx, ny, 26, 0, Math.PI * 2);
        ctx.fill();

        drawVirus(ctx, nx, ny, 12, 9, color, time * 0.6 + ZONES.indexOf(zone), false);

        // Angry eyes
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(nx - 4, ny - 1, 3, 2, -0.3, 0, Math.PI * 2);
        ctx.ellipse(nx + 4, ny - 1, 3, 2, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#c0392b';
        ctx.beginPath();
        ctx.arc(nx - 4, ny - 1, 1.4, 0, Math.PI * 2);
        ctx.arc(nx + 4, ny - 1, 1.4, 0, Math.PI * 2);
        ctx.fill();
        // Angry brows
        ctx.strokeStyle = '#1a1a1a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(nx - 7, ny - 6); ctx.lineTo(nx - 1, ny - 4);
        ctx.moveTo(nx + 7, ny - 6); ctx.lineTo(nx + 1, ny - 4);
        ctx.stroke();
      } else {
        // Purified marker (virus debugged)
        ctx.fillStyle = 'rgba(46,213,115,0.15)';
        ctx.beginPath();
        ctx.arc(nx, ny, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2ed573';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(nx, ny, 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#2ed573';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('✓', nx, ny + 4);
      }

      // Zone name
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(zone?.name || '', nx, ny + 24);

      // Interaction hint
      const dist = npc.triggered ? 0 : Math.hypot(p.x - npc.x, p.y - npc.y);
      if (dist < 2 && !npc.triggered && !defeated) {
        ctx.fillStyle = `rgba(255,80,80,${Math.sin(time * 3) * 0.3 + 0.7})`;
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('[Debugar]', nx, ny - 30);
      }
    }

    // ─── Stars ───
    for (const star of g.stars) {
      if (star.collected) continue;
      const bob = Math.sin(time * 2 + star.bob) * 3;
      const sx = star.x * TILE;
      const sy = star.y * TILE + bob;

      // Glow
      const sGlow = ctx.createRadialGradient(sx, sy, 2, sx, sy, 14);
      sGlow.addColorStop(0, 'rgba(255,215,0,0.3)');
      sGlow.addColorStop(1, 'rgba(255,215,0,0)');
      ctx.fillStyle = sGlow;
      ctx.beginPath();
      ctx.arc(sx, sy, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffd700';
      ctx.strokeStyle = '#ffed4a';
      ctx.lineWidth = 1.5;
      drawStar(ctx, sx, sy, 5, 6, 3);
      ctx.fill();
      ctx.stroke();
    }

    // ─── Boss (Mega Virus) ───
    const allDone = completedStages.size >= ZONES.length;
    if (allDone && g.boss.hp > 0) {
      const bx = g.boss.x * TILE;
      const by = g.boss.y * TILE + Math.sin(time * 2) * 3;
      const flash = g.boss.hitTimer > 0;

      // Boss aura
      const bGlow = ctx.createRadialGradient(bx, by, 5, bx, by, 55);
      bGlow.addColorStop(0, 'rgba(255,0,0,0.25)');
      bGlow.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = bGlow;
      ctx.beginPath();
      ctx.arc(bx, by, 55, 0, Math.PI * 2);
      ctx.fill();

      drawVirus(ctx, bx, by, 20, 14, '#8b0000', time * -0.4, flash);

      // Eyes (four, menacing)
      const eyeColor = flash ? '#fff' : '#ff4444';
      ctx.fillStyle = eyeColor;
      [[-9, -6], [9, -6], [-4, 3], [4, 3]].forEach(([ox, oy]) => {
        ctx.beginPath(); ctx.arc(bx + ox, by + oy, 4, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = flash ? '#ff4444' : '#ffd700';
      [[-9, -6], [9, -6], [-4, 3], [4, 3]].forEach(([ox, oy]) => {
        ctx.beginPath(); ctx.arc(bx + ox, by + oy, 1.8, 0, Math.PI * 2); ctx.fill();
      });

      // Crown (Mestre dos Virus)
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.moveTo(bx - 16, by - 20);
      ctx.lineTo(bx - 11, by - 32);
      ctx.lineTo(bx - 5, by - 22);
      ctx.lineTo(bx, by - 34);
      ctx.lineTo(bx + 5, by - 22);
      ctx.lineTo(bx + 11, by - 32);
      ctx.lineTo(bx + 16, by - 20);
      ctx.closePath();
      ctx.fill();

      // HP bar
      const hpW = 50;
      const hpH = 6;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx - hpW/2, by - 42, hpW, hpH);
      ctx.fillStyle = g.boss.hp / 3 > 0.5 ? '#2ed573' : g.boss.hp / 3 > 0.25 ? '#ffa502' : '#ff4757';
      ctx.fillRect(bx - hpW/2, by - 42, hpW * (g.boss.hp / 3), hpH);

      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MESTRE DOS VIRUS', bx, by - 46);

      // Approaching hint
      const bossDist = Math.hypot(p.x - g.boss.x, p.y - g.boss.y);
      if (bossDist < 3) {
        ctx.fillStyle = `rgba(255,255,255,${Math.sin(time * 4) * 0.3 + 0.7})`;
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('❓ APROXIME-SE', bx, by + 40);
      }

      ctx.fillStyle = '#ffd700';
      ctx.font = '10px sans-serif';
      ctx.fillText(`HP: ${g.boss.hp}/3`, bx, by + 30);
    } else if (allDone && g.boss.hp <= 0) {
      // Boss defeated marker
      ctx.fillStyle = '#2ed573';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 DERROTADO!', g.boss.x * TILE, g.boss.y * TILE + 5);
    }

    // ─── Player (reflects the customized avatar) ───
    if (p) {
      const px = p.x * TILE;
      const py = p.y * TILE;
      const outfitColor = avatar?.outfitColor || '#667eea';
      const skinColor = avatar?.skinTone || '#8a9ef0';
      const hairColor = avatar?.hairColor || '#2a3a5a';
      const hairStyle = avatar?.hairStyle || 'short';
      const accessory = avatar?.accessory || 'none';

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(px, py + 14, 10, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body (outfit)
      ctx.fillStyle = outfitColor;
      ctx.beginPath();
      ctx.roundRect(px - 10, py - 8, 20, 22, 6);
      ctx.fill();

      // Head (skin tone)
      ctx.fillStyle = skinColor;
      ctx.beginPath();
      ctx.arc(px, py - 10, 10, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      const eyeDir = p.dir;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(px - 4 + eyeDir * 2, py - 12, 3.5, 0, Math.PI * 2);
      ctx.arc(px + 4 + eyeDir * 2, py - 12, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(px - 4 + eyeDir * 3, py - 12, 2, 0, Math.PI * 2);
      ctx.arc(px + 4 + eyeDir * 3, py - 12, 2, 0, Math.PI * 2);
      ctx.fill();

      // Hair (style + color from avatar)
      if (hairStyle !== 'bald') {
        ctx.fillStyle = hairColor;
        if (hairStyle === 'spiky') {
          for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.moveTo(px + i * 6 - 3, py - 18);
            ctx.lineTo(px + i * 6, py - 27);
            ctx.lineTo(px + i * 6 + 3, py - 18);
            ctx.closePath();
            ctx.fill();
          }
        } else {
          ctx.fillRect(px - 8, py - 20, 16, 4);
          ctx.fillRect(px - 6, py - 24, 12, 5);
          if (hairStyle === 'long' || hairStyle === 'ponytail') {
            ctx.beginPath();
            ctx.ellipse(px - eyeDir * 9, py - 4, 3, 10, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Accessory (unlocked customization)
      if (accessory !== 'none' && ACC_EMOJI[accessory]) {
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(ACC_EMOJI[accessory], px, accessory === 'glasses' ? py - 11 : py - 23);
      }

      // Legs (walking animation)
      if (p.moving) {
        const legOff = p.animFrame % 2 === 0 ? 2 : -2;
        ctx.fillStyle = '#4a5a8a';
        ctx.fillRect(px - 6 + legOff, py + 14, 5, 8);
        ctx.fillRect(px + 1 - legOff, py + 14, 5, 8);
      } else {
        ctx.fillStyle = '#4a5a8a';
        ctx.fillRect(px - 6, py + 14, 5, 8);
        ctx.fillRect(px + 1, py + 14, 5, 8);
      }
    }

    // ─── Particles ───
    for (const pt of g.particles) {
      const alpha = pt.life / pt.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ─── HUD ───
    // Score
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.roundRect(8, 8, 160, 24, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`⭐ ${score} pts | Acertos: ${correctCount}`, 16, 25);

    // Lives HUD
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.roundRect(8, 36, 82, 22, 8);
    ctx.fill();
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    let heartsStr = '';
    for (let i = 0; i < MAX_LIVES; i++) heartsStr += i < lives ? '❤️' : '🖤';
    ctx.fillText(heartsStr, 14, 52);

    // Elapsed time HUD (faster + correct = better score bonus)
    if (g.startTime) {
      const elapsed = (Date.now() - g.startTime) / 1000;
      const bonusPreview = computeTimeBonus(elapsed);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.roundRect(8, 64, 110, 20, 8);
      ctx.fill();
      ctx.fillStyle = bonusPreview > 0 ? '#7bed9f' : 'rgba(255,255,255,0.5)';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`⏱️ ${formatTime(elapsed)}`, 14, 78);
    }

    // Boss HP (if active)
    if (allDone && g.boss.hp > 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.roundRect(CANVAS_W - 160, 8, 150, 24, 8);
      ctx.fill();
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`👹 Boss: ${g.boss.hp}/3 HP`, CANVAS_W - 16, 25);
    }

    // Map legend
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.roundRect(8, CANVAS_H - 24, 280, 18, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Setas/WASD: Andar  |  🦠: Debugar virus  |  ⭐: Coletar  |  ❤️: Vidas', 14, CANVAS_H - 12);

    // Stage completion indicator
    const completedCount = completedStages.size;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.roundRect(CANVAS_W / 2 - 100, 8, 200, 24, 8);
    ctx.fill();
    ctx.fillStyle = completedCount >= ZONES.length ? '#ffd700' : 'rgba(255,255,255,0.6)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${completedCount}/${ZONES.length} portais liberados`, CANVAS_W / 2, 25);

    // Toast on canvas
    if (showMapLabel) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.beginPath();
      ctx.roundRect(CANVAS_W / 2 - 120, CANVAS_H / 2 - 60, 240, 30, 10);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(showMapLabel, CANVAS_W / 2, CANVAS_H / 2 - 40);
    }
  }

  // ─── Virus enemy helper (spiky corrupted-data blob) ───
  function drawVirus(ctx, cx, cy, r, spikeCount, color, rot, flash) {
    const bodyColor = flash ? '#ffffff' : color;
    for (let i = 0; i < spikeCount; i++) {
      const angle = (i / spikeCount) * Math.PI * 2 + rot;
      const baseX = cx + Math.cos(angle) * r * 0.85;
      const baseY = cy + Math.sin(angle) * r * 0.85;
      const tipX = cx + Math.cos(angle) * (r + r * 0.55);
      const tipY = cy + Math.sin(angle) * (r + r * 0.55);
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = r * 0.16;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(baseX, baseY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      ctx.arc(tipX, tipY, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
    // Core body
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // Corrupted-data pores
    ctx.fillStyle = flash ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.25)';
    for (let i = 0; i < Math.floor(spikeCount / 2); i++) {
      const angle = (i / (spikeCount / 2)) * Math.PI * 2 + rot * 1.3;
      const px = cx + Math.cos(angle) * r * 0.55;
      const py = cy + Math.sin(angle) * r * 0.55;
      ctx.beginPath();
      ctx.arc(px, py, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ─── Star helper ───
  function drawStar(ctx, cx, cy, spikes, outerR, innerR) {
    let rot = Math.PI / 2 * 3;
    let step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerR);
    for (let i = 0; i < spikes; i++) {
      ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR); rot += step;
      ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR); rot += step;
    }
    ctx.closePath();
  }

  // ─── LOADING ───
  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}><Spin size="large" /></div>;
  }

  // ─── MENU ───
  if (gameState === 'menu') {
    return (
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/aluno/jogos')}>Voltar</Button>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #0d2137, #1a3a6b)', borderRadius: 24, padding: '40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -60, top: -60, width: 300, height: 300, borderRadius: '50%', background: 'rgba(79,156,249,0.08)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: -40, bottom: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(102,126,234,0.1)', pointerEvents: 'none' }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🗄️</div>
            <Title level={2} style={{ color: '#fff', margin: 0, marginBottom: 4 }}>
              DataBase Quest - Mundo 2D
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, display: 'block', marginBottom: 6 }}>
              Explore o mundo da modelagem de dados!
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, display: 'block', marginBottom: 24 }}>
              Ande pelo mapa, debugue os virus de dados, responda perguntas e derrote o Boss final! Cuidado: errar custa uma vida ❤️.
            </Text>

            {avatar && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '8px 16px', marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: `linear-gradient(135deg, ${avatar.outfitColor}88, ${avatar.outfitColor}44)`, border: `2px solid ${avatar.outfitColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                  {avatar.name?.charAt(0).toUpperCase()}
                </div>
                <Text style={{ color: '#fff' }}>{avatar.name}</Text>
              </div>
            )}

            {/* Controls */}
            <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 12, padding: '12px 20px', marginBottom: 24, maxWidth: 500, margin: '0 auto 24px' }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, display: 'block', marginBottom: 8 }}>🎮 Controles:</Text>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Tag color="blue" style={{ borderRadius: 6, fontSize: 11 }}>← → ↑ ↓ / WASD : Andar</Tag>
                <Tag color="green" style={{ borderRadius: 6, fontSize: 11 }}>🦠 : Debugar virus (responder)</Tag>
                <Tag color="gold" style={{ borderRadius: 6, fontSize: 11 }}>⭐ : Coletar estrelas</Tag>
                <Tag color="red" style={{ borderRadius: 6, fontSize: 11 }}>❤️ {MAX_LIVES} vidas : erros custam 1 vida</Tag>
                <Tag color="orange" style={{ borderRadius: 6, fontSize: 11 }}>⏱️ {QUESTION_TIME}s por pergunta : tempo esgotado tambem custa 1 vida</Tag>
                <Tag color="cyan" style={{ borderRadius: 6, fontSize: 11 }}>⚡ Derrote o Boss rapido : +{TIME_BONUS_MAX} pts de bonus de velocidade</Tag>
              </div>
            </div>

            {/* Mini map preview */}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
              {ZONES.map((z, i) => (
                <div key={i} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '8px 12px', textAlign: 'center', minWidth: 80 }}>
                  <div style={{ fontSize: 20, marginBottom: 2 }}>{z.icon}</div>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, display: 'block' }}>{z.name}</Text>
                </div>
              ))}
              <div style={{ background: 'rgba(255,215,0,0.1)', borderRadius: 10, padding: '8px 12px', textAlign: 'center', border: '1px solid rgba(255,215,0,0.3)' }}>
                <div style={{ fontSize: 20, marginBottom: 2 }}>👹</div>
                <Text style={{ color: '#ffd700', fontSize: 10, display: 'block' }}>Boss</Text>
              </div>
            </div>

            <Button type="primary" size="large" icon={<ThunderboltOutlined />} onClick={startGame}
              style={{ borderRadius: 14, height: 52, paddingInline: 40, background: 'linear-gradient(135deg, #4f9cf9, #667eea)', border: 'none', fontWeight: 700, fontSize: 18 }}>
              Iniciar Aventura!
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── PLAYING ───
  if (gameState === 'playing') {
    return (
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => setGameState('menu')} size="small">Sair</Button>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Tag color="gold" style={{ borderRadius: 6 }}>⭐ {score} pts</Tag>
            <Tag color="green" style={{ borderRadius: 6 }}>✓ {correctCount} acertos</Tag>
            <Tag color="blue" style={{ borderRadius: 6 }}>{completedStages.size}/{ZONES.length} portais</Tag>
            <Tag color="red" style={{ borderRadius: 6 }}>{'❤️'.repeat(lives)}{'🖤'.repeat(MAX_LIVES - lives)}</Tag>
          </div>
        </div>

        <div style={{ borderRadius: 16, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
            style={{ display: 'block', width: '100%', height: 'auto', background: '#1a2330', cursor: 'default' }}
          />

          {/* Toast */}
          {toast && (
            <div style={{ position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)', padding: '8px 18px', borderRadius: 10,
              background: toast.type === 'success' ? 'rgba(46,213,115,0.9)' : toast.type === 'error' ? 'rgba(255,71,87,0.9)' : 'rgba(255,165,0,0.9)',
              color: '#fff', fontSize: 13, fontWeight: 600, zIndex: 10, pointerEvents: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
              {toast.text}
            </div>
          )}
        </div>

        <div style={{ marginTop: 8, display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
          {ZONES.map((z, i) => (
            <Tag key={i} color={completedStages.has(z.id) ? 'green' : 'default'} style={{ borderRadius: 6, fontSize: 11 }}>
              {completedStages.has(z.id) ? '✓' : '🔒'} {z.icon} {z.name}
            </Tag>
          ))}
          <Tag color={completedStages.size >= ZONES.length ? 'red' : 'default'} style={{ borderRadius: 6, fontSize: 11 }}>
            👹 Boss {completedStages.size >= ZONES.length ? '(Disponivel)' : '(Bloqueado)'}
          </Tag>
        </div>
      </div>
    );
  }

  // ─── DIALOGUE ───
  if (gameState === 'dialogue' && dialogue) {
    return (
      <div style={{ maxWidth: 550, margin: '40px auto' }}>
        <div style={{ background: 'linear-gradient(135deg, #0d2137, #1a3a6b)', borderRadius: 24, padding: '28px 32px', border: '2px solid #667eea60', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: dialogue.key === 'boss' ? 'linear-gradient(135deg, #8b0000, #ff4444)' : 'linear-gradient(135deg, #2ed573, #7bed9f)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>{dialogue.key === 'boss' ? '👹' : '🦠'}</div>
            <div>
              <Text style={{ color: dialogue.key === 'boss' ? '#ff6b6b' : '#2ed573', fontSize: 13, fontWeight: 600, display: 'block' }}>{dialogue.key === 'boss' ? 'Mestre dos Virus' : 'Virus de Dados'}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{dialogue.key === 'boss' ? '⚔️ Boss Fight! Errar custa 1 vida' : 'Debugue corretamente ou perca 1 vida ❤️'}</Text>
            </div>
          </div>

          {!dialogue.answered && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>⏱️ Tempo para responder</Text>
                <Text style={{ color: dialogueTimeLeft <= 5 ? '#ff4757' : 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 700 }}>{Math.ceil(dialogueTimeLeft)}s</Text>
              </div>
              <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(dialogueTimeLeft / QUESTION_TIME) * 100}%`, background: dialogueTimeLeft <= 5 ? '#ff4757' : '#667eea', transition: 'width 0.1s linear' }} />
              </div>
            </div>
          )}

          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: '16px 20px', marginBottom: 18 }}>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: 500, display: 'block' }}>{dialogue.question}</Text>
            {!dialogue.answered && <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 4 }}>Escolha uma alternativa:</Text>}
            {dialogue.answered && dialogue.timedOut && <Text style={{ color: '#ff4757', fontSize: 11, marginTop: 4, display: 'block' }}>⏰ Tempo esgotado!</Text>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dialogue.options.map((opt, i) => {
              let bg = 'rgba(255,255,255,0.06)', border = '2px solid rgba(255,255,255,0.1)', textColor = 'rgba(255,255,255,0.8)';
              if (dialogue.answered) {
                if (i === dialogue.correct) { bg = 'rgba(46,213,115,0.15)'; border = '2px solid #2ed573'; textColor = '#2ed573'; }
                else if (i === dialogue.selected) { bg = 'rgba(255,71,87,0.15)'; border = '2px solid #ff4757'; textColor = '#ff4757'; }
                else { bg = 'rgba(255,255,255,0.03)'; border = '2px solid rgba(255,255,255,0.05)'; textColor = 'rgba(255,255,255,0.3)'; }
              }
              return (
                <div key={i} onClick={() => { if (dialogue.answered) return; handleAnswer(i); }}
                  style={{ padding: '12px 16px', borderRadius: 10, background: bg, border, cursor: dialogue.answered ? 'default' : 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 10 }}
                  onMouseEnter={e => { if (!dialogue.answered) { e.currentTarget.style.borderColor = '#667eea'; e.currentTarget.style.background = 'rgba(102,126,234,0.1)'; } }}
                  onMouseLeave={e => { if (!dialogue.answered) { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; } }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: dialogue.answered && i === dialogue.correct ? '#2ed573' : dialogue.answered && i === dialogue.selected ? '#ff4757' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                    {dialogue.answered && i === dialogue.correct ? <CheckCircleOutlined /> : dialogue.answered && i === dialogue.selected ? <CloseCircleOutlined /> : String.fromCharCode(65 + i)}
                  </div>
                  <Text style={{ color: textColor, fontSize: 13, flex: 1 }}>{opt}</Text>
                </div>
              );
            })}
          </div>

          {dialogue.answered && (
            <Button type="primary" size="large" onClick={continueAfterDialogue} block
              style={{ marginTop: 18, borderRadius: 10, height: 44, background: dialogue.wasCorrect ? 'linear-gradient(135deg, #2ed573, #7bed9f)' : 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none', fontWeight: 600, fontSize: 15 }}>
              {dialogue.wasCorrect ? '✅ Continuar' : 'Continuar'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ─── VICTORY ───
  if (gameState === 'victory') {
    return (
      <div style={{ maxWidth: 550, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ background: 'linear-gradient(135deg, #0d2137, #1a3a6b)', borderRadius: 24, padding: '36px', border: '2px solid #ffd70040', marginBottom: 20 }}>
          <div style={{ fontSize: 72, marginBottom: 12 }}>🏆</div>
          <Title level={2} style={{ color: '#fff', margin: 0, marginBottom: 6 }}>Parabens! Fase Concluida!</Title>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, display: 'block', marginBottom: 20 }}>
            Voce derrotou o Boss e dominou os fundamentos de modelagem!
          </Text>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
            {[1,2,3].map(s => <StarFilled key={s} style={{ fontSize: 44, color: s <= stars ? '#ffd700' : 'rgba(255,255,255,0.1)' }} />)}
          </div>

          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div><Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, display: 'block' }}>Pontuacao</Text><Text style={{ fontSize: 24, fontWeight: 800, color: '#ffd700' }}>{score}</Text></div>
            <div><Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, display: 'block' }}>Acertos</Text><Text style={{ fontSize: 24, fontWeight: 800, color: '#2ed573' }}>{correctCount}</Text></div>
            <div><Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, display: 'block' }}>Estrelas</Text><Text style={{ fontSize: 24, fontWeight: 800, color: '#ffd700' }}>{stars}/3</Text></div>
          </div>

          {finalElapsedSec != null && (
            <div style={{ background: 'rgba(123,237,159,0.08)', border: '1px solid rgba(123,237,159,0.25)', borderRadius: 14, padding: '10px 16px', marginBottom: 16, display: 'flex', justifyContent: 'center', gap: 20 }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>⏱️ Tempo: <strong style={{ color: '#fff' }}>{formatTime(finalElapsedSec)}</strong></Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>⚡ Bonus de velocidade: <strong style={{ color: timeBonus > 0 ? '#7bed9f' : '#fff' }}>+{timeBonus} pts</strong></Text>
            </div>
          )}

          {saving && <Spin style={{ display: 'block', marginBottom: 12 }} />}
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Button size="large" icon={<TrophyOutlined />} onClick={startGame} style={{ borderRadius: 12, height: 46, paddingInline: 20 }}>Jogar Novamente</Button>
          <Button type="primary" size="large" icon={<ArrowLeftOutlined />} onClick={() => navigate('/aluno/jogos')} style={{ borderRadius: 12, height: 46, paddingInline: 20, background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none', fontWeight: 600 }}>Voltar aos Jogos</Button>
        </div>
      </div>
    );
  }

  // ─── DEFEAT ───
  if (gameState === 'defeat') {
    return (
      <div style={{ maxWidth: 550, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ background: 'linear-gradient(135deg, #2a0d0d, #6b1a1a)', borderRadius: 24, padding: '36px', border: '2px solid #ff444440', marginBottom: 20 }}>
          <div style={{ fontSize: 72, marginBottom: 12 }}>🦠</div>
          <Title level={2} style={{ color: '#fff', margin: 0, marginBottom: 6 }}>Sistema Corrompido!</Title>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, display: 'block', marginBottom: 20 }}>
            Os virus de dados tomaram conta antes que voce conseguisse debugar tudo. Tente novamente!
          </Text>

          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div><Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, display: 'block' }}>Pontuacao</Text><Text style={{ fontSize: 24, fontWeight: 800, color: '#ffd700' }}>{score}</Text></div>
            <div><Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, display: 'block' }}>Acertos</Text><Text style={{ fontSize: 24, fontWeight: 800, color: '#2ed573' }}>{correctCount}</Text></div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Button size="large" icon={<ThunderboltOutlined />} onClick={startGame} style={{ borderRadius: 12, height: 46, paddingInline: 20 }}>Tentar Novamente</Button>
          <Button type="primary" size="large" icon={<ArrowLeftOutlined />} onClick={() => navigate('/aluno/jogos')} style={{ borderRadius: 12, height: 46, paddingInline: 20, background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none', fontWeight: 600 }}>Voltar aos Jogos</Button>
        </div>
      </div>
    );
  }

  return null;
}