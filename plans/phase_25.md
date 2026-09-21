---
name: Phase 25 PostgreSQL ERD
overview: Proposed Phase 25（plan STEP 25）：E2E 通过后的 ERD。含会签字段。不在 STEP 24 之前开始。
todos:
  - id: erd-core
    content: 核心实体与历史段 Assignment
    status: pending
  - id: erd-signoff
    content: external_order_no、Order 扩展状态、闲置时钟、Media 主数据表
    status: pending
  - id: accept-phase25
    content: 验收；Proposed Phase 26 Migration
    status: pending
isProject: false
---

# Proposed Phase 25 — PostgreSQL ERD

对齐 [plan.md](plan.md) STEP 25。前置：Phase 24 E2E 通过。

## 做

ERD 覆盖 AdAccount / Order / Assignment / Demand / Media 主数据，以及 §41 新增字段。

## 不做

- 在 E2E 未通过时建库
- 真实 Telegram / 真实 Media API（STEP 29–30）

## 之后

STEP 26 Migration → STEP 27 Server API → STEP 28 替换 Mock → STEP 29 Real Telegram → STEP 30 Real Media Connectors。
