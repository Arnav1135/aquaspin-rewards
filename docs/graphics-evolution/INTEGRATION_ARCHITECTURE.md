# Integration Architecture: System A & System B

## Overview
The AquaSpin Graphics Evolution System unifies two complementary engines:
1. **System A — AI Graphics Upgrade Advisor (`scripts/graphics-advisor.ts`)**: Scans repository components, determines visual limitations and defects, calculates prioritization, and publishes concrete recommendations to `docs/graphics-evolution/queue.json`.
2. **System B — Autonomous Hourly Graphics Evolution Engine (`scripts/hourly-evolution.ts`)**: Invoked hourly via Antigravity's scheduled sidecar. It consumes the prioritized queue, acquires a process lock to avoid concurrency collisions, tests the candidate upgrade, checks quality gates via TypeScript and build tests, and logs verification status to `history.json` and human-readable documentation.

## Architecture Diagram

```mermaid
flowchart TD
    subgraph SystemA["System A: AI Graphics Upgrade Advisor"]
        A1[Scan Repository & Game Engines] --> A2[Identify Defects & Realistic Opportunities]
        A2 --> A3[Rank by Visual Impact & Feasibility]
        A3 --> A4[Publish to queue.json]
    end

    subgraph SystemB["System B: Autonomous Hourly Evolution Engine"]
        B0[Hourly Trigger via Antigravity Scheduler] --> B1[Acquire Process Lock]
        B1 --> B2[Consume Highest Priority Task from queue.json]
        B2 --> B3[Execute Source Code Modifications]
        B3 --> B4[Quality Gates: Type-Check & Build]
        B4 -->|Pass| B5[Mark Task ACCEPTED & Sync History]
        B4 -->|Fail| B6[Mark Task NEEDS_REPAIR & Rollback/Report]
        B5 --> B7[Update UPGRADE_HISTORY.md & NEXT_UPGRADES.md]
        B6 --> B7
        B7 --> B8[Release Process Lock]
    end

    A4 -.->|Persistent Queue Connection| B2
```

## Task Lifecycle States
`DISCOVERED` → `PRIORITIZED` → `QUEUED` → `IN_PROGRESS` → `TESTING` → `ACCEPTED` (or `NEEDS_REPAIR` / `REJECTED`)
