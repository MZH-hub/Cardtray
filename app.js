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
    e:card.email, p:card.phone, w:card.website,
    b:card.bio, s:card.stock
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

const ACCENTS = ['teal','blue','plum','gold','forest'];

const ICONS = {
  email: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  website: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`
};

function contactRows(card){
  const rows = [];
  if(card.email) rows.push(`<div class="contact-row">${ICONS.email}<span>${escapeHtml(card.email)}</span></div>`);
  if(card.phone) rows.push(`<div class="contact-row">${ICONS.phone}<span>${escapeHtml(card.phone)}</span></div>`);
  if(card.website) rows.push(`<div class="contact-row">${ICONS.website}<span>${escapeHtml(card.website)}</span></div>`);
  return rows.join('');
}

function cardFaceMarkup(card, accent){
  return `
    <div class="card-front">
      <div class="logo-row"><img src="logo.svg" alt="Organization logo"></div>
      <div class="id">
        <h3>${escapeHtml(card.name || 'Unnamed')}</h3>
        <p class="role">${escapeHtml(card.title || '')}</p>
      </div>
      <div class="contacts">${contactRows(card)}</div>
    </div>
    <div class="arches"><div class="arch light"></div><div class="arch dark"></div></div>
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
    const accent = ACCENTS.includes(card.stock) ? card.stock : 'teal';

    slot.innerHTML = `
      <div class="card-flip">
        <div class="card-face front acc-${accent}">
          <div class="card-actions">
            <button class="icon-btn" data-action="edit" title="Edit">&#9998;</button>
            <button class="icon-btn" data-action="delete" title="Delete">&times;</button>
          </div>
          ${cardFaceMarkup(card, accent)}
          <div class="flip-hint" data-action="flip">Flip &#8635;</div>
        </div>
        <div class="card-face back acc-${accent}">
          <div class="card-back">
            <div class="qr-wrap" data-qr></div>
            <div>
              <div class="stamp-text">
                <span class="name">${escapeHtml(card.name || '')}</span>
                Scan to view &amp; save
              </div>
              <div class="row-actions">
                <button data-action="copy">Copy link</button>
                <button data-action="open">Open card</button>
                <button data-action="flip">&#8635; Flip back</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    grid.appendChild(slot);

    // generate QR into the back once
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
  form.website.value = card?.website || '';
  form.bio.value = card?.bio || '';
  const stock = ACCENTS.includes(card?.stock) ? card.stock : 'teal';
  document.querySelectorAll('.stock-dot').forEach(d => {
    d.classList.toggle('selected', d.dataset.stock === stock);
  });
  form.dataset.stock = stock;
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

document.querySelectorAll('.stock-dot').forEach(dot => {
  dot.addEventListener('click', () => {
    document.querySelectorAll('.stock-dot').forEach(d => d.classList.remove('selected'));
    dot.classList.add('selected');
    form.dataset.stock = dot.dataset.stock;
  });
});

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
    website: form.website.value.trim(),
    bio: form.bio.value.trim(),
    stock: form.dataset.stock || 'teal'
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