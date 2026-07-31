const BiliAPI = (function () {
  const DEFAULT_API = '/api/bilibili';
  let lastPayload = null;

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      const t = setTimeout(function () { reject(new Error('timeout')); }, ms);
      promise.then(
        function (v) { clearTimeout(t); resolve(v); },
        function (e) { clearTimeout(t); reject(e); }
      );
    });
  }

  async function load(config) {
    const mid = String(config.uid || '').trim();
    if (!mid) throw new Error('config.uid missing');
    const api = (config.apiPath || DEFAULT_API).replace(/\/$/, '');
    const url = api + '?mid=' + encodeURIComponent(mid) + '&action=all';
    const resp = await withTimeout(fetch(url, { credentials: 'omit' }), 12000);
    if (!resp.ok) throw new Error('http ' + resp.status);
    const data = await resp.json();
    if (!data || data.code !== 0) throw new Error((data && data.message) || 'api error');
    lastPayload = data;
    return data;
  }

  function getCache() { return lastPayload; }

  return { load: load, getCache: getCache };
})();
