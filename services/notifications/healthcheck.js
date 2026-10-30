import http from 'node:http';
const port = process.env.PORT || 4004;
const req = http.get({ host: '127.0.0.1', port, path: '/api/notifications/health', timeout: 4000 }, (res) => {
  process.exit(res.statusCode === 200 ? 0 : 1);
});
req.on('error', () => process.exit(1));
req.on('timeout', () => { req.destroy(); process.exit(1); });
