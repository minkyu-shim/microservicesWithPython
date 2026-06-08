## YOU NEED TO COMMIT THIS FILE BEFORE MOVING ON TO THE NEXT MODULE ! 🚨

**feel free to delete this comment**

# Module 1 — Reflection

**Team name**: **\*\***\_\_\_**\*\***
**Branch**: `module-01/<team-name>`
**Submitted**: before Module 2 lesson

---

Answer the three questions below. There are no right or wrong answers — we are looking for your reasoning, not a textbook definition. A few honest sentences are worth more than a long generic paragraph.

---

## 1. The "why"

You started from a painful monolith. Now you're splitting it into separate services.

**What concrete problem does that split solve: and for whom?**

Think about it from three angles: the developer who has to change code, the team that has to deploy it, and the user who has to live with its failures. You don't need to cover all three, pick the one that felt most real to you today.

> _In the original painful monolithic project, a bug in a single point will crash the entire app. Let's say for example, we have a bug in the notification service. With the monolithic project, the whole GameHub will crash. However, by using microservices, everything will work except for the notification. In other words, the whole app is not going to crash._

---

## 2. Your choice

Look at your service map. Every arrow between two services is a decision someone made.

**Pick one boundary, one place where you decided service A should not be part of service B. Explain why that line exists.**

What would break, slow down, or become harder to manage if you merged those two services back together?

> _activity service and logging service -- These two may sound very similar because they both write down what happened. However, they have different role. activity service serves the user and the logging service serves the GDPR rules such as opt-in_

---

## 3. The tradeoff

Microservices solve the monolith's problems. But they create new ones.

**Name one thing that was simpler in the monolith and is now harder in your distributed design.**

No need to solve it: just name it honestly. This is exactly the tension the rest of the course is about.

> _In monolithic, the trail for an inbound request was very simple. But the microservice architecture requires more delicacy. For example, logging a game goes to gateway -> activity service -> logging service -> notification service. If something fails, it will be significantly more difficult for us to trace and find out where the error is._

---

_Keep this file. You will refer back to it during the oral presentation._
