// Local test SMTP receiver. No credentials, external delivery, persistence or third-party packages.
// Bind only to loopback; point the TEST backend's MAIL_HOST/MAIL_PORT here.
const net = require('node:net');
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const messages = [];
let rejectedDeliveries = 0, failNextDeliveries = 0;
const smtpPort = Number(process.env.E2E_SMTP_PORT || 1025);
const httpPort = Number(process.env.E2E_MAILBOX_PORT || 8025);
const smtp = net.createServer(socket => {
  socket.setEncoding('utf8');
  socket.setTimeout(30000, () => socket.destroy());
  let buffer = '', recipients = [], data = null;
  socket.write('220 localhost E2E SMTP\r\n');
  socket.on('error', () => {});
  socket.on('data', chunk => {
    buffer += chunk;
    if (buffer.length > 2_000_000) { socket.destroy(); return; }
    let end;
    while ((end = buffer.indexOf('\r\n')) !== -1) {
      const line = buffer.slice(0, end); buffer = buffer.slice(end + 2);
      if (data !== null) {
        if (line === '.') {
          if (failNextDeliveries > 0) { failNextDeliveries--; rejectedDeliveries++; recipients = []; data = null; socket.write('451 Temporary test delivery failure\r\n'); continue; }
          messages.push({ id: randomUUID(), to: recipients, raw: data.join('\r\n') });
          if (messages.length > 200) messages.shift();
          recipients = []; data = null; socket.write('250 Message accepted\r\n');
        } else {
          data.push(line.startsWith('..') ? line.slice(1) : line);
          if (data.length > 20000) { socket.destroy(); return; }
        }
      } else if (/^EHLO /i.test(line)) socket.write('250-localhost\r\n250 8BITMIME\r\n');
      else if (/^HELO /i.test(line)) socket.write('250 localhost\r\n');
      else if (/^MAIL FROM:/i.test(line)) { recipients = []; socket.write('250 OK\r\n'); }
      else if (/^RCPT TO:/i.test(line)) {
        const address = line.match(/^RCPT TO:\s*<([^>]+)>/i);
        if (!address) socket.write('501 Expected envelope address\r\n');
        else { recipients.push(address[1].toLowerCase()); socket.write('250 OK\r\n'); }
      } else if (/^DATA$/i.test(line) && recipients.length) { data = []; socket.write('354 End with dot\r\n'); }
      else if (/^QUIT$/i.test(line)) socket.end('221 Bye\r\n');
      else if (/^RSET$/i.test(line)) { recipients = []; data = null; socket.write('250 OK\r\n'); }
      else if (/^NOOP$/i.test(line)) socket.write('250 OK\r\n');
      else socket.write('502 Unsupported command\r\n');
    }
  });
});
const api = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  const to = url.searchParams.get('to');
  if (req.method === 'POST' && url.pathname === '/delivery-failures') {
    failNextDeliveries = Number(url.searchParams.get('count') || '0');
    if (!Number.isInteger(failNextDeliveries) || failNextDeliveries < 0 || failNextDeliveries > 5) { failNextDeliveries = 0; res.statusCode = 400; }
    res.end(JSON.stringify({ rejectedDeliveries, failNextDeliveries }));
  } else if (req.method === 'GET' && url.pathname === '/delivery-failures') res.end(JSON.stringify({ rejectedDeliveries, failNextDeliveries }));
  else if (req.method === 'GET' && url.pathname === '/messages' && to) {
    res.end(JSON.stringify(messages.filter(m => m.to.includes(to.toLowerCase()))));
  } else if (req.method === 'DELETE' && url.pathname === '/messages' && to) {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].to.includes(to.toLowerCase())) messages.splice(i, 1);
    res.end('{}');
  } else if (req.method === 'GET' && url.pathname === '/health') res.end('{"ready":true}');
  else { res.statusCode = 404; res.end('{}'); }
});
for (const server of [smtp, api]) server.on('error', error => { console.error(error.message); process.exit(1); });
smtp.listen(smtpPort, '127.0.0.1', () => console.log(`Test SMTP: 127.0.0.1:${smtpPort}`));
api.listen(httpPort, '127.0.0.1', () => console.log(`Test mailbox: http://127.0.0.1:${httpPort}`));
