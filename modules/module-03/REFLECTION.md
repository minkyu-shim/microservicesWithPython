# Module 3 — Reflection

**Team name**: _______________
**Branch**: `module-03/<team-name>`
**Submitted**: before Module 4 lesson

---

Answer the three questions below. There are no right or wrong answers — we are looking for your reasoning, not a textbook definition. A few honest sentences are worth more than a long generic paragraph.

---

## 1. The "why"

All client requests now go through the gateway. No client ever calls a service directly.

**Why does that single entry point exist? What would the client's life look like without it?**

Think about what the client would need to know and manage if it talked to each service on its own port.

> Without the gateway the client would need to know the port of every single service. And if you add a new service or move one you have to go update every client that talks to it which is a lot of work. With the gateway everyone just sends requests to port 8000 and they dont need to know anything else about whats running behind it.

---

## 2. Your choice

The activity-service makes two outbound calls: one to validate the user (with retry logic), one to fetch game data (with a null fallback if it fails).

**Why are these two calls treated differently? Why does one retry and the other just give up gracefully?**

What is the consequence for the user in each case if the downstream service is unavailable?

> If the user doesnt exist then the activity shouldnt be saved at all because its just wrong data so that one has to fail. But the game info is just extra stuff we add to the response. The activity still gets saved either way so if game service is down we just put null there and thats fine. It would be annoying if the whole thing failed just because we couldnt fetch some game details.

---

## 3. The tradeoff

Every time a client creates an activity, three services are involved synchronously. They all have to be running, healthy, and fast.

**What is the systemic risk of chaining synchronous calls like this?**

What happens to the user experience if the slowest service in the chain takes 3 seconds to respond?

> Everything has to wait for everything else so if one service is slow the whole request is slow. Like if user service takes 3 seconds then the user is already waiting 3 seconds before we even call game service. And if any one of the services goes down the whole thing breaks. The more services you add to the chain the more things can go wrong at the same time.

---

*Keep this file. You will refer back to it during the oral presentation.*
