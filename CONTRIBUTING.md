# Contributing to web-search

Thanks for taking the time to contribute.

## Setup

```bash
git clone https://github.com/dungle-scrubs/web-search.git
cd web-search
pnpm install
```

Pre-commit hooks install automatically via Lefthook.

## Development workflow

| Command | What it does |
| ------- | ------------ |
| `pnpm test` | Run the vitest suite |
| `pnpm typecheck` | TypeScript strict mode check (no emit) |
| `pnpm check` | Biome lint + format check |
| `pnpm format` | Biome auto-format |
| `pnpm lint` | Biome lint |
| `pnpm build` | Emit `dist/` |

Run the full gate before pushing:

```bash
pnpm typecheck && pnpm check && pnpm test
```

The pre-commit hook runs format → lint → typecheck on staged files.

## Conventions

- **TypeScript strict.** `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters` are on. No `any` types.
- **Effect-native.** New code that touches IO uses Effect services and layers rather than side-effecting directly.
- **Tests.** Every new behavior should have a test. The test helpers in `test/helpers.ts` provide `stubHttp` for injecting a fake transport without touching `globalThis.fetch`.
- **Formatting.** Biome with double quotes, 88-char line width. No bikeshedding — just run `pnpm format`.
- **Commits.** Follow [Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `docs:`, `test:`, `chore:`, `build:`, `refactor:`. Breaking changes get a `!` after the type (`feat!: …`) or a `BREAKING CHANGE:` footer.

## Pull requests

- Open a PR against the default branch.
- The PR title becomes the changelog entry (enforced by release-please), so use conventional-commit format.
- CI must pass before merge.
- Small, focused PRs are preferred.
