/**
 * 用户与权限管理页（模块一，仅管理员）
 */
(function () {
  const { ElMessage, ElMessageBox } = ElementPlus;

  const app = Vue.createApp({
    data() {
      const me = Auth.guard(['admin']);
      return {
        me,
        tab: 'users',
        filterRole: '',
        filterStatus: '',
        users: [],
        logs: [],
        roleLabels: ROLE_LABELS,
        roleVisible: false,
        roleEditUser: {},
        roleEditVal: ''
      };
    },
    computed: {
      stats() {
        return {
          total: this.users.length,
          pending: this.users.filter((u) => u.status === 'pending').length,
          researcher: this.users.filter((u) => u.role === 'researcher').length
        };
      },
      filteredUsers() {
        return this.users.filter((u) => {
          if (this.filterRole && u.role !== this.filterRole) return false;
          if (this.filterStatus && u.status !== this.filterStatus) return false;
          return true;
        });
      }
    },
    mounted() {
      this.loadUsers();
      this.loadLogs();
      Auth.renderNav('topnav-host', 'users');
    },
    methods: {
      roleClass(r) { return r; },
      roleClassForLabel(label) {
        const k = Object.keys(ROLE_LABELS).find((x) => ROLE_LABELS[x] === label);
        return k || '';
      },
      loadUsers() { this.users = UserStore.load(); },
      loadLogs() { this.logs = SpeciesLog.loadLogs(); },

      audit(row, pass) {
        const who = row.nickname + '（' + row.username + '）';
        if (pass) {
          UserStore.update(this.users, row.id, { status: 'active' });
          ElMessage.success('已通过「' + who + '」的注册申请');
          SpeciesLog.addLog('账号审核', '管理员审核通过 ' + row.username + ' 的注册申请');
        } else {
          ElMessageBox.confirm('确定拒绝并删除「' + who + '」的申请吗？', '拒绝申请', { type: 'warning' })
            .then(() => {
              UserStore.remove(this.users, row.id);
              ElMessage.info('已拒绝该注册申请');
              SpeciesLog.addLog('账号审核', '管理员拒绝 ' + row.username + ' 的注册申请');
            })
            .catch(() => {});
        }
      },
      toggleStatus(row) {
        if (row.username === this.me.username) {
          ElMessage.warning('不能禁用当前登录账号');
          return;
        }
        const next = row.status === 'active' ? 'disabled' : 'active';
        UserStore.update(this.users, row.id, { status: next });
        ElMessage.success(next === 'active' ? '已启用「' + row.nickname + '」' : '已禁用「' + row.nickname + '」');
        SpeciesLog.addLog(next === 'active' ? '启用账号' : '禁用账号', row.username + (next === 'active' ? ' 被启用' : ' 被禁用'));
      },
      openRoleEdit(row) {
        if (row.username === this.me.username) {
          ElMessage.warning('不能修改自己的角色');
          return;
        }
        this.roleEditUser = row;
        this.roleEditVal = row.role;
        this.roleVisible = true;
      },
      saveRole() {
        if (!this.roleEditVal) return;
        UserStore.update(this.users, this.roleEditUser.id, { role: this.roleEditVal });
        ElMessage.success('已更新角色');
        SpeciesLog.addLog('修改角色', this.roleEditUser.username + ' 角色调整为 ' + (ROLE_LABELS[this.roleEditVal] || this.roleEditVal));
        this.roleVisible = false;
      },
      removeUser(row) {
        if (row.username === this.me.username) {
          ElMessage.warning('不能删除当前登录账号');
          return;
        }
        ElMessageBox.confirm('确定删除用户「' + row.nickname + '」吗？', '删除确认', { type: 'warning' })
          .then(() => {
            UserStore.remove(this.users, row.id);
            ElMessage.success('已删除用户');
            SpeciesLog.addLog('删除用户', '管理员删除用户 ' + row.username);
          })
          .catch(() => {});
      },
      clearLogs() {
        ElMessageBox.confirm('确定清空全部操作日志吗？', '清空日志', { type: 'warning' })
          .then(() => {
            SpeciesLog.clearLogs();
            this.loadLogs();
            ElMessage.success('日志已清空');
          })
          .catch(() => {});
      }
    }
  });

  app.use(ElementPlus, { locale: ElementPlusLocaleZhCn });
  app.mount('#app');
})();
