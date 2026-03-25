const Redis = require('ioredis');
const crypto = require('crypto');
const { customAlphabet } = require('nanoid');

const nanoid = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 16);

let redis;

function getRedis() {
  if (!redis) {
    redis = new Redis(process.env.REDIS_URL);
  }
  return redis;
}

// Bhop License Management
const bhopDB = {
  async generateKey(days) {
    const db = getRedis();
    const key = `BHOP-${nanoid()}`;
    
    await db.set(`bhop:license:${key}`, JSON.stringify({
      days,
      redeemed: false,
      hwid: null,
      expiresAt: null,
      redeemedAt: null,
      createdAt: Date.now()
    }));
    
    return key;
  },

  async getAllKeys() {
    const db = getRedis();
    const keys = await db.keys('bhop:license:*');
    const data = [];
    
    for (const key of keys) {
      const licenseData = await db.get(key);
      if (licenseData) {
        data.push({
          key: key.replace('bhop:license:', ''),
          ...JSON.parse(licenseData)
        });
      }
    }
    
    return data.sort((a, b) => b.createdAt - a.createdAt);
  },

  async resetHWID(key) {
    const db = getRedis();
    const licenseData = await db.get(`bhop:license:${key}`);
    
    if (!licenseData) {
      return { success: false, message: 'Key not found' };
    }
    
    const license = JSON.parse(licenseData);
    
    if (!license.redeemed) {
      return { success: false, message: 'Key has not been activated yet' };
    }

    const resetId = nanoid();
    await db.set(`bhop:reset:${resetId}`, JSON.stringify({
      licenseKey: key,
      oldHwid: license.hwid,
      newHwid: null,
      resetBy: 'admin',
      resetAt: Date.now()
    }));
    
    await db.lpush('bhop:resets', resetId);
    await db.ltrim('bhop:resets', 0, 99);

    await db.set(`bhop:license:${key}`, JSON.stringify({
      ...license,
      hwid: null,
      redeemed: false,
      redeemedAt: null
    }));

    return { success: true, message: `HWID reset successful for ${key}` };
  },

  async setExpiry(key, date) {
    const db = getRedis();
    const licenseData = await db.get(`bhop:license:${key}`);
    
    if (!licenseData) {
      return { success: false, message: 'Key not found' };
    }
    
    const license = JSON.parse(licenseData);
    const expiryTimestamp = new Date(date).getTime();
    
    await db.set(`bhop:license:${key}`, JSON.stringify({
      ...license,
      expiresAt: expiryTimestamp
    }));
    
    return { success: true, message: `Expiry date updated to ${date}` };
  },

  async deleteKey(key) {
    const db = getRedis();
    const deleted = await db.del(`bhop:license:${key}`);
    
    if (deleted === 0) {
      return { success: false, message: 'Key not found' };
    }
    
    return { success: true, message: `License key deleted` };
  },

  async getResets() {
    const db = getRedis();
    const resetIds = await db.lrange('bhop:resets', 0, 49);
    const resets = [];
    
    for (const resetId of resetIds) {
      const resetData = await db.get(`bhop:reset:${resetId}`);
      if (resetData) {
        resets.push(JSON.parse(resetData));
      }
    }
    
    return resets;
  }
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    return res.status(200).send(`
<!DOCTYPE html>
<html>
<head>
    <title>KyoBhop Admin</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Courier New',monospace;background:linear-gradient(135deg,#0f0c29,#302b63,#24243e);min-height:100vh;padding:20px;color:#fff}
        .banner{color:#0ff;text-align:center;font-size:10px;line-height:12px;margin-bottom:20px;text-shadow:0 0 10px #0ff}
        .subtitle{text-align:center;color:#f0f;margin-bottom:30px;font-size:18px}
        .container{max-width:1400px;margin:0 auto}
        .login-box,.dashboard{background:rgba(0,0,0,0.7);border-radius:10px;padding:30px;box-shadow:0 0 30px rgba(0,255,255,0.3);border:2px solid #0ff}
        h1{color:#0ff;margin-bottom:20px;text-shadow:0 0 10px #0ff;text-align:center}
        h2{color:#f0f;margin:30px 0 15px;text-shadow:0 0 10px #f0f;border-bottom:2px solid #f0f;padding-bottom:10px}
        input,button{width:100%;padding:12px;margin:10px 0;border:2px solid #0ff;border-radius:5px;font-size:16px;background:rgba(0,0,0,0.5);color:#fff;font-family:'Courier New',monospace}
        input::placeholder{color:#888}
        button{background:linear-gradient(135deg,#0ff,#f0f);color:#000;border:none;cursor:pointer;transition:0.3s;font-weight:bold}
        button:hover{transform:scale(1.05);box-shadow:0 0 20px #0ff}
        .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:20px;margin:20px 0}
        .stat-card{background:linear-gradient(135deg,rgba(0,255,255,0.1),rgba(255,0,255,0.1));border:2px solid #0ff;padding:20px;border-radius:10px;text-align:center;box-shadow:0 0 15px rgba(0,255,255,0.3)}
        .stat-card h3{font-size:2.5em;margin:10px 0;color:#0ff;text-shadow:0 0 10px #0ff}
        table{width:100%;border-collapse:collapse;margin:20px 0;background:rgba(0,0,0,0.3);display:block;overflow-x:auto}
        thead,tbody{display:table;width:100%;table-layout:fixed}
        th,td{padding:12px;text-align:left;border-bottom:1px solid rgba(0,255,255,0.3)}
        th{background:rgba(0,255,255,0.2);color:#0ff}
        .key{font-family:'Courier New',monospace;background:rgba(0,255,255,0.2);padding:4px 8px;border-radius:4px;color:#0ff;border:1px solid #0ff;font-size:11px}
        .hwid{font-size:10px;color:#f0f}
        .status-active{color:#0f0;font-weight:bold}
        .status-inactive{color:#f00}
        .status-unused{color:#ff0}
        #dashboard{display:none}
        .action-btn{padding:6px 12px;margin:2px;width:auto;display:inline-block;font-size:11px}
        .success-msg{background:rgba(0,255,0,0.2);border:1px solid #0f0;padding:15px;border-radius:5px;margin:10px 0;color:#0f0;text-align:center}
        .input-group{display:grid;grid-template-columns:2fr 1fr;gap:10px}
        .generate-section{background:rgba(255,0,255,0.1);padding:20px;border-radius:10px;border:2px solid #f0f;margin:20px 0}
        .btn-danger{background:linear-gradient(135deg,#f00,#f0f)!important}
        .btn-warning{background:linear-gradient(135deg,#fa0,#f0f)!important}
        @media(max-width:768px){.banner{font-size:6px;line-height:8px}.input-group{grid-template-columns:1fr}.action-btn{width:100%;margin:5px 0}}
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
            <input type="password" id="password" placeholder="Enter admin password" autofocus>
            <button onclick="login()">Login</button>
        </div>

        <div class="dashboard" id="dashboard">
            <h1>📊 KyoBhop License Manager</h1>
            <div class="stats" id="stats"></div>
            
            <div class="generate-section">
                <h2>🔑 Generate New License</h2>
                <div class="input-group">
                    <input type="number" id="days" placeholder="Days" min="1" value="30">
                    <button onclick="generateKey()">Generate</button>
                </div>
                <div id="generatedKey"></div>
            </div>
            
            <h2>📋 All Bhop Licenses</h2>
            <div id="keys"></div>
            
            <h2>🔄 HWID Reset History</h2>
            <div id="resets"></div>
            
            <button onclick="logout()" style="margin-top:30px">Logout</button>
        </div>
    </div>

    <script>
        let token='';
        const API='/api/bhop-admin';

        async function login(){
            const password=document.getElementById('password').value;
            try{
                const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',password})});
                const data=await res.json();
                if(data.success){
                    token=data.token;
                    document.getElementById('login').style.display='none';
                    document.getElementById('dashboard').style.display='block';
                    loadData();
                }else{alert('❌ Invalid password');document.getElementById('password').value='';}
            }catch(e){alert('Error: '+e.message);}
        }

        async function generateKey(){
            const days=document.getElementById('days').value;
            if(!days||days<1){alert('Enter valid days');return;}
            try{
                const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'generate',days,token})});
                const data=await res.json();
                if(data.success){
                    document.getElementById('generatedKey').innerHTML='<div class="success-msg"><strong>✅ LICENSE GENERATED</strong><br><br><span class="key" style="font-size:16px">'+data.key+'</span><br><br><strong>Duration:</strong> '+days+' days</div>';
                    document.getElementById('days').value='30';
                    setTimeout(()=>{document.getElementById('generatedKey').innerHTML='';loadData();},5000);
                }
            }catch(e){alert('Error: '+e.message);}
        }

        async function resetHWID(key){
            if(!confirm('Reset HWID for:\\n'+key+'?'))return;
            try{
                const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'resetHWID',key,token})});
                const data=await res.json();
                alert(data.message);
                if(data.success)setTimeout(()=>loadData(),500);
            }catch(e){alert('Error: '+e.message);}
        }

        async function setExpiry(key){
            const date=prompt('Enter new expiry (YYYY-MM-DD):',new Date().toISOString().split('T')[0]);
            if(!date)return;
            try{
                const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'setExpiry',key,date,token})});
                const data=await res.json();
                alert(data.message);
                if(data.success)setTimeout(()=>loadData(),500);
            }catch(e){alert('Error: '+e.message);}
        }

        async function deleteKey(key){
            if(!confirm('⚠️ DELETE:\\n'+key+'?'))return;
            try{
                const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'deleteKey',key,token})});
                const data=await res.json();
                alert(data.message);
                if(data.success)setTimeout(()=>loadData(),500);
            }catch(e){alert('Error: '+e.message);}
        }

        async function loadData(){
            try{
                const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'getData',token})});
                const data=await res.json();
                if(!data.success)return;

                const total=data.keys.length;
                const active=data.keys.filter(k=>k.redeemed&&k.expiresAt&&k.expiresAt>Date.now()).length;
                const unused=data.keys.filter(k=>!k.redeemed).length;
                const expired=data.keys.filter(k=>k.redeemed&&k.expiresAt&&k.expiresAt<=Date.now()).length;

                document.getElementById('stats').innerHTML='<div class="stat-card"><div>Total</div><h3>'+total+'</h3></div><div class="stat-card"><div>Active</div><h3>'+active+'</h3></div><div class="stat-card"><div>Unused</div><h3>'+unused+'</h3></div><div class="stat-card"><div>Expired</div><h3>'+expired+'</h3></div>';

                if(data.keys.length===0){document.getElementById('keys').innerHTML='<p style="text-align:center;color:#999">No licenses yet</p>';}
                else{
                    let html='<table><thead><tr><th>License Key</th><th>Days</th><th>Status</th><th>HWID</th><th>Expires</th><th>Created</th><th>Actions</th></tr></thead><tbody>';
                    data.keys.forEach(k=>{
                        let st='status-unused',stxt='⚪ Unused';
                        if(k.redeemed){const exp=k.expiresAt&&k.expiresAt<=Date.now();st=exp?'status-inactive':'status-active';stxt=exp?'❌ Expired':'✅ Active';}
                        html+='<tr><td><span class="key">'+k.key+'</span></td><td>'+k.days+'</td><td class="'+st+'">'+stxt+'</td><td class="hwid">'+(k.hwid?k.hwid.substring(0,12)+'...':'-')+'</td><td>'+(k.expiresAt?new Date(k.expiresAt).toLocaleDateString():'-')+'</td><td>'+new Date(k.createdAt).toLocaleDateString()+'</td><td>'+(k.redeemed?'<button class="action-btn btn-warning" onclick="resetHWID(\''+k.key+'\')">Reset HWID</button>':'')+'<button class="action-btn" onclick="setExpiry(\''+k.key+'\')">Set Expiry</button><button class="action-btn btn-danger" onclick="deleteKey(\''+k.key+'\')">Delete</button></td></tr>';
                    });
                    html+='</tbody></table>';
                    document.getElementById('keys').innerHTML=html;
                }

                if(data.resets&&data.resets.length>0){
                    let rhtml='<table><thead><tr><th>License</th><th>Old HWID</th><th>Reset By</th><th>Reset At</th></tr></thead><tbody>';
                    data.resets.forEach(r=>{rhtml+='<tr><td><span class="key">'+r.licenseKey+'</span></td><td class="hwid">'+(r.oldHwid?r.oldHwid.substring(0,16)+'...':'N/A')+'</td><td>'+r.resetBy+'</td><td>'+new Date(r.resetAt).toLocaleString()+'</td></tr>';});
                    rhtml+='</tbody></table>';
                    document.getElementById('resets').innerHTML=rhtml;
                }else{document.getElementById('resets').innerHTML='<p style="text-align:center;color:#999">No HWID resets yet</p>';}
            }catch(e){console.error(e);}
        }

        function logout(){if(token&&!confirm('Logout?'))return;token='';document.getElementById('login').style.display='block';document.getElementById('dashboard').style.display='none';document.getElementById('password').value='';}

        setInterval(()=>{if(token)loadData();},30000);
        document.addEventListener('DOMContentLoaded',()=>{document.getElementById('password').addEventListener('keypress',e=>{if(e.key==='Enter')login();});});
    </script>
</body>
</html>
    `);
  }

  if (req.method === 'POST') {
    try {
      const { action, password, token, days, key, date } = req.body;

      if (action === 'login') {
        if (password === process.env.ADMIN_PASSWORD) {
          return res.status(200).json({ success: true, token: crypto.randomBytes(32).toString('hex') });
        }
        return res.status(200).json({ success: false });
      }

      if (!token || token.length < 32) {
        return res.status(200).json({ success: false, message: 'Unauthorized' });
      }

      if (action === 'generate') {
        const bhopKey = await bhopDB.generateKey(parseInt(days));
        return res.status(200).json({ success: true, key: bhopKey });
      }

      if (action === 'resetHWID') {
        const result = await bhopDB.resetHWID(key);
        return res.status(200).json(result);
      }

      if (action === 'setExpiry') {
        const result = await bhopDB.setExpiry(key, date);
        return res.status(200).json(result);
      }

      if (action === 'deleteKey') {
        const result = await bhopDB.deleteKey(key);
        return res.status(200).json(result);
      }

      if (action === 'getData') {
        const keys = await bhopDB.getAllKeys();
        const resets = await bhopDB.getResets();
        return res.status(200).json({ success: true, keys, resets });
      }

      return res.status(400).json({ success: false, message: 'Invalid action' });
    } catch (error) {
      console.error('Bhop Admin Error:', error);
      return res.status(500).json({ success: false, message: 'Server error: ' + error.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
};
