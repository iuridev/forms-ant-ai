const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('../services/sheetsDb');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

async function generatePublicCode() {
  for (let i = 0; i < 20; i++) {
    const code = Array.from({ length: 8 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
    const existing = await db.findOne('Users', u => u.publicCode === code);
    if (!existing) return code;
  }
  throw new Error('Não foi possível gerar código público único');
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function safeUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, publicCode: user.publicCode || null };
}

async function register(req, res) {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  const existing = await db.findOne('Users', u => u.email === email);
  if (existing) return res.status(409).json({ error: 'Email já cadastrado' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const publicCode = await generatePublicCode();
  const user = await db.insert('Users', {
    name,
    email,
    password: hashedPassword,
    role: role === 'TEACHER' ? 'TEACHER' : 'STUDENT',
    publicCode,
    createdAt: new Date().toISOString(),
  });

  return res.status(201).json({ token: generateToken(user), user: safeUser(user) });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email e senha são obrigatórios' });

  const user = await db.findOne('Users', u => u.email === email);
  if (!user) return res.status(401).json({ error: 'Credenciais inválidas' });

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });

  return res.json({ token: generateToken(user), user: safeUser(user) });
}

async function me(req, res) {
  let user = await db.findById('Users', req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  // Gera publicCode para usuários existentes que não possuem
  if (!user.publicCode) {
    const publicCode = await generatePublicCode();
    user = await db.update('Users', user.id, { ...user, publicCode });
  }

  return res.json(safeUser(user));
}

async function googleAuth(req, res) {
  const { googleUserInfo, role } = req.body;
  if (!googleUserInfo?.email) return res.status(400).json({ error: 'Dados do Google obrigatórios' });

  const { email, name } = googleUserInfo;

  let user = await db.findOne('Users', u => u.email === email);

  if (user) {
    // Garante que usuários existentes tenham publicCode
    if (!user.publicCode) {
      const publicCode = await generatePublicCode();
      user = await db.update('Users', user.id, { ...user, publicCode });
    }
    return res.json({ token: generateToken(user), user: safeUser(user) });
  }

  // Novo usuário — precisa escolher o papel
  if (!role || !['TEACHER', 'STUDENT'].includes(role)) {
    return res.status(202).json({ needsRole: true, email, name });
  }

  const publicCode = await generatePublicCode();
  user = await db.insert('Users', {
    name,
    email,
    password: '',
    role,
    publicCode,
    createdAt: new Date().toISOString(),
  });

  return res.status(201).json({ token: generateToken(user), user: safeUser(user) });
}

module.exports = { register, login, me, googleAuth };
