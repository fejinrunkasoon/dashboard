---
name: Phase 7 Demand Scheduling Completed
overview: Phase 7 已完成 DEMAND/DIRECT 双路径分配：调度工作台、allocate/assignDirect mock 写、池页接线、Shortage 占位。Transfer/Recycle 仍 OPEN。
todos:
  - id: allocate-api
    content: isInAccountPool 共享；allocate + assignDirect
    status: completed
  - id: scheduling-page
    content: /accounts/scheduling + Nav
    status: completed
  - id: pool-direct-wire
    content: pool 双按钮接线；Shortage 占位
    status: completed
  - id: accept-phase7
    content: 验收；Phase 8 计划
    status: completed
isProject: false
---

# Phase 7 — Demand Scheduling（Completed）

对齐脑图双路径 + [plan.md](plan.md) §12 / §25.2–25.3 / STEP 7。

## 交付

| Source | 入口 | API |
|--------|------|-----|
| **DEMAND** | [`/accounts/scheduling`](app/pages/accounts/scheduling.vue)；池「分配给 Demand」 | `demandService.allocate` |
| **DIRECT** | 池「直接分配」 | `accountService.assignDirect` |

| 项 | 路径 |
|----|------|
| 池资格单点 | [pool-eligibility.ts](app/services/accounts/pool-eligibility.ts) |
| Nav | [AccountCenterNav.vue](app/components/accounts/AccountCenterNav.vue)「需求调度」 |
| Mock | Snap 池户时区改为 `America/Los_Angeles` 以匹配 dmd-002 |

**DEMAND**：隐式 `SUBMITTED`→`APPROVED`；写 Allocation + Assignment；`assetStatus=ASSIGNED`；PARTIAL/FULFILLED。Hard match media + timezone。

**DIRECT**：仅 Assignment；不写 DemandAllocation。

**Shortage**：Channel Order 按钮 toast 占位（STEP 10）。

## 明确未做

- Transfer / Recycle / Change Product 写（STEP 8）
- Channel Account Order
- 账龄/地区等扩展匹配

## 风险

- R07：池分配已闭合；**Transfer/Recycle 仍 OPEN**
- mock 内存写刷新丢失

## 下一步

见 [phase_8.md](phase_8.md) Proposed Phase 8 — Transfer / Recycle / Product / Manager。

## Signoff Delta

Allocate 一次写齐四关系；Credential 点击警告；BANNED 不进 Matching Pool → [plan.md](plan.md) §41 / STEP 17。
