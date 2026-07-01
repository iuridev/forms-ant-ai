require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const db = require('./services/sheetsDb');
const authRoutes = require('./routes/auth');
const examRoutes = require('./routes/exams');
const attemptRoutes = require('./routes/attempts');
const groupRoutes = require('./routes/groups');
const aulaRoutes = require('./routes/aulas');
const questionBankRoutes = require('./routes/questionBank');
const simuladoRoutes = require('./routes/simulados');
const disciplineRoutes = require('./routes/disciplines');
const gameRoutes = require('./routes/games');

const app = express();
const server = http.createServer(app);
const ALLOWED_ORIGINS = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(s => s.trim().replace(/\/$/, ''))
  : ['http://localhost:5173'];

function originAllowed(origin, callback) {
  // Permite requests sem origin (Postman, curl, server-to-server)
  if (!origin) return callback(null, true);
  const normalized = origin.replace(/\/$/, '');
  if (ALLOWED_ORIGINS.includes(normalized)) return callback(null, true);
  callback(new Error(`CORS: origin não permitida: ${origin}`));
}

const corsOptions = {
  origin: originAllowed,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

const io = new Server(server, {
  cors: { origin: originAllowed, methods: ['GET', 'POST'] },
});

app.use(cors(corsOptions));

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/attempts', attemptRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/aulas', aulaRoutes);
app.use('/api/question-bank', questionBankRoutes);
app.use('/api/simulados', simuladoRoutes);
app.use('/api/disciplines', disciplineRoutes);
app.use('/api/games', gameRoutes);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

io.on('connection', (socket) => {
  socket.on('join-exam-monitor', (examId) => socket.join(`exam:${examId}`));
  socket.on('violation', (data) => io.to(`exam:${data.examId}`).emit('student-violation', data));
  socket.on('student-online', (data) => io.to(`exam:${data.examId}`).emit('student-status', { ...data, online: true }));
});

const PORT = process.env.PORT || 3001;

async function start() {
  try {
    console.log('Conectando ao Google Sheets...');
    await db.init();
    console.log('Google Sheets conectado e abas verificadas.');
    server.listen(PORT, '0.0.0.0', () => console.log(`Servidor rodando em 0.0.0.0:${PORT}`));
  } catch (err) {
    console.error('Erro ao conectar ao Google Sheets:', err.message);
    process.exit(1);
  }
}

start();
