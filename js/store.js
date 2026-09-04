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
})(window);
