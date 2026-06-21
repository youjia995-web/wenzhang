// 读者端 + 作者端 SPA
// Design: Swiss Modernism 2.0 + 编辑感 + 暗色模式自适应
// Stack: 原生 JS, 无框架, fetch API

'use strict';

const API = '';
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

// ============================================================
// State
// ============================================================
const state = {
  adminToken: localStorage.getItem('admin_token') || null,
  unlockTokens: JSON.parse(localStorage.getItem('unlock_tokens') || '{}'),
};

function setUnlockToken(slug, token) {
  state.unlockTokens[slug] = token;
  localStorage.setItem('unlock_tokens', JSON.stringify(state.unlockTokens));
}
function getUnlockToken(slug) { return state.unlockTokens[slug]; }
function clearUnlock(slug) {
  delete state.unlockTokens[slug];
  localStorage.setItem('unlock_tokens', JSON.stringify(state.unlockTokens));
}

// ============================================================
// API
// ============================================================
async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (opts.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (state.adminToken && path.startsWith('/api/admin/')) {
    headers['Authorization'] = `Bearer ${state.adminToken}`;
  }
  const slug = location.hash.match(/^#\/post\/([^/?]+)/)?.[1];
  if (slug && path.startsWith('/api/posts/')) {
    const t = getUnlockToken(slug);
    if (t) headers['X-Unlock-Token'] = t;
  }
  const res = await fetch(API + path, { ...opts, headers, credentials: 'include' });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw Object.assign(new Error(data.error || res.statusText), { status: res.status, data });
  }
  return res.json();
}

// ============================================================
// SVG 图标 (Heroicons outline, 24x24)
// ============================================================
const Icon = {
  arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>',
  checkCircle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.91 5.84L20 11l-6.09 2.16L12 19l-1.91-5.84L4 11l6.09-2.16L12 3z"/></svg>',
};

// ============================================================
// Utils
// ============================================================
function fmtPrice(cents) { return '¥' + (cents / 100).toFixed(2); }

function escape(s) {
  return (s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function renderMarkdown(md) {
  return escape(md)
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

function timeLeft(expiredAt) {
  const sec = Math.max(0, Math.floor((new Date(expiredAt) - Date.now()) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function toast(msg, kind = 'info') {
  const t = document.createElement('div');
  t.textContent = msg;
  t.style.cssText = `
    position: fixed; top: 80px; left: 50%; transform: translateX(-50%);
    padding: 12px 24px; background: var(--fg); color: var(--bg);
    border-radius: 10px; font-size: 14px; z-index: 1000;
    box-shadow: 0 8px 24px rgba(0,0,0,0.2); opacity: 0; transition: opacity 200ms;
  `;
  document.body.appendChild(t);
  requestAnimationFrame(() => { t.style.opacity = '1'; });
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 200);
  }, 2400);
}

// ============================================================
// Router
// ============================================================
function router() {
  const hash = location.hash || '#/';
  const root = $('#app');
  root.innerHTML = '';

  if (hash === '#/' || hash === '') return renderList(root);
  if (hash.startsWith('#/post/')) {
    const slug = decodeURIComponent(hash.slice('#/post/'.length));
    return renderPost(root, slug);
  }
  if (hash === '#/admin') return renderAdminLogin(root);
  if (hash === '#/admin/qrs') {
    if (!state.adminToken) return (location.hash = '#/admin');
    return renderAdminQRs(root);
  }
  if (hash === '#/admin/orders') {
    if (!state.adminToken) return (location.hash = '#/admin');
    return renderAdminOrders(root);
  }
  if (hash === '#/admin/posts') {
    if (!state.adminToken) return (location.hash = '#/admin');
    return renderAdminPosts(root);
  }
  if (hash === '#/admin/posts/new' || hash.startsWith('#/admin/posts/edit/')) {
    if (!state.adminToken) return (location.hash = '#/admin');
    const id = hash.startsWith('#/admin/posts/edit/')
      ? hash.slice('#/admin/posts/edit/'.length)
      : null;
    return renderAdminEdit(root, id);
  }
  root.innerHTML = '<p style="text-align:center;padding:40px;">未知页面</p>';
}

window.addEventListener('hashchange', router);

// ============================================================
// 文章列表 — Editorial hero
// ============================================================
async function renderList(root) {
  root.innerHTML = `
    <section class="hero fade-in">
      <h1>每一篇都值得你花时间</h1>
      <p class="lede">独立作者的深度思考、技术洞察与不喧哗的诚意。一次性付费，永久阅读。</p>
    </section>
    <div id="postList"><div class="skeleton" style="height: 200px;"></div></div>
  `;
  try {
    const { posts } = await api('/api/posts');
    const list = $('#postList');
    if (!posts.length) {
      list.innerHTML = '<p style="text-align:center;padding:60px 0;color:var(--fg-muted);">还没有文章，敬请期待</p>';
      return;
    }
    list.innerHTML = `<ul class="post-list fade-in">${
      posts.map((p, i) => `
        <li>
          <a href="#/post/${encodeURIComponent(p.slug)}" class="post-card" style="animation-delay: ${i * 50}ms">
            <h2>${escape(p.title)}</h2>
            <div class="meta">
              <span class="price-tag">${fmtPrice(p.priceCents)}</span>
              <span>${new Date(p.publishedAt).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })}</span>
              <span>·</span>
              <span>约 ${Math.max(3, Math.round((p.summary || '').length / 80))} 分钟</span>
            </div>
            <p class="summary">${escape(p.summary)}</p>
          </a>
        </li>
      `).join('')
    }</ul>`;
  } catch (e) {
    $('#postList').innerHTML = `<p style="color:var(--accent);padding:40px 0;">加载失败：${e.message}</p>`;
  }
}

// ============================================================
// 文章详情
// ============================================================
async function renderPost(root, slug) {
  root.innerHTML = `<div class="skeleton" style="height: 400px;"></div>`;
  try {
    const { post } = await api(`/api/posts/${encodeURIComponent(slug)}`);
    const previewHtml = renderMarkdown(post.preview);

    let body = `
      <article class="article fade-in">
        <a href="#/" class="back-link">${Icon.arrowLeft}<span>返回首页</span></a>
        <header class="article-header">
          <h1>${escape(post.title)}</h1>
          <div class="article-meta">
            <span>${new Date(post.publishedAt).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            <span>·</span>
            <span class="price-tag">${fmtPrice(post.priceCents)}</span>
          </div>
          ${post.summary ? `<p class="article-summary">${escape(post.summary)}</p>` : ''}
        </header>
        <div class="article-body">
          <div class="locked-section">${previewHtml}</div>
        </div>
        <div id="payArea"></div>
      </article>
    `;
    root.innerHTML = body;

    if (post.unlocked) {
      await showUnlocked(slug, post);
    } else {
      renderPayCard(slug, post.priceCents);
    }
  } catch (e) {
    root.innerHTML = `<p style="color:var(--accent);padding:40px 0;">加载失败：${e.message}</p>`;
  }
}

async function showUnlocked(slug, post) {
  try {
    const { content } = await api(`/api/posts/${encodeURIComponent(slug)}/content`);
    const article = $('.article-body');
    article.innerHTML = renderMarkdown(content);

    const pay = $('#payArea');
    pay.innerHTML = `
      <div class="unlock-banner">
        ${Icon.checkCircle}
        <span>已解锁 · 完整内容如下</span>
        <button onclick="window.__clearUnlock('${escape(slug)}')">清除</button>
      </div>
    `;
  } catch (e) {
    toast('解锁凭证失效：' + e.message);
    clearUnlock(slug);
    router();
  }
}

window.__clearUnlock = (slug) => {
  clearUnlock(slug);
  router();
};

function renderPayCard(slug, priceCents) {
  const pay = $('#payArea');
  pay.innerHTML = `
    <div class="pay-card fade-in">
      <p style="color: var(--fg-muted); font-size: 15px; margin-bottom: var(--sp-2);">本文剩余内容需要付费解锁</p>
      <div class="price">${fmtPrice(priceCents)}</div>
      <p class="price-unit">一次性解锁 · 永久阅读</p>
      <div class="pay-trust">
        <span>${Icon.shield}30 天退款</span>
        <span>${Icon.lock}内容保护</span>
        <span>${Icon.sparkle}作者亲自确认</span>
      </div>
      <button class="btn btn-primary btn-block btn-lg" id="unlockBtn" style="margin-top: var(--sp-6);">
        立即解锁
      </button>
    </div>
  `;
  $('#unlockBtn').onclick = () => showQR(slug, priceCents);
}

async function showQR(slug, priceCents) {
  const pay = $('#payArea');
  pay.innerHTML = `
    <div class="pay-card">
      <p style="color: var(--fg-muted); font-size: 14px; margin-bottom: var(--sp-3);">正在准备收款码...</p>
      <div class="skeleton" style="height: 220px;"></div>
    </div>
  `;
  try {
    const order = await api('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ postSlug: slug }),
    });
    pay.innerHTML = `
      <div class="pay-card fade-in">
        <p style="color: var(--fg-muted); font-size: 14px; margin-bottom: var(--sp-2);">
          订单号 <span class="order-no">${order.orderNo}</span>
          <span class="countdown" id="expireTimer" style="margin-left: var(--sp-3);"></span>
        </p>
        <div class="qr-section">
          <div class="qr-frame">
            <img src="data:image/png;base64,${order.qrImage}" alt="收款二维码" />
          </div>
          <div class="qr-meta">
            <h3>${escape(order.qrLabel || '微信扫码支付')}</h3>
            <ol class="qr-steps">
              <li>长按或截图识别二维码 → 输入金额 <strong>${fmtPrice(order.amountCents)}</strong></li>
              <li>备注订单号 <strong>${order.orderNo}</strong> → 完成支付</li>
              <li>点下方按钮通知作者确认</li>
            </ol>
          </div>
        </div>
        <button class="btn btn-primary btn-block btn-lg" id="paidBtn" style="margin-top: var(--sp-6);">
          我已支付，等待作者确认
        </button>
        <div class="status-area" id="statusArea" style="margin-top: var(--sp-4);"></div>
        <p style="margin-top: var(--sp-4); font-size: 13px; color: var(--fg-muted); text-align: center;">
          ⚠️ 务必在备注里填订单号，否则作者无法识别您的支付
        </p>
      </div>
    `;

    // 倒计时
    const timer = $('#expireTimer');
    const tick = () => {
      timer.textContent = ` ${timeLeft(order.expiredAt)} 后过期`;
      if (timeLeft(order.expiredAt) === '0:00') {
        clearInterval(t);
        $('#paidBtn').disabled = true;
        $('#statusArea').textContent = '订单已过期，请刷新页面重新创建';
      }
    };
    tick();
    const t = setInterval(tick, 1000);

    $('#paidBtn').onclick = () => markPaidAndPoll(slug, order.orderNo, t);
  } catch (e) {
    if (e.data?.error === 'no_payment_qr_configured') {
      pay.innerHTML = `
        <div class="pay-card">
          <p style="color: var(--warn); font-weight: 500;">作者还未上传收款码</p>
          <p style="color: var(--fg-muted); font-size: 14px; margin-top: var(--sp-2);">请联系作者补传微信收款码后再试。</p>
        </div>
      `;
    } else {
      pay.innerHTML = `<div class="pay-card"><p style="color: var(--accent);">创建订单失败：${e.message}</p></div>`;
    }
  }
}

async function markPaidAndPoll(slug, orderNo, timer) {
  const btn = $('#paidBtn');
  const status = $('#statusArea');
  btn.disabled = true;
  btn.textContent = '已通知作者...';

  try {
    await api(`/api/orders/${orderNo}/paid`, { method: 'POST' });
  } catch (e) {
    if (e.status !== 409) {
      btn.disabled = false;
      btn.textContent = '我已支付，等待作者确认';
      status.textContent = '提交失败：' + e.message;
      return;
    }
  }

  status.classList.add('ok');
  status.textContent = '✓ 已通知作者，正在等待确认（通常 < 2h）...';

  const start = Date.now();
  const poll = setInterval(async () => {
    try {
      const r = await api(`/api/orders/${orderNo}`);
      if (r.status === 'CONFIRMED' && r.unlockToken) {
        clearInterval(poll);
        if (timer) clearInterval(timer);
        setUnlockToken(slug, r.unlockToken);
        toast('🎉 作者已确认，自动解锁中...');
        setTimeout(() => router(), 800);
      } else if (r.status === 'REJECTED') {
        clearInterval(poll);
        if (timer) clearInterval(timer);
        status.classList.remove('ok');
        status.textContent = '作者判定未到账，已被拒绝。如已支付请联系作者。';
        btn.disabled = false;
        btn.textContent = '重新通知';
      } else if (r.status === 'EXPIRED') {
        clearInterval(poll);
        if (timer) clearInterval(timer);
        status.classList.remove('ok');
        status.textContent = '订单已过期。';
        btn.disabled = true;
      } else if (Date.now() - start > 30 * 60_000) {
        clearInterval(poll);
        if (timer) clearInterval(timer);
        status.classList.remove('ok');
        status.textContent = '等待超时，请刷新页面或联系作者。';
        btn.disabled = false;
        btn.textContent = '我已支付（再次通知）';
      }
    } catch (e) {
      // ignore transient
    }
  }, 3000);
}

// ============================================================
// 作者登录
// ============================================================
function renderAdminLogin(root) {
  root.innerHTML = `
    <section class="article fade-in" style="max-width: 400px; margin: 60px auto;">
      <h1 style="text-align: center; font-size: 28px;">作者登录</h1>
      <p style="text-align: center; color: var(--fg-muted); margin: var(--sp-3) 0 var(--sp-8);">管理文章、订单与收款码</p>
      <form id="loginForm">
        <div class="form-group">
          <label>管理密码</label>
          <input class="form-control" name="password" type="password" placeholder="请输入密码" required autofocus />
        </div>
        <button type="submit" class="btn btn-primary btn-block btn-lg">登录</button>
      </form>
    </section>
  `;
  $('#loginForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const r = await api('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password: fd.get('password') }),
      });
      state.adminToken = r.token;
      localStorage.setItem('admin_token', r.token);
      toast('登录成功');
      location.hash = '#/admin/orders';
    } catch (err) {
      toast('登录失败：' + err.message, 'error');
    }
  };
}

// ============================================================
// 收款码管理
// ============================================================
async function renderAdminQRs(root) {
  root.innerHTML = `
    <div class="page-header">
      <h1>收款码</h1>
      <div>${adminNavPills('qrs')}</div>
    </div>
    <div class="pay-card">
      <p style="font-weight: 600; margin-bottom: var(--sp-2);">上传新收款码</p>
      <p style="color: var(--fg-muted); font-size: 13px; margin-bottom: var(--sp-4);">上传后自动启用，旧码停用。建议命名如"微信-主号"，便于识别。</p>
      <div class="upload-zone" id="uploadZone">
        ${Icon.upload}
        <p>点击或拖拽图片到这里</p>
        <p style="font-size: 12px; margin-top: var(--sp-2);">PNG / JPG · ≤ 200KB</p>
        <input type="file" id="qrFile" accept="image/png,image/jpeg" hidden />
      </div>
      <div class="form-group" style="margin-top: var(--sp-4);">
        <input class="form-control" id="qrLabel" placeholder="备注，例如：微信-主号" style="max-width: 320px;" />
      </div>
      <p class="status-area" id="uploadStatus"></p>
    </div>
    <h2 style="font-size: 18px; margin: var(--sp-8) 0 var(--sp-4);">当前收款码</h2>
    <div id="qrList"><div class="skeleton" style="height: 100px;"></div></div>
  `;
  await loadQRList();
  setupUpload();
}

function setupUpload() {
  const zone = $('#uploadZone');
  const file = $('#qrFile');
  const label = $('#qrLabel');
  const status = $('#uploadStatus');

  zone.onclick = () => file.click();
  zone.ondragover = (e) => { e.preventDefault(); zone.classList.add('dragover'); };
  zone.ondragleave = () => zone.classList.remove('dragover');
  zone.ondrop = (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) uploadFile(e.dataTransfer.files[0]);
  };
  file.onchange = (e) => {
    if (e.target.files[0]) uploadFile(e.target.files[0]);
  };

  async function uploadFile(f) {
    if (f.size > 200 * 1024) {
      status.textContent = '图片过大，请压缩到 200KB 以内';
      return;
    }
    if (!label.value.trim()) {
      status.textContent = '请先填写备注';
      label.focus();
      return;
    }
    status.textContent = '上传中...';
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        await api('/api/admin/qrs', {
          method: 'POST',
          body: JSON.stringify({ label: label.value.trim(), imageBase64: reader.result }),
        });
        status.classList.add('ok');
        status.textContent = '✓ 上传成功';
        label.value = '';
        await loadQRList();
      } catch (e) {
        status.textContent = '失败：' + e.message;
      }
    };
    reader.readAsDataURL(f);
  }
}

async function loadQRList() {
  const list = $('#qrList');
  try {
    const { qrs } = await api('/api/admin/qrs');
    if (!qrs.length) {
      list.innerHTML = '<p style="color: var(--fg-muted); padding: var(--sp-6) 0; text-align: center;">还没有上传收款码</p>';
      return;
    }
    list.innerHTML = qrs.map(q => `
      <div class="order-row">
        <div class="order-info">
          <div class="order-title">${escape(q.label)}</div>
          <div class="order-meta">
            <span class="badge ${q.isActive ? 'badge-ok' : 'badge-muted'}">${q.isActive ? '已启用' : '已停用'}</span>
            <span>${new Date(q.createdAt).toLocaleString('zh-CN')}</span>
          </div>
        </div>
        <div class="order-actions">
          ${q.isActive
            ? `<button class="btn btn-secondary" disabled>当前</button>`
            : `<button class="btn btn-secondary" onclick="window.__activateQR('${q.id}')">启用</button>`}
          <button class="btn btn-secondary" onclick="window.__deleteQR('${q.id}')" title="删除">${Icon.trash}</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = `<p style="color: var(--accent);">加载失败：${e.message}</p>`;
  }
}

window.__activateQR = async (id) => {
  await api(`/api/admin/qrs/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ isActive: true }),
  });
  await loadQRList();
};
window.__deleteQR = async (id) => {
  if (!confirm('确认删除？')) return;
  await api(`/api/admin/qrs/${id}`, { method: 'DELETE' });
  await loadQRList();
};

// ============================================================
// 订单管理
// ============================================================
function adminNavPills(active) {
  const items = [
    { hash: '#/admin/orders', label: '订单' },
    { hash: '#/admin/posts', label: '文章' },
    { hash: '#/admin/qrs', label: '收款码' },
  ];
  return `<nav class="nav-pills">${items.map(i =>
    `<a href="${i.hash}" class="${active === activePageName(active) ? 'active' : ''}">${i.label}</a>`
  ).join('')}</nav>`;
}

function activePageName(active) {
  return active; // simple
}

async function renderAdminOrders(root) {
  root.innerHTML = `
    <div class="page-header">
      <h1>订单管理</h1>
    </div>
    <div class="nav-pills">
      <a href="#/admin/orders" class="active">订单</a>
      <a href="#/admin/posts">文章</a>
      <a href="#/admin/qrs">收款码</a>
      <a href="#" id="logout" style="margin-left: auto;">${Icon.logout} 退出</a>
    </div>
    <div id="stats"></div>
    <div class="nav-pills" style="margin-top: var(--sp-6);">
      <a href="#" data-filter="AWAITING_CONFIRM" class="active" style="color: var(--warn);">待我确认</a>
      <a href="#" data-filter="CONFIRMED" style="color: var(--ok);">已确认</a>
      <a href="#" data-filter="">全部</a>
    </div>
    <div id="orderList" style="margin-top: var(--sp-4);"><div class="skeleton" style="height: 200px;"></div></div>
  `;
  $('#logout').onclick = (e) => {
    e.preventDefault();
    state.adminToken = null;
    localStorage.removeItem('admin_token');
    location.hash = '#/';
  };
  $$('[data-filter]').forEach(btn => {
    btn.onclick = (e) => {
      e.preventDefault();
      $$('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadOrders(btn.dataset.filter);
    };
  });
  await loadStats();
  await loadOrders('AWAITING_CONFIRM');
}

async function loadStats() {
  try {
    const s = await api('/api/admin/stats');
    $('#stats').innerHTML = `
      <div class="stat-grid">
        <div class="stat-card warn">
          <div class="label">待我确认</div>
          <div class="value">${s.awaitingConfirm}</div>
        </div>
        <div class="stat-card">
          <div class="label">待支付</div>
          <div class="value">${s.pending}</div>
        </div>
        <div class="stat-card ok">
          <div class="label">已确认</div>
          <div class="value">${s.confirmed}</div>
        </div>
        <div class="stat-card accent">
          <div class="label">累计收入</div>
          <div class="value">${fmtPrice(s.totalCents)}</div>
        </div>
      </div>
    `;
  } catch (e) {
    $('#stats').innerHTML = '<p style="color: var(--accent);">统计加载失败</p>';
  }
}

async function loadOrders(filter) {
  const list = $('#orderList');
  list.innerHTML = '<div class="skeleton" style="height: 100px;"></div>';
  try {
    const q = filter ? `?status=${filter}` : '';
    const { orders } = await api(`/api/admin/orders${q}`);
    if (!orders.length) {
      list.innerHTML = '<p style="text-align:center;padding:var(--sp-8);color:var(--fg-muted);">暂无订单</p>';
      return;
    }
    list.innerHTML = orders.map(o => `
      <div class="order-row fade-in">
        <div class="order-info">
          <div class="order-title">${escape(o.post.title)}</div>
          <div class="order-meta">
            <span class="order-no">${o.orderNo}</span>
            <span>${fmtPrice(o.amountCents)}</span>
            <span>${new Date(o.createdAt).toLocaleString('zh-CN')}</span>
            ${orderBadge(o.status)}
          </div>
        </div>
        ${o.status === 'AWAITING_CONFIRM' ? `
          <div class="order-actions">
            <button class="btn btn-primary" onclick="window.__confirmOrder('${o.id}')">${Icon.check} 确认</button>
            <button class="btn btn-secondary" onclick="window.__rejectOrder('${o.id}')" title="拒绝">${Icon.x}</button>
          </div>
        ` : ''}
      </div>
    `).join('');
  } catch (e) {
    list.innerHTML = `<p style="color: var(--accent);">加载失败：${e.message}</p>`;
  }
}

function orderBadge(s) {
  return {
    PENDING: '<span class="badge badge-muted">待支付</span>',
    AWAITING_CONFIRM: '<span class="badge badge-warn">待确认</span>',
    CONFIRMED: '<span class="badge badge-ok">已确认</span>',
    REJECTED: '<span class="badge badge-danger">已拒绝</span>',
    EXPIRED: '<span class="badge badge-muted">已过期</span>',
  }[s] || '';
}

window.__confirmOrder = async (id) => {
  if (!confirm('确认收到这笔款？')) return;
  await api(`/api/admin/orders/${id}/confirm`, { method: 'POST' });
  toast('✓ 已确认，读者将自动解锁');
  await loadStats();
  await loadOrders('AWAITING_CONFIRM');
};
window.__rejectOrder = async (id) => {
  const reason = prompt('拒绝原因（可空）：');
  if (reason === null) return;
  await api(`/api/admin/orders/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
  toast('已拒绝');
  await loadStats();
  await loadOrders('AWAITING_CONFIRM');
};

// ============================================================
// 文章管理
// ============================================================
async function renderAdminPosts(root) {
  root.innerHTML = `
    <div class="page-header">
      <h1>文章管理</h1>
    </div>
    <div class="nav-pills">
      <a href="#/admin/orders">订单</a>
      <a href="#/admin/posts" class="active">文章</a>
      <a href="#/admin/qrs">收款码</a>
      <a href="#" id="logout" style="margin-left: auto;">${Icon.logout} 退出</a>
    </div>
    <p style="margin: var(--sp-4) 0;">
      <a href="#/admin/posts/new" class="btn btn-primary">${Icon.plus} 新建文章</a>
    </p>
    <div id="postList"><div class="skeleton" style="height: 200px;"></div></div>
  `;
  $('#logout').onclick = (e) => {
    e.preventDefault();
    state.adminToken = null;
    localStorage.removeItem('admin_token');
    location.hash = '#/';
  };
  try {
    const { posts } = await api('/api/admin/posts');
    if (!posts.length) {
      $('#postList').innerHTML = '<p style="text-align:center;padding:var(--sp-8);color:var(--fg-muted);">还没有文章</p>';
      return;
    }
    $('#postList').innerHTML = `<ul class="post-list">${
      posts.map(p => `
        <li>
          <a href="#/admin/posts/edit/${p.id}" class="post-card">
            <h2>${escape(p.title)}</h2>
            <div class="meta">
              <span class="badge ${p.status === 'PUBLISHED' ? 'badge-ok' : p.status === 'DRAFT' ? 'badge-muted' : 'badge-warn'}">${p.status}</span>
              <span class="price-tag">${fmtPrice(p.priceCents)}</span>
              <span>${new Date(p.updatedAt).toLocaleDateString('zh-CN')}</span>
            </div>
          </a>
        </li>
      `).join('')
    }</ul>`;
  } catch (e) {
    $('#postList').innerHTML = `<p style="color: var(--accent);">加载失败：${e.message}</p>`;
  }
}

async function renderAdminEdit(root, id) {
  let post = { slug: '', title: '', summary: '', preview: '', content: '', priceCents: 990, status: 'DRAFT' };
  if (id) {
    try {
      const r = await api(`/api/admin/posts/${id}`);
      post = r.post;
    } catch (e) {
      root.innerHTML = `<p style="color: var(--accent);">加载失败：${e.message}</p>`;
      return;
    }
  }
  root.innerHTML = `
    <div class="page-header">
      <h1>${id ? '编辑文章' : '新建文章'}</h1>
    </div>
    <p><a href="#/admin/posts" class="back-link">${Icon.arrowLeft}<span>返回列表</span></a></p>
    <form id="postForm" style="margin-top: var(--sp-6);">
      <div class="form-group">
        <label>URL Slug（英文短横线）</label>
        <input class="form-control" name="slug" value="${escape(post.slug)}" required pattern="[a-z0-9-]+" />
      </div>
      <div class="form-group">
        <label>标题</label>
        <input class="form-control" name="title" value="${escape(post.title)}" required />
      </div>
      <div class="form-group">
        <label>摘要（列表页展示）</label>
        <textarea class="form-control" name="summary" rows="2">${escape(post.summary)}</textarea>
      </div>
      <div class="form-group">
        <label>公开预览（建议 20-30% 内容）</label>
        <textarea class="form-control" name="preview" rows="6" style="font-family: var(--font-mono); font-size: 14px;">${escape(post.preview)}</textarea>
      </div>
      <div class="form-group">
        <label>完整内容（付费后可见）</label>
        <textarea class="form-control" name="content" rows="14" style="font-family: var(--font-mono); font-size: 14px;">${escape(post.content)}</textarea>
      </div>
      <div class="form-group">
        <label>价格（分）= ${fmtPrice(post.priceCents)}</label>
        <input class="form-control" name="priceCents" type="number" value="${post.priceCents}" min="1" style="max-width: 200px;" />
      </div>
      <div class="form-group">
        <label>状态</label>
        <select class="form-control" name="status" style="max-width: 200px;">
          <option value="DRAFT" ${post.status === 'DRAFT' ? 'selected' : ''}>草稿</option>
          <option value="PUBLISHED" ${post.status === 'PUBLISHED' ? 'selected' : ''}>发布</option>
          <option value="ARCHIVED" ${post.status === 'ARCHIVED' ? 'selected' : ''}>归档</option>
        </select>
      </div>
      <div style="display: flex; gap: var(--sp-3); margin-top: var(--sp-8);">
        <button type="submit" class="btn btn-primary btn-lg">保存</button>
        ${id ? `<button type="button" id="delBtn" class="btn btn-secondary">删除</button>` : ''}
      </div>
    </form>
  `;
  $('#postForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      slug: fd.get('slug'),
      title: fd.get('title'),
      summary: fd.get('summary'),
      preview: fd.get('preview'),
      content: fd.get('content'),
      priceCents: parseInt(fd.get('priceCents'), 10),
      status: fd.get('status'),
    };
    try {
      if (id) {
        await api(`/api/admin/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) });
      } else {
        await api('/api/admin/posts', { method: 'POST', body: JSON.stringify(data) });
      }
      toast('✓ 保存成功');
      setTimeout(() => location.hash = '#/admin/posts', 600);
    } catch (err) {
      toast('保存失败：' + (err.data?.error || err.message), 'error');
    }
  };
  if (id) {
    $('#delBtn').onclick = async () => {
      if (!confirm('确认删除？此操作不可恢复')) return;
      await api(`/api/admin/posts/${id}`, { method: 'DELETE' });
      toast('已删除');
      setTimeout(() => location.hash = '#/admin/posts', 600);
    };
  }
}

router();
