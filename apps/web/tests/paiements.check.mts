// Paiements : double paiement refusé, états protégés. Écrit au journal (non modifiable) : à lancer sur une base jetable.
// DATABASE_URL=postgresql://pride:pride@localhost:5432/pride_check pnpm --filter @pride/web exec tsx --conditions=react-server tests/paiements.check.mts
import assert from "node:assert/strict";
import { db, eq, schema, closeDb } from "@pride/db";
import { confirmPayment, failPayment, payDues } from "../src/lib/dues.ts";

const member = await db.query.members.findFirst();
assert(member, "base sans membre : lancez pnpm db:seed");
// Échéance fictive propre à ce test (période inventée, jamais facturée).
const [due] = await db.insert(schema.dues).values({ memberId: member.id, kind: "COTISATION", period: `TEST-${Date.now()}`, amount: 10000 }).returning();
const input = { memberId: due.memberId, dueIds: [due.id], provider: "MVOLA" as const, phone: "034 12 345 67" };

// 1. Deux paiements simultanés sur la même échéance : un seul passe.
const results = await Promise.allSettled([payDues(input), payDues(input)]);
const ok = results.filter((r) => r.status === "fulfilled");
assert.equal(ok.length, 1, "un seul paiement doit réussir");
const paid = (ok[0] as PromiseFulfilledResult<any>).value;
assert.equal(paid.status, "REUSSI");
const ledger = await db.query.ledgerEntries.findMany({ where: eq(schema.ledgerEntries.paymentId, paid.id) });
assert.equal(ledger.length, 1);
assert.equal((await db.query.dues.findFirst({ where: eq(schema.dues.id, due.id) }))!.status, "PAYEE");

// 2. Une notification « échec » après le succès ne change rien.
await failPayment(paid.id);
assert.equal((await db.query.payments.findFirst({ where: eq(schema.payments.id, paid.id) }))!.status, "REUSSI");

// 3. Un « succès » après un échec n'écrit rien au journal.
const [pending] = await db.insert(schema.payments).values({ memberId: due.memberId, amount: 1000, provider: "MVOLA" }).returning();
await failPayment(pending!.id);
await confirmPayment(pending!.id);
assert.equal((await db.query.payments.findFirst({ where: eq(schema.payments.id, pending!.id) }))!.status, "ECHOUE");
assert.equal((await db.query.ledgerEntries.findMany({ where: eq(schema.ledgerEntries.paymentId, pending!.id) })).length, 0);

console.log("OK : double paiement refusé, états de paiement protégés");
await closeDb();
