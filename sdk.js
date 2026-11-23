/*!
 * PuddingLogin 一键登录 SDK v1.0
 * PuddingLogin - MIT License · https://gitee.com/budingyun6/puddinglogin-v2
 *
 * 用法：
 *   <script src='https://你的站点/sdk.js'></script>
 *   <div id='pl-login'></div>
 *   PlLogin.init({ appid: 'PLxxxx', redirect_uri: 'https://your-site.com/callback' }).mount('#pl-login');
 *
 * 回调页：
 *   var r = PlLogin.callback();
 *   if (r) { 把 r.type 与 r.code 提交到你的服务端换取用户信息 }
 */
(function (global) {
  'use strict';

  var DEFAULT_BASE = (function () {
    var s = document.currentScript ? document.currentScript.src : '';
    if (!s) return '';
    var p = s.indexOf('://');
    if (p < 0) return '';
    var rest = s.slice(p + 3);
    var q = rest.indexOf('/');
    return s.slice(0, p + 3) + (q < 0 ? rest : rest.slice(0, q));
  })();

  var cfg = {
    appid: '',
    redirect_uri: '',
    base: DEFAULT_BASE,
    state: '',
    theme: 'auto',
    onError: null
  };

  function join(base, path) {
    if (!base) return path;
    var b = String(base);
    while (b.length > 0 && b.charAt(b.length - 1) === '/') {
      b = b.slice(0, -1);
    }
    return b + path;
  }

  function qs(obj) {
    var out = [];
    for (var k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      var v = obj[k];
      if (v === undefined || v === null || v === '') continue;
      out.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
    }
    return out.join('&');
  }

  function randState() {
    var s = '';
    var chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < 24; i++) {
      s += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return s;
  }

  function fail(msg) {
    if (typeof cfg.onError === 'function') cfg.onError(msg);
    else if (global.console) global.console.warn('[PuddingLogin] ' + msg);
  }

  function parse(text) {
    try {
      return JSON.parse(text);
    } catch (e) {
      return null;
    }
  }

  function requestList(done) {
    var url = join(cfg.base, '/connect.php') + '?' + qs({
      act: 'sdk',
      appid: cfg.appid,
      redirect_uri: cfg.redirect_uri
    });
    var xhr = new XMLHttpRequest();
    var finish = false;
    var timer = setTimeout(function () {
      if (finish) return;
      finish = true;
      try { xhr.abort(); } catch (e) {}
      fail('请求超时，请检查网络或站点配置');
    }, 12000);
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4 || finish) return;
      finish = true;
      clearTimeout(timer);
      var data = parse(xhr.responseText);
      if (!data) {
        fail('接口返回异常，HTTP 状态 ' + xhr.status);
        return;
      }
      if (data.code !== 0) {
        fail(data.msg || '获取可用登录方式失败');
        return;
      }
      done(data.types || []);
    };
    xhr.send(null);
  }

  var STYLE = '.pl-wrap{display:flex;flex-wrap:wrap;gap:10px}'
    + '.pl-btn{display:inline-flex;align-items:center;gap:8px;border:1px solid rgba(0,0,0,.08);background:#fff;color:#1f2333;border-radius:12px;padding:10px 16px;font-size:14px;line-height:1;cursor:pointer;transition:transform .12s ease,box-shadow .12s ease;font-family:inherit;box-shadow:0 1px 2px rgba(16,20,40,.06)}'
    + '.pl-btn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(16,20,40,.12)}'
    + '.pl-btn[disabled]{opacity:.55;cursor:not-allowed;transform:none}'
    + '.pl-dot{width:8px;height:8px;border-radius:50%;flex:0 0 auto}'
    + '.pl-dark .pl-btn{background:#161a2b;color:#e9ecf8;border-color:rgba(255,255,255,.12)}'
    + '.pl-tip{font-size:12px;color:#8a8fab;margin-top:8px}';

  function injectStyle() {
    if (document.getElementById('pl-sdk-style')) return;
    var st = document.createElement('style');
    st.id = 'pl-sdk-style';
    st.appendChild(document.createTextNode(STYLE));
    (document.head || document.documentElement).appendChild(st);
  }

  function go(type) {
    var state = cfg.state || randState();
    try { global.sessionStorage.setItem('pl_state', state); } catch (e) {}
    var url = join(cfg.base, '/connect.php') + '?' + qs({
      act: 'sdk',
      appid: cfg.appid,
      type: type,
      redirect_uri: cfg.redirect_uri,
      state: state
    });
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      var data = parse(xhr.responseText);
      if (!data || data.code !== 0 || !data.url) {
        fail((data && data.msg) || '发起登录失败');
        return;
      }
      global.location.href = data.url;
    };
    xhr.send(null);
  }

  var PlLogin = {
    version: '1.0.0',
    init: function (options) {
      if (!options || !options.appid) {
        fail('缺少 appid');
        return PlLogin;
      }
      if (!options.redirect_uri) {
        fail('缺少 redirect_uri');
        return PlLogin;
      }
      cfg.appid = String(options.appid);
      cfg.redirect_uri = String(options.redirect_uri);
      if (options.base) cfg.base = String(options.base);
      if (options.state) cfg.state = String(options.state);
      if (options.theme) cfg.theme = String(options.theme);
      if (typeof options.onError === 'function') cfg.onError = options.onError;
      return PlLogin;
    },
    mount: function (selector) {
      injectStyle();
      var el = typeof selector === 'string' ? document.querySelector(selector) : selector;
      if (!el) {
        fail('未找到挂载节点：' + selector);
        return PlLogin;
      }
      if (cfg.theme === 'dark') el.className = (el.className || '') + ' pl-dark';
      var tip = document.createElement('div');
      tip.className = 'pl-tip';
      tip.textContent = '正在加载登录方式…';
      el.innerHTML = '';
      el.appendChild(tip);
      requestList(function (types) {
        if (!types.length) {
          tip.textContent = '暂无可用的登录方式，请先在后台开启并配置登录接口';
          return;
        }
        var wrap = document.createElement('div');
        wrap.className = 'pl-wrap';
        types.forEach(function (t) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'pl-btn';
          btn.setAttribute('data-type', t.type);
          var dot = document.createElement('span');
          dot.className = 'pl-dot';
          dot.style.background = t.color || '#8a8fab';
          var label = document.createElement('span');
          label.textContent = t.name || t.type;
          btn.appendChild(dot);
          btn.appendChild(label);
          btn.onclick = function () {
            var all = wrap.querySelectorAll('button');
            for (var i = 0; i < all.length; i++) all[i].disabled = true;
            go(t.type);
          };
          wrap.appendChild(btn);
        });
        el.innerHTML = '';
        el.appendChild(wrap);
      });
      return PlLogin;
    },
    open: function (type) {
      if (!cfg.appid || !cfg.redirect_uri) {
        fail('请先调用 PlLogin.init');
        return PlLogin;
      }
      go(type || 'qq');
      return PlLogin;
    },
    callback: function () {
      var search = global.location.search || '';
      if (search.charAt(0) === '?') search = search.slice(1);
      var out = {};
      if (search) {
        var parts = search.split('&');
        for (var i = 0; i < parts.length; i++) {
          var kv = parts[i];
          if (!kv) continue;
          var idx = kv.indexOf('=');
          var k = decodeURIComponent(idx < 0 ? kv : kv.slice(0, idx));
          var v = decodeURIComponent(idx < 0 ? '' : kv.slice(idx + 1));
          out[k] = v;
        }
      }
      if (!out.code || !out.type) return null;
      var saved = '';
      try { saved = global.sessionStorage.getItem('pl_state') || ''; } catch (e) { saved = ''; }
      if (saved && out.state && saved !== out.state) {
        fail('state 校验失败，可能存在 CSRF 风险');
      }
      return { type: out.type, code: out.code, state: out.state || '' };
    }
  };

  global.PlLogin = PlLogin;
})(window);
