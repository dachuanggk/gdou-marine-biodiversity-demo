/**
 * 生态系统管理页逻辑（模块三a）
 * 已登录可浏览，科研人员/管理员可新增、编辑、删除
 */
(function () {
  const { ElMessage, ElMessageBox } = ElementPlus;

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }
  function emptyEco() {
    return { name: '', type: '', location: '', longitude: '', latitude: '', area: 0, description: '', owner: '' };
  }

  const app = Vue.createApp({
    data() {
      const me = Auth.guard();
      return {
        me,
        users: UserStore.load(),
        ecoList: EcoStore.load(),
        obsList: ObsStore.load(),
        typeOptions: ECOSYSTEM_TYPES.slice(),
        filterType: '',
        keyword: '',
        page: 1,
        pageSize: 6,
        dialogVisible: false,
        editingId: null,
        form: emptyEco(),
        formRules: {
          name: [{ required: true, message: '请输入生态系统名称', trigger: 'blur' }],
          type: [{ required: true, message: '请选择生态类型', trigger: 'change' }],
          location: [{ required: true, message: '请输入所在位置', trigger: 'blur' }]
        }
      };
    },
    computed: {
      canManage() {
        return Auth.canManage();
      },
      filteredList() {
        const kw = (this.keyword || '').trim().toLowerCase();
        return this.ecoList.filter((e) => {
          if (this.filterType && e.type !== this.filterType) return false;
          if (kw) {
            const hay = [e.name, e.location, e.description || '', e.type || ''].join(' ').toLowerCase();
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
        return this.editingId ? '编辑生态系统' : '新增生态系统';
      },
      stats() {
        const area = this.ecoList.reduce((s, e) => s + (Number(e.area) || 0), 0);
        const ids = new Set();
        this.obsList.forEach((o) => (o.speciesSeen || []).forEach((x) => ids.add(x.speciesId)));
        return {
          total: this.ecoList.length,
          area: Math.round(area),
          obs: this.obsList.length,
          species: ids.size
        };
      }
    },
    mounted() {
      Auth.renderNav('topnav-host', 'ecosystems');
    },
    methods: {
      typeTag(t) {
        return { 造礁珊瑚礁: 'danger', 红树林: 'success', 海草床: 'warning', 深海: 'info', 滩涂湿地: '', 河口湿地: '' }[t] || '';
      },
      ecoObs(row) {
        return this.obsList.filter((o) => o.ecoId === row.id);
      },
      ecoObsCount(row) {
        return this.ecoObs(row).length;
      },
      ecoSpeciesCount(row) {
        const ids = new Set();
        this.ecoObs(row).forEach((o) => (o.speciesSeen || []).forEach((x) => ids.add(x.speciesId)));
        return ids.size;
      },
      ownerName(username) {
        if (!username) return '-';
        const u = this.users.find((x) => x.username === username);
        return u ? u.nickname + '（' + username + '）' : username;
      },
      resetPage() {
        this.page = 1;
      },
      openCreate() {
        this.editingId = null;
        this.form = emptyEco();
        this.dialogVisible = true;
      },
      openEdit(row) {
        this.editingId = row.id;
        this.form = Object.assign({}, emptyEco(), row);
        this.dialogVisible = true;
      },
      submitForm() {
        this.$refs.formRef.validate((valid) => {
          if (!valid) return;
          const exist = this.editingId ? this.ecoList.find((x) => x.id === this.editingId) : null;
          const payload = {
            name: this.form.name,
            type: this.form.type,
            location: this.form.location,
            longitude: this.form.longitude,
            latitude: this.form.latitude,
            area: this.form.area == null ? 0 : Number(this.form.area),
            description: this.form.description,
            owner: exist && exist.owner ? exist.owner : (this.me ? this.me.username : '')
          };
          if (this.editingId) {
            EcoStore.update(this.ecoList, this.editingId, payload);
            ElMessage.success('已保存修改');
            SpeciesLog.addLog('编辑生态系统', '修改生态系统「' + payload.name + '」信息');
          } else {
            const item = EcoStore.create(this.ecoList, Object.assign({}, payload, { createdAt: todayStr() }));
            ElMessage.success('已新增生态系统「' + item.name + '」');
            SpeciesLog.addLog('新增生态系统', '录入生态系统 ' + item.name + '（' + item.type + '）');
          }
          this.dialogVisible = false;
          this.resetPage();
        });
      },
      removeEco(row) {
        const n = this.ecoObsCount(row);
        const tip = n > 0 ? '该生态系统下存在 ' + n + ' 条观测记录，删除后这些记录将保留但失去生态关联。' : '删除后不可恢复。';
        ElMessageBox.confirm('确定删除生态系统「' + row.name + '」吗？' + tip, '删除确认', {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning'
        })
          .then(() => {
            EcoStore.remove(this.ecoList, row.id);
            ElMessage.success('已删除「' + row.name + '」');
            SpeciesLog.addLog('删除生态系统', '删除生态系统 ' + row.name);
          })
          .catch(() => {});
      }
    }
  });

  app.use(ElementPlus, { locale: ElementPlusLocaleZhCn });
  app.mount('#app');
})();
