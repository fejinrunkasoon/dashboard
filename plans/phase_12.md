---
name: Phase 12 Alerts Completed
overview: Phase 12 已完成预警中心 Domain 闭环 — 状态机写接口、Shortage↔调度幂等衔接、alerts.vue 迁离 /api/alerts；侧栏 badge 为真实 open count。
todos:
  - id: alert-domain-align
    content: Domain 状态 §31；AlertType；关联 Demand/Order/Team；种子修正
    status: completed
  - id: alert-write-api
    content: alertService 写接口 + ensureShortageAlert / resolveShortage…
    status: completed
  - id: shortage-emit
    content: 调度 getSchedulingDemandItems + allocate 接线 Shortage Alert
    status: completed
  - id: alerts-page
    content: 重写 alerts.vue + 侧栏 badge + scheduling deep-link
    status: completed
  - id: accept-phase12
    content: 验收；Completed + Proposed Phase 13 Analytics
    status: completed
isProject: false
---

# Phase 12 — Alerts（Completed）

对齐 [plan.md](plan.md) STEP 12 / §31 / §3.5。

## 交付

| 项 | 路径 |
|----|------|
| Domain | [alert.ts](app/domain/alert.ts) — `OPEN\|IN_PROGRESS\|RESOLVED\|IGNORED`；`AlertType`；关联字段 |
| Service | [alerts/types.ts](app/services/alerts/types.ts) · [mock.ts](app/services/alerts/mock.ts) |
| 种子 | [entities.ts](app/mocks/entities.ts) — TEAM/POOL Shortage、DEMAND_OVERDUE 等 |
| 调度衔接 | [demands/mock.ts](app/services/demands/mock.ts) — shortage>0 幂等 ensure；allocate 后 shortage=0 自动 resolve |
| 预警页 | [alerts.vue](app/pages/alerts.vue) — `alertService`；认领/解决/忽略；Shortage CTA |
| Deep-link | [scheduling.vue](app/pages/accounts/scheduling.vue) — `?demandItemId=&openOrder=1` |
| Badge | [default.vue](app/layouts/default.vue) — `getOpenCount()` |

**闭环**：发现（调度 ensure）→ 认领 → 去分配 / 建单 → 解决（手动或 allocate 清 Shortage）。

**遗留**：`server/api/alerts.ts` 仍存在但页面已不再引用。

## 明确未做

- 推送 / 邮件 / Telegram（STEP 24）
- 系统管理预警规则 CRUD
- 账户分析 Pivot（STEP 13）
- 真实探测自动化
- PostgreSQL / 清理全部 `~/types`

## 风险

- mock 内存写刷新丢失
- 侧栏 badge 在 layout 挂载时拉取，同会话内调度新建 Alert 后需刷新导航才更新数字

## 下一步

见 [phase_13.md](phase_13.md) Phase 13 — Account Analytics（Completed）。

## Signoff Delta

Credential / 交付逾期 / 闲置待回收进入待办闭环 → [plan.md](plan.md) §41 / STEP 17。
真实 Telegram 推送 → STEP 29，不是本阶段。
