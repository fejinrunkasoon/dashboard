---
name: Phase 8 Lifecycle Completed
overview: Phase 8 已完成账户生命周期 mock 写：Transfer / Recycle / Disable、Change Product / Manager，以及列表/详情分配入口。R07 闭合。下一步 Channel Center。
todos:
  - id: service-api
    content: transfer/recycle/disable/changeProduct/changeManager 契约
    status: completed
  - id: mock-writes
    content: mock 五写 + 守卫 + Timeline RECYCLED/DISABLED
    status: completed
  - id: ui-list
    content: 列表接线 + 池内户分配
    status: completed
  - id: ui-detail
    content: 详情 Header 五动作接线
    status: completed
  - id: accept-phase8
    content: 验收；Proposed Phase 9
    status: completed
isProject: false
---

# Phase 8 — Lifecycle（Completed）

对齐 [plan.md](plan.md) STEP 8 / 业务链 Transfer·Recycle·Disable，以及脑图账户工作台四操作。

## 交付

| 操作 | API | 入口 |
|------|-----|------|
| **分配** | 既有 `assignDirect` | 列表 More / 详情（池内户）；池页 / 调度不变 |
| **转移** | `transferAccount` | 列表主按钮 + 详情 |
| **回收** | `recycleAccount` | 列表 More + 详情 → `AVAILABLE` 入池 |
| **停用** | `disableAccount` | 列表 More + 详情 → `DISABLED` 不入池 |
| 更换产品 | `changeProduct` | 列表 / 详情 |
| 更换户管 | `changeManager` | 列表 / 详情 |

| 项 | 路径 |
|----|------|
| 契约 | [accounts/types.ts](app/services/accounts/types.ts) |
| Mock 写 | [accounts/mock.ts](app/services/accounts/mock.ts) |
| 列表 | [accounts/index.vue](app/pages/accounts/index.vue) |
| 详情 | [accounts/[id].vue](app/pages/accounts/[id].vue) + [AccountDetailHeader.vue](app/components/accounts/AccountDetailHeader.vue) |

**语义**：历史段不覆盖（`endedAt` + push）；Transfer 不改户管；DISABLED 拒绝后续流转；Timeline：无同刻续段且非终端停用 → `RECYCLED`；`assetStatus=DISABLED` → `DISABLED`。

## 明确未做

- 账户「启用 / 恢复」
- 独立 AccountStatusHistory 表
- Channel Center / Channel Account Order
- PostgreSQL

## 风险

- mock 内存写刷新丢失
- 列表池资格用 read-model 镜像（AVAILABLE + ACTIVE + 无 team），与 `isInAccountPool` 对齐

## 下一步

见 [phase_9.md](phase_9.md) Proposed Phase 9 — Channel Center。

## Signoff Delta

闲置 >1 天自动回收、取消 Demand 的人工/自动回收分支、批量生命周期 → [plan.md](plan.md) §41 / STEP 17。
