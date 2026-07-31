/**
 * DGWEB — B站数据层
 * 通过本站 Pages Function (/api/bilibili) 获取 UP 主信息与视频列表。
 * 无需填写任何接口地址：/api/bilibili 随 Cloudflare Pages 自动部署。
 */
var BiliAPI = (function () {
  'use strict';

  var API_URL = '/api/bilibili';

  function http(url, timeoutMs) {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, timeoutMs || 12000);
    return fetch(url, { signal: ctrl.signal }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).catch(function (e) {
      clearTimeout(timer);
      throw e;
    });
  }

  /** 拉取 UP 主信息 + 视频列表 */
  function load(uid) {
    return http(API_URL + '?mid=' + encodeURIComponent(uid)).then(function (res) {
      if (!res || res.code !== 0) {
        throw new Error((res && res.message) || '接口返回异常');
      }
      return res;
    });
  }

  /** 封面地址标准化: 补协议 + 按需裁剪尺寸 */
  function normalizeCover(pic, w, h) {
    if (!pic) return '';
    var u = pic.indexOf('//') === 0 ? 'https:' + pic : pic;
    if (/hdslb\.com/.test(u) && u.indexOf('@') === -1) {
      u += '@' + (w || 400) + 'w_' + (h || 225) + 'h_1e_1c.jpg';
    }
    return u;
  }

  /** 播放量格式化: 123456 -> 12.3万 */
  function formatPlay(n) {
    n = Number(n) || 0;
    if (n >= 100000000) return (n / 100000000).toFixed(1).replace(/\.0$/, '') + '亿';
    if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万';
    return String(n);
  }

  /** 相对时间: 刚刚 / x分钟前 / x小时前 / x天前 / 日期 */
  function timeAgo(ts) {
    var diff = Date.now() - ts * 1000;
    var m = Math.floor(diff / 60000);
    if (m < 1) return '刚刚';
    if (m < 60) return m + '分钟前';
    var h = Math.floor(m / 60);
    if (h < 24) return h + '小时前';
    var d = Math.floor(h / 24);
    if (d < 30) return d + '天前';
    var dt = new Date(ts * 1000);
    return dt.getFullYear() + '-' +
      ('0' + (dt.getMonth() + 1)).slice(-2) + '-' +
      ('0' + dt.getDate()).slice(-2);
  }

  return {
    load: load,
    normalizeCover: normalizeCover,
    formatPlay: formatPlay,
    timeAgo: timeAgo
  };
})();
