const { google } = require('googleapis');
const { randomUUID: uuidv4 } = require('crypto');

const SHEET_SCHEMAS = {
  Users:              ['id', 'name', 'email', 'password', 'role', 'publicCode', 'createdAt'],
  Exams:              ['id', 'title', 'description', 'durationMinutes', 'status', 'accessCode', 'teacherId', 'type', 'maxAttempts', 'scheduledStart', 'scheduledEnd', 'createdAt', 'updatedAt'],
  Groups:             ['id', 'name', 'teacherId', 'createdAt'],
  GroupMembers:       ['id', 'groupId', 'studentId', 'addedAt'],
  ExamGroups:         ['id', 'examId', 'groupId'],
  Questions:          ['id', 'examId', 'text', 'type', 'points', 'order', 'correctBlank'],
  Options:            ['id', 'questionId', 'text', 'isCorrect'],
  ExamAttempts:       ['id', 'examId', 'studentId', 'startedAt', 'submittedAt', 'score', 'maxScore', 'status', 'totalFocusLostSeconds'],
  Answers:            ['id', 'attemptId', 'questionId', 'selectedOptionId', 'textAnswer', 'isCorrect', 'pointsEarned', 'feedback'],
  ViolationLogs:      ['id', 'attemptId', 'type', 'details', 'timestamp', 'durationSeconds'],
  Aulas:              ['id', 'title', 'description', 'slideUrl', 'groupId', 'teacherId', 'order', 'createdAt'],
  QuestionBank:        ['id', 'teacherId', 'text', 'type', 'points', 'correctBlank', 'tags', 'createdAt'],
  QuestionBankOptions: ['id', 'questionBankId', 'text', 'isCorrect'],
  Simulados:           ['id', 'studentId', 'discipline', 'totalQuestions', 'score', 'maxScore', 'status', 'createdAt', 'submittedAt'],
  SimuladoAnswers:     ['id', 'simuladoId', 'questionBankId', 'questionText', 'questionType', 'isCorrect', 'pointsEarned', 'maxPoints', 'selectedAnswer', 'correctAnswer'],
};

class SheetsDB {
  constructor() {
    this.sheets = null;
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    this._cache = {};
    this._cacheTime = {};
    this.CACHE_TTL = 3000; // 3 segundos
  }

  async init() {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    this.sheets = google.sheets({ version: 'v4', auth });
    await this._ensureSheets();
  }

  async _ensureSheets() {
    const meta = await this.sheets.spreadsheets.get({ spreadsheetId: this.spreadsheetId });
    const existing = new Set(meta.data.sheets.map(s => s.properties.title));

    for (const [name, headers] of Object.entries(SHEET_SCHEMAS)) {
      if (!existing.has(name)) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: { requests: [{ addSheet: { properties: { title: name } } }] },
        });
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${name}!A1`,
          valueInputOption: 'RAW',
          requestBody: { values: [headers] },
        });
      } else {
        // Verifica se o cabeçalho existe e bate com o schema atual
        const res = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.spreadsheetId,
          range: `${name}!1:1`,
        });
        const existingHeaders = res.data.values?.[0] || [];
        const expectedHeaders = SHEET_SCHEMAS[name];
        // Atualiza se vazio ou se colunas divergem (schema evoluiu)
        if (existingHeaders.length === 0 || existingHeaders.join(',') !== expectedHeaders.join(',')) {
          await this.sheets.spreadsheets.values.update({
            spreadsheetId: this.spreadsheetId,
            range: `${name}!A1`,
            valueInputOption: 'RAW',
            requestBody: { values: [expectedHeaders] },
          });
        }
      }
    }
  }

  // Lê todos os registros de uma aba como array de objetos
  async readAll(sheetName) {
    const now = Date.now();
    if (this._cache[sheetName] && (now - this._cacheTime[sheetName]) < this.CACHE_TTL) {
      return this._cache[sheetName];
    }

    const res = await this.sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: sheetName,
    });

    const rows = res.data.values || [];
    if (rows.length < 1) return [];

    const headers = rows[0];
    const records = rows.slice(1).map((row, idx) => {
      const obj = { _rowIndex: idx + 2 }; // 1-based, +1 for header
      headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
      return obj;
    });

    this._cache[sheetName] = records;
    this._cacheTime[sheetName] = now;
    return records;
  }

  _invalidateCache(sheetName) {
    delete this._cache[sheetName];
    delete this._cacheTime[sheetName];
  }

  // Insere um novo registro
  async insert(sheetName, data) {
    const id = data.id || uuidv4();
    const headers = SHEET_SCHEMAS[sheetName];
    const row = headers.map(h => {
      if (h === 'id') return id;
      const val = data[h];
      if (val === undefined || val === null) return '';
      return String(val);
    });

    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    });

    this._invalidateCache(sheetName);
    return { id, ...data };
  }

  // Atualiza um registro por ID
  async update(sheetName, id, data) {
    const records = await this.readAll(sheetName);
    const record = records.find(r => r.id === id);
    if (!record) throw new Error(`Registro ${id} não encontrado em ${sheetName}`);

    const headers = SHEET_SCHEMAS[sheetName];
    const updated = { ...record, ...data, id };
    const row = headers.map(h => {
      const val = updated[h];
      if (val === undefined || val === null) return '';
      return String(val);
    });

    const range = `${sheetName}!A${record._rowIndex}`;
    await this.sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [row] },
    });

    this._invalidateCache(sheetName);
    return updated;
  }

  // Deleta um registro por ID (limpa a linha)
  async delete(sheetName, id) {
    const records = await this.readAll(sheetName);
    const record = records.find(r => r.id === id);
    if (!record) return;

    const meta = await this.sheets.spreadsheets.get({ spreadsheetId: this.spreadsheetId });
    const sheetMeta = meta.data.sheets.find(s => s.properties.title === sheetName);
    const sheetId = sheetMeta.properties.sheetId;

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: [{
          deleteDimension: {
            range: { sheetId, dimension: 'ROWS', startIndex: record._rowIndex - 1, endIndex: record._rowIndex },
          },
        }],
      },
    });

    this._invalidateCache(sheetName);
  }

  // Helpers de busca
  async findById(sheetName, id) {
    const records = await this.readAll(sheetName);
    return records.find(r => r.id === id) || null;
  }

  async findWhere(sheetName, predicate) {
    const records = await this.readAll(sheetName);
    return records.filter(predicate);
  }

  async findOne(sheetName, predicate) {
    const records = await this.readAll(sheetName);
    return records.find(predicate) || null;
  }

  // Deleta todos os registros que satisfazem o predicado (em lote reverso)
  async deleteWhere(sheetName, predicate) {
    const records = await this.readAll(sheetName);
    const toDelete = records.filter(predicate).sort((a, b) => b._rowIndex - a._rowIndex);
    if (toDelete.length === 0) return;

    const meta = await this.sheets.spreadsheets.get({ spreadsheetId: this.spreadsheetId });
    const sheetMeta = meta.data.sheets.find(s => s.properties.title === sheetName);
    const sheetId = sheetMeta.properties.sheetId;

    const requests = toDelete.map(r => ({
      deleteDimension: {
        range: { sheetId, dimension: 'ROWS', startIndex: r._rowIndex - 1, endIndex: r._rowIndex },
      },
    }));

    await this.sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: { requests },
    });

    this._invalidateCache(sheetName);
  }
}

const db = new SheetsDB();
module.exports = db;
