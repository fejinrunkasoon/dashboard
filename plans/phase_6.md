---
name: Phase 6 Account Demand Completed
overview: Phase 6 已完成 Account Demand UI：申请 Modal、按 Media 动态 requirements、demandService mock 写（DRAFT→SUBMITTED）、Demand Tab 明细与草稿操作。不做 Scheduling / Allocate。
todos:
  - id: req-fields
    content: DemandRequirementFieldDef + getDemandRequirementFields
    status: completed
  - id: demand-write-api
    content: demandService createDemand / submitDemand / updateDraftDemand
    status: completed
  - id: apply-modal
    content: ApplyAccountDemandModal + 接线替换 stub
    status: completed
  - id: demand-tab-ux
    content: Demand Tab 明细 / DRAFT 编辑提交；Phase 7 计划
    status: completed
isProject: false
---

# Phase 6 — Account Demand UI（Completed）

对齐 [plan.md](plan.md) §28 / STEP 6。团队只表达「我要什么账户」，不能选具体账户。

## 交付

| 项 | 路径 |
|----|------|
| Requirements 配置 | [app/domain/demand-requirement-fields.ts](app/domain/demand-requirement-fields.ts) |
| 写 API | [app/services/demands/types.ts](app/services/demands/types.ts)、[mock.ts](app/services/demands/mock.ts) |
| 申请 Modal | [app/components/teams/ApplyAccountDemandModal.vue](app/components/teams/ApplyAccountDemandModal.vue) |
| 接线 | [app/pages/teams/[id].vue](app/pages/teams/[id].vue) |

**表单字段**：Media / Quantity / Product / Timezone(+media-specific) / Expected Date / Priority / Reason

**Media-specific**：公共 `timezone`；Meta `preferredBmHint`；Snapchat `organizationHint`；Google/TikTok 仅 timezone

**状态**：保存草稿 → `DRAFT`；提交 → `SUBMITTED`。Demand Tab 可展开 Item、编辑/提交 DRAFT。

## 明确未做

- Demand Scheduling / Allocate / Assignment 写（STEP 7–8）
- APPROVE / REJECT 管理员 UI
- Channel Account Order
- PostgreSQL / 真实 API / 全站 `/demands` 页

## 风险 / Technical Debt

- **R07** Assign stub 仍 OPEN
- mock 内存写刷新即失
- requirements 静态配置，待 Domain Freeze 主数据化

## 下一步

见 [phase_7.md](phase_7.md) Proposed Phase 7 — Demand Scheduling（不实施于本阶段）。

## Signoff Delta

管理者审批、申请字段基线、禁止选具体账户 → [plan.md](plan.md) §41。实现归 STEP 17（[phase_17.md](phase_17.md)）。
