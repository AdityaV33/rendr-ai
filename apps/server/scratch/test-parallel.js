import http from 'http';

const PROJECT_ID = "66f7f6a7d5b1234567890def"; // random valid ObjectId

function request(method, path, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(`http://localhost:3000${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // The backend requires authentication in most places, but wait...
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 400) reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          else resolve(JSON.parse(body || '{}'));
        } catch(e) {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function run() {
  console.log('Testing parallel execution...');
  // The dev server might need authentication, we'll see.
}
run();
