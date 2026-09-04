/**
 * 观测记录管理页逻辑（模块三b）
 * 记录关联生态系 + 环境参数 + 观测物种（物种/数量/行为）
 * 已登录可浏览，科研人员/管理员可新增、编辑、删除
 */
(function () {
  const { ElMessage, ElMessageBox } = ElementPlus;

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function emptyObs() {
    return {
      ecoId: '',
      date: todayStr(),
      longitude: '',
      latitude: '',
      observer: '',
      temp: null,
      salinity: null,
      depth: null,
      speciesSeen: [],
      remark: ''
    };
  }

  const app = Vue.createApp({
    data() {
      const me = Auth.guard();
      return {
        me,
        speciesList: SpeciesStore.loadData(),
        ecoList: EcoStore.load(),
        obsList: ObsStore.load(),
        filterEcoId: '',
        keyword: '',
        page: 1,
        pageSize: 6,
        dialogVisible: false,
        editingId: null,
        form: emptyObs(),
        formRules: {
          ecoId: [{ required: true, message: '请选择所属生态系统', trigger: 'change' }],
          date: [{ required: true, message: '请选择观测日期', trigger: 'change' }]
        }
      };
    },
    computed: {
      canManage() {
        return Auth.canManage();
      },
      speciesOptions() {
        return this.speciesList.slice().sort((a, b) => a.name.localeCompare(b.name, 'zh'));
      },
      filteredList() {
        const kw = (this.keyword || '').trim().toLowerCase();
        return this.obsList.filter((o) => {
          if (this.filterEcoId && o.ecoId !== this.filterEcoId) return false;
          if (kw) {
            const seenNames = (o.speciesSeen || [])
              .map((x) => this.speciesName(x.speciesId))
              .join(' ');
            const hay = [o.observer || '', o.remark || '', o.date, seenNames].join(' ').toLowerCase();
            if (!hay.includes(kw)) return false;
          }
          return true;
        });
      },
      paginatedList() {
        const start = (this.page - 1) * this.pageSize;
        return this.filteredList.slice(start, start + this.pageSize);
      },
      dialogTitle() {
        return this.editingId ? '编辑观测记录' : '新增观测记录';
      },
      stats() {
        const ecos = new Set();
        const sp = new Set();
        const obsr = new Set();
        this.obsList.forEach((o) => {
          if (o.ecoId != null) ecos.add(o.ecoId);
          (o.speciesSeen || []).forEach((x) => sp.add(x.speciesId));
          if (o.observer) obsr.add(o.observer);
        });
        return { total: this.obsList.length, ecos: ecos.size, species: sp.size, observers: obsr.size };
      }
    },
    mounted() {
      Auth.renderNav('topnav-host', 'observations');
    },
    methods: {
      speciesName(id) {
        const s = this.speciesList.find((x) => x.id === id);
        return s ? s.name : '';
      },
      speciesText(id) {
        const s = this.speciesList.find((x) => x.id === id);
        if (!s) return '物种#' + id + '（已删除）';
        return s.scientificName ? s.name + '（' + s.scientificName + '）' : s.name;
      },
      ecoById(id) {
        return this.ecoList.find((x) => x.id === id);
      },
      ecoName(id) {
        const e = this.ecoById(id);
        return e ? e.name : '未知生态系统';
      },
      ecoType(id) {
        const e = this.ecoById(id);
        return e ? e.type : '';
      },
      typeTag(t) {
        return { 造礁珊瑚礁: 'danger', 红树林: 'success', 海草床: 'warning', 深海: 'info', 滩涂湿地: '', 河口湿地: '' }[t] || '';
      },
      resetPage() {
        this.page = 1;
      },
      openCreate() {
        this.editingId = null;
        this.form = emptyObs();
        if (this.me) {
          this.form.observer = this.me.nickname;
          if (this.ecoList.length) this.form.ecoId = this.ecoList[0].id;
        }
        this.dialogVisible = true;
      },
      openEdit(row) {
        this.editingId = row.id;
        const base = Object.assign({}, emptyObs(), row);
        base.speciesSeen = (row.speciesSeen || []).map((s) => ({
          speciesId: s.speciesId,
          count: s.count == null ? 0 : s.count,
          behavior: s.behavior || ''
        }));
        this.form = base;
        this.dialogVisible = true;
      },
      addSpeciesRow() {
        const used = this.form.speciesSeen.map((s) => s.speciesId);
        const first = this.speciesOptions.find((x) => !used.includes(x.id));
        this.form.speciesSeen.push({ speciesId: first ? first.id : '', count: 1, behavior: '' });
      },
      removeSpeciesRow(idx) {
        this.form.speciesSeen.splice(idx, 1);
      },
      submitForm() {
        this.$refs.formRef.validate((valid) => {
          if (!valid) return;
          const rows = this.form.speciesSeen
            .filter((s) => s.speciesId)
            .map((s) => ({ speciesId: s.speciesId, count: Number(s.count) || 0, behavior: (s.behavior || '').trim() }));
          const payload = {
            ecoId: this.form.ecoId,
            date: this.form.date,
            longitude: this.form.longitude,
            latitude: this.form.latitude,
            observer: this.form.observer,
            temp: this.form.temp == null ? null : Number(this.form.temp),
            salinity: this.form.salinity == null ? null : Number(this.form.salinity),
            depth: this.form.depth == null ? null : Number(this.form.depth),
            speciesSeen: rows,
            remark: this.form.remark
          };
          if (this.editingId) {
            ObsStore.update(this.obsList, this.editingId, payload);
            ElMessage.success('已保存修改');
            SpeciesLog.addLog('编辑观测记录', this.me.username + ' 修改 ' + this.ecoName(payload.ecoId) + ' ' + payload.date + ' 的观测记录');
          } else {
            const item = ObsStore.create(this.obsList, Object.assign({}, payload, { createdAt: todayStr() }));
            ElMessage.success('观测记录已保存（记录到 ' + rows.length + ' 种物种）');
            SpeciesLog.addLog('新增观测记录', this.me.username + ' 录入 ' + this.ecoName(payload.ecoId) + ' ' + item.date + ' 观测，物种 ' + rows.length + ' 种');
          }
          this.dialogVisible = false;
          this.resetPage();
        });
      },
      removeObs(row) {
        ElMessageBox.confirm('确定删除 ' + row.date + ' 在「' + this.ecoName(row.ecoId) + '」的观测记录吗？删除后不可恢复。', '删除确认', {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning'
        })
          .then(() => {
            ObsStore.remove(this.obsList, row.id);
            ElMessage.success('已删除该观测记录');
            SpeciesLog.addLog('删除观测记录', '删除 ' + this.ecoName(row.ecoId) + ' ' + row.date + ' 的观测记录');
          })
          .catch(() => {});
      }
    }
  });

  app.use(ElementPlus, { locale: ElementPlusLocaleZhCn });
  app.mount('#app');
})();
