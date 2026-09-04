/**
 * 登录 / 注册页逻辑（模块一）
 */
(function () {
  const { ElMessage } = ElementPlus;

  function todayStr() {
    const d = new Date();
    const p = (n) => (n < 10 ? '0' + n : '' + n);
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  const app = Vue.createApp({
    data() {
      return {
        tab: 'login',
        loading: false,
        loginForm: { username: '', password: '' },
        loginRules: {
          username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
          password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
        },
        regForm: { username: '', nickname: '', email: '', role: 'student', password: '' },
        regRules: {
          username: [
            { required: true, message: '请输入用户名', trigger: 'blur' },
            { pattern: /^[a-zA-Z0-9_]{3,16}$/, message: '3-16位字母/数字/下划线', trigger: 'blur' }
          ],
          nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
          password: [{ required: true, message: '请输入密码', trigger: 'blur' }, { min: 6, message: '至少6位', trigger: 'blur' }]
        },
        quickAccounts: [
          { username: 'admin', label: '管理员', desc: '全部权限' },
          { username: 'teacher', label: '科研人员', desc: '数据管理' },
          { username: 'student', label: '学生', desc: '查询学习' },
          { username: 'public', label: '公众', desc: '公开浏览' }
        ]
      };
    },
    computed: {
      ret() {
        const p = new URLSearchParams(location.search);
        return p.get('ret') || 'index.html';
      }
    },
    methods: {
      doLogin() {
        this.$refs.loginRef.validate((valid) => {
          if (!valid) return;
          this.loading = true;
          const r = Auth.login(this.loginForm.username, this.loginForm.password);
          this.loading = false;
          if (r.ok) {
            ElMessage.success('欢迎回来，' + r.user.nickname);
            setTimeout(() => { location.href = this.ret; }, 700);
          } else {
            ElMessage.error(r.msg);
          }
        });
      },
      quickLogin(acc) {
        const r = Auth.login(acc.username, '123456');
        if (r.ok) {
          ElMessage.success('已以「' + r.user.nickname + '」身份进入系统');
          setTimeout(() => { location.href = this.ret; }, 600);
        } else {
          ElMessage.error(r.msg);
        }
      },
      doRegister() {
        this.$refs.regRef.validate((valid) => {
          if (!valid) return;
          const users = UserStore.load();
          if (users.some((u) => u.username === this.regForm.username)) {
            ElMessage.warning('该用户名已被注册');
            return;
          }
          UserStore.create(users, {
            username: this.regForm.username,
            nickname: this.regForm.nickname,
            email: this.regForm.email,
            role: this.regForm.role,
            password: this.regForm.password,
            status: 'pending',
            createdAt: todayStr()
          });
          SpeciesLog.addLog('注册申请', this.regForm.username + ' 提交注册申请（' + (ROLE_LABELS[this.regForm.role] || this.regForm.role) + '）');
          ElMessage.success('注册申请已提交，请等待管理员审核通过后登录');
          this.tab = 'login';
          this.regForm = { username: '', nickname: '', email: '', role: 'student', password: '' };
        });
      }
    }
  });

  app.use(ElementPlus, { locale: ElementPlusLocaleZhCn });
  app.mount('#login-app');
})();
