# Contributor Tutorial

Start with `AGENTS.md`, then `docs/ARCHITECTURE.md`.

The quickest mental model is:

- public JSON describes what characters *could* exist;
- SQLite records who *actually joined* and what is currently happening;
- Express enforces every game rule;
- React only renders the state and sends user intentions;
- SSE tells open browsers that something changed.

When adding a feature, first ask which layer owns the truth. If the answer is a browser component or localStorage, it is probably in the wrong place.
