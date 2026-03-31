import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import {
  isAdminUser,
  listOrgsForAdminPage,
} from "@/server/services/admin.service";
import {
  assignOrgAdminAction,
  removeOrgAdminAction,
  assignTournamentCreatorAction,
  removeTournamentCreatorAction,
} from "@/server/actions/admin.actions";
import { AssignOrgAdminForm } from "@/components/admin/AssignOrgAdminForm";
import { AssignTournamentCreatorForm } from "@/components/admin/AssignTournamentCreatorForm";

export const metadata = { title: "Admin — RallyBase" };

export default async function AdminDashboardPage() {
  const { userId } = await auth();
  if (!userId || !(await isAdminUser(userId))) notFound();

  const { platformAdmin, orgs } = await listOrgsForAdminPage(userId);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="space-y-10">
        <div>
          <h1 className="text-3xl font-semibold text-text-1">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-text-3">
            {platformAdmin ? "Platform administrator controls." : "Org admin controls."}
          </p>
        </div>

        {/* Quick links — platform admin only */}
        {platformAdmin && (
          <section className="flex gap-3">
            <Link
              href="/admin/players"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-accent-dim"
            >
              Manage Players
            </Link>
            <Link
              href="/admin/tournaments"
              className="rounded-md border border-border bg-elevated px-4 py-2 text-sm font-medium text-text-1 transition-colors hover:bg-surface-hover"
            >
              All Tournaments
            </Link>
          </section>
        )}

        {/* Per-org management cards */}
        <section className="space-y-6">
          {orgs.map((org) => (
            <div key={org.id} className="rounded-lg border border-border bg-elevated p-4 space-y-6">
              <h2 className="text-sm font-semibold text-text-1">{org.name}</h2>

              {/* Org admins — platform admin only */}
              {platformAdmin && (
                <div className="space-y-3">
                  <h3 className="text-xs font-medium uppercase tracking-wide text-text-3">Org Admins</h3>
                  {org.orgAdmins.length === 0 ? (
                    <p className="text-sm text-text-3">No org admins assigned.</p>
                  ) : (
                    <ul className="divide-y divide-border-subtle overflow-hidden rounded-md border border-border">
                      {org.orgAdmins.map((oa) => (
                        <li
                          key={oa.id}
                          className="flex items-center justify-between bg-surface px-3 py-2"
                        >
                          <div>
                            <p className="text-sm text-text-1">
                              {oa.user.playerProfile?.displayName ?? oa.user.name}
                              {oa.user.playerProfile && (
                                <span className="ml-2 text-xs text-text-3">
                                  #{oa.user.playerProfile.playerNumber}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-text-3">{oa.user.email}</p>
                          </div>
                          <form action={removeOrgAdminAction.bind(null, oa.id)}>
                            <button
                              type="submit"
                              className="text-xs text-red-400 hover:text-red-300 transition-colors"
                            >
                              Remove
                            </button>
                          </form>
                        </li>
                      ))}
                    </ul>
                  )}
                  <AssignOrgAdminForm
                    organizationId={org.id}
                    action={assignOrgAdminAction.bind(null, org.id)}
                  />
                </div>
              )}

              {/* Tournament creator allowlist */}
              <div className="space-y-3">
                <h3 className="text-xs font-medium uppercase tracking-wide text-text-3">Tournament Creators</h3>
                {org.tournamentCreatorAllowlist.length === 0 ? (
                  <p className="text-sm text-text-3">No approved tournament creators.</p>
                ) : (
                  <ul className="divide-y divide-border-subtle overflow-hidden rounded-md border border-border">
                    {org.tournamentCreatorAllowlist.map((tc) => (
                      <li
                        key={tc.id}
                        className="flex items-center justify-between bg-surface px-3 py-2"
                      >
                        <div>
                          <p className="text-sm text-text-1">
                            {tc.user.playerProfile?.displayName ?? tc.user.name}
                            {tc.user.playerProfile && (
                              <span className="ml-2 text-xs text-text-3">
                                #{tc.user.playerProfile.playerNumber}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-text-3">{tc.user.email}</p>
                        </div>
                        <form action={removeTournamentCreatorAction.bind(null, tc.id)}>
                          <button
                            type="submit"
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                          >
                            Remove
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
                <AssignTournamentCreatorForm
                  organizationId={org.id}
                  action={assignTournamentCreatorAction.bind(null, org.id)}
                />
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
