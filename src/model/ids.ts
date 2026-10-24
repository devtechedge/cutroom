let counter = 0;

/** Collision-resistant id; crypto.randomUUID when the runtime provides it. */
export function newId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  counter = (counter + 1) % 1_000_000;
  const rand = Math.floor(Math.random() * 0xffffffff).toString(36);
  return `${Date.now().toString(36)}-${counter.toString(36)}-${rand}`;
}
