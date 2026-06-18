require('dotenv').config();
const { google } = require('googleapis');

async function testar() {
  console.log('\n=== Testando conexão com Google Sheets ===\n');

  const missingVars = [];
  if (!process.env.GOOGLE_SHEETS_ID) missingVars.push('GOOGLE_SHEETS_ID');
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.includes('seu-')) missingVars.push('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  if (!process.env.GOOGLE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY.includes('SUA_CHAVE')) missingVars.push('GOOGLE_PRIVATE_KEY');

  if (missingVars.length > 0) {
    console.error('❌ Variáveis não preenchidas no .env:');
    missingVars.forEach(v => console.error(`   - ${v}`));
    console.error('\nSiga o guia em COMO_TESTAR.md para preencher o .env.\n');
    process.exit(1);
  }

  console.log('✅ Variáveis de ambiente encontradas.');
  console.log(`   Planilha: ${process.env.GOOGLE_SHEETS_ID}`);
  console.log(`   Conta: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    const sheets = google.sheets({ version: 'v4', auth });

    console.log('\n⏳ Conectando à planilha...');
    const meta = await sheets.spreadsheets.get({ spreadsheetId: process.env.GOOGLE_SHEETS_ID });
    console.log(`✅ Planilha encontrada: "${meta.data.properties.title}"`);
    console.log(`   Abas existentes: ${meta.data.sheets.map(s => s.properties.title).join(', ') || '(nenhuma)'}`);
    console.log('\n✅ CONEXÃO OK! Pode rodar: npm run dev\n');
  } catch (err) {
    console.error('\n❌ Erro ao conectar:');
    if (err.message?.includes('invalid_grant') || err.message?.includes('unauthorized')) {
      console.error('   Credenciais inválidas ou a planilha não foi compartilhada com a Service Account.');
      console.error(`   Compartilhe a planilha com: ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL}`);
    } else if (err.message?.includes('not found') || err.code === 404) {
      console.error('   Planilha não encontrada. Verifique o GOOGLE_SHEETS_ID no .env.');
    } else {
      console.error('  ', err.message);
    }
    process.exit(1);
  }
}

testar();
