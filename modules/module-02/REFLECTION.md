# Module 2 — Reflection

**Team name**: _______________
**Branch**: `module-02/<team-name>`
**Submitted**: before Module 3 lesson

---

Answer the three questions below. There are no right or wrong answers — we are looking for your reasoning, not a textbook definition. A few honest sentences are worth more than a long generic paragraph.

---

## 1. The "why"

You built a service with distinct layers: models, schemas, repository, service, and routes — each with a single responsibility.

**Why not just put everything in one file and call it done?**

Think about what happens six months later when someone new joins the team, or when you need to swap SQLite for PostgreSQL. What does the layered structure protect you from?

> *Your answer:* The main reason is that things are easier to fix. If everything is in one file, finding a bug means reading through everything. With separate layers, you know exactly where to look. Models break? Go to models. Validation fails? Go to schemas. It also means you can swap out one layer — like changing the database — without touching the others.

---

## 2. Your choice

Each service owns its data exclusively — no other service is allowed to touch its database directly.

**Pick one entity your service owns (e.g. `User`, `Game`). What would go wrong if another service could write to that table directly?**

Give a concrete scenario, not a general principle.

> *Your answer:* Take the `Game` entity. game-service has rules about how game records get written — for example, always setting `created_at` correctly. If auth-service writes directly to the games table, it doesn't know those rules exist. It will insert a row without following them, and the data ends up wrong. game-service has no idea it happened. Only the service that owns the table knows all the rules about it.

---

## 3. The tradeoff

You now have models, schemas, a repository, a service, and routes — five layers for what is essentially a CRUD service.

**For a system this small, what is the cost of all this structure?**

And at what point does the complexity start to pay off? Where is the tipping point?

> *Your answer:* Right now it feels like overkill. There are five files for what is basically four SQL queries — the setup code is bigger than the actual logic. The cost is time: writing and navigating all that structure when the feature is tiny. It starts paying off when more than one person is working on the code, or when one layer needs to change without breaking the others. That's the tipping point.

---

*Keep this file. You will refer back to it during the oral presentation.*
