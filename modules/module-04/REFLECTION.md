# Module 4 — Reflection

**Team name**: minkyu
**Branch**: `module-04/minkyu`
**Submitted**: before Module 5 lesson

---

## 1. What happens if notification-service is down when the message is published?

The activity still gets created. The activity is saved to the database before the message is ever sent. If RabbitMQ has a problem or notification-service is down, the publisher logs the error and moves on. The user gets a success response either way. The notification just gets lost quietly — no retry, no alarm.

So no, the activity creation should not fail. The two things are separate. Saving an activity and sending a notification are not the same operation, and one should not depend on the other.

---

## 2. Why use a broker instead of calling notification-service directly over HTTP?

When we called game-service in Module 3, we needed the data right away to build the response. The activity response couldn't be returned without it, so a direct HTTP call made sense.

Notifications are different. Nobody is waiting for them. If we called notification-service over HTTP, every activity creation would slow down or break whenever notification-service had a problem. With RabbitMQ in the middle, activity-service drops the message and walks away. It doesn't care what happens next. The two services don't even need to be running at the same time.

---

## 3. What visibility do you lose compared to a synchronous call?

With a direct HTTP call, you get an answer immediately — it worked or it didn't. Here you have no idea. You know the message was published to RabbitMQ, but you don't know if notification-service ever picked it up, processed it, or crashed halfway through.

As a developer, you'd need extra tools to figure out what actually happened — the RabbitMQ management dashboard, dead-letter queues for failed messages, or logs on the notification-service side. None of that is automatic. You have to build it in.

---

*Keep this file. You will refer back to it during the oral presentation.*
