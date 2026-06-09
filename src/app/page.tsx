import { ArrowRight } from "lucide-react";
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
  const demoFailed = params.auth === "demo_failed";

  return (
    <main className="grid min-h-screen place-items-center bg-[var(--wj-white)] px-4 py-8 text-[var(--wj-black)]">
      {session ? (
        <form action="/api/auth/sign-out" className="absolute right-4 top-4 sm:right-6 sm:top-6" method="post">
          <button className="wj-action-secondary bg-white" type="submit">
            Sign out
          </button>
        </form>
      ) : null}

      <section className="w-full max-w-sm text-center">
        <Image
          alt="Warren James"
          className="mx-auto size-16 rounded border border-black object-contain"
          height={64}
          priority
          src="/brand/warren-james-black-logo.png"
          width={64}
        />

        <h1 className="mt-6 text-3xl font-extrabold uppercase tracking-[0.18em]">
          Warren James HQ
        </h1>
        <p className="mt-3 text-sm italic leading-6 text-[rgba(0,0,0,0.62)]">
          Creator kickoff operations.
        </p>

        <div className="mt-8">
          {session ? (
            <Link className="wj-button-primary w-full justify-center" href="/dashboard">
              Continue to dashboard
              <ArrowRight className="size-4" />
            </Link>
          ) : (
            <a className="wj-button-primary w-full justify-center" href="/api/auth/google">
              Sign in with Google
              <ArrowRight className="size-4" />
            </a>
          )}
        </div>

        {!session ? (
          <>
            <div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs uppercase tracking-[0.18em] text-[rgba(0,0,0,0.4)]">
              <span className="h-px bg-[var(--wj-line)]" />
              <span>or</span>
              <span className="h-px bg-[var(--wj-line)]" />
            </div>

            <form action="/api/auth/demo" className="space-y-3" method="post">
              <label className="block text-left">
                <span className="wj-label">Username</span>
                <input
                  autoComplete="username"
                  className="mt-2 h-11 w-full rounded border border-black bg-white px-3 text-sm font-semibold outline-offset-2"
                  defaultValue="admin"
                  name="username"
                  required
                  type="text"
                />
              </label>
              <label className="block text-left">
                <span className="wj-label">Password</span>
                <input
                  autoComplete="current-password"
                  className="mt-2 h-11 w-full rounded border border-black bg-white px-3 text-sm font-semibold outline-offset-2"
                  defaultValue="wj123!"
                  name="password"
                  required
                  type="password"
                />
              </label>
              <button className="wj-action-secondary w-full bg-white" type="submit">
                Demo login
              </button>
            </form>
          </>
        ) : null}

        {authFailed ? (
          <p className="mt-4 rounded border border-[var(--wj-red)] bg-white px-3 py-2 text-xs font-semibold text-[var(--wj-red)]">
            Google sign-in did not complete. Try again.
          </p>
        ) : null}
        {demoFailed ? (
          <p className="mt-4 rounded border border-[var(--wj-red)] bg-white px-3 py-2 text-xs font-semibold text-[var(--wj-red)]">
            Demo username or password is incorrect.
          </p>
        ) : null}

        <p className="mt-5 text-xs text-[rgba(0,0,0,0.5)]">
          {session ? session.user.email : "Google Workspace access required"}
        </p>
      </section>
    </main>
  );
}
