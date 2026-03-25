const db = require('../lib/database');
const crypto = require('crypto');

// Your exclusive admin password - CHANGE THIS!
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "YourSecurePassword123!";

// Database setup for bhop licenses
const Database = require('better-sqlite3');
const dbPath = require('path').join(__dirname, '../../kyobhop.db');
const bhopDb = new Database(dbPath);

// Initialize bhop tables
bhopDb.exec(`
  CREATE TABLE IF NOT EXISTS bhop_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    days INTEGER NOT NULL,
    redeemed BOOLEAN DEFAULT 0,
    hwid TEXT,
    expires_at TEXT,
    redeemed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS bhop_hwid_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    license_key TEXT NOT NULL,
    old_hwid TEXT,
    new_hwid TEXT,
    reset_by TEXT DEFAULT 'admin',
    reset_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

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
        h1 { 
            color: #00ffff; 
            margin-bottom: 20px; 
            text-shadow: 0 0 10px #00ffff;
            text-align: center;
        }
        h2 { 
            color: #ff00ff; 
            margin: 30px 0 15px 0; 
            text-shadow: 0 0 10px #ff00ff;
            border-bottom: 2px solid #ff00ff;
            padding-bottom: 10px;
        }
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
            font-size: 12px;
        }
        .hwid {
            font-family: 'Courier New', monospace;
            font-size: 11px;
            color: #ff00ff;
        }
        .status-active { color: #00ff00; font-weight: bold; }
        .status-inactive { color: #ff0000; }
        .status-unused { color: #ffff00; }
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
            text-align: center;
            font-size: 14px;
        }
        .input-group {
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 10px;
        }
        .generate-section {
            background: rgba(255, 0, 255, 0.1);
            padding: 20px;
            border-radius: 10px;
            border: 2px solid #ff00ff;
            margin: 20px 0;
        }
        .btn-danger {
            background: linear-gradient(135deg, #ff0000, #ff00ff) !important;
        }
        .btn-warning {
            background: linear-gradient(135deg, #ffaa00, #ff00ff) !important;
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
        <div class="subtitle">"The best BloxStrike Bhop" - ADMIN PANEL</div>

        <div class="login-box" id="login">
            <h1>🔐 Owner Authentication</h1>
            <input type="password" id="password" placeholder="Enter your admin password" autofocus>
            <button onclick="login()">Login</button>
        </div>

        <div class="dashboard" id="dashboard">
            <h1>📊 KyoBhop License Manager</h1>
            
            <div class="stats" id="stats"></div>
            
            <div class="generate-section">
                <h2>🔑 Generate New License Key</h2>
                <div class="input-group">
                    <input type="number" id="days" placeholder="License Duration (days)" min="1" value="30">
                    <button onclick="generateKey()">Generate License</button>
                </div>
                <div id="generatedKey"></div>
            </div>
            
            <h2>📋 All Bhop License Keys</h2>
            <div id="keys"></div>
            
            <h2>🔄 HWID Reset History</h2>
            <div id="resets"></div>
            
            <button onclick="logout()" style="margin-top: 30px;">Logout</button>
        </div>
    </div>

    <script>
        let token = '';

        async function login() {
            const password = document.getElementById('password').value;
            const res = await fetch('/api/bhop-admin', {
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
                alert('❌ Invalid password - Access Denied');
                document.getElementById('password').value = '';
            }
        }

        async function generateKey() {
            const days = document.getElementById('days').value;
            if (!days || days < 1) {
                alert('Please enter valid days');
                return;
            }
            
            const res = await fetch('/api/bhop-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'generate', days, token })
            });
            const data = await res.json();
            
            if (data.success) {
                document.getElementById('generatedKey').innerHTML = 
                    \`<div class="success-msg">
                        <strong>✅ LICENSE GENERATED</strong><br><br>
                        <span class="key" style="font-size: 16px;">\${data.key}</span><br><br>
                        <strong>Duration:</strong> \${days} days
                    </div>\`;
                document.getElementById('days').value = '30';
                loadData();
            }
        }

        async function resetHWID(key) {
            if (!confirm(\`Reset HWID for license:\\n\${key}\\n\\nThis will allow the key to be used on a new PC.\`)) return;
            
            const res = await fetch('/api/bhop-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'resetHWID', key, token })
            });
            const data = await res.json();
            
            alert(data.message);
            if (data.success) loadData();
        }

        async function setExpiry(key) {
            const date = prompt('Enter new expiry date (YYYY-MM-DD):', new Date().toISOString().split('T')[0]);
            if (!date) return;
            
            const res = await fetch('/api/bhop-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'setExpiry', key, date, token })
            });
            const data = await res.json();
            
            alert(data.message);
            if (data.success) loadData();
        }

        async function deleteKey(key) {
            if (!confirm(\`⚠️ DELETE LICENSE KEY:\\n\${key}\\n\\nThis action cannot be undone!\`)) return;
            
            const res = await fetch('/api/bhop-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'deleteKey', key, token })
            });
            const data = await res.json();
            
            alert(data.message);
            if (data.success) loadData();
        }

        async function loadData() {
            const res = await fetch('/api/bhop-admin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'getData', token })
            });
            const data = await res.json();
            
            if (!data.success) return;

            // Stats
            const totalKeys = data.keys.length;
            const activeKeys = data.keys.filter(k => k.redeemed && new Date(k.expires_at) > new Date()).length;
            const unusedKeys = data.keys.filter(k => !k.redeemed).length;
            const expiredKeys = data.keys.filter(k => k.redeemed && new Date(k.expires_at) <= new Date()).length;
            
            document.getElementById('stats').innerHTML = \`
                <div class="stat-card">
                    <div>Total Keys</div>
                    <h3>\${totalKeys}</h3>
                </div>
                <div class="stat-card">
                    <div>Active Licenses</div>
                    <h3>\${activeKeys}</h3>
                </div>
                <div class="stat-card">
                    <div>Unused Keys</div>
                    <h3>\${unusedKeys}</h3>
                </div>
                <div class="stat-card">
                    <div>Expired</div>
                    <h3>\${expiredKeys}</h3>
                </div>
            \`;

            // Keys table
            document.getElementById('keys').innerHTML = \`
                <table>
                    <tr>
                        <th>License Key</th>
                        <th>Days</th>
                        <th>Status</th>
                        <th>HWID</th>
                        <th>Expires</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                    \${data.keys.map(k => {
                        let status = 'status-unused';
                        let statusText = '⚪ Unused';
                        
                        if (k.redeemed) {
                            const expired = new Date(k.expires_at) <= new Date();
                            status = expired ? 'status-inactive' : 'status-active';
                            statusText = expired ? '❌ Expired' : '✅ Active';
                        }
                        
                        return \`
                        <tr>
                            <td><span class="key">\${k.key}</span></td>
                            <td>\${k.days} days</td>
                            <td class="\${status}">\${statusText}</td>
                            <td class="hwid">\${k.hwid ? k.hwid.substring(0, 12) + '...' : '-'}</td>
                            <td>\${k.expires_at ? new Date(k.expires_at).toLocaleDateString() : '-'}</td>
                            <td>\${new Date(k.created_at).toLocaleDateString()}</td>
                            <td>
                                \${k.redeemed ? \`<button class="action-btn btn-warning" onclick="resetHWID('\${k.key}')">Reset HWID</button>\` : ''}
                                <button class="action-btn" onclick="setExpiry('\${k.key}')">Set Expiry</button>
                                <button class="action-btn btn-danger" onclick="deleteKey('\${k.key}')">Delete</button>
                            </td>
                        </tr>
                    \`;
                    }).join('')}
                </table>
            \`;

            // HWID Resets table
            if (data.resets && data.resets.length > 0) {
                document.getElementById('resets').innerHTML = \`
                    <table>
                        <tr>
                            <th>License Key</th>
                            <th>Old HWID</th>
                            <th>Reset By</th>
                            <th>Reset At</th>
                        </tr>
                        \${data.resets.map(r => \`
                            <tr>
                                <td><span class="key">\${r.license_key}</span></td>
                                <td class="hwid">\${r.old_hwid ? r.old_hwid.substring(0, 16) + '...' : 'N/A'}</td>
                                <td>\${r.reset_by}</td>
                                <td>\${new Date(r.reset_at).toLocaleString()}</td>
                            </tr>
                        \`).join('')}
                    </table>
                \`;
            } else {
                document.getElementById('resets').innerHTML = '<p style="text-align: center; color: #999;">No HWID resets yet</p>';
            }
        }

        function logout() {
            if (!confirm('Logout from admin panel?')) return;
            token = '';
            document.getElementById('login').style.display = 'block';
            document.getElementById('dashboard').style.display = 'none';
            document.getElementById('password').value = '';
        }

        // Auto-refresh every 60 seconds
        setInterval(() => {
            if (token) loadData();
        }, 60000);

        // Handle Enter key on password input
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('password').addEventListener('keypress', (e) => {
                if (e.key === 'Enter') login();
            });
        });
    </script>
</body>
</html>
    `);
  }

  if (req.method === 'POST') {
    const { action, password, token, days, key, date } = req.body;

    if (action === 'login') {
      if (password === ADMIN_PASSWORD) {
        const sessionToken = crypto.randomBytes(32).toString('hex');
        return res.json({ success: true, token: sessionToken });
      }
      return res.json({ success: false });
    }

    // Verify token (simple check - use proper session management in production)
    if (!token || token.length < 32) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    try {
      if (action === 'generate') {
        const bhopKey = `BHOP-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
        const stmt = bhopDb.prepare('INSERT INTO bhop_keys (key, days) VALUES (?, ?)');
        stmt.run(bhopKey, parseInt(days));
        return res.json({ success: true, key: bhopKey });
      }

      if (action === 'resetHWID') {
        const keyData = bhopDb.prepare('SELECT hwid, redeemed FROM bhop_keys WHERE key = ?').get(key);
        
        if (!keyData) {
          return res.json({ success: false, message: 'Key not found' });
        }
        
        if (!keyData.redeemed) {
          return res.json({ success: false, message: 'Key has not been activated yet' });
        }

        // Log reset
        bhopDb.prepare('INSERT INTO bhop_hwid_resets (license_key, old_hwid, new_hwid) VALUES (?, ?, NULL)')
          .run(key, keyData.hwid);
        
        // Reset HWID
        bhopDb.prepare('UPDATE bhop_keys SET hwid = NULL, redeemed = 0 WHERE key = ?').run(key);
        
        return res.json({ success: true, message: `HWID reset successful for ${key}` });
      }

      if (action === 'setExpiry') {
        bhopDb.prepare('UPDATE bhop_keys SET expires_at = ? WHERE key = ?').run(date, key);
        return res.json({ success: true, message: `Expiry date updated to ${date}` });
      }

      if (action === 'deleteKey') {
        bhopDb.prepare('DELETE FROM bhop_keys WHERE key = ?').run(key);
        return res.json({ success: true, message: `License key ${key} deleted` });
      }

      if (action === 'getData') {
        const keys = bhopDb.prepare('SELECT * FROM bhop_keys ORDER BY created_at DESC').all();
        const resets = bhopDb.prepare('SELECT * FROM bhop_hwid_resets ORDER BY reset_at DESC LIMIT 50').all();
        return res.json({ success: true, keys, resets });
      }
    } catch (error) {
      console.error('Admin API Error:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }

    return res.status(400).json({ success: false, message: 'Invalid action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
