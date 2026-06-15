# Module 5 — Reflection

**Team name**: _______________
**Branch**: `module-05/<team-name>`
**Submitted**: before Module 6 lesson

---

Answer the three questions below. There are no right or wrong answers — we are looking for your reasoning, not a textbook definition. A few honest sentences are worth more than a long generic paragraph.

---

## 1. The "why"

The game-service now has two models for the same data: SQLite for writes, Redis for reads. They store the same games in two different shapes.

**Why go through the trouble of maintaining two representations of the same data?**

Think about what kind of queries each model is optimised for, and what would happen if you tried to use the write model for high-traffic read operations.

> SQLite is good at writes — it enforces constraints, handles transactions, and keeps the data safe. But it is not built for speed under many concurrent reads. Redis lives in memory, so reads are almost instant. The `/summary` endpoint gets hit a lot more than a write does, so pulling from Redis makes sense there. If we only had SQLite, every summary request would hit the database, and that adds up fast when you have many users browsing at once.

---

## 2. Your choice

The logging-service checks GDPR consent before recording any activity. If a user has not opted in, the log is silently dropped.

**What does this consent check force you to accept about your data?** It is incomplete by design — some activities will never be recorded.

From a system design perspective: where is the right place to enforce this rule — in the logging-service, in the activity-service, or at the gateway? Why?

> You have to accept that your logs will have gaps. Some users will never appear in the log table, and that is intentional. Putting the check in the logging-service makes the most sense because logging is the only service that actually cares about consent. The gateway does not know what will be done with an event, and the activity-service should not need to know about logging rules. Each service should own its own concerns. If we put the check at the gateway, we would be mixing privacy policy into routing logic, which makes both harder to change later.

---

## 3. The tradeoff

With CQRS, your write model and read model can drift out of sync — a game is updated in SQLite but the Redis projection still shows the old data.

**In what scenario does this inconsistency matter to the user? In what scenario is it completely acceptable?**

Is there a class of applications where eventual consistency is never acceptable? What are they?

> It matters when a user updates a game and immediately checks the summary — they might still see the old name or rating because Redis has not been refreshed yet. That is a bad experience if the user expects their change to show up right away. But if someone is just browsing a game catalog, seeing data that is a few seconds old is completely fine. They will not notice, and the speed gain from Redis is worth it. There are some areas where stale data is never acceptable though — anything involving money or health. A bank balance that is out of sync, even for a second, can cause real problems. The same goes for medical records or stock trades, where acting on old data can have serious consequences.

---

*Keep this file. You will refer back to it during the oral presentation.*
