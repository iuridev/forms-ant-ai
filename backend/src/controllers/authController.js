const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const db = require('../services/sheetsDb');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
}

function safeUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

async function register(req, res) {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
  }

  const existing = await db.findOne('Users', u => u.email === email);
  if (existing) return res.status(409).json({ error: 'Email já cadastrado' });

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await db.insert('Users', {
    name,
    email,
    password: hashedPassword,
    role: role === 'TEACHER' ? 'TEACHER' : 'STUDENT',
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
  const user = await db.findById('Users', req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  return res.json(safeUser(user));
}

async function googleAuth(req, res) {
  const { googleUserInfo, role } = req.body;
  if (!googleUserInfo?.email) return res.status(400).json({ error: 'Dados do Google obrigatórios' });

  const { email, name } = googleUserInfo;

  let user = await db.findOne('Users', u => u.email === email);

  if (user) {
    return res.json({ token: generateToken(user), user: safeUser(user) });
  }

  // Novo usuário — precisa escolher o papel
  if (!role || !['TEACHER', 'STUDENT'].includes(role)) {
    return res.status(202).json({ needsRole: true, email, name });
  }

  user = await db.insert('Users', {
    name,
    email,
    password: '',
    role,
    createdAt: new Date().toISOString(),
  });

  return res.status(201).json({ token: generateToken(user), user: safeUser(user) });
}

module.exports = { register, login, me, googleAuth };
