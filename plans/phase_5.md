---
name: Phase 5 Team Center Completed
overview: Phase 5 已完成 Team Center：teams 迁至 teamService + Mock；列表聚合 KPI；/teams/:id 五 Tab；申请账户 stub。不做 Demand 写库与调度。
todos:
  - id: team-read-model
    content: 扩展 TeamListItem / DetailBundle + teamService mock 聚合
    status: completed
  - id: teams-list-page
    content: 重写 teams.vue 迁离 /api
    status: completed
  - id: team-detail-page
    content: 实现 /teams/:id 五 Tab
    status: completed
  - id: apply-stub-risks
    content: 申请 stub、Mock Ban、风险登记、Phase 6 计划
    status: completed
isProject: false
---

# Phase 5 — Team Center（Completed）

对齐 [plan.md](plan.md) §27 / STEP 5。团队是「需求与使用」视图，不是调度中心。

## 交付

| 项 | 路径 |
|----|------|
| 读模型 + 聚合 | [app/services/teams/types.ts](app/services/teams/types.ts)、[mock.ts](app/services/teams/mock.ts) |
| Team List | [app/pages/teams.vue](app/pages/teams.vue) → `getTeamList` |
| Team Detail | [app/pages/teams/[id].vue](app/pages/teams/[id].vue) + [TeamDetailHeader.vue](app/components/teams/TeamDetailHeader.vue) |
| Ban Rate 样本 | [entities.ts](app/mocks/entities.ts) `asg-banned-1` → team-a |

**List 列**：Team / Leader / Members / Accounts / In Use / Idle / Usage Rate / Today / 7D / Internal / External / Ban Rate / Unfulfilled Demand

**Detail Tabs**：Overview / Accounts / Members / Product Performance / Account Demand

**申请账户**：Header + Demand Tab 按钮 → toast stub（完整表单 STEP 6）

## KPI（已固定）

当前归属 = `AccountAssignment` 且 `endedAt == null`。

- Usage Rate = `InUse / Accounts`
- Ban Rate = `BANNED / Accounts`（当前归属）
- Unfulfilled = open Demand（SUBMITTED / APPROVED / PARTIALLY_ALLOCATED）上 ∑ `max(0, requested − allocated)`
- Internal / External = 7D spend 按当前 Product.ownershipType
- Team Idle ≠ 账户池资格（池规则仍只在 `isInAccountPool`）

## 明确未做

- Demand 写库 / Scheduling（STEP 6–8）
- TeamCenterNav / 并列二级路由
- 改 AccountCenterNav
- Channel / PostgreSQL / Media API
- settings 组织页仍可能挂旧 `/api`（债）

## 风险 / Technical Debt（OPEN）

- **R07** Assign / Transfer stub 仍 OPEN
- 池若日后含 IDLE：只改 `isInAccountPool` 一处；Team Idle 列语义不变
- Ban Rate 仅当前归属，历史封户回收后可能偏低
- settings/organization、members 旧 API 待迁

## 下一步

见 [phase_6.md](phase_6.md) Proposed Phase 6 — Account Demand UI（不实施于本阶段）。

## Signoff / UX Delta

布局仍初步。对齐账户中心壳、TeamCenterNav、筛选与分页 → [phase_16.md](phase_16.md)（plan STEP 16）。
会签规则（审批人、申请字段、闲置）→ [plan.md](plan.md) §41，Mock 落地 STEP 17。
