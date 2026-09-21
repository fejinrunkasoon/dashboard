---
name: Phase 10 Channel Account Order Completed
overview: Phase 10 已完成 Shortage→建单→交付入库→回池。池优先 Allocate 不变；不自动 Allocate；无 Telegram Bot / 正式 Alert。
todos:
  - id: order-write-api
    content: demandService create/submit/startProcessing/confirmDelivery/cancel + 状态机
    status: completed
  - id: inbound-accounts
    content: confirmDelivery 写 AdAccount AVAILABLE + ChannelAssignment
    status: completed
  - id: shortage-wire
    content: 调度 Shortage CTA 接线建单（关联 Demand Item）
    status: completed
  - id: orders-tab-ops
    content: 渠道 Orders Tab 建单/推进/交付/取消/复制摘要
    status: completed
  - id: accept-phase10
    content: 验收；Completed + Proposed Phase 11
    status: completed
isProject: false
---

# Phase 10 — Channel Account Order（Completed）

对齐 [plan.md](plan.md) STEP 10 / §0 库存不足链 / §12–§13 / §25.3 / §30。

## 交付

| 项 | 路径 |
|----|------|
| 写契约 | [demands/types.ts](app/services/demands/types.ts) |
| Mock 状态机 + 入库 | [demands/mock.ts](app/services/demands/mock.ts) |
| 建单 Modal | [CreateChannelOrderModal.vue](app/components/channels/CreateChannelOrderModal.vue) |
| 交付 Modal | [ConfirmChannelDeliveryModal.vue](app/components/channels/ConfirmChannelDeliveryModal.vue) |
| 调度 Shortage | [scheduling.vue](app/pages/accounts/scheduling.vue) |
| 渠道 Orders | [channels/[id].vue](app/pages/channels/[id].vue) |
| 种子 | `ord-001` PARTIALLY_DELIVERED；`ord-002` PENDING |

**流程**：Matching Pool → 先 Allocate → Shortage 建单 → 复制摘要人工 TG → Confirm Delivery → `AVAILABLE` 入池 → 再 Allocate。

**入库**：`sourceChannelId` + `AccountChannelAssignment`；可选 PlatformAsset；不写 Assignment / DemandAllocation。

## 明确未做

- 正式 Team/Pool Shortage Alert（STEP 12）
- Telegram Bot 发送/解析（STEP 24）
- 交付后自动 Allocate
- 独立订单中心导航 / 池页 Shortage 按钮
- 打款地址审核 / Ledger / 对账（STEP 25）
- PostgreSQL

## 风险

- mock 内存写刷新丢失
- 订单摘要复制依赖 Clipboard API

## 下一步

见 [phase_11.md](phase_11.md) Phase 11 — Platform Asset（Completed）。

## Signoff Delta

`externalOrderNo`、同单续交、超交入池、取消仅未交、禁无 Demand 补库 → [plan.md](plan.md) §41 / STEP 17。
模拟 TG 协议 → STEP 18（[phase_18.md](phase_18.md)）；真实 Bot → STEP 29。不再使用旧「STEP 24 = Telegram」。
