import express from 'express';

interface ConnectorOptions {
  remoteUrl: string;
  sessionId: string;
  token: string;
  port: number;
}

function readOption(name: string) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function getOptions(): ConnectorOptions {
  const remoteUrl = readOption('remote') || process.env.DOUTRINA_REMOTE_URL || '';
  const sessionId = readOption('session') || process.env.DOUTRINA_SESSION_ID || '';
  const token = readOption('token') || process.env.DOUTRINA_SESSION_TOKEN || '';
  const portValue = readOption('port') || process.env.DOUTRINA_CONNECTOR_PORT || '3000';
  const port = Number(portValue);

  if (!remoteUrl || !sessionId || !token || !Number.isInteger(port) || port <= 0) {
    console.error(
      'Uso: npm run connector -- --remote https://seu-servidor --session ID --token TOKEN'
    );
    process.exit(1);
  }

  return {
    remoteUrl: remoteUrl.replace(/\/$/, ''),
    sessionId,
    token,
    port,
  };
}

const options = getOptions();
const app = express();

app.use(express.json({ limit: '10mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', sessionId: options.sessionId });
});

app.post('/gsi', (req, res) => {
  void fetch(`${options.remoteUrl}/gsi/${encodeURIComponent(options.sessionId)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-doutrinahud-session-token': options.token,
    },
    body: JSON.stringify(req.body),
  }).catch((error) => {
    console.error('Falha ao encaminhar GSI:', error.message);
  });

  res.sendStatus(200);
});

app.listen(options.port, '127.0.0.1', () => {
  console.log(`DoutrinaHUD Connector ativo em http://127.0.0.1:${options.port}/gsi`);
  console.log(`Encaminhando para a sessao ${options.sessionId}`);
});
