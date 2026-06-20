const http = require('http');
const fs = require('fs');
const path = require('path');
const server = http.createServer((req, res) => {
    const file = path.join(__dirname, 'architecture_globale.html');
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(file).pipe(res);
});
server.listen(9876, '127.0.0.1', () => {
    console.log('SERVER_READY on http://127.0.0.1:9876');
});
