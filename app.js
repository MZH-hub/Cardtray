/* ---------- storage ---------- */
const STORE_KEY = 'cardtray.cards.v1';

function loadCards(){
  try{
    return JSON.parse(localStorage.getItem(STORE_KEY)) || [];
  }catch(e){ return []; }
}
function saveCards(cards){
  localStorage.setItem(STORE_KEY, JSON.stringify(cards));
}
function uid(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}

/* ---------- base64url encode/decode of card data (for shareable link) ---------- */
function encodeCard(card){
  const payload = {
    n:card.name, t:card.title, c:card.company,
    e:card.email, p:card.phone, m:card.mobile, w:card.website,
    b:card.bio
  };
  const json = JSON.stringify(payload);
  let b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function cardShareUrl(card){
  const base = new URL('card.html', window.location.href);
  base.searchParams.set('d', encodeCard(card));
  return base.href;
}

function contactRowsOverlay(card){
  const rows = [];
  if(card.email)   rows.push(`<div class="tpl-row email"><span>${escapeHtml(card.email)}</span></div>`);
  if(card.phone)   rows.push(`<div class="tpl-row phone"><span>${escapeHtml(card.phone)}</span></div>`);
  if(card.mobile)  rows.push(`<div class="tpl-row mobile"><span>${escapeHtml(card.mobile)}</span></div>`);
  if(card.website) rows.push(`<div class="tpl-row website"><span>${escapeHtml(card.website)}</span></div>`);
  return rows.join('');
}

function cardBackMarkup(card){
  return `
    <div class="tpl-id">
      <h3>${escapeHtml(card.name || 'Unnamed')}</h3>
      <p class="role">${escapeHtml(card.title || '')}</p>
    </div>
    <div class="tpl-contacts">${contactRowsOverlay(card)}</div>
    <div class="tpl-back-actions">
      <button class="mini-link" data-action="copy" title="Copy link">Copy link</button>
      <span class="dot">&middot;</span>
      <button class="mini-link" data-action="open" title="Open card">Open card</button>
    </div>
  `;
}

/* ---------- rendering ---------- */
const grid = document.getElementById('grid');
const empty = document.getElementById('empty');

function render(){
  const cards = loadCards();
  grid.innerHTML = '';
  if(cards.length === 0){
    empty.style.display = 'block';
    grid.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  grid.style.display = 'grid';

  cards.forEach((card) => {
    const slot = document.createElement('div');
    slot.className = 'card-slot';
    slot.dataset.id = card.id;

    slot.innerHTML = `
      <div class="card-flip">
        <div class="card-face front">
          <div class="card-actions">
            <button class="icon-btn" data-action="edit" title="Edit">&#9998;</button>
            <button class="icon-btn" data-action="delete" title="Delete">&times;</button>
          </div>
          <div class="tpl-qr-badge">
            <div class="qr-wrap" data-qr></div>
            <span class="cap">Tap to flip</span>
          </div>
        </div>
        <div class="card-face back">
          ${cardBackMarkup(card)}
        </div>
      </div>
    `;
    grid.appendChild(slot);

    // generate QR into the front once
    const qrHost = slot.querySelector('[data-qr]');
    new QRCode(qrHost, {
      text: cardShareUrl(card),
      width: 100,
      height: 100,
      colorDark: '#115C71',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.M
    });
  });
}

function escapeHtml(str){
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

/* ---------- interactions ---------- */
grid.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  const slot = e.target.closest('.card-slot');
  if(!slot) return;
  const id = slot.dataset.id;
  const cards = loadCards();
  const card = cards.find(c => c.id === id);

  if(!btn){
    // click on card body (not a button) -> flip
    slot.classList.toggle('flipped');
    return;
  }

  const action = btn.dataset.action;
  if(action === 'flip'){
    slot.classList.toggle('flipped');
  } else if(action === 'edit'){
    openModal(card);
  } else if(action === 'delete'){
    if(confirm(`Delete "${card.name || 'this card'}"? This can't be undone.`)){
      saveCards(cards.filter(c => c.id !== id));
      render();
      toast('Card deleted');
    }
  } else if(action === 'copy'){
    navigator.clipboard.writeText(cardShareUrl(card)).then(()=> toast('Link copied'));
  } else if(action === 'open'){
    window.open(cardShareUrl(card), '_blank');
  }
});

/* ---------- modal ---------- */
const backdrop = document.getElementById('modal-backdrop');
const form = document.getElementById('card-form');
let editingId = null;

function openModal(card){
  editingId = card ? card.id : null;
  document.getElementById('modal-title').textContent = card ? 'Edit card' : 'New card';
  form.name.value = card?.name || '';
  form.title.value = card?.title || '';
  form.company.value = card?.company || '';
  form.email.value = card?.email || '';
  form.phone.value = card?.phone || '';
  form.mobile.value = card?.mobile || '';
  form.website.value = card?.website || '';
  form.bio.value = card?.bio || '';
  backdrop.classList.add('show');
  form.name.focus();
}
function closeModal(){
  backdrop.classList.remove('show');
  editingId = null;
}

document.getElementById('add-card-btn').addEventListener('click', () => openModal(null));
document.getElementById('empty-add-btn').addEventListener('click', () => openModal(null));
document.getElementById('cancel-btn').addEventListener('click', closeModal);
backdrop.addEventListener('click', (e) => { if(e.target === backdrop) closeModal(); });

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const cards = loadCards();
  const data = {
    id: editingId || uid(),
    name: form.name.value.trim(),
    title: form.title.value.trim(),
    company: form.company.value.trim(),
    email: form.email.value.trim(),
    phone: form.phone.value.trim(),
    mobile: form.mobile.value.trim(),
    website: form.website.value.trim(),
    bio: form.bio.value.trim()
  };
  if(!data.name){
    form.name.focus();
    return;
  }
  if(editingId){
    const idx = cards.findIndex(c => c.id === editingId);
    cards[idx] = data;
  } else {
    cards.push(data);
  }
  saveCards(cards);
  closeModal();
  render();
  toast(editingId ? 'Card updated' : 'Card added');
});

/* ---------- toast ---------- */
let toastTimer;
function toast(msg){
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> el.classList.remove('show'), 2200);
}

render();