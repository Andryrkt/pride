import { PAYMENT_PROVIDERS, type PaymentProviderId } from "@pride/shared";
import { PageTitle } from "@/components/site/app-shell";
import { ActionForm } from "@/components/ui/action-form";
import { Card } from "@/components/ui/card";
import { RequiredLegend } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { listPaymentAccounts } from "@/lib/dues";
import { canManagePaymentAccounts, requireFinances } from "@/lib/session";
import { removePaymentAccountAction } from "../actions";
import { AccountForm } from "./account-form";

/** Numéros officiels auxquels les membres envoient leurs cotisations ; un opérateur sans numéro n'est pas proposé. */
export default async function PaymentAccountsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const v = await requireFinances();
  const { ok } = await searchParams;
  const accounts = await listPaymentAccounts();
  const canManage = canManagePaymentAccounts(v);

  return (
    <>
      <PageTitle title="Numéros mobile money" sub="Les membres envoient leurs cotisations à ces numéros. Un opérateur sans numéro ne leur est pas proposé." />
      {ok && <p role="status" className="rounded-xl bg-brand-50 px-4 py-3 font-semibold text-brand-800">{ok}</p>}
      {canManage ? (
        <p className="rounded-xl bg-sun-50 px-4 py-3 text-sun-800">Vérifiez chaque chiffre : l'argent des membres partira vers ce numéro. Chaque changement est tracé et signalé par e-mail à l'association.</p>
      ) : (
        <p className="rounded-xl bg-paper px-4 py-3">Seuls le Trésorier et le conseil d'administration peuvent modifier ces numéros.</p>
      )}
      {canManage && <RequiredLegend />}
      <div className="grid gap-5 lg:grid-cols-3">
        {(Object.entries(PAYMENT_PROVIDERS) as [PaymentProviderId, string][]).map(([id, label]) => {
          const account = accounts.find((a) => a.provider === id);
          return (
            <Card key={id} className="flex flex-col gap-4">
              <h2 className="text-xl font-bold">{label}</h2>
              {canManage ? (
                <>
                  <AccountForm provider={id} number={account?.number} holder={account?.holder} />
                  {account && (
                    <ActionForm action={removePaymentAccountAction.bind(null, id)}>
                      <SubmitButton variant="ghost" size="sm" className="self-start" pendingLabel="…">Retirer ce numéro</SubmitButton>
                    </ActionForm>
                  )}
                </>
              ) : account ? (
                <p><strong>{account.number}</strong><br />{account.holder}</p>
              ) : (
                <p className="text-muted">Pas encore de numéro.</p>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}
