// Paiements déclarés : double déclaration refusée, états protégés. Écrit au journal (non modifiable) : à lancer sur une base jetable.
// DATABASE_URL=postgresql://pride:pride@localhost:5432/pride_check pnpm --filter @pride/web exec tsx --conditions=react-server tests/paiements.check.mts
import assert from "node:assert/strict";
import { db, eq, schema, closeDb } from "@pride/db";
import { confirmPayment, declarePayment, failPayment, rejectPayment, verifyPayment } from "../src/lib/dues.ts";

const [member, other] = await db.query.members.findMany({ limit: 2 });
assert(member && other, "base avec moins de 2 membres : lancez pnpm db:seed");
await db.insert(schema.paymentAccounts).values({ provider: "MVOLA", number: "034 00 000 00", holder: "PRIDe (fictif)" }).onConflictDoNothing();
const run = Date.now();
// Échéance fictive propre à ce test (période inventée, jamais facturée).
const [due] = await db.insert(schema.dues).values({ memberId: member.id, kind: "COTISATION", period: `TEST-${run}`, amount: 10000 }).returning();
const input = { memberId: due!.memberId, dueIds: [due!.id], provider: "MVOLA" as const, phone: "034 12 345 67" };

// 1. Deux déclarations simultanées sur la même échéance : une seule passe, sans reçu ni journal.
const results = await Promise.allSettled([declarePayment({ ...input, reference: `A${run}` }), declarePayment({ ...input, reference: `B${run}` })]);
const ok = results.filter((r) => r.status === "fulfilled");
assert.equal(ok.length, 1, "une seule déclaration doit passer");
const declared = (ok[0] as PromiseFulfilledResult<any>).value;
assert.equal(declared.status, "EN_ATTENTE");
assert.equal(declared.receiptNumber, null);
assert.equal((await db.query.ledgerEntries.findMany({ where: eq(schema.ledgerEntries.paymentId, declared.id) })).length, 0);

// 2. Une référence déjà déclarée est refusée, même sur une autre échéance.
const [due2] = await db.insert(schema.dues).values({ memberId: member.id, kind: "COTISATION", period: `TEST2-${run}`, amount: 10000 }).returning();
await assert.rejects(declarePayment({ ...input, dueIds: [due2!.id], reference: declared.providerRef }), /déjà été déclarée/);

// 3. Personne ne vérifie son propre paiement.
await assert.rejects(verifyPayment(declared.id, member.id), /autre personne/);
await assert.rejects(rejectPayment(declared.id, "motif", member.id), /autre personne/);

// 4. Confirmation : reçu, échéance payée, une seule écriture ; un refus après coup ne change rien.
const paid = await verifyPayment(declared.id, other.id);
assert.equal(paid.status, "REUSSI");
assert.equal((await db.query.ledgerEntries.findMany({ where: eq(schema.ledgerEntries.paymentId, paid.id) })).length, 1);
assert.equal((await db.query.dues.findFirst({ where: eq(schema.dues.id, due!.id) }))!.status, "PAYEE");
await assert.rejects(rejectPayment(paid.id, "motif", other.id), /déjà été traité/);
await failPayment(paid.id);
assert.equal((await db.query.payments.findFirst({ where: eq(schema.payments.id, paid.id) }))!.status, "REUSSI");

// 5. Refus : l'échéance redevient payable, la référence peut resservir ; un « succès » après coup n'écrit rien au journal.
const refused = await declarePayment({ ...input, dueIds: [due2!.id], reference: `C${run}` });
await rejectPayment(refused!.id, "Référence introuvable", other.id);
const after = await db.query.payments.findFirst({ where: eq(schema.payments.id, refused!.id) });
assert.equal(after!.status, "ECHOUE");
assert.equal(after!.rejectionReason, "Référence introuvable");
assert.equal((await db.query.dues.findFirst({ where: eq(schema.dues.id, due2!.id) }))!.paymentId, null);
await confirmPayment(refused!.id);
assert.equal((await db.query.payments.findFirst({ where: eq(schema.payments.id, refused!.id) }))!.status, "ECHOUE");
assert.equal((await db.query.ledgerEntries.findMany({ where: eq(schema.ledgerEntries.paymentId, refused!.id) })).length, 0);
await declarePayment({ ...input, dueIds: [due2!.id], reference: `C${run}` });

console.log("OK : double déclaration refusée, vérification et états de paiement protégés");
await closeDb();
