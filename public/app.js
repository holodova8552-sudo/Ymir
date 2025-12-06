// public/app.js
const API_BASE = '/api';

const sections = Array.from(document.querySelectorAll('.section'));
const navButtons = Array.from(document.querySelectorAll('.nav button'));
function showSection(route){
  sections.forEach(s => s.classList.toggle('visible', s.id === route));
  navButtons.forEach(b => b.classList.toggle('active', b.dataset.route === route));
}
function navigate(route){ location.hash = route; }
window.addEventListener('hashchange', ()=> { const r = location.hash.replace('#','') || '/login'; showSection(r); loadSectionData(r); });
navButtons.forEach(b => b.addEventListener('click', ()=> navigate(b.dataset.route)));
if(!location.hash) location.hash = '/login'; else showSection(location.hash.replace('#',''));

function apiGet(path){ return fetch(API_BASE + path).then(r => r.json()); }
function apiPost(path, body){ return fetch(API_BASE + path, { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(body) }).then(r => r.json()); }

let currentUser = null;

document.getElementById('createUserBtn').addEventListener('click', async ()=>{
  const name = document.getElementById('displayNameInput').value.trim();
  const phone = document.getElementById('displayPhoneInput').value.trim() || null;
  if(!name){ document.getElementById('createUserMsg').textContent = 'Enter name'; return }
  try{
    const res = await apiPost('/user', { name, phone });
    if(res.error) { document.getElementById('createUserMsg').textContent = 'Error: ' + res.error; return; }
    currentUser = res.user;
    document.getElementById('createUserMsg').textContent = 'Created: ' + currentUser.name;
    updateUI();
    navigate('/menu');
  } catch (err) { document.getElementById('createUserMsg').textContent = 'Network error'; }
});

async function loadSectionData(route){
  if(route === '/shop') await loadShop();
  if(route === '/inventory') await loadInventory();
  if(route === '/profile') await loadProfile();
  if(route === '/deck') await loadDeck();
  if(route === '/leaderboard') await loadLeaderboard();
}

function updateUI(){
  if(!currentUser) return;
  document.getElementById('sidebarBalance').textContent = 'Balance: ' + currentUser.balance + ' ⚔️';
  const profileCard = document.getElementById('profileCard');
  profileCard.innerHTML = `<p><strong>${currentUser.name}</strong></p><p class="muted">Phone: ${currentUser.phone||'—'}</p><p class="muted">Level: ${currentUser.level||1}</p><p style="margin-top:8px;font-weight:800;color:var(--survey-2)">Balance: <span id="pfBal">${currentUser.balance}</span> ⚔️</p>`;
}

async function loadShop(){
  const grid = document.getElementById('shopGrid'); grid.innerHTML = '<div class="muted">Loading...</div>';
  try{
    const data = await apiGet('/shop');
    if(!data.items || data.items.length === 0) { grid.innerHTML = '<div class="muted">No listings</div>'; return; }
    grid.innerHTML = '';
    data.items.forEach(it => {
      const el = document.createElement('div'); el.className = 'card';
      el.innerHTML = `<h4>${it.name}</h4><div class="muted">Seller:${it.seller||'—'}</div><div class="price">${it.price} ⚔️</div><div style="margin-top:8px"><button class="btn buyBtn" data-id="${it.id}">Buy</button></div>`;
      grid.appendChild(el);
    });
    Array.from(document.querySelectorAll('.buyBtn')).forEach(b => b.addEventListener('click', async () => {
      if(!currentUser){ alert('Create account first'); return; }
      try {
        const res = await apiPost('/buy', { userId: currentUser.id, listingId: b.dataset.id });
        if(res.error) return alert('Buy error: ' + res.error);
        alert('Bought! New balance: ' + res.newBal);
        currentUser.balance = res.newBal;
        updateUI();
        loadInventory(); loadShop();
      } catch(e){ alert('Network'); }
    }));
  }catch(e){ grid.innerHTML = '<div class="muted">Failed to load shop</div>'; }
}

document.getElementById('addListing').addEventListener('click', async ()=>{
  const name = document.getElementById('newItemName').value.trim();
  const price = parseInt(document.getElementById('newItemPrice').value,10);
  if(!name || isNaN(price) || price<=0){ alert('Provide valid name and price'); return; }
  if(!currentUser){ alert('Create an account first'); return; }
  try{
    await apiPost('/shop', { name, price, seller: currentUser.name });
    document.getElementById('newItemName').value=''; document.getElementById('newItemPrice').value='';
    loadShop();
  }catch(e){ alert('Add failed'); }
});

async function loadInventory(){
  const invEl = document.getElementById('invList'); invEl.innerHTML = '<div class="muted">Loading...</div>';
  if(!currentUser){ invEl.innerHTML = '<div class="muted">Create account to see inventory</div>'; return; }
  try{
    const data = await apiGet('/inventory?userId=' + encodeURIComponent(currentUser.id));
    if(!data.items || data.items.length === 0){ invEl.innerHTML = '<div class="muted">Inventory empty</div>'; return; }
    invEl.innerHTML = '';
    data.items.forEach(it => {
      const d = document.createElement('div'); d.className = 'inv-item';
      d.innerHTML = `<strong>${it.item_name}</strong><div class="muted">InvID:${it.id}</div><div style="margin-top:8px"><button class="btn sellBtn" data-id="${it.id}">Sell</button></div>`;
      invEl.appendChild(d);
    });
    Array.from(document.querySelectorAll('.sellBtn')).forEach(b => b.addEventListener('click', async ()=>{
      const price = parseInt(prompt('Enter selling price:'),10);
      if(isNaN(price)||price<=0){ alert('Invalid'); return; }
      try{
        const res = await apiPost('/sell', { userId: currentUser.id, invId: b.dataset.id, price });
        if(res.error) return alert('Sell error: ' + res.error);
        alert('Listed for sale');
        loadInventory(); loadShop();
      }catch(e){ alert('Network'); }
    }));
  }catch(e){ invEl.innerHTML = '<div class="muted">Failed to load inventory</div>'; }
}

async function loadDeck(){
  const deckEl = document.getElementById('deckList'); deckEl.innerHTML = '<div class="muted">Loading...</div>';
  if(!currentUser){ deckEl.innerHTML = '<div class="muted">Create account to build deck</div>'; return; }
  try{
    const data = await apiGet('/deck?userId=' + encodeURIComponent(currentUser.id));
    if(!data.deck || data.deck.length === 0){ deckEl.innerHTML = '<div class="muted">No cards in deck</div>'; return; }
    deckEl.innerHTML = '';
    data.deck.forEach(c => {
      const cc = document.createElement('div'); cc.className = 'card'; cc.innerHTML = `<strong>${c.item_name}</strong><div class="muted">ID:${c.id}</div>`; deckEl.appendChild(cc);
    });
  }catch(e){ deckEl.innerHTML = '<div class="muted">Failed to load deck</div>'; }
}

async function loadProfile(){
  if(!currentUser) return;
  try{
    const data = await apiGet('/user?id=' + encodeURIComponent(currentUser.id));
    if(!data.user) return;
    currentUser = data.user; updateUI();
  }catch(e){ console.warn('profile load failed'); }
}

async function loadLeaderboard(){
  const lb = document.getElementById('leaderboard'); lb.innerHTML = '<div class="muted">Loading...</div>';
  try{
    const data = await apiGet('/leaderboard');
    if(!data.top || data.top.length === 0){ lb.innerHTML = '<div class="muted">No players yet</div>'; return; }
    lb.innerHTML = '';
    data.top.forEach((p,i) => {
      const d = document.createElement('div'); d.className = 'leader'; d.innerHTML = `<div>${i+1}. <strong>${p.name}</strong></div><div class="muted">${p.balance} ⚔️</div>`; lb.appendChild(d);
    });
  }catch(e){ lb.innerHTML = '<div class="muted">Failed to load leaderboard</div>'; }
}
