/**
 * DGWEB — 页面逻辑
 * 流程: 读 data/config.json -> BiliAPI.load(uid) -> 渲染 UP 信息 + 视频卡片
 */
(function () {
  'use strict';

  var PAGE_SIZE = 12;

  var state = {
    videos: [],      // 已附加 _cat 分类
    category: 'all',
    sort: 'new',
    query: '',
    shown: PAGE_SIZE,
    status: 'loading' // loading | ok | error
  };

  var CATEGORIES = [
    { key: 'all',   label: '全部' },
    { key: 'afk',   label: '低配挂机' },
    { key: 'event', label: '活动攻略' },
    { key: 'guide', label: '新人入坑' },
    { key: 'ops',   label: '干员测评' }
  ];

  var CAT_LABEL = {};
  CATEGORIES.forEach(function (c) { CAT_LABEL[c.key] = c.label; });

  var $ = function (id) { return document.getElementById(id); };

  /* ---------------- 标题关键词自动分类 ---------------- */
  function classify(title) {
    var t = title || '';
    if (/新手|入坑|开局|萌新|必看|养成/.test(t)) return 'guide';
    if (/测评|评测|演示|实战|泛用|强度|榜单|榜#|推荐|干员/.test(t)) return 'ops';
    if (/挂机|低配|单核|双核|摆完|删除|剿灭|主线|合约|镀层|作业|攻略/.test(t)) return 'afk';
    return 'event';
  }

  /* ---------------- 初始化 ---------------- */
  function init() {
    bindToolbar();
    renderSkeleton();
    setSync('loading', '正在连接B站接口…');

    fetch('data/config.json').then(function (r) { return r.json(); }).then(function (cfg) {
      applyConfig(cfg || {});
      return BiliAPI.load(cfg.uid);
    }).then(function (res) {
      state.status = 'ok';
      state.videos = (res.videos || []).map(function (v) {
        v._cat = classify(v.title);
        return v;
      });
      applyUinfo(res);
      render();
      var time = new Date(res.updated * 1000);
      setSync('ok', '数据已同步 · ' +
        ('0' + time.getHours()).slice(-2) + ':' +
        ('0' + time.getMinutes()).slice(-2));
    }).catch(function (err) {
      state.status = 'error';
      renderError(err);
      setSync('error', '接口暂不可用');
    });
  }

  function applyConfig(cfg) {
    var name = cfg.name || '未知UP主';
    var siteName = cfg.siteName || 'DGWEB';
    var siteDesc = cfg.siteDesc || '';
    document.title = siteName + ' — ' + siteDesc;
    setText('brandName', siteName);
    setText('brandDesc', siteDesc);
    setText('footName', siteName);
    setText('heroSub', cfg.slogan || '');
    setText('upName', name);
    setText('upUid', 'UID ' + cfg.uid);
    setText('year', new Date().getFullYear());
    var space = 'https://space.bilibili.com/' + cfg.uid;
    var b1 = $('biliLink'); if (b1) b1.href = space;
    var b2 = $('biliLink2'); if (b2) b2.href = space;
    var b3 = $('biliLink3'); if (b3) b3.href = space;
  }

  function applyUinfo(res) {
    var u = res.uinfo || {};
    if (u.name) setText('upName', u.name);
    if (u.follower != null) setText('statFollowers', BiliAPI.formatPlay(u.follower));
    if (res.total != null) setText('statVideos', String(res.total));
    if (u.face) {
      var img = $('upFace');
      img.src = u.face.indexOf('//') === 0 ? 'https:' + u.face : u.face;
      img.onerror = function () { img.src = 'images/logo.png'; };
    }
  }

  /* ---------------- 渲染 ---------------- */
  function filtered() {
    var q = state.query.trim().toLowerCase();
    var list = state.videos.filter(function (v) {
      if (state.category !== 'all' && v._cat !== state.category) return false;
      if (q && v.title.toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
    list.sort(function (a, b) {
      return state.sort === 'hot' ? (b.play - a.play) : (b.created - a.created);
    });
    return list;
  }

  function render() {
    var grid = $('videoGrid');
    var list = filtered();
    var show = list.slice(0, state.shown);

    if (!show.length) {
      grid.innerHTML =
        '<div class="empty-box"><div class="empty-icon">∅</div>' +
        '<p>没有匹配的攻略</p><p class="empty-sub">换个关键词或分类试试</p></div>';
    } else {
      grid.innerHTML = show.map(cardHtml).join('');
    }

    $('resultInfo').textContent = '共 ' + list.length + ' 个视频';
    $('loadMore').style.display = state.shown < list.length ? 'inline-block' : 'none';
  }

  function cardHtml(v) {
    var cover = BiliAPI.normalizeCover(v.cover, 400, 225);
    return '' +
      '<a class="card" href="' + v.url + '" target="_blank" rel="noopener">' +
        '<div class="card-cover">' +
          '<img src="' + cover + '" alt="" loading="lazy" referrerpolicy="no-referrer" ' +
               'onerror="this.onerror=null;this.src=\'images/default-cover.jpg\'">' +
          '<span class="badge-cat">' + CAT_LABEL[v._cat] + '</span>' +
          '<span class="badge-duration">' + (v.duration || '') + '</span>' +
        '</div>' +
        '<div class="card-body">' +
          '<h3 class="card-title">' + escapeHtml(v.title) + '</h3>' +
          '<div class="card-meta">' +
            '<span>▶ ' + BiliAPI.formatPlay(v.play) + '</span>' +
            '<span>' + BiliAPI.timeAgo(v.created) + '</span>' +
          '</div>' +
        '</div>' +
      '</a>';
  }

  function renderSkeleton() {
    var html = '';
    for (var i = 0; i < 8; i++) {
      html += '<div class="card sk-card"><div class="sk-cover sk-shine"></div>' +
              '<div class="card-body"><div class="sk-line sk-shine"></div>' +
              '<div class="sk-line short sk-shine"></div></div></div>';
    }
    $('videoGrid').innerHTML = html;
    $('resultInfo').textContent = '数据加载中…';
    $('loadMore').style.display = 'none';
  }

  function renderError(err) {
    $('videoGrid').innerHTML =
      '<div class="error-box">' +
        '<div class="error-icon">⚠</div>' +
        '<h3>B站数据接口暂不可用</h3>' +
        '<p class="error-sub">' + escapeHtml(String((err && err.message) || err || '未知错误')) + '</p>' +
        '<ul class="error-tips">' +
          '<li>若是刚部署：Pages Function 首次生效需 1~2 分钟，稍候重试</li>' +
          '<li>若是 B 站限流：接口有 10 分钟缓存，稍候会自动恢复</li>' +
          '<li>确认仓库包含 <code>functions/api/bilibili.js</code> 且部署类型为 Cloudflare Pages</li>' +
        '</ul>' +
        '<button class="btn btn-accent" onclick="location.reload()">重新加载</button>' +
      '</div>';
    $('resultInfo').textContent = '加载失败';
    $('loadMore').style.display = 'none';
  }

  /* ---------------- 工具栏 ---------------- */
  function bindToolbar() {
    var tabs = $('tabs');
    tabs.innerHTML = CATEGORIES.map(function (c) {
      return '<button class="tab' + (c.key === 'all' ? ' active' : '') +
             '" data-cat="' + c.key + '">' + c.label + '</button>';
    }).join('');
    tabs.addEventListener('click', function (e) {
      var btn = e.target.closest('.tab');
      if (!btn) return;
      tabs.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
      btn.classList.add('active');
      state.category = btn.getAttribute('data-cat');
      state.shown = PAGE_SIZE;
      if (state.status === 'ok') render();
    });

    $('sortSel').addEventListener('change', function (e) {
      state.sort = e.target.value;
      state.shown = PAGE_SIZE;
      if (state.status === 'ok') render();
    });

    $('searchInput').addEventListener('input', function (e) {
      state.query = e.target.value;
      state.shown = PAGE_SIZE;
      if (state.status === 'ok') render();
    });

    $('loadMore').addEventListener('click', function () {
      state.shown += PAGE_SIZE;
      render();
    });
  }

  /* ---------------- 小工具 ---------------- */
  function setText(id, text) {
    var el = $(id);
    if (el) el.textContent = text;
  }

  function setSync(type, text) {
    var pill = $('syncPill');
    pill.className = 'sync-pill is-' + type;
    setText('syncText', text);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
