# <Feature> Implementation Plan

> **For agentic workers:** execute task by task. If a plan-execution skill is
> available (for example superpowers `subagent-driven-development` or
> `executing-plans`), use it. Track steps with checkboxes (`- [ ]`). When all
> tasks are done, run `spec-lifecycle` before opening the PR.

**Goal:** <one or two sentences: what the user can do after this plan>

**Architecture:** <the layers touched and how they change>

**Tech stack:** <languages, frameworks, versions, test runner>

**Spec:** `docs/specs/YYYY-MM-DD-<topic>-design.md`

## Global constraints

- <Style rules, e.g. "zero comments unless explaining a workaround or a non-obvious invariant">
- <No new dependencies unless listed here: …>
- <File size limits: 500 lines per file, 300 per component>
- <Platform rules, e.g. "no Android", "never disable code signing">
- Run `<check command>` and `<test command>` at the end of every task; format only changed files.
- <Where tests live and how they are run>

## File structure

| Action | Path | Responsibility |
| --- | --- | --- |
| Create | `<path>` | <what it owns> |
| Modify | `<path>` | <what changes> |

## Task 1: <name>

**Files:** `<create/modify paths>`

**Interfaces**

- Consumes: `<type / function / event>` from `<path>`
- Produces: `<type / function / event>` used by Task <n>

```ts
// the exact types or signatures this task introduces
```

**Steps**

- [ ] Write the failing test for <behavior> in `<test path>`
- [ ] Implement <behavior>
- [ ] Run `<test command>`; expected: <result>
- [ ] Commit: `feat(<area>): <message>`

## Task 2: <name>

<same shape>

## Final acceptance

- [ ] All tasks committed; `<check>` and `<test>` pass
- [ ] UI checks <case names> pass in light and dark with screenshots and video
- [ ] Deviations and rulings collected for the spec's Implementation Record
