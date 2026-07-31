(function () {
  const PAGE_SIZE = 12;
  const state = {
    config: null,
    videos: [],
    uinfo: null,
    category: 'all',
    sort: 'new',
    query: '',
    shown: PAGE_SIZE,
    live: false,
    degraded: false,
    updated: 0
  };

  const $ = function (sel) { return document.querySelector(sel); };
  const $$ = function (sel) { return Array.prototype.slice.call(document.querySelectorAll(sel)); };

  function guessCategory(title) {
    const t = title || '';
    if (/新手|入坑|开局|萌新|必看|少走/.test(t)) return 'newbie';
    if (/测评|演示|实战|泛用|榜|强度|干员/.test(t)) return 'review';
    if (/挂机|低配|单核|摆完|删除|脱手|半挂/.test(t)) return 'afk';
    return 'event';
  }

  function fmtPlay(n) {
    n = Number(n) || 0;
    if (n >= 10000) return (n / 10000).toFixed(n >= 100000 ? 0 : 1) + '万';
    return String(n);
  }

  function fmtFollower(n) {
    n = Number(n) || 0;
    if (n >= 10000) return (n / 10000).toFixed(1) + '万';
    return String(n);
  }

  function fmtRelative(ts) {
    if (!ts) return '';
    const now = Math.floor(Date.now() / 1000);
    const d = Math.max(0, now - ts);
    if (d < 60) return '刚刚';
    if (d < 3600) return Math.floor(d / 60) + '分钟前';
    if (d < 86400) return Math.floor(d / 3600) + '小时前';
    if (d < 86400 * 30) return Math.floor(d / 86400) + '天前';
    const dt = new Date(ts * 1000);
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return dt.getFullYear() + '-' + m + '-' + day;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeVideos(list) {
    return (list || []).map(function (v) {
      return {
        bvid: v.bvid,
        title: v.title,
        cover: v.cover || '',
        play: Number(v.play) || 0,
        duration: v.duration || '',
        created: Number(v.created) || 0,
        category: guessCategory(v.title),
        url: 'https://www.bilibili.com/video/' + v.bvid
      };
    });
  }

  function filtered() {
    let list = state.videos.slice();
    if (state.category !== 'all') {
      list = list.filter(function (v) { return v.category === state.category; });
    }
    if (state.query) {
      const q = state.query.toLowerCase();
      list = list.filter(function (v) { return v.title.toLowerCase().indexOf(q) !== -1; });
    }
    if (state.sort === 'hot') {
      list.sort(function (a, b) { return b.play - a.play; });
    } else {
      list.sort(function (a, b) { return b.created - a.created; });
    }
    return list;
  }

  function setStatus(mode, text) {
    const el = $('#liveStatus');
    if (!el) return;
    el.className = 'live-status ' + mode;
    el.innerHTML = '<span class="dot"></span><span>' + escapeHtml(text) + '</span>';
  }

  function renderHero() {
    const name = (state.uinfo && state.uinfo.name) || (state.config && state.config.name) || 'DGWEB';
    const face = (state.uinfo && state.uinfo.face) || 'images/logo.png';
    const follower = state.uinfo && state.uinfo.follower != null ? state.uinfo.follower : null;
    const videoCount = state.uinfo && state.uinfo.videos != null
      ? state.uinfo.videos
      : (state.videos.length || null);
    const sign = (state.uinfo && state.uinfo.sign) || '愿为世界添砖加瓦 · 简单好抄的明日方舟攻略';

    $('#heroName').textContent = name;
    $('#heroSign').textContent = sign;
    const av = $('#heroAvatar');
    av.src = face;
    av.referrerPolicy = 'no-referrer';
    av.onerror = function () { this.src = 'images/logo.png'; };

    $('#statFollowers').textContent = follower != null ? fmtFollower(follower) : '—';
    $('#statVideos').textContent = videoCount != null ? String(videoCount) : '—';
    $('#statShown').textContent = String(state.videos.length || 0);

    const sync = $('#syncTime');
    if (state.updated) {
      const d = new Date(state.updated * 1000);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      sync.textContent = 'SYNC ' + hh + ':' + mm;
    } else {
      sync.textContent = 'OFFLINE';
    }

    const space = state.config && state.config.spaceUrl
      ? state.config.spaceUrl
      : ('https://space.bilibili.com/' + (state.config && state.config.uid || ''));
    $$('a[data-space]').forEach(function (a) { a.href = space; });
  }

  function renderList() {
    const list = filtered();
    const slice = list.slice(0, state.shown);
    const grid = $('#videoGrid');
    const empty = $('#emptyState');
    const more = $('#loadMoreBtn');

    if (!slice.length) {
      grid.innerHTML = '';
      empty.hidden = false;
      more.hidden = true;
      $('#resultMeta').textContent = '0 条结果';
      return;
    }

    empty.hidden = true;
    grid.innerHTML = slice.map(function (v) {
      const cover = v.cover || 'images/default-cover.jpg';
      return (
        '<a class="v-card" href="' + escapeHtml(v.url) + '" target="_blank" rel="noopener">' +
          '<div class="v-cover">' +
            '<img src="' + escapeHtml(cover) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.src=\'images/default-cover.jpg\'">' +
            (v.duration ? '<span class="v-dur">' + escapeHtml(v.duration) + '</span>' : '') +
            '<span class="v-play"><i></i>' + escapeHtml(fmtPlay(v.play)) + '</span>' +
          '</div>' +
          '<div class="v-body">' +
            '<h3 class="v-title">' + escapeHtml(v.title) + '</h3>' +
            '<div class="v-meta">' +
              '<span>' + escapeHtml(fmtRelative(v.created)) + '</span>' +
              '<span class="tag">' + escapeHtml(labelOf(v.category)) + '</span>' +
            '</div>' +
          '</div>' +
        '</a>'
      );
    }).join('');

    $('#resultMeta').textContent = '显示 ' + slice.length + ' / ' + list.length;
    more.hidden = slice.length >= list.length;
  }

  function labelOf(cat) {
    return ({ newbie: '新人入坑', afk: '低配挂机', event: '活动攻略', review: '干员测评' })[cat] || '攻略';
  }

  function bindUI() {
    $$('.tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        $$('.tab').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        state.category = btn.dataset.cat;
        state.shown = PAGE_SIZE;
        renderList();
      });
    });

    $('#sortSelect').addEventListener('change', function (e) {
      state.sort = e.target.value;
      state.shown = PAGE_SIZE;
      renderList();
    });

    let timer = null;
    $('#searchInput').addEventListener('input', function (e) {
      clearTimeout(timer);
      timer = setTimeout(function () {
        state.query = e.target.value.trim();
        state.shown = PAGE_SIZE;
        renderList();
      }, 180);
    });

    $('#loadMoreBtn').addEventListener('click', function () {
      state.shown += PAGE_SIZE;
      renderList();
    });

    const navToggle = $('#navToggle');
    if (navToggle) {
      navToggle.addEventListener('click', function () {
        $('#navLinks').classList.toggle('open');
      });
    }

    $$('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const t = document.querySelector(id);
        if (t) {
          e.preventDefault();
          t.scrollIntoView({ behavior: 'smooth', block: 'start' });
          $('#navLinks').classList.remove('open');
        }
      });
    });
  }

  function showSetupHint(msg) {
    const empty = $('#emptyState');
    empty.hidden = false;
    empty.innerHTML =
      '<div class="empty-title">数据暂未就绪</div>' +
      '<p>' + escapeHtml(msg || '请确认已部署到 Cloudflare Pages（含 functions 目录）。') + '</p>' +
      '<a class="btn" data-space href="#" target="_blank" rel="noopener">前往 B 站空间</a>';
    if (state.config && state.config.spaceUrl) {
      empty.querySelector('[data-space]').href = state.config.spaceUrl;
    }
  }

  async function boot() {
    bindUI();
    setStatus('loading', '同步中');

    try {
      const cfgResp = await fetch('data/config.json', { cache: 'no-cache' });
      if (!cfgResp.ok) throw new Error('config missing');
      state.config = await cfgResp.json();
    } catch (e) {
      setStatus('error', '配置缺失');
      showSetupHint('找不到 data/config.json，请检查文件是否上传完整。');
      renderHero();
      return;
    }

    document.title = (state.config.name || 'DGWEB') + ' — 明日方舟攻略站';
    renderHero();

    try {
      const data = await BiliAPI.load(state.config);
      state.uinfo = data.uinfo || null;
      state.videos = normalizeVideos(data.videos || []);
      state.total = data.total || state.videos.length;
      state.updated = data.updated || Math.floor(Date.now() / 1000);
      state.live = true;
      state.degraded = !!data.degraded;
      setStatus(state.degraded ? 'warn' : 'live', state.degraded ? '部分数据' : 'LIVE');
      renderHero();
      renderList();
      if (!state.videos.length) {
        showSetupHint('视频列表暂时被 B 站风控，请稍后刷新。粉丝等基础数据仍可显示。');
      }
    } catch (e) {
      state.live = false;
      setStatus('error', '同步失败');
      showSetupHint('无法连接数据接口（/api/bilibili）。请确认项目已部署到 Cloudflare Pages，且 functions 目录已上传。');
      renderList();
    }

    $('#loader').classList.add('done');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
