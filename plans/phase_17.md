---
name: Phase 17 Signoff Mock Closure
overview: Phase 17 Completed。会签规则已落在 Mock Domain，无真实 TG、无 Postgres。
todos:
  - id: order-fields
    content: externalOrderNo；扩展 Order 状态；禁无 Demand 补库
    status: completed
  - id: delivery-rules
    content: 同单续交、超交入池、取消仅未交、已交付不可撤
    status: completed
  - id: allocate-guards
    content: BANNED 出池；Credential 点击 Allocate 警告；四关系一次写
    status: completed
  - id: recycle-idle
    content: 闲置回收规则；Demand 管理者审批；批量生命周期（分配/转移/回收/停用/产品/户管）
    status: completed
  - id: accept-phase17
    content: 验收；Proposed Phase 18 Mock Telegram
    status: completed
isProject: false
---

# Phase 17 — Signoff Mock Closure

**Status: Completed**

对齐 [plan.md](plan.md) STEP 17 / §41。

## 已做

- 建单必填 `externalOrderNo` 与 `relatedDemandItemId`；无 Demand 直接失败
- 超交账户以 `AVAILABLE` + `sourceChannelId` 入池，`deliveredQuantity` 不超过申请量
- 未交付取消为 `CANCELLED`；已交付取消为 `PARTIAL_CLOSED`，已入库账户不撤回
- `partialReminderTime` 仅作字段与详情时间输入，不跑定时任务
- `BANNED` 不在可分配池；Allocate 必填 Member / 户管，并写入 Team、Product
- Credential `LOST` 先确认，确认后仍分配并写入 Credential Alert
- 仅团队负责人可将 `SUBMITTED` 改为 `APPROVED`；未审批不能 Allocate
- 取消 Demand：有消耗不回收；闲置超过 1 天自动回收；不超过 1 天需确认批量回收
- 账户列表支持多选后逐户 recycle
- 账户列表批量生命周期：分配 / 转移 / 回收 / 停用 / 更换产品 / 更换户管

## 不做

- 真实 Bot、真实 Media API、PostgreSQL
- 模拟 TG 全状态机 UI（STEP 18）

## 下一步

[phase_18.md](phase_18.md) Mock Telegram Order Workflow。
