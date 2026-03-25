const db = require('../lib/database');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    // Serve admin panel HTML
    return res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>Admin Panel</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .login-box, .dashboard {
            background: white;
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        }
        h1 { color: #667eea; margin-bottom: 20px; }
        input, button {
            width: 100%;
            padding: 12px;
            margin: 10px 0;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }
        button {
            background: #667eea;
            color: white;
            border: none;
            cursor: pointer;
            transition: 0.3s;
        }
        button:hover { background: #5568d3; }
        .stats { 
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .stat-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-card h3 { font-size: 2em; margin: 10px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f5f5f5; font-weight: 600; }
        .key { 
            font-family: monospace;
            background: #f0f0f0;
            padding: 4px 8px;
            border-radius: 4px;
        }
        .status-active { color: #00aa00; font-weight: bold; }
        .status-inactive { color: #999; }
        #dashboard { display: none; }
    </style>
</head>
<body>
    <div class="container">
        <div class="login-box" id="login">
            <h1>🔐 Admin Login</h1>
            <input type="password" id="password" placeholder="Enter password">
            <button onclick="login()">Login</button>
        </div>

        <div class="dashboard" id="dashboard">
            <h1>📊 Admin Dashboard</h1>
            
            <div class="stats" id="stats"></div>
            
            <h2>🔑 Generate License Key</h2>
            <input type="number" id="days" placeholder="Days (e.g., 30)">
            <button onclick="generateKey()">Generate Key</button>
            <div id="generatedKey"></div>
            
            <h2>📋 All License Keys</h2>
            <div id="keys"></div>
            
            <h2>👥 Active Users</h2>
            <div id="users"></div>
            
            <button onclick="logout()">Logout</button>
        </div>
    </div>

    <script>
        let token = '';

        async function login() {
            const password = document.getElementById('password').value;
            const res = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'login', password })
            });
            const data = await res.json();
            
            if (data.success) {
                token = data.token;
                document.getElementById('login').style.display = 'none';
                document.getElementById('dashboard').style.display = 'block';
                loadData();
            } else {
                alert('Invalid password');
            }
        }

        async function generateKey() {
            const days = document.getElementById('days').value;
            const res = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate', days, token })
            });
            const data = await res.json();
            
            if (data.success) {
                document.getElementById('generatedKey').innerHTML = 
                    \`<p style="background: #e8f5e9; padding: 15px; border-radius: 5px; margin: 10px 0;">
                        <strong>Generated Key:</strong> <span class="key">\${data.key}</span><br>
                        <strong>Duration:</strong> \${days} days
                    </p>\`;
                loadData();
            }
        }

        async function loadData() {
            const res = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getData', token })
            });
            const data = await res.json();
            
            if (!data.success) return;

            // Stats
            document.getElementById('stats').innerHTML = \`
                <div class="stat-card">
                    <div>Total Keys</div>
                    <h3>\${data.keys.length}</h3>
                </div>
                <div class="stat-card">
                    <div>Active Users</div>
                    <h3>\${data.users.filter(u => u.active).length}</h3>
                </div>
                <div class="stat-card">
                    <div>Redeemed</div>
                    <h3>\${data.keys.filter(k => k.redeemed).length}</h3>
                </div>
            \`;

            // Keys table
            document.getElementById('keys').innerHTML = \`
                <table>
                    <tr>
                        <th>Key</th>
                        <th>Days</th>
                        <th>Status</th>
                        <th>Created</th>
                    </tr>
                    \${data.keys.map(k => \`
                        <tr>
                            <td><span class="key">\${k.key}</span></td>
                            <td>\${k.days} days</td>
                            <td class="\${k.redeemed ? 'status-inactive' : 'status-active'}">
                                \${k.redeemed ? 'Redeemed' : 'Available'}
                            </td>
                            <td>\${new Date(k.createdAt).toLocaleDateString()}</td>
                        </tr>
                    \`).join('')}
                </table>
            \`;

            // Users table
            document.getElementById('users').innerHTML = \`
                <table>
                    <tr>
                        <th>User ID</th>
                        <th>Status</th>
                        <th>Expires</th>
                        <th>Key</th>
                    </tr>
                    \${data.users.map(u => \`
                        <tr>
                            <td>\${u.userId}</td>
                            <td class="\${u.active ? 'status-active' : 'status-inactive'}">
                                \${u.active ? 'Active' : 'Expired'}
                            </td>
                            <td>\${new Date(u.expiresAt).toLocaleDateString()}</td>
                            <td><span class="key">\${u.key || 'N/A'}</span></td>
                        </tr>
                    \`).join('')}
                </table>
            \`;
        }

        function logout() {
            token = '';
            document.getElementById('login').style.display = 'block';
            document.getElementById('dashboard').style.display = 'none';
        }
    </script>
</body>
</html>
    `);
  }

  if (req.method === 'POST') {
    const { action, password, token, days } = req.body;

    if (action === 'login') {
      if (password === process.env.ADMIN_PASSWORD) {
        return res.json({ success: true, token: 'admin-session-' + Date.now() });
      }
      return res.json({ success: false });
    }

    // Verify token (simple check for demo)
    if (!token || !token.startsWith('admin-session-')) {
      return res.status(401).json({ success: false });
    }

    if (action === 'generate') {
      const key = await db.generateKey(parseInt(days));
      return res.json({ success: true, key });
    }

    if (action === 'getData') {
      const keys = await db.getAllKeys();
      const users = await db.getAllUsers();
      return res.json({ success: true, keys, users });
    }

    return res.status(400).json({ success: false });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
