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

function isRedacted(doc) {
  return doc.protected === true && userRole !== 'full';
}

function redactedBars(text) {
  const wrap = el('span', 'redacted');
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', 'Данные скрыты');
  text.split(/\s+/).filter(Boolean).forEach((word, index) => {
    if (index > 0) wrap.appendChild(document.createTextNode(' '));
    const bar = el('span', 'redact-bar');
    bar.style.width = `${Math.max(2, word.length) * 0.58}em`;
    wrap.appendChild(bar);
  });
  return wrap;
}

function redactedBlock(block) {
  if (block.t === 'p') return add(el('p'), redactedBars(block.text));
  if (block.t === 'h') return add(el('h4', 'doc-subheading'), redactedBars(block.text));
  if (block.t === 'ul') {
    const wrap = el('div');
    if (block.lead) add(wrap, add(el('p'), redactedBars(block.lead)));
    const list = el('ul');
    block.items.forEach((item) => add(list, add(el('li'), redactedBars(item))));
    return add(wrap, list);
  }
  if (block.t === 'restricted') {
    const aside = el('aside', 'restricted-block');
    add(aside, el('span', 'restricted-tag', 'RESTRICTED // ДАННЫЕ СКРЫТЫ'), add(el('h4'), redactedBars(block.title)));
    renderBlocks(block.blocks, aside, { redact: true });
    return aside;
  }
  return add(el('p'), redactedBars('RECORD INCOMPLETE DATA'));
}

function renderBlocks(blocks, parent, ctx = {}) {
  blocks.forEach((block) => {
    const visible = !ctx.redact || ctx.openSection || block.public === true;
    if (block.t === 'fields') {
      add(parent, fieldsBlock(block, ctx));
    } else if (!visible) {
      add(parent, redactedBlock(block));
    } else if (block.t === 'p') {
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

function descriptionLines(value) {
  if (!value) return ['Описание изображения не добавлено.'];
  return Array.isArray(value) ? value : [value];
}

function photoSlot(doc, redact) {
  const figure = el('figure', 'doc-photo');
  const slot = add(el('div', 'doc-photo-window'), el('span', 'doc-photo-word', 'ФОТО'));
  const name = doc.photo || doc.id.toLowerCase();
  const caption = el('figcaption', 'mono', redact ? 'ДАННЫЕ СКРЫТЫ' : `ФАЙЛ: ${name}`);
  add(figure, slot, el('i', 'corner corner-tl'), el('i', 'corner corner-br'), caption);
  if (redact) {
    const black = el('div', 'doc-photo-window is-redacted');
    black.setAttribute('role', 'img');
    black.setAttribute('aria-label', 'Данные скрыты');
    figure.replaceChild(black, slot);
    return figure;
  }
  findImage(
    'images/',
    name,
    (url) => {
      const button = el('button', 'doc-photo-window');
      button.type = 'button';
      button.setAttribute('aria-label', `Открыть фото: ${doc.title}`);
      const img = el('img');
      img.src = url;
      img.alt = doc.title;
      add(button, img);
      button.addEventListener('click', () =>
        openViewer({ url, label: `PORTRAIT // ${doc.id}`, title: doc.title, description: descriptionLines(doc.photoDescription), file: url.split('/').pop() }, false, button)
      );
      figure.replaceChild(button, slot);
      caption.textContent = `ФОТО // ${doc.id}`;
    },
    () => {}
  );
  return figure;
}

function fieldsBlock(block, ctx = {}) {
  const card = el('div', ctx.doc ? 'doc-fields has-photo' : 'doc-fields');
  if (block.title) add(card, el('span', 'doc-fields-title', block.title));
  if (ctx.doc) add(card, photoSlot(ctx.doc, ctx.redact));
  const list = el('dl', 'doc-fields-list');
  block.items.forEach((item) => {
    const open = !ctx.redact || ctx.openSection || item.public === true;
    const value = open ? el('dd', null, item.value) : add(el('dd'), redactedBars(item.value));
    add(list, add(el('div', 'doc-field'), el('dt', null, item.label), value));
  });
  return add(card, list);
}

function restrictedBlock(block, documentId) {
  const aside = el('aside', 'restricted-block');
  add(aside, el('span', 'restricted-tag', documentId ? `RESTRICTED // ${documentId}` : 'RESTRICTED'), el('h4', null, block.title));
  renderBlocks(block.blocks, aside);
  return aside;
}

function summaryNode(doc) {
  const p = el('p');
  if (!isRedacted(doc)) {
    p.textContent = doc.summary;
    return p;
  }
  if (doc.publicSummary) p.appendChild(document.createTextNode(`${doc.publicSummary} `));
  return add(p, redactedBars(doc.summary.split(/\s+/).slice(0, 14).join(' ')));
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
  add(box, el('span', 'featured-tag', `LAST RECORD // ${featured.id}`), el('h4', null, featured.title), summaryNode(featured), open);
  return add(wrap, text, box);
}

function documentsPanel() {
  const current = documents.find((doc) => doc.id === state.documentId) || documents[0];
  const redacted = isRedacted(current);
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
  add(meta, el('span', null, current.id), el('span', null, `DATE: ${current.date}`), el('span', null, `CLASS: ${current.classification}`), el('span', null, `STATUS: ${redacted ? 'REDACTED' : current.status}`));
  add(article, meta, el('h3', 'doc-title', current.title));
  if (redacted) add(article, el('p', 'doc-banner', 'ДОКУМЕНТ ЧАСТИЧНО ЗАСЕКРЕЧЕН // УРОВЕНЬ ДОПУСКА: ОГРАНИЧЕННЫЙ'));
  current.sections.forEach((section) => {
    const block = el('section', 'doc-section');
    add(block, el('h4', 'doc-heading', section.title));
    renderBlocks(section.blocks, block, { redact: redacted, openSection: section.public === true, doc: current });
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
    add(row, el('span', 'mono', doc.id), el('span', null, doc.title), el('span', 'mono', doc.date), el('span', 'mono', isRedacted(doc) ? 'REDACTED' : doc.status));
    row.addEventListener('click', () => openDocument(doc.id));
    add(wrap, row);
  });
  return wrap;
}

function openViewer(item, panelOpen, opener) {
  const overlay = el('div', 'viewer');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', item.label);

  const stage = el('div', 'viewer-stage');
  if (item.redacted) {
    const black = el('div', 'viewer-redacted mono', 'ДАННЫЕ СКРЫТЫ // УРОВЕНЬ ДОПУСКА: ОГРАНИЧЕННЫЙ');
    black.setAttribute('role', 'img');
    black.setAttribute('aria-label', 'Данные скрыты');
    add(stage, black);
  } else if (item.url) {
    const img = el('img');
    img.src = item.url;
    img.alt = item.title;
    add(stage, img);
  } else {
    add(stage, el('div', 'viewer-missing mono', 'FILE PENDING'));
  }

  const toggle = el('button', 'viewer-tab');
  toggle.type = 'button';
  toggle.setAttribute('aria-controls', 'viewer-panel');
  const close = el('button', 'viewer-btn', 'ЗАКРЫТЬ ✕');
  close.type = 'button';
  const bar = add(el('div', 'viewer-bar'), el('span', 'viewer-label mono', item.label), add(el('div', 'viewer-actions'), close));

  const panel = el('aside', 'viewer-panel');
  panel.id = 'viewer-panel';
  panel.setAttribute('aria-label', 'Описание изображения');
  const meta = el('dl', 'viewer-meta mono');
  const metaRows = item.redacted
    ? [['ФАЙЛ', null], ['СТАТУС', 'REDACTED']]
    : [['ФАЙЛ', item.file || '—'], ['СТАТУС', item.url ? 'STORED' : 'PENDING']];
  metaRows.forEach(([label, value]) =>
    add(meta, add(el('div'), el('dt', null, label), value === null ? add(el('dd'), redactedBars('XXXXXXXX')) : el('dd', null, value)))
  );
  const body = el('div', 'viewer-text');
  item.description.forEach((line) => add(body, add(el('p'), item.redacted ? redactedBars(line) : document.createTextNode(line))));
  const heading = el('h3', 'viewer-title');
  if (item.redacted) add(heading, redactedBars(item.title));
  else heading.textContent = item.title;
  add(panel, el('span', 'viewer-tag mono', 'ОПИСАНИЕ'), heading, meta, body);

  const setPanel = (open) => {
    overlay.classList.toggle('is-panel-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'СКРЫТЬ ▸' : '◂ ОПИСАНИЕ';
    panel.inert = !open;
  };
  const shut = () => {
    overlay.remove();
    document.body.classList.remove('has-viewer');
    document.removeEventListener('keydown', onKey);
    if (opener && opener.isConnected) opener.focus();
  };
  const onKey = (event) => {
    if (event.key === 'Escape') shut();
  };
  toggle.addEventListener('click', () => setPanel(!overlay.classList.contains('is-panel-open')));
  close.addEventListener('click', shut);
  stage.addEventListener('click', (event) => {
    if (event.target === stage) shut();
  });
  document.addEventListener('keydown', onKey);

  add(overlay, stage, bar, toggle, panel);
  setPanel(panelOpen);
  document.body.classList.add('has-viewer');
  document.body.appendChild(overlay);
  close.focus();
}

function imageFrame(image) {
  const figure = el('figure', 'frame');
  const windowNode = add(el('div', 'frame-window'), el('span', 'frame-placeholder', 'FILE PENDING'));
  const status = el('span', 'frame-status', 'STATUS: PENDING');
  const item = {
    url: null,
    label: `IMAGE ${image.number}`,
    title: image.title || `Архивный фрагмент ${image.number}`,
    description: descriptionLines(image.description),
    file: null
  };
  add(figure, windowNode, el('i', 'corner corner-tl'), el('i', 'corner corner-tr'), el('i', 'corner corner-bl'), el('i', 'corner corner-br'));
  add(figure, add(el('figcaption'), el('span', 'frame-number', `IMAGE ${image.number}`), el('span', null, 'ARCHIVE FRAGMENT'), status));
  if (userRole !== 'full') {
    const black = el('button', 'frame-window is-redacted');
    black.type = 'button';
    black.setAttribute('aria-label', `Изображение ${image.number}: данные скрыты`);
    black.addEventListener('click', () => openViewer({ ...item, redacted: true }, false, black));
    figure.replaceChild(black, windowNode);
    status.textContent = 'STATUS: REDACTED';
    return figure;
  }
  findImage(
    'images/',
    image.name,
    (url) => {
      const button = el('button', 'frame-window');
      button.type = 'button';
      button.setAttribute('aria-label', `Открыть изображение ${image.number}`);
      const img = el('img');
      img.src = url;
      img.alt = `Архивный фрагмент ${image.number}`;
      add(button, img, el('span', 'frame-scan'));
      item.url = url;
      item.file = url.split('/').pop();
      button.addEventListener('click', () => openViewer(item, false, button));
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
  if (userRole !== 'full') {
    add(wrap, add(el('aside', 'restricted-block'), el('span', 'restricted-tag', 'ACCESS DENIED'), el('h4', null, 'Доступ к разделу запрещён'), el('p', null, 'Недостаточный уровень допуска.')));
    return wrap;
  }
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
