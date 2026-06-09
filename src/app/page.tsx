import { ArrowRight, CheckCircle2, LockKeyhole, Sheet, Workflow } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getGoogleSessionFromCookies } from "@/server/auth/google";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const [session, params] = await Promise.all([
    getGoogleSessionFromCookies(),
    searchParams,
  ]);
  const authFailed = params.auth === "failed";

  return (
    <main className="wj-brand-grid min-h-screen bg-[var(--wj-white)] text-[var(--wj-black)]">
      <section className="flex min-h-screen flex-col">
        <header className="border-b border-black bg-[rgba(244,244,244,0.94)] px-4 py-4 backdrop-blur sm:px-6 lg:px-10">
          <div className="flex items-center justify-between gap-4">
            <Link className="flex min-w-0 items-center gap-3" href="/">
              <Image
                alt="Warren James"
                className="size-11 rounded border border-black object-contain"
                height={44}
                priority
                src="/brand/warren-james-black-logo.png"
                width={44}
              />
              <span className="min-w-0">
                <span className="block text-sm font-extrabold uppercase tracking-[0.18em]">
                  Launch Ops
                </span>
                <span className="mt-1 block truncate text-xs text-[rgba(0,0,0,0.58)]">
                  Google-connected kickoff automation
                </span>
              </span>
            </Link>
            {session ? (
              <form action="/api/auth/sign-out" method="post">
                <button className="wj-action-secondary bg-white" type="submit">
                  Sign out
                </button>
              </form>
            ) : null}
          </div>
        </header>

        <div className="grid flex-1 lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)]">
          <div className="flex items-center px-4 py-10 sm:px-6 lg:px-10">
            <div className="max-w-5xl">
              <p className="wj-label">Warren James internal operations</p>
              <h1 className="mt-4 max-w-4xl text-5xl font-extrabold leading-[0.92] tracking-normal sm:text-7xl lg:text-8xl">
                Creator launches, authenticated to Google.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-[rgba(0,0,0,0.66)] sm:text-lg">
                Sign in with Google to unlock the Launch Ops console, connect the Sheets and
                Apps Script scopes, and run kickoff automation from one controlled workspace.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {session ? (
                  <Link className="wj-button-primary" href="/dashboard">
                    Continue to dashboard
                    <ArrowRight className="size-4" />
                  </Link>
                ) : (
                  <a className="wj-button-primary" href="/api/auth/google">
                    Sign in with Google
                    <ArrowRight className="size-4" />
                  </a>
                )}
                <a className="wj-action-secondary bg-white" href="#capabilities">
                  View scopes
                </a>
              </div>

              {authFailed ? (
                <div className="mt-5 rounded border border-[var(--wj-red)] bg-white px-4 py-3 text-sm font-semibold text-[var(--wj-red)]">
                  Google sign-in did not complete. Check the OAuth redirect URI and credentials.
                </div>
              ) : null}
            </div>
          </div>

          <aside className="border-t border-black bg-black p-4 text-[var(--wj-white)] lg:border-l lg:border-t-0 lg:p-6">
            <div className="flex h-full flex-col justify-between gap-8">
              <div>
                <div className="rounded border border-[rgba(244,244,244,0.24)] bg-[rgba(244,244,244,0.08)] p-4">
                  <p className="wj-label wj-invert-label">Auth status</p>
                  {session ? (
                    <div className="mt-4 flex items-center gap-3">
                      {session.user.picture ? (
                        <Image
                          alt=""
                          className="size-12 rounded-full"
                          height={48}
                          src={session.user.picture}
                          width={48}
                        />
                      ) : (
                        <div className="grid size-12 place-items-center rounded-full border border-[rgba(244,244,244,0.32)]">
                          <CheckCircle2 className="size-5" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold">{session.user.name}</p>
                        <p className="mt-1 truncate text-xs text-[rgba(244,244,244,0.6)]">
                          {session.user.email}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-4 flex items-center gap-3">
                      <div className="grid size-12 place-items-center rounded-full border border-[rgba(244,244,244,0.32)]">
                        <LockKeyhole className="size-5" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold">Google sign-in required</p>
                        <p className="mt-1 text-xs text-[rgba(244,244,244,0.6)]">
                          Dashboard and operator APIs are gated.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div id="capabilities" className="mt-4 grid gap-3">
                  <ScopeRow
                    icon={Sheet}
                    title="Sheets API"
                    text="Append pod assignment rows to the configured launch assignment sheet."
                  />
                  <ScopeRow
                    icon={Workflow}
                    title="Apps Script API"
                    text="Call a configured script function for handoff-doc automation."
                  />
                  <ScopeRow
                    icon={LockKeyhole}
                    title="Secure session"
                    text="OAuth tokens stay in encrypted, HTTP-only cookies."
                  />
                </div>
              </div>

              <div className="border-t border-[rgba(244,244,244,0.24)] pt-4">
                <p className="text-xs leading-5 text-[rgba(244,244,244,0.56)]">
                  Required Google scopes: profile, email, spreadsheets, script projects, and
                  script execution.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function ScopeRow({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Sheet;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded border border-[rgba(244,244,244,0.24)] p-4">
      <div className="flex items-center gap-2">
        <Icon className="size-4" />
        <p className="text-sm font-extrabold">{title}</p>
      </div>
      <p className="mt-2 text-xs leading-5 text-[rgba(244,244,244,0.6)]">{text}</p>
    </div>
  );
}
