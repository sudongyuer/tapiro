---
title: <Feature or change name>
status: proposed
created: YYYY-MM-DD
approved:
implemented:
supersedes:
superseded-by:
pr:
---

<!-- Copy to docs/specs/YYYY-MM-DD-<topic>-design.md and add a row to docs/specs/README.md.
Visual mockup: <link, if any>. Related issue / upstream: <link>. Builds on: <earlier spec>. -->

## Problem

<What is wrong or missing today, from the user's point of view. Cite code (`path:line`),
issues, or measurements. One or two paragraphs.>

## Goals and scope

**Do**

- <Outcome 1, observable>
- <Outcome 2>

**Don't do**

- <Explicitly excluded work, and why>
- <Rejected alternatives: one line each with the reason>

## Decisions

| Decision | Choice            | Why      | Alternatives considered |
| -------- | ----------------- | -------- | ----------------------- |
| <topic>  | <what we will do> | <reason> | <A: …, B: …>            |

## Data flow and ownership

<Who owns which state, which layer calls which, where the contracts are.
A small diagram if a linear description is hard to follow.>

## Errors and degradation

| Failure                                | User sees          | System does                  |
| -------------------------------------- | ------------------ | ---------------------------- |
| <offline / rejected / timeout / empty> | <message or state> | <retry, fallback, no replay> |

## UI/UX and motion

<Design handoff. Approved before implementation starts; a spec with no user-facing change writes
"None:" and the reason.>

### Screens and states

| Screen   | Design board        | States to cover                                                              |
| -------- | ------------------- | ---------------------------------------------------------------------------- |
| <screen> | <canvas board name> | <empty, one, many, loading, error, long copy (ms), largest text, light/dark> |

### Motion

| Motion       | Purpose (one word) | Trigger                | Duration token | Haptic / sound         | Reduce Motion |
| ------------ | ------------------ | ---------------------- | -------------- | ---------------------- | ------------- |
| <what moves> | <why>              | <user action or event> | <--duration-*> | <none / light / sound> | <fallback>    |

## Known limits

- <Ceilings, unsupported cases, deliberate gaps>

## Implementation order

1. <Step that is independently shippable or testable>
2. <...>

## Verification

- <Automated checks that must pass>
- <UI cases (light/dark, screenshots, video) that must exist>
- <Design QA: screenshots beside the design boards, reviewed by the owner before the PR>
- <Acceptance: what a person checks>

<!-- After implementation, spec-lifecycle appends "## Implementation Record (YYYY-MM-DD)" below. -->
