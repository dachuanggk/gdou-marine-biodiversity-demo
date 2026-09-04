/**
 * 数据层：localStorage 读写 + 纯增删改查逻辑。
 * 与 UI 解耦，可在 test.html 中直接单元测试。
 */
(function (global) {
  const STORAGE_KEY = 'species_mgmt_demo_v3';

  function emptyForm() {
    return {
      name: '',
      scientificName: '',
      alias: '',
      kingdom: '',
      phylum: '',
      classLevel: '',
      order: '',
      family: '',
      genus: '',
      speciesName: '',
      conservationStatus: '',
      protectionLevel: '',
      distribution: '',
      longitude: '',
      latitude: '',
      habitat: '',
      diet: '',
      behavior: '',
      reproduction: '',
      features: '',
      remark: '',
      videoUrl: '',
      reference: '',
      image: ''
    };
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn('读取本地数据失败，使用演示数据', e);
    }
    return SEED_SPECIES.slice();
  }

  function saveData(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      console.warn('保存本地数据失败', e);
      return false;
    }
  }

  function createSpecies(list, obj) {
    const item = Object.assign(emptyForm(), obj, { id: Date.now() });
    list.unshift(item);
    saveData(list);
    return item;
  }

  function updateSpecies(list, id, obj) {
    const idx = list.findIndex((x) => x.id === id);
    if (idx === -1) return false;
    list[idx] = Object.assign({}, emptyForm(), list[idx], obj, { id });
    saveData(list);
    return true;
  }

  function deleteSpecies(list, id) {
    const idx = list.findIndex((x) => x.id === id);
    if (idx === -1) return false;
    list.splice(idx, 1);
    saveData(list);
    return true;
  }

  function filterSpecies(list, filters) {
    const f = filters || {};
    const kw = (f.keyword || '').trim().toLowerCase();
    return list.filter((s) => {
      if (kw) {
        const haystack = [s.name, s.scientificName, s.alias, s.family, s.genus].join(' ').toLowerCase();
        if (!haystack.includes(kw)) return false;
      }
      if (f.conservation && s.conservationStatus !== f.conservation) return false;
      if (f.protection && s.protectionLevel !== f.protection) return false;
      return true;
    });
  }

  global.SpeciesStore = {
    STORAGE_KEY,
    emptyForm,
    loadData,
    saveData,
    createSpecies,
    updateSpecies,
    deleteSpecies,
    filterSpecies
  };

  // ============ 通用集合数据层（模块一 / 模块三） ============
  function makeCollection(key, seed) {
    function load() {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const p = JSON.parse(raw);
          if (Array.isArray(p)) return p;
        }
      } catch (e) { /* 使用种子数据 */ }
      return seed.slice();
    }
    function save(list) {
      try { localStorage.setItem(key, JSON.stringify(list)); return true; }
      catch (e) { console.warn('保存本地数据失败', key, e); return false; }
    }
    function create(list, obj) {
      const item = Object.assign({}, obj, { id: Date.now() });
      list.unshift(item);
      save(list);
      return item;
    }
    function update(list, id, obj) {
      const i = list.findIndex((x) => x.id === id);
      if (i < 0) return false;
      list[i] = Object.assign({}, list[i], obj, { id });
      save(list);
      return true;
    }
    function remove(list, id) {
      const i = list.findIndex((x) => x.id === id);
      if (i < 0) return false;
      list.splice(i, 1);
      save(list);
      return true;
    }
    return { KEY: key, load, save, create, update, remove };
  }

  const UserStore = makeCollection('mbis_users_v1', SEED_USERS);
  const EcoStore = makeCollection('mbis_ecosystems_v1', SEED_ECOSYSTEMS);
  const ObsStore = makeCollection('mbis_observations_v1', SEED_OBSERVATIONS);

  // ============ 操作日志（模块一） ============
  const LOG_KEY = 'mbis_logs_v1';

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }

  function nowStr() {
    const d = new Date();
    return (
      d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds())
    );
  }

  function loadLogs() {
    try {
      const raw = localStorage.getItem(LOG_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* 空日志 */ }
    return [];
  }

  function addLog(action, detail) {
    const logs = loadLogs();
    const u = global.Auth ? global.Auth.currentUser() : null;
    logs.unshift({
      id: Date.now(),
      time: nowStr(),
      username: u ? u.username : '-',
      role: u ? (ROLE_LABELS[u.role] || u.role) : '未登录',
      action,
      detail: detail || ''
    });
    try { localStorage.setItem(LOG_KEY, JSON.stringify(logs)); } catch (e) { /* 忽略 */ }
    return logs;
  }

  function clearLogs() {
    try { localStorage.removeItem(LOG_KEY); } catch (e) { /* 忽略 */ }
  }

  global.UserStore = UserStore;
  global.EcoStore = EcoStore;
  global.ObsStore = ObsStore;
  global.SpeciesLog = { loadLogs, addLog, clearLogs };
})(window);
