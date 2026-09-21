---
name: Phase 14 Dashboard Data Completed
overview: Phase 14 已完成运营总览 Domain 接线 — dashboardService 聚合 KPI/趋势/渠团/预警；Home* 与 Slideover 不再打遗留 /api。
todos:
  - id: dashboard-read-model
    content: dashboardService.getOverview 读模型
    status: completed
  - id: dashboard-page-wire
    content: index + Home* + Slideover 迁 Domain
    status: completed
  - id: drilldown-links
    content: Channel/Team/Important Alerts + 穿透链接
    status: completed
  - id: accept-phase14
    content: 验收；Completed + Proposed Phase 15
    status: completed
isProject: false
---

# Phase 14 — Dashboard Data Integration（Completed）

对齐 [plan.md](plan.md) STEP 14 / §33 / §3.1。

## 交付

| 项 | 路径 |
|----|------|
| Service | [dashboard/types.ts](app/services/dashboard/types.ts) · [mock.ts](app/services/dashboard/mock.ts) |
| 首页 | [index.vue](app/pages/index.vue) — `getOverview({ trendDays })` |
| KPI | [HomeStats.vue](app/components/home/HomeStats.vue) — 无假 variation；封禁=存量 mediaBanned |
| 趋势 | [HomeChart.client.vue](app/components/home/HomeChart.client.vue) — 动态媒体系列 |
| 归属/结构 | HomeConsumptionSplit · HomeAccountStructure（Domain 桶） |
| 概览 | HomeChannelOverview · HomeTeamOverview · HomeImportantAlerts |
| Slideover | [NotificationsSlideover.vue](app/components/NotificationsSlideover.vue) → `alertService` |

**Spend** = Media only。日期窗口相对 `MOCK_TODAY`（7–30 天）。

**遗留**：`server/api/overview.ts` / `consumption.ts` / `alerts.ts` 停止被首页引用。

## 明确未做

- 大规模改 Dashboard 视觉
- 真实「今日新增封禁」事件流
- Service Fee 进总览
- PostgreSQL / Connector

## 下一步

见 [phase_15.md](phase_15.md) Proposed Phase 15 — Domain Checkpoint（不建库；下一步 UX Parity）。
