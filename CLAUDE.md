# Agent Issue Tracker — notes for Claude Code

Project guidance for the [**prototype**](prototype/) lives in [`prototype/CONTEXT.md`](prototype/CONTEXT.md) (vanilla HTML/CSS/JS, static deploy, schema). Use this file for **current iteration intent** so implementation stays aligned.

## Current goal

Mock the full AIT workflow end to end using hardcoded and simulated data only—no production integrations. The priority is to **experience and debug the loop**, not to ship production-quality plumbing.

## What “mock” means here

- **Agent behavior:** simulated via explicit controls (for example, buttons in a dev panel), not a live agent runtime.
- **GitHub:** no API calls; any “sync” is stubbed (for example, `console.log` only).
- **Slack:** no webhooks; notifications are stubbed (for example, `console.log` only).
- **LLM:** no real model calls; responses are fixed or templated structured payloads for predictable UI/state transitions.
- **Data:** interactive state stays in **`localStorage`** so flows are inspectable and resettable in the browser; static JSON such as [`prototype/api/issues.json`](prototype/api/issues.json) is seed/sample data for agents or initial loads, not a live backend.
- **Observability:** behavior should be easy to follow in DevTools (logs, visible UI affordances, minimal hidden magic).
