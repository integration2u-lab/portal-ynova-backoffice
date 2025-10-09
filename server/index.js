import { createServer } from 'http';
import { randomUUID } from 'crypto';

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const HOST = process.env.HOST || '0.0.0.0';

const allowedOriginPatterns = [/^https?:\/\/localhost:\d+$/, /\.ynovamarketplace\.com$/];

const contracts = [
  {
    id: '1',
    contract_code: 'CTR-2024-061-0001',
    client_name: 'Cliente XPTO',
    client_id: '17f83280-750a-473c-99d2-2bfacd101813',
    groupName: 'default',
    cnpj: '00.000.000/0001-00',
    segment: 'Comercial',
    contact_responsible: 'Maria Silva',
    contracted_volume_mwh: '1500.75',
    status: 'Ativo',
    energy_source: 'Convencional',
    contracted_modality: 'PLD',
    start_date: '2024-01-01T00:00:00.000Z',
    end_date: '2026-12-31T00:00:00.000Z',
    billing_cycle: 'Mensal',
    upper_limit_percent: '0.15',
    lower_limit_percent: '0.05',
    flexibility_percent: '0.1',
    average_price_mwh: '320.5',
    spot_price_ref_mwh: '299.9',
    compliance_consumption: 'Em análise',
    compliance_nf: 'Em análise',
    compliance_invoice: 'Em análise',
    compliance_charges: 'Em análise',
    compliance_overall: 'Em análise',
    created_at: '2024-03-01T12:00:00.000Z',
    updated_at: '2024-03-01T12:00:00.000Z',
  },
];

function isAllowedOrigin(origin) {
  if (!origin) return false;
  return allowedOriginPatterns.some((pattern) => pattern.test(origin));
}

function setCorsHeaders(res, origin) {
  if (isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve(JSON.parse(text));
      } catch (error) {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', (err) => reject(err));
  });
}

function sendJson(res, statusCode, payload, origin) {
  setCorsHeaders(res, origin);
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

const requiredFields = [
  'contract_code',
  'client_name',
  'cnpj',
  'segment',
  'contact_responsible',
  'contracted_volume_mwh',
  'status',
  'energy_source',
  'contracted_modality',
  'start_date',
  'end_date',
  'billing_cycle',
];

const server = createServer(async (req, res) => {
  const origin = req.headers.origin || '';
  const url = new URL(req.url || '/', 'http://localhost');

  if (req.method === 'OPTIONS') {
    setCorsHeaders(res, origin);
    res.writeHead(204);
    res.end();
    return;
  }

  if (url.pathname === '/contracts' && req.method === 'GET') {
    sendJson(res, 200, contracts, origin);
    return;
  }

  if (url.pathname === '/contracts' && req.method === 'POST') {
    try {
      const payload = await parseBody(req);
      const missing = requiredFields.filter((field) => !payload?.[field]);
      if (missing.length > 0) {
        sendJson(res, 400, { error: `Missing: ${missing.join(', ')}` }, origin);
        return;
      }

      const now = new Date().toISOString();
      const contract = {
        id: randomUUID(),
        ...payload,
        client_id: randomUUID(),
        groupName: typeof payload.groupName === 'string' && payload.groupName.trim()
          ? payload.groupName
          : 'default',
        created_at: now,
        updated_at: now,
      };
      contracts.unshift(contract);
      sendJson(res, 201, contract, origin);
    } catch (error) {
      sendJson(res, 400, { error: error instanceof Error ? error.message : 'Invalid request' }, origin);
    }
    return;
  }

  sendJson(res, 404, { error: 'Not Found' }, origin);
});

server.on('clientError', (err, socket) => {
  if (socket.writable) {
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Contracts API listening on http://${HOST}:${PORT}`);
});
