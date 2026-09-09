# Contributing to NevaUI

NevaUI is an experimental library. Ideas are welcome early — you do not need a finished
component to open a discussion.

## Before you start

Read the [core philosophy and component lifecycle](./README.md). The two rules that shape
most review feedback:

- **Complexity must justify itself.** New dependencies, abstractions and shared utilities need
  a demonstrated need, not a possible future one.
- **Components are independent by default.** A component should work without pulling in the
  rest of the library.

## Setup

```bash
pnpm install
pnpm validate
```

## Workflow

1. Open an issue describing the idea, the interaction, or the bug.
2. Branch from `main`.
3. Keep the change focused — one meaningful unit of work per commit.
4. Run `pnpm validate` before opening a pull request.
5. Say which lifecycle stage the work targets (Spark, Concept, Lab, Experimental, Stable).

Commit messages follow a simple prefix convention:

```text
feat: add proximity field component
fix: clean up animation frame on unmount
docs: document lifecycle stages
chore: configure linting
test: add pointer interaction validation
```

## What review looks for

- The code is understandable, and non-obvious decisions are explained.
- Continuous animation does not run through React state updates without a documented reason.
- Resources are cleaned up on unmount: listeners, animation frames, timers, observers.
- Types are strict. No `any`, no assertions used to silence the compiler.
- Tests match the risk the change introduces, not a coverage number.
- No secrets, no hardcoded credentials, no unexpected network access.
- Accessibility expectations scale with the lifecycle stage.

## Security

Do not open a public issue for a security problem. Report it privately through GitHub's
security advisories on this repository.
