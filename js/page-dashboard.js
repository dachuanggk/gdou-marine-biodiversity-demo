/**
 * 数据可视化与报表页逻辑（模块四）
 * ECharts 统计：门类组成、濒危/保护等级、各生态系观测数、观测点位分布；CSV 导出
 */
(function () {
  const { ElMessage } = ElementPlus;

  const PALETTE = ['#5B8FF9', '#61DDAA', '#65789B', '#F6BD16', '#7262FD', '#78D3F8', '#9661BC', '#F6903D', '#008685', '#F08BB4'];
  const CONS_COLORS = { LC: '#909399', NT: '#67c23a', VU: '#e6a23c', EN: '#f56c6c', CR: '#c0392b', EW: '#34495e', EX: '#2c3e50' };
  const PRO_COLORS = { 一级: '#f56c6c', 二级: '#e6a23c', 三级: '#409eff' };

  const app = Vue.createApp({
    data() {
      const me = Auth.guard();
      return { me, speciesList: [], ecoList: [], obsList: [] };
    },
    computed: {
      stats() {
        const threatened = this.speciesList.filter((s) => ['VU', 'EN', 'CR'].includes(s.conservationStatus)).length;
        return {
          species: this.speciesList.length,
          ecos: this.ecoList.length,
          obs: this.obsList.length,
          threatened
        };
      }
    },
    mounted() {
      Auth.renderNav('topnav-host', 'dashboard');
      this.reload();
    },
    beforeUnmount() {
      window.removeEventListener('resize', this.resizeCharts);
      Object.keys(this.charts).forEach((k) => this.charts[k] && this.charts[k].dispose());
    },
    methods: {
      reload() {
        this.speciesList = SpeciesStore.loadData();
        this.ecoList = EcoStore.load();
        this.obsList = ObsStore.load();
        this.$nextTick(() => this.initCharts());
      },
      ecoName(id) {
        const e = this.ecoList.find((x) => x.id === id);
        return e ? e.name : '未知生态系统';
      },

      initCharts() {
        this.charts = {};
        const refs = ['chartPhylum', 'chartCons', 'chartEco', 'chartPro', 'chartMap'];
        refs.forEach((r) => {
          const el = this.$refs[r];
          if (!el) return;
          if (this.charts[r]) this.charts[r].dispose();
          this.charts[r] = echarts.init(el);
        });
        window.removeEventListener('resize', this.resizeCharts);
        window.addEventListener('resize', this.resizeCharts);
        this.renderCharts();
      },
      resizeCharts() {
        Object.keys(this.charts).forEach((k) => this.charts[k] && this.charts[k].resize());
      },

      // ---------- 图表构建 ----------
      renderCharts() {
        const baseTooltip = { trigger: 'item' };
        // 1. 门类组成（环形）
        const phylum = {};
        this.speciesList.forEach((s) => {
          const k = s.phylum || '未分类';
          phylum[k] = (phylum[k] || 0) + 1;
        });
        const phylumData = Object.keys(phylum).map((k) => ({ name: k, value: phylum[k] }))
          .sort((a, b) => b.value - a.value);
        this.setChart('chartPhylum', {
          tooltip: baseTooltip,
          legend: { bottom: 0, type: 'scroll', icon: 'circle', itemWidth: 8 },
          color: PALETTE,
          series: [{
            name: '物种数',
            type: 'pie',
            radius: ['42%', '68%'],
            center: ['50%', '44%'],
            avoidLabelOverlap: true,
            itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 1 },
            label: { formatter: '{b}\n{c} 种' },
            data: phylumData.length ? phylumData : [{ name: '暂无数据', value: 1, itemStyle: { color: '#e5e8ec' } }]
          }]
        });

        // 2. 濒危等级（柱状）
        const consKeys = ['LC', 'NT', 'VU', 'EN', 'CR', 'EW', 'EX'];
        const consLabels = { LC: '无危 LC', NT: '近危 NT', VU: '易危 VU', EN: '濒危 EN', CR: '极危 CR', EW: '野外灭绝 EW', EX: '灭绝 EX' };
        const consData = consKeys.map((k) => {
          const n = this.speciesList.filter((s) => s.conservationStatus === k).length;
          return { name: consLabels[k], value: n, itemStyle: { color: CONS_COLORS[k] || '#909399' } };
        }).filter((d) => d.value > 0);
        const allCons = this.speciesList.filter((s) => !consKeys.includes(s.conservationStatus)).length;
        if (allCons > 0) consData.push({ name: '未评估', value: allCons, itemStyle: { color: '#d0d3d6' } });
        this.setChart('chartCons', {
          tooltip: Object.assign({}, baseTooltip, { trigger: 'axis' }),
          grid: { left: 44, right: 20, top: 20, bottom: 40 },
          xAxis: { type: 'category', data: consData.map((d) => d.name), axisLabel: { rotate: 30 } },
          yAxis: { type: 'value', minInterval: 1, name: '物种数' },
          series: [{ name: '物种数', type: 'bar', barWidth: '46%', data: consData, label: { show: true, position: 'top' } }]
        });

        // 3. 各生态系统观测记录数（柱状）
        const ecoCounts = {};
        this.obsList.forEach((o) => {
          const k = this.ecoName(o.ecoId);
          ecoCounts[k] = (ecoCounts[k] || 0) + 1;
        });
        const ecoNames = Object.keys(ecoCounts).sort((a, b) => ecoCounts[b] - ecoCounts[a]);
        this.setChart('chartEco', {
          tooltip: Object.assign({}, baseTooltip, { trigger: 'axis' }),
          grid: { left: 44, right: 20, top: 24, bottom: 70 },
          xAxis: { type: 'category', data: ecoNames.length ? ecoNames : ['暂无数据'], axisLabel: { rotate: 28, width: 90, overflow: 'truncate' } },
          yAxis: { type: 'value', minInterval: 1, name: '观测次数' },
          series: [{
            name: '观测次数',
            type: 'bar',
            barWidth: '40%',
            data: ecoNames.map((n) => ecoCounts[n]),
            itemStyle: { color: '#5B8FF9', borderRadius: [5, 5, 0, 0] }
          }]
        });

        // 4. 保护等级（柱状）
        const proData = ['一级', '二级', '三级'].map((k) => {
          const n = this.speciesList.filter((s) => s.protectionLevel === k).length;
          return { name: k, value: n, itemStyle: { color: PRO_COLORS[k] } };
        });
        this.setChart('chartPro', {
          tooltip: Object.assign({}, baseTooltip, { trigger: 'axis' }),
          grid: { left: 44, right: 20, top: 20, bottom: 40 },
          xAxis: { type: 'category', data: proData.map((d) => '国家' + d.name) },
          yAxis: { type: 'value', minInterval: 1, name: '物种数' },
          series: [{ name: '物种数', type: 'bar', barWidth: '46%', data: proData, label: { show: true, position: 'top' } }]
        });

        // 5. 观测点位分布（散点）
        const pts = this.obsList
          .map((o, i) => {
            const lon = parseFloat(o.longitude);
            const lat = parseFloat(o.latitude);
            if (isNaN(lon) || isNaN(lat)) return null;
            return {
              value: [lon, lat],
              name: this.ecoName(o.ecoId) + '\n' + o.date + '\n观测员：' + (o.observer || '-') + '\n物种 ' + (o.speciesSeen || []).length + ' 种',
              symbolSize: 10 + Math.min((o.speciesSeen || []).length * 2.5, 18)
            };
          })
          .filter(Boolean);
        this.setChart('chartMap', {
          tooltip: {
            trigger: 'item',
            formatter: (p) => '<b>[' + p.data.value[0] + ', ' + p.data.value[1] + ']</b><br/>' + p.data.name
          },
          grid: { left: 60, right: 40, top: 24, bottom: 60 },
          xAxis: { type: 'value', name: '经度 °E', nameLocation: 'middle', nameGap: 28, scale: true },
          yAxis: { type: 'value', name: '纬度 °N', nameLocation: 'middle', nameGap: 34, scale: true },
          series: [{
            name: '观测点',
            type: 'scatter',
            data: pts,
            itemStyle: { color: '#2b6cb0', opacity: 0.75 },
            markLine: {
              silent: true,
              lineStyle: { color: '#d0d3d6' },
              data: []
            }
          }]
        });
      },
      setChart(name, option) {
        const c = this.charts[name];
        if (c) c.setOption(option, true);
      },

      // ---------- CSV 导出 ----------
      downloadCSV(filename, rows) {
        if (!rows.length) {
          ElMessage.warning('没有可导出的数据');
          return;
        }
        const esc = (v) => {
          const s = v == null ? '' : String(v);
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        };
        const csv = rows.map((r) => r.map(esc).join(',')).join('\r\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(a.href), 200);
        ElMessage.success('已导出 ' + filename);
        SpeciesLog.addLog('导出报表', this.me.username + ' 导出 ' + filename);
      },
      exportSpecies() {
        const header = ['名称', '学名', '别名', '门', '纲', '目', '科', '属', '保护等级', 'IUCN等级', '分布区域', '经度', '纬度', '生境', '食性', '主要特征', '备注'];
        const rows = this.speciesList.map((s) => [
          s.name, s.scientificName, s.alias, s.phylum, s.classLevel, s.order, s.family, s.genus,
          s.protectionLevel, s.conservationStatus, s.distribution, s.longitude, s.latitude,
          s.habitat, s.diet, s.features, s.remark
        ]);
        rows.unshift(header);
        this.downloadCSV('物种信息清单_' + todayStamp() + '.csv', rows);
      },
      exportObs() {
        const header = ['日期', '生态系统', '经度', '纬度', '水温(°C)', '盐度(‰)', '水深(m)', '观测员', '物种', '数量', '行为/备注', '记录备注'];
        const rows = [];
        this.obsList.forEach((o) => {
          const sp = o.speciesSeen || [];
          if (!sp.length) {
            rows.push([o.date, this.ecoName(o.ecoId), o.longitude, o.latitude, o.temp, o.salinity, o.depth, o.observer, '', '', '', o.remark]);
          } else {
            sp.forEach((x, i) => {
              const s = this.speciesList.find((y) => y.id === x.speciesId);
              rows.push([
                o.date, this.ecoName(o.ecoId), o.longitude, o.latitude, o.temp, o.salinity, o.depth, o.observer,
                s ? s.name : '物种#' + x.speciesId, x.count, x.behavior,
                i === 0 ? o.remark : ''
              ]);
            });
          }
        });
        rows.unshift(header);
        this.downloadCSV('观测记录_' + todayStamp() + '.csv', rows);
      }
    }
  });

  function todayStamp() {
    const d = new Date();
    const p = (n) => (n < 10 ? '0' + n : '' + n);
    return '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate());
  }

  app.use(ElementPlus, { locale: ElementPlusLocaleZhCn });
  app.mount('#app');
})();
