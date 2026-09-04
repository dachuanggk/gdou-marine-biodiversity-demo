/**
 * 模块一：登录会话、角色权限、顶部导航、页面守卫。
 * 依赖：seed.js(ROLE_LABELS)、store.js(UserStore/SpeciesLog)。
 * 依赖顺序：seed → store → auth
 */
(function (global) {
  const SESSION_KEY = 'mbis_session_v1';

  function currentUser() {
    try {
      const uname = localStorage.getItem(SESSION_KEY);
      if (!uname) return null;
      const users = UserStore.load();
      return users.find((u) => u.username === uname && u.status === 'active') || null;
    } catch (e) {
      return null;
    }
  }

  function login(username, password) {
    const users = UserStore.load();
    const user = users.find((u) => u.username === (username || '').trim());
    if (!user || user.password !== (password || '')) return { ok: false, msg: '用户名或密码错误' };
    if (user.status === 'pending') return { ok: false, msg: '账号正在等待管理员审核，暂不能登录' };
    if (user.status === 'disabled') return { ok: false, msg: '账号已被禁用，请联系管理员' };
    try { localStorage.setItem(SESSION_KEY, user.username); } catch (e) { /* 忽略 */ }
    SpeciesLog.addLog('登录系统', user.username + ' 登录系统');
    return { ok: true, user };
  }

  function logout() {
    const u = currentUser();
    if (u) SpeciesLog.addLog('退出登录', u.username + ' 退出系统');
    try { localStorage.removeItem(SESSION_KEY); } catch (e) { /* 忽略 */ }
  }

  function isAdmin() {
    const u = currentUser();
    return !!(u && u.role === 'admin');
  }

  /** 管理员与科研人员可进行数据录入 / 维护 */
  function canManage() {
    const u = currentUser();
    return !!(u && (u.role === 'admin' || u.role === 'researcher'));
  }

  function hasRole(roles) {
    const u = currentUser();
    return !!u && roles.includes(u.role);
  }

  const NAV_ITEMS = [
    { key: 'species', label: '物种信息', href: 'index.html' },
    { key: 'ecosystems', label: '生态系统', href: 'ecosystems.html' },
    { key: 'observations', label: '观测记录', href: 'observations.html' },
    { key: 'dashboard', label: '数据看板', href: 'dashboard.html' },
    { key: 'users', label: '用户管理', href: 'users.html', adminOnly: true }
  ];

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /**
   * 向页面顶部注入导航栏。
   * @param mountId 放置导航的容器 id（body 顶部预留 <div id="topnav-host"></div>）
   * @param activeKey 当前高亮的模块 key
   */
  function renderNav(mountId, activeKey) {
    const el = document.getElementById(mountId);
    if (!el) return;
    const user = currentUser();
    const items = NAV_ITEMS.filter((n) => !n.adminOnly || (user && user.role === 'admin'));
    const itemHtml = items
      .map((n) =>
        '<a class="tn-item' + (n.key === activeKey ? ' tn-active' : '') + '" href="' + n.href + '">' + n.label + '</a>'
      )
      .join('');

    let rightHtml;
    if (user) {
      rightHtml =
        '<div class="tn-right">' +
        '<span class="tn-user">' + escapeHtml(user.nickname) + '<em>' + (ROLE_LABELS[user.role] || user.role) + '</em></span>' +
        '<a class="tn-logout" href="login.html" onclick="Auth.logout()">退出登录</a>' +
        '</div>';
    } else {
      rightHtml = '<div class="tn-right"><a class="tn-login-btn" href="login.html">登录 / 注册</a></div>';
    }

    el.innerHTML =
      '<div class="topnav">' +
      '<div class="tn-logo">🌊 海洋生物多样性信息管理系统</div>' +
      '<nav class="tn-nav">' + itemHtml + '</nav>' +
      rightHtml +
      '</div>';
  }

  /**
   * 页面守卫：未登录跳转登录页；角色不满足时跳回主页。
   * @param allowRoles 允许访问的角色数组；null/空 表示已登录即可
   */
  function guard(allowRoles) {
    const user = currentUser();
    if (!user) {
      location.replace('login.html?ret=' + encodeURIComponent(location.href));
      return null;
    }
    if (allowRoles && allowRoles.length && !allowRoles.includes(user.role)) {
      alert('当前账号「' + user.nickname + '」无权访问该页面，仅限 ' +
        allowRoles.map((r) => ROLE_LABELS[r] || r).join('、') + ' 使用。');
      location.replace('index.html');
      return null;
    }
    return user;
  }

  global.Auth = { currentUser, login, logout, isAdmin, canManage, hasRole, renderNav, guard };
})(window);
