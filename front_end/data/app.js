/* 应用使用数据统计看板（数据由 data.json 接口加载） */
// ============ 全局统计（通过接口加载）============
let statData = null;
// 保存echarts实例，防止重复初始化
const chartInstances = {};

// ============ 更新 KPI 卡片 ============
function updateKpi() {
  const total = statData.login + statData.chat + statData.hobby;
  document.getElementById('kpiTotal').textContent = total.toLocaleString();
  document.getElementById('kpiLogin').textContent = statData.login.toLocaleString();
  document.getElementById('kpiChat').textContent = statData.chat.toLocaleString();
  document.getElementById('kpiHobby').textContent = statData.hobby.toLocaleString();
}

function axisLabelStyle() {
  return { color: '#6b7280', fontSize: 12 };
}

// ============ 图表 1：各功能使用次数对比（柱状图）============
function renderUsage() {
  const dom = document.getElementById('chartUsage');
  // 如果已有实例先销毁
  if(chartInstances.chartUsage) chartInstances.chartUsage.dispose();
  chartInstances.chartUsage = echarts.init(dom);
  chartInstances.chartUsage.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: '{b}<br/>{a}：{c} 次',
    },
    legend: { data: ['使用次数'], right: 20, top: 0, textStyle: { color: '#6b7280' } },
    grid: { left: 50, right: 30, top: 46, bottom: 30 },
    xAxis: {
      type: 'category',
      data: ['登录', '对话', '喜好选择'],
      axisLabel: axisLabelStyle(),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
    },
    yAxis: {
      type: 'value',
      name: '次数',
      nameTextStyle: { color: '#9ca3af' },
      axisLabel: { color: '#9ca3af' },
      splitLine: { lineStyle: { color: '#f0f0f5' } },
    },
    series: [
      {
        name: '使用次数',
        type: 'bar',
        barWidth: 56,
        data: [
          { value: statData.login, itemStyle: { color: '#10b981', borderRadius: [6, 6, 0, 0] } },
          { value: statData.chat,  itemStyle: { color: '#6366f1', borderRadius: [6, 6, 0, 0] } },
          { value: statData.hobby, itemStyle: { color: '#ec4899', borderRadius: [6, 6, 0, 0] } },
        ],
        label: { show: true, position: 'top', color: '#374151', fontWeight: 600, formatter: '{c}' },
      },
    ],
  });
}

// ============ 图表 2：用户喜好分布（环形图）============
function renderHobby() {
  const dom = document.getElementById('chartHobby');
  if(chartInstances.chartHobby) chartInstances.chartHobby.dispose();
  chartInstances.chartHobby = echarts.init(dom);
  chartInstances.chartHobby.setOption({
    tooltip: { trigger: 'item', formatter: '{b}：{c} 人（{d}%）' },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: { color: '#6b7280', fontSize: 12 },
    },
    series: [
      {
        name: '用户喜好',
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['40%', '50%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        labelLine: { show: false },
        color: [
          '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9',
          '#8b5cf6', '#ef4444', '#14b8a6', '#f97316',
        ],
        data: statData.hobbies,
      },
    ],
  });
}

// ============ 图表 3：近 7 天使用趋势（折线图）============
function renderTrend() {
  const dom = document.getElementById('chartTrend');
  if(chartInstances.chartTrend) chartInstances.chartTrend.dispose();
  chartInstances.chartTrend = echarts.init(dom);
  chartInstances.chartTrend.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: '{b}<br/>登录：{c0}<br/>对话：{c1}<br/>喜好：{c2}',
    },
    legend: {
      data: ['登录', '对话', '喜好选择'],
      top: 0,
      right: 20,
      textStyle: { color: '#6b7280' },
    },
    grid: { left: 50, right: 30, top: 46, bottom: 30 },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: statData.trend.dates,
      axisLabel: axisLabelStyle(),
      axisLine: { lineStyle: { color: '#e5e7eb' } },
    },
    yAxis: {
      type: 'value',
      name: '次数',
      nameTextStyle: { color: '#9ca3af' },
      axisLabel: { color: '#9ca3af' },
      splitLine: { lineStyle: { color: '#f0f0f5' } },
    },
    series: [
      {
        name: '登录',
        type: 'line',
        smooth: true,
        data: statData.trend.login,
        itemStyle: { color: '#10b981' },
        areaStyle: { opacity: 0.12, color: '#10b981' },
      },
      {
        name: '对话',
        type: 'line',
        smooth: true,
        data: statData.trend.chat,
        itemStyle: { color: '#6366f1' },
        areaStyle: { opacity: 0.12, color: '#6366f1' },
      },
      {
        name: '喜好选择',
        type: 'line',
        smooth: true,
        data: statData.trend.hobby,
        itemStyle: { color: '#ec4899' },
        areaStyle: { opacity: 0.12, color: '#ec4899' },
      },
    ],
  });
}

// ============ 图表 4：功能使用雷达图 =============
function renderRadar() {
  const dom = document.getElementById('chartRadar');
  if(chartInstances.chartRadar) chartInstances.chartRadar.dispose();
  chartInstances.chartRadar = echarts.init(dom);
  chartInstances.chartRadar.setOption({
    tooltip: {},
    radar: {
      indicator: [
        { name: '登录', max: 400 },
        { name: '对话', max: 400 },
        { name: '喜好', max: 400 },
        { name: '消息', max: 400 },
        { name: '搜索', max: 400 },
      ],
      radius: '68%',
      splitNumber: 4,
      axisName: { color: '#6b7280', fontSize: 12 },
      splitArea: { areaStyle: { color: ['rgba(99,102,241,0.03)', 'rgba(99,102,241,0.06)'] } },
      axisLine: { lineStyle: { color: '#e5e7eb' } },
      splitLine: { lineStyle: { color: '#e5e7eb' } },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            name: '功能使用',
            value: [
              statData.login,
              statData.chat,
              statData.hobby,
              Math.round(statData.chat * 0.8),
              Math.round(statData.chat * 0.3),
            ],
            areaStyle: { color: 'rgba(99,102,241,0.25)' },
            lineStyle: { color: '#6366f1', width: 2 },
            itemStyle: { color: '#6366f1' },
          },
        ],
      },
    ],
  });
}

// ============ 初始化 ============
function renderAll() {
  updateKpi();
  renderUsage();
  renderHobby();
  renderTrend();
  renderRadar();
}

async function loadAndRender() {
  if (!window.echarts) {
    document.querySelectorAll('.chart-box').forEach((box) => {
      box.innerHTML = '<p style="padding:100px;text-align:center;color:#9ca3af;">ECharts 加载失败，请检查网络连接</p>';
    });
    return;
  }
  try {
    // 从 data.json 接口获取数据
    const res = await fetch('data.json');
    if (!res.ok) {
      throw new Error('接口请求失败：' + res.status);
    }
    statData = await res.json();
  } catch (err) {
    console.error('加载数据失败:', err);
    document.querySelectorAll('.chart-box').forEach((box) => {
      box.innerHTML = '<p style="padding:100px;text-align:center;color:#ef4444;">数据加载失败，请确认 data.json 接口可用。</p>';
    });
    return;
  }
  renderAll();
}

window.addEventListener('load', () => {
  if (window.echarts) {
    loadAndRender();
    window.addEventListener('resize', () => {
      Object.values(chartInstances).forEach(inst => {
        if(inst) inst.resize();
      });
    });
  } else {
    document.querySelectorAll('.chart-box').forEach((box) => {
      box.innerHTML = '<p style="padding:100px;text-align:center;color:#9ca3af;">ECharts 加载失败，请检查网络连接</p>';
    });
  }
});
