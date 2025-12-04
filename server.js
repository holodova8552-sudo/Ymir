// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');

const db = new Database('./aotbot.db');
// init tables
db.prepare(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, phone TEXT UNIQUE, name TEXT, balance INTEGER DEFAULT 1000, level INTEGER DEFAULT 1, xp INTEGER DEFAULT 0, linked INTEGER DEFAULT 0, joined TEXT)`).run();
db.prepare(`CREATE TABLE IF NOT EXISTS shop_items (id TEXT PRIMARY KEY, name TEXT, price INTEGER, seller TEXT, created_at TEXT)`).run();
db.prepare(`CREATE TABLE IF NOT EXISTS inventory (id TEXT PRIMARY KEY, user_id TEXT, item_name TEXT, created_at TEXT)`).run();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// seed a demo user if none
const ucount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
if(ucount === 0){
  const id = uuidv4();
  db.prepare('INSERT INTO users (id,phone,name,balance,joined,linked) VALUES (?,?,?,?,?,?)').run(id,'demo','DemoPlayer',1000,new Date().toISOString(),1);
}

// GET /api/shop
app.get('/api/shop', (req,res)=>{
  const items = db.prepare('SELECT id,name,price,seller,created_at FROM shop_items ORDER BY created_at DESC').all();
  res.json({items});
});

// POST /api/shop - create listing
app.post('/api/shop', (req,res)=>{
  const {name,price,seller} = req.body; if(!name||!price) return res.status(400).json({error:'name+price required'});
  const id = uuidv4(); db.prepare('INSERT INTO shop_items (id,name,price,seller,created_at) VALUES (?,?,?,?,?)').run(id,name,price,seller||'unknown',new Date().toISOString());
  res.json({ok:true,id});
});

// POST /api/user - create user
app.post('/api/user', (req,res)=>{
  const {name,phone} = req.body; if(!name) return res.status(400).json({error:'name required'});
  const id = uuidv4();
  try{
    db.prepare('INSERT INTO users (id,phone,name,balance,joined,linked) VALUES (?,?,?,?,?,?)').run(id,phone||null,name,1000,new Date().toISOString(),0);
    const user = db.prepare('SELECT id,name,phone,balance,level,xp FROM users WHERE id = ?').get(id);
    res.json({ok:true,user});
  }catch(err){ res.status(500).json({error:err.message}); }
});

// POST /api/buy - buy listing
app.post('/api/buy', (req,res)=>{
  const {userId,listingId} = req.body; if(!userId||!listingId) return res.status(400).json({error:'userId+listingId required'});
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId); if(!user) return res.status(404).json({error:'user not found'});
  const listing = db.prepare('SELECT * FROM shop_items WHERE id = ?').get(listingId); if(!listing) return res.status(404).json({error:'listing not found'});
  if(user.balance < listing.price) return res.status(400).json({error:'insufficient balance'});
  db.prepare('UPDATE users SET balance = balance - ? WHERE id = ?').run(listing.price,userId);
  const invId = uuidv4(); db.prepare('INSERT INTO inventory (id,user_id,item_name,created_at) VALUES (?,?,?,?)').run(invId,userId,listing.name,new Date().toISOString());
  db.prepare('DELETE FROM shop_items WHERE id = ?').run(listingId);
  const newBal = db.prepare('SELECT balance FROM users WHERE id = ?').get(userId).balance;
  res.json({ok:true,invId,newBal});
});

// POST /api/sell - user lists from their inventory
app.post('/api/sell', (req,res)=>{
  const {userId,invId,price} = req.body; if(!userId||!invId||!price) return res.status(400).json({error:'userId+invId+price required'});
  const inv = db.prepare('SELECT * FROM inventory WHERE id = ? AND user_id = ?').get(invId,userId); if(!inv) return res.status(404).json({error:'inventory not found'});
  const id = uuidv4(); db.prepare('INSERT INTO shop_items (id,name,price,seller,created_at) VALUES (?,?,?,?,?)').run(id,inv.item_name,price,userId,new Date().toISOString());
  db.prepare('DELETE FROM inventory WHERE id = ?').run(invId);
  res.json({ok:true,id});
});

// GET /api/inventory
app.get('/api/inventory',(req,res)=>{
  const userId = req.query.userId; if(!userId) return res.status(400).json({error:'userId required'});
  const items = db.prepare('SELECT id,item_name,created_at FROM inventory WHERE user_id = ?').all(userId);
  res.json({items});
});

// GET /api/user
app.get('/api/user',(req,res)=>{ const userId = req.query.userId; if(!userId) return res.status(400).json({error:'userId required'}); const user = db.prepare('SELECT id,name,phone,balance,level,xp FROM users WHERE id = ?').get(userId); if(!user) return res.status(404).json({error:'not found'}); res.json({user}); });

// GET /api/leaderboard
app.get('/api/leaderboard',(req,res)=>{ const top = db.prepare('SELECT name,balance FROM users ORDER BY balance DESC LIMIT 10').all(); res.json({top}); });

// GET /api/deck
app.get('/api/deck',(req,res)=>{ const userId = req.query.userId; if(!userId) return res.status(400).json({error:'userId required'}); const deck = db.prepare('SELECT id,item_name FROM inventory WHERE user_id = ? LIMIT 5').all(userId); res.json({deck}); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('AOT Bot backend listening on',PORT));
