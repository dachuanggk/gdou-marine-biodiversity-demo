/**
 * 物种信息管理模块 - 纯前端 Demo
 * 技术栈：Vue 3 + Element Plus (CDN) + localStorage
 */
(function () {
  const { ElMessage, ElMessageBox } = ElementPlus;

  // 诊断：收集 console 错误，渲染失败时展示在页面上
  const pageErrors = [];
  const origConsoleError = console.error;
  console.error = function (...args) {
    pageErrors.push(args.map((a) => (a && a.stack ? a.stack : String(a))).join(' '));
    origConsoleError.apply(console, args);
  };

  const conservationOptions = [
    { value: 'LC', label: '无危 (LC)' },
    { value: 'NT', label: '近危 (NT)' },
    { value: 'VU', label: '易危 (VU)' },
    { value: 'EN', label: '濒危 (EN)' },
    { value: 'CR', label: '极危 (CR)' },
    { value: 'EW', label: '野外灭绝 (EW)' },
    { value: 'EX', label: '灭绝 (EX)' }
  ];

  const protectionOptions = [
    { value: '一级', label: '国家一级保护' },
    { value: '二级', label: '国家二级保护' },
    { value: '三级', label: '国家三级保护' }
  ];

  const conservationLabelMap = Object.fromEntries(conservationOptions.map((c) => [c.value, c.label.split(' ')[0]]));

  function conservationTagType(v) {
    return { LC: 'info', NT: 'info', VU: 'warning', EN: 'danger', CR: 'danger', EW: 'danger', EX: 'danger' }[v] || 'info';
  }

  function protectionTagType(v) {
    return { 一级: 'danger', 二级: 'warning', 三级: 'info' }[v] || 'info';
  }

  const app = Vue.createApp({
    data() {
      return {
        speciesList: SpeciesStore.loadData(),
        filters: { keyword: '', conservation: '', protection: '' },
        page: 1,
        pageSize: 8,
        loading: false,
        // 新增 / 编辑
        dialogVisible: false,
        editingId: null,
        form: SpeciesStore.emptyForm(),
        formRules: {
          name: [{ required: true, message: '请输入物种名称', trigger: 'blur' }]
        },
        // 详情
        detailVisible: false,
        current: SpeciesStore.emptyForm(),
        conservationOptions,
        protectionOptions
      };
    },

    computed: {
      filteredList() {
        return SpeciesStore.filterSpecies(this.speciesList, this.filters);
      },
      total() {
        return this.filteredList.length;
      },
      paginatedList() {
        const start = (this.page - 1) * this.pageSize;
        return this.filteredList.slice(start, start + this.pageSize);
      },
      dialogTitle() {
        return this.editingId ? '编辑物种信息' : '新增物种信息';
      }
    },

    watch: {
      speciesList: {
        handler(val) {
          SpeciesStore.saveData(val);
        },
        deep: true
      }
    },

    methods: {
      resetPage() {
        this.page = 1;
      },
      resetFilters() {
        this.filters = { keyword: '', conservation: '', protection: '' };
        this.resetPage();
      },

      openCreate() {
        this.editingId = null;
        this.form = SpeciesStore.emptyForm();
        this.dialogVisible = true;
      },
      openEdit(row) {
        this.editingId = row.id;
        this.form = Object.assign({}, SpeciesStore.emptyForm(), row);
        this.dialogVisible = true;
      },
      submitForm() {
        this.$refs.formRef.validate((valid) => {
          if (!valid) return;
          if (this.editingId) {
            SpeciesStore.updateSpecies(this.speciesList, this.editingId, this.form);
            ElMessage.success('修改成功');
          } else {
            SpeciesStore.createSpecies(this.speciesList, this.form);
            ElMessage.success('新增成功');
          }
          this.dialogVisible = false;
          this.resetPage();
        });
      },

      viewDetail(row) {
        this.current = row;
        this.detailVisible = true;
      },

      removeSpecies(row) {
        ElMessageBox.confirm(
          `确定要删除「${row.name}」吗？删除后不可恢复。`,
          '删除确认',
          { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' }
        )
          .then(() => {
            SpeciesStore.deleteSpecies(this.speciesList, row.id);
            ElMessage.success(`已删除「${row.name}」`);
          })
          .catch(() => {});
      },

      handleImageChange(uploadFile) {
        const file = uploadFile.raw;
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
          this.form.image = e.target.result;
        };
        reader.readAsDataURL(file);
      },

      conservationLabel(v) {
        return conservationLabelMap[v] || v || '-';
      },
      conservationTagType,
      protectionTagType
    }
  });

  app.use(ElementPlus, { locale: ElementPlusLocaleZhCn });

  try {
    app.mount('#app');
  } catch (e) {
    const lines = [
      '=== 页面渲染失败 ===',
      'Message: ' + (e && e.message ? e.message : String(e)),
      e && e.loc ? '位置: ' + JSON.stringify(e.loc) : '',
      e && e.stack ? e.stack : '',
      '--- 已捕获的 console 错误 ---',
      pageErrors.join('\n---\n')
    ].filter(Boolean);
    const el = document.getElementById('app');
    if (el) {
      el.innerHTML =
        '<div style="margin:24px;padding:20px;background:#fff;border:1px solid #f56c6c;border-radius:8px;font-family:Consolas,monospace;font-size:13px;line-height:1.7;white-space:pre-wrap;color:#303133">' +
        '<h3 style="color:#f56c6c;margin:0 0 12px">⚠️ 页面渲染失败</h3>' +
        '<pre style="margin:0">' +
        lines.join('\n\n').replace(/&/g, '&amp;').replace(/</g, '&lt;') +
        '</pre></div>';
    }
    throw e;
  }
})();
