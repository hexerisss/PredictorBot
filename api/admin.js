const db = require('../lib/database');
const crypto = require('crypto');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    // Serve admin panel HTML
    return res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>KyoBhop Admin Panel</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Courier New', monospace;
            background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
            min-height: 100vh;
            padding: 20px;
            color: #fff;
        }
        .banner {
            font-family: monospace;
            color: #00ffff;
            text-align: center;
            font-size: 10px;
            line-height: 12px;
            margin-bottom: 20px;
            text-shadow: 0 0 10px #00ffff;
        }
        .subtitle {
            text-align: center;
            color: #ff00ff;
            margin-bottom: 30px;
            font-size: 18px;
        }
        .container { max-width: 1400px; margin: 0 auto; }
        .login-box, .dashboard {
            background: rgba(0, 0, 0, 0.7);
            border-radius: 10px;
            padding: 30px;
            box-shadow: 0 0 30px rgba(0, 255, 255, 0.3);
            border: 2px solid #00ffff;
        }
        h1 { color: #00ffff; margin-bottom: 20px; text-shadow: 0 0 10px #00ffff; }
        h2 { color: #ff00ff; margin: 20px 0 10px 0; text-shadow: 0 0 10px #ff00ff; }
        input, button, select {
            width: 100%;
            padding: 12px;
            margin: 10px 0;
            border: 2px solid #00ffff;
            border-radius: 5px;
            font-size: 16px;
            background: rgba(0, 0, 0, 0.5);
            color: #fff;
            font-family: 'Courier New', monospace;
        }
        button {
            background: linear-gradient(135deg, #00ffff, #ff00ff);
            color: #000;
            border: none;
            cursor: pointer;
            transition: 0.3s;
            font-weight: bold;
        }
        button:hover { 
            transform: scale(1.05);
            box-shadow: 0 0 20px #00ffff;
        }
        .stats { 
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }
        .stat-card {
            background: linear-gradient(135deg, #00ffff20, #ff00ff20);
            border: 2px solid #00ffff;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 0 15px rgba(0, 255, 255, 0.3);
        }
        .stat-card h3 { 
            font-size: 2.5em; 
            margin: 10px 0; 
            color: #00ffff;
            text-shadow: 0 0 10px #00ffff;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0;
            background: rgba(0, 0, 0, 0.3);
        }
        th, td { 
            padding: 12px; 
            text-align: left; 
            border-bottom: 1px solid #00ffff50;
        }
        th { 
            background: rgba(0, 255, 255, 0.2);
            font-weight: 600;
            color: #00ffff;
        }
        .key { 
            font-family: 'Courier New', monospace;
            background: rgba(0, 255, 255, 0.2);
            padding: 4px 8px;
            border-radius: 4px;
            color: #00ffff;
            border: 1px solid #00ffff;
        }
        .hwid {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            color: #ff00ff;
        }
        .status-active { color: #00ff00; font-weight: bold; }
        .status-inactive { color: #ff0000; }
        #dashboard { display: none; }
        .action-btn {
            padding: 6px 12px;
            margin: 2px;
            width: auto;
            display: inline-block;
            font-size: 12px;
        }
        .success-msg {
            background: rgba(0, 255, 0, 0.2);
            border: 1px solid #00ff00;
            padding: 15px;
            border-radius: 5px;
            margin: 10px 0;
            color: #00ff00;
        }
        .input-group {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <pre class="banner">
██╗  ██╗██╗   ██╗ ██████╗ ██████╗ ██╗  ██╗ ██████╗ ██████╗ 
██║ ██╔╝╚██╗ ██╔╝██╔═══██╗██╔══██╗██║  ██║██╔═══██╗██╔══██╗
█████╔╝  ╚████╔╝ ██║   ██║██████╔╝███████║██║   ██║██████╔╝
██╔═██╗   ╚██╔╝  ██║   ██║██╔══██╗██╔══██║██║   ██║██╔═══╝ 
██║  ██╗   ██║   ╚██████╔╝██████╔╝██║  ██║╚██████╔╝██║     
╚═╝  ╚═╝   ╚═╝    ╚═════╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝     
        </pre>
        <div class="subtitle">"The best BloxStrike Bhop"</div>

        <div class="login-box" id="login">
            <h1>🔐 Admin Login</h1>
            <input type="password" id="password" placeholder="Enter admin password">
            <button onclick="login()">Login</button>
        </div>

        <div class="dashboard" id="dashboard">
            <h1>📊 KyoBhop Admin Dashboard</h1>
            
            <div class="stats" id="stats"></div>
            
            <h2>🔑 Generate License Key</h2>
            <div class="input-group">
                <input type="number" id="days" placeholder="Days (e.g., 30)">
                <button onclick="generateKey()">Generate Key</button>
            </div>
            <div id="generatedKey"></div>
            
            <h2>🔧 HWID Management</h2>
            <div class="input-group">
                <input type="text" id="resetUserId" placeholder="User ID">
                <button onclick="resetHWID()">Reset HWID</button>
            </div>
            
            <h2>📅 Set Custom Expiry Date</h2>
            <div class="input-group">
                <input type="text" id="expiryUserId" placeholder="User ID">
                <input type="date" id="expiryDate">
                <button onclick="setExpiry()">Set Expiry</button>
            </div>
            
            <h2>📋 All License Keys</h2>
            <div id="keys"></div>
            
            <h2>👥 Active Users</h2>
            <div id="users"></div>
            
            <h2>🔄 HWID Reset History</h2>
            <div id="resets"></div>
            
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
                    \`<div class="success-msg">
                        <strong>Generated Key:</strong> <span class="key">\${data.key}</span><br>
                        <strong>Duration:</strong> \${days} days
                    </div>\`;
                loadData();
            }
        }

        async function resetHWID() {
            const userId = document.getElementById('resetUserId').value;
            const res = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'resetHWID', userId, token })
            });
            const data = await res.json();
            
            alert(data.message);
            if (data.success) {
                loadData();
                document.getElementById('resetUserId').value = '';
            }
        }

        async function setExpiry() {
            const userId = document.getElementById('expiryUserId').value;
            const date = document.getElementById('expiryDate').value;
            const res = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'setExpiry', userId, date, token })
            });
            const data = await res.json();
            
            alert(data.message);
            if (data.success) {
                loadData();
                document.getElementById('expiryUserId').value = '';
                document.getElementById('expiryDate').value = '';
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
            const activeUsers = data.users.filter(u => u.active).length;
            const redeemedKeys = data.keys.filter(k => k.redeemed).length;
            
            document.getElementById('stats').innerHTML = \`
                <div class="stat-card">
                    <div>Total Keys</div>
                    <h3>\${data.keys.length}</h3>
                </div>
                <div class="stat-card">
                    <div>Active Users</div>
                    <h3>\${activeUsers}</h3>
                </div>
                <div class="stat-card">
                    <div>Redeemed</div>
                    <h3>\${redeemedKeys}</h3>
                </div>
                <div class="stat-card">
                    <div>Available Keys</div>
                    <h3>\${data.keys.length - redeemedKeys}</h3>
                </div>
            \`;

            // Keys table
            document.getElementById('keys').innerHTML = \`
                <table>
                    <tr>
                        <th>ID</th>
                        <th>Key</th>
                        <th>Days</th>
                        <th>Status</th>
                        <th>Created</th>
                    </tr>
                    \${data.keys.map(k => \`
                        <tr>
                            <td>\${k.id}</td>
                            <td><span class="key">\${k.key}</span></td>
                            <td>\${k.days} days</td>
                            <td class="\${k.redeemed ? 'status-inactive' : 'status-active'}">
                                \${k.redeemed ? '❌ Redeemed' : '✅ Available'}
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
                        <th>ID</th>
                        <th>User ID</th>
                        <th>HWID</th>
                        <th>Status</th>
                        <th>Expires</th>
                        <th>Key</th>
                        <th>Actions</th>
                    </tr>
                    \${data.users.map(u => \`
                        <tr>
                            <td>\${u.id}</td>
                            <td>\${u.userId}</td>
                            <td class="hwid">\${u.hwid ? u.hwid.substring(0, 16) + '...' : 'Not set'}</td>
                            <td class="\${u.active ? 'status-active' : 'status-inactive'}">
                                \${u.active ? '✅ Active' : '❌ Expired'}
                            </td>
                            <td>\${new Date(u.expiresAt).toLocaleDateString()}</td>
                            <td><span class="key">\${u.key || 'N/A'}</span></td>
                            <td>
                                <button class="action-btn" onclick="quickResetHWID('\${u.userId}')">Reset HWID</button>
                            </td>
                        </tr>
                    \`).join('')}
                </table>
            \`;

            // HWID Resets table
            if (data.resets && data.resets.length > 0) {
                document.getElementById('resets').innerHTML = \`
                    <table>
                        <tr>
                            <th>User ID</th>
                            <th>Old HWID</th>
                            <th>New HWID</th>
                            <th>Reset By</th>
                            <th>Reset At</th>
                        </tr>
                        \${data.resets.map(r => \`
                            <tr>
                                <td>\${r.userId}</td>
                                <td class="hwid">\${r.oldHwid ? r.oldHwid.substring(0, 16) + '...' : 'N/A'}</td>
                                <td class="hwid">\${r.newHwid ? r.newHwid.substring(0, 16) + '...' : 'Cleared'}</td>
                                <td>\${r.resetBy}</td>
                                <td>\${new Date(r.resetAt).toLocaleString()}</td>
                            </tr>
                        \`).join('')}
                    </table>
                \`;
            }
        }

        async function quickResetHWID(userId) {
            if (!confirm(\`Reset HWID for user \${userId}?\`)) return;
            
            const res = await fetch('/api/admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'resetHWID', userId, token })
            });
            const data = await res.json();
            
            alert(data.message);
            if (data.success) loadData();
        }

        function logout() {
            token = '';
            document.getElementById('login').style.display = 'block';
            document.getElementById('dashboard').style.display = 'none';
        }

        // Auto-refresh every 30 seconds
        setInterval(() => {
            if (token) loadData();
        }, 30000);
    </script>
</body>
</html>
    `);
  }

  if (req.method === 'POST') {
    const { action, password, token, days, userId, date } = req.body;

    if (action === 'login') {
      if (password === process.env.ADMIN_PASSWORD) {
        return res.json({ success: true, token: 'admin-session-' + Date.now() });
      }
      return res.json({ success: false });
    }

    // Verify token
    if (!token || !token.startsWith('admin-session-')) {
      return res.status(401).json({ success: false });
    }

    if (action === 'generate') {
      const key = await db.generateKey(parseInt(days));
      return res.json({ success: true, key });
    }

    if (action === 'resetHWID') {
      const result = await db.resetHWID(userId);
      return res.json(result);
    }

    if (action === 'setExpiry') {
      const result = await db.setExpiryDate(userId, date);
      return res.json(result);
    }

    if (action === 'getData') {
      const keys = await db.getAllKeys();
      const users = await db.getAllUsers();
      const resets = await db.getHWIDResets();
      return res.json({ success: true, keys, users, resets });
    }

    return res.status(400).json({ success: false });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
