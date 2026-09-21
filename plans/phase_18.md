---
name: Phase 18 Mock Telegram
overview: Phase 18 Completed。按 check.txt / plan §14 系统内模拟询单履约。无真实 Bot Token。
todos:
  - id: inquiry-sim
    content: 模拟询单卡片：确认接单 / 拒绝接单 / 超时提醒
    status: completed
  - id: delivery-parse
    content: Reply 归属 + Parser 草稿 + Validator + 人工确认入库
    status: completed
  - id: partial-state
    content: PARTIAL_DELIVERED 续交至满；每日提醒配置
    status: completed
  - id: accept-phase18
    content: 验收一次模拟接单+部分交付+入库+再 Allocate
    status: completed
isProject: false
---

# Phase 18 — Mock Telegram Order Workflow

**Status: Completed**

对齐 [plan.md](plan.md) STEP 18 / §14；需求源 [check.txt](check.txt)。真实 Bot = STEP 29。

## 已做

- Order 状态对齐 §14：`PENDING_CONFIRM` / `ACCEPTED` / `REJECTED` / `TIMEOUT` / `PARTIAL_DELIVERED` / `DELIVERED` / `PARSING_EXCEPTION` / `QUANTITY_EXCEPTION` 等；废弃 `PARTIALLY_DELIVERED` / `COMPLETED` 命名
- 履约字段：`inquiryMessageId`、`acceptedAt`/`acceptedBy`、`rejectReason`
- Mock Service：`sendMockInquiry` / `accept` / `reject` / `timeout`；`submitMockDeliveryReply`（Reply 必须绑定原询单 messageId）→ 规则 Parser → Validator → `confirmDeliveryFromDraft`（人工确认才入库）
- `closePartialOrder`、`simulatePartialReminder`；手填 `confirmChannelAccountDelivery` 仍作兜底
- UI：渠道订单 Tab 上 `MockInquiryCard` + `MockDeliveryPanel`；「发送模拟询单」替代「开始处理」；Stage A「复制摘要」保留

## 不做

- Bot Token / Webhook / 真实 Telegram API
- 自动询第二供应商、渠道评分引擎
- PostgreSQL；Confirm Delivery 后自动 Allocate

## 验收记录

1. 拒单（含原因）→ 再询单 → 接单 → `PROCESSING`
2. 模拟超时 → `TIMEOUT` → 可再发询单
3. 数量不符 Reply → `QUANTITY_EXCEPTION`，不可直接入池
4. 部分交付 → `PARTIAL_DELIVERED`（AVAILABLE + `sourceChannelId`）→ 续交至满 → `DELIVERED`
5. 续交提醒可配置并「模拟触发」

## 下一步

[phase_19.md](phase_19.md) 数据字典 / Media 主数据 CRUD（Mock）。
