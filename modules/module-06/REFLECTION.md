# Module 6 — Reflection

**Team name**: _______________
**Branch**: `module-06/<team-name>`
**Submitted**: before Module 7 lesson

---

Answer the three questions below. There are no right or wrong answers — we are looking for your reasoning, not a textbook definition. A few honest sentences are worth more than a long generic paragraph.

---

## 1. The "why"

The gateway now validates every JWT before forwarding a request. Individual services no longer need to check identity themselves.

**What does centralising authentication at the gateway buy you?** What would the alternative look like — if every service validated tokens on its own?

Think about what happens when you need to rotate the secret key, or add a new service to the system.

> Doing auth in one place means you only have to get it right once. If every service checked tokens on its own, each one would need the secret key, and every time you change the key or the validation logic you have to update and redeploy all of them. Adding a new service would mean wiring auth into that too. With the gateway handling it, services behind it can trust that whoever got through is already verified. They just focus on their own job.

---

## 2. Your choice

When activity-service calls user-service internally, it uses a Machine-to-Machine (M2M) token — not a user's token.

**Why can't it just reuse the user's token that arrived in the original request?**

What would break, or what door would you accidentally leave open, if services passed user tokens between themselves?

> If activity-service forwarded the user's token to user-service, then user-service would see that request as coming from the user, not from activity-service. That means a normal user's token could be used to call internal endpoints that were never meant to be user-facing. It also makes it hard to know which service actually made a request, because the token always says "user X" instead of "activity-service". The M2M token keeps internal traffic clearly separate from user traffic.

---

## 3. The tradeoff

The gateway and the auth-service share the same `SECRET_KEY` to verify tokens without making a network call on every request.

**What is the security risk of sharing this key?** What happens if it leaks?

And what would the alternative look like — verifying tokens by calling auth-service on every request instead? What does that cost you?

> If the secret key leaks, anyone who has it can sign their own tokens and pretend to be any user, including an admin. That is a total break — you have to rotate the key and invalidate everything immediately. The alternative is to call auth-service on every single request to verify the token. That is safer in some ways because the key lives in one place, but it means every request now depends on a network call to auth-service. If auth-service is slow or goes down, everything stops working. Shared key is faster but riskier if it ever gets out.

---

*Keep this file. You will refer back to it during the oral presentation.*
