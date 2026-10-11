const FADE_MS = 900;
const MESSAGE_MS = 1800;
const SECRET_CLICKS = 5;
const SECRET_WINDOW_MS = 3000;

const shell = document.getElementById('shell');
const tabsHost = document.getElementById('tabs');
const panelHost = document.getElementById('panel');

const state = { tab: 'overview', documentId: documents[0].id };

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function add(parent, ...children) {
  children.forEach((child) => parent.appendChild(child));
  return parent;
}

function renderBlocks(blocks, parent) {
  blocks.forEach((block) => {
    if (block.t === 'p') {
      add(parent, el('p', null, block.text));
    } else if (block.t === 'h') {
      add(parent, el('h4', 'doc-subheading', block.text));
    } else if (block.t === 'ul') {
      if (block.lead) add(parent, el('p', null, block.lead));
      const list = el('ul');
      block.items.forEach((item) => add(list, el('li', null, item)));
      add(parent, list);
    } else if (block.t === 'restricted') {
      add(parent, restrictedBlock(block));
    } else {
      add(parent, el('p', 'doc-empty', 'RECORD INCOMPLETE // ДАННЫЕ ОТСУТСТВУЮТ'));
    }
  });
}

function restrictedBlock(block, documentId) {
  const aside = el('aside', 'restricted-block');
  add(aside, el('span', 'restricted-tag', documentId ? `RESTRICTED // ${documentId}` : 'RESTRICTED'), el('h4', null, block.title));
  renderBlocks(block.blocks, aside);
  return aside;
}

function openDocument(id) {
  state.documentId = id;
  selectTab('documents');
}

function overviewPanel() {
  const featured = documents[documents.length - 1];
  const wrap = el('div', 'overview');
  const text = add(el('div', 'overview-text'), el('h3', 'panel-title', 'Обзор архива'), el('p', null, archiveMeta.intro));
  const box = el('div', 'featured');
  const open = el('button', 'featured-link', 'OPEN DOCUMENT');
  open.type = 'button';
  open.addEventListener('click', () => openDocument(featured.id));
  add(box, el('span', 'featured-tag', `LAST RECORD // ${featured.id}`), el('h4', null, featured.title), el('p', null, featured.summary), open);
  return add(wrap, text, box);
}

function documentsPanel() {
  const current = documents.find((doc) => doc.id === state.documentId) || documents[0];
  const wrap = el('div', 'documents');
  const list = el('ul', 'doc-list');
  documents.forEach((doc) => {
    const item = el('li');
    const button = el('button', 'doc-list-item');
    button.type = 'button';
    button.setAttribute('aria-current', String(doc.id === current.id));
    add(button, el('span', 'mono', doc.id), el('span', null, doc.title));
    button.addEventListener('click', () => openDocument(doc.id));
    add(list, add(item, button));
  });
  const article = el('article', 'doc-reader');
  const meta = el('div', 'doc-meta mono');
  add(meta, el('span', null, current.id), el('span', null, `DATE: ${current.date}`), el('span', null, `CLASS: ${current.classification}`), el('span', null, `STATUS: ${current.status}`));
  add(article, meta, el('h3', 'doc-title', current.title));
  current.sections.forEach((section) => {
    const block = el('section', 'doc-section');
    add(block, el('h4', 'doc-heading', section.title));
    renderBlocks(section.blocks, block);
    add(article, block);
  });
  return add(wrap, list, article);
}

function recordsPanel() {
  const wrap = el('div', 'records');
  const head = el('div', 'record-row record-head mono');
  add(head, el('span', null, 'ID'), el('span', null, 'TITLE'), el('span', null, 'DATE'), el('span', null, 'STATUS'));
  add(wrap, head);
  documents.forEach((doc) => {
    const row = el('button', 'record-row');
    row.type = 'button';
    add(row, el('span', 'mono', doc.id), el('span', null, doc.title), el('span', 'mono', doc.date), el('span', 'mono', doc.status));
    row.addEventListener('click', () => openDocument(doc.id));
    add(wrap, row);
  });
  return wrap;
}

function openLightbox(url, number) {
  const overlay = el('div', 'lightbox');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  const img = el('img');
  img.src = url;
  img.alt = `Архивный фрагмент ${number}`;
  add(overlay, img, el('span', 'lightbox-label', `IMAGE ${number} // CLICK OR ESC TO CLOSE`));
  const close = () => {
    overlay.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (event) => {
    if (event.key === 'Escape') close();
  };
  overlay.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.appendChild(overlay);
}

function imageFrame(image) {
  const figure = el('figure', 'frame');
  const windowNode = add(el('div', 'frame-window'), el('span', 'frame-placeholder', 'FILE PENDING'));
  const status = el('span', 'frame-status', 'STATUS: PENDING');
  add(figure, windowNode, el('i', 'corner corner-tl'), el('i', 'corner corner-tr'), el('i', 'corner corner-bl'), el('i', 'corner corner-br'));
  add(figure, add(el('figcaption'), el('span', 'frame-number', `IMAGE ${image.number}`), el('span', null, 'ARCHIVE FRAGMENT'), status));
  findImage(
    'images/',
    image.name,
    (url) => {
      const button = el('button', 'frame-window');
      button.type = 'button';
      const img = el('img');
      img.src = url;
      img.alt = `Архивный фрагмент ${image.number}`;
      add(button, img, el('span', 'frame-scan'));
      button.addEventListener('click', () => openLightbox(url, image.number));
      figure.replaceChild(button, windowNode);
      status.textContent = 'STATUS: STORED';
    },
    () => {}
  );
  return figure;
}

function evidencePanel() {
  const wrap = el('div', 'evidence');
  images.forEach((image) => add(wrap, imageFrame(image)));
  return wrap;
}

function restrictedPanel() {
  const wrap = el('div', 'restricted-panel');
  let found = 0;
  documents.forEach((doc) =>
    doc.sections.forEach((section) =>
      section.blocks
        .filter((block) => block.t === 'restricted')
        .forEach((block) => {
          found += 1;
          add(wrap, restrictedBlock(block, doc.id));
        })
    )
  );
  if (found === 0) add(wrap, el('p', 'doc-empty', 'NO RESTRICTED RECORDS AVAILABLE'));
  return wrap;
}

const panelBuilders = {
  overview: overviewPanel,
  documents: documentsPanel,
  records: recordsPanel,
  evidence: evidencePanel,
  restricted: restrictedPanel
};

function selectTab(id) {
  state.tab = id;
  tabsHost.querySelectorAll('.tab').forEach((button) => {
    button.setAttribute('aria-selected', String(button.dataset.tab === id));
  });
  panelHost.id = `panel-${id}`;
  panelHost.setAttribute('aria-labelledby', `tab-${id}`);
  panelHost.replaceChildren(panelBuilders[id]());
  panelHost.style.animation = 'none';
  void panelHost.offsetWidth;
  panelHost.style.animation = '';
}

function buildTabs() {
  tabs.forEach((tab) => {
    const button = el('button', 'tab');
    button.type = 'button';
    button.id = `tab-${tab.id}`;
    button.dataset.tab = tab.id;
    button.setAttribute('role', 'tab');
    add(button, el('span', 'tab-number', tab.number), el('span', 'tab-label', tab.label));
    button.addEventListener('click', () => selectTab(tab.id));
    add(tabsHost, button);
  });
}

function buildHero() {
  document.getElementById('hero-text').textContent = `«${archiveMeta.intro}»`;
  document.getElementById('session-id').textContent = Math.random().toString(16).slice(2, 10).toUpperCase();
  const lastRecord = documents[documents.length - 1];
  const entries = [
    ['ARCHIVE ID', archiveMeta.archiveId],
    ['CLASSIFICATION', archiveMeta.classification],
    ['FILE STATUS', archiveMeta.fileStatus],
    ['LAST RECORD', lastRecord.id],
    ['DOCUMENT COUNT', String(documents.length).padStart(3, '0')]
  ];
  const notice = document.getElementById('notice');
  add(notice, el('span', 'notice-tag', 'ВНИМАНИЕ // ДОСТУП ОГРАНИЧЕН'));
  archiveMeta.notices.forEach((line) => add(notice, add(el('p', 'notice-line'), el('span', 'notice-dot'), el('span', null, line))));
  const grid = document.getElementById('meta-grid');
  entries.forEach(([label, value]) => add(grid, add(el('div'), el('dt', null, label), el('dd', null, value))));
}

function goToSignal() {
  const overlay = el('div', 'transmission is-fading');
  overlay.setAttribute('role', 'status');
  add(overlay, el('span', null, 'UNKNOWN TRANSMISSION'));
  document.body.appendChild(overlay);
  shell.classList.add('is-fading');
  setTimeout(() => overlay.classList.add('is-message'), FADE_MS);
  setTimeout(() => {
    window.location.href = window.location.protocol === 'file:' ? 'signal/index.html' : 'signal/';
  }, FADE_MS + MESSAGE_MS);
}

function setupSecretDot() {
  const dot = document.getElementById('secret-dot');
  let clicks = [];
  let resetTimer = null;
  dot.addEventListener('click', () => {
    const now = Date.now();
    clicks = clicks.filter((time) => now - time < SECRET_WINDOW_MS).concat(now);
    clearTimeout(resetTimer);
    if (clicks.length >= SECRET_CLICKS) {
      clicks = [];
      dot.dataset.level = '0';
      goToSignal();
      return;
    }
    dot.dataset.level = String(clicks.length);
    resetTimer = setTimeout(() => {
      clicks = [];
      dot.dataset.level = '0';
    }, SECRET_WINDOW_MS);
  });
}

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    shell.classList.remove('is-fading');
    document.querySelectorAll('.transmission').forEach((node) => node.remove());
  }
});

buildTabs();
buildHero();
setupSecretDot();
selectTab('overview');
