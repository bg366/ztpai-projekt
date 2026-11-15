import { EventEmitter } from "node:events";
import type { Pool } from "pg";
export interface DomainEvent {
  type: string;
  actorId: string;
  userId?: string;
  message?: string;
  payload: Record<string, unknown>;
}
export class DomainEvents {
  private emitter = new EventEmitter();
  private pending = new Set<Promise<unknown>>();
  on(handler: (event: DomainEvent) => Promise<void>) {
    this.emitter.on("event", handler);
  }
  publish(event: DomainEvent) {
    // Publikacja następuje po COMMIT. Każdy odbiorca pracuje niezależnie.
    for (const handler of this.emitter.listeners("event")) {
      const job = Promise.resolve()
        .then(() => handler(event))
        .catch((error) =>
          console.error(
            "Odbiorca zdarzenia nie powiódł się:",
            event.type,
            error.message,
          ),
        );
      this.pending.add(job);
      void job.finally(() => this.pending.delete(job));
    }
  }
  async drain() {
    while (this.pending.size) await Promise.allSettled([...this.pending]);
  }
}
export function attachListeners(events: DomainEvents, pool: Pool) {
  events.on(async (event) => {
    await pool.query(
      "INSERT INTO audit_events(type,actor_id,payload) VALUES($1,$2,$3)",
      [event.type, event.actorId, JSON.stringify(event.payload)],
    );
  });
  events.on(async (event) => {
    if (event.userId && event.message)
      await pool.query(
        "INSERT INTO notifications(user_id,message) VALUES($1,$2)",
        [event.userId, event.message],
      );
  });
}
