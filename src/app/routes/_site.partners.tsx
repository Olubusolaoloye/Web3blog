import { useEffect } from "react";
import { data, Form, Link, useNavigation } from "react-router";
import type { Route } from "./+types/_site.partners";
import { Breadcrumbs } from "~/components/layout/Breadcrumbs";
import { launchedCountries } from "~/config/countries";
import { site } from "~/config/site";
import { track } from "~/lib/analytics/track";
import { getCaptureDeps } from "~/lib/capture/deps.server";
import { budgetRanges, parseLeadForm } from "~/lib/capture/lead-schema";
import { LIMITS } from "~/lib/capture/rate-limit.server";
import { clientIp, readUtm } from "~/lib/capture/request.server";
import { getContentSource } from "~/lib/content/source.server";
import { formatDate } from "~/lib/dates";
import { breadcrumbJsonLd, graph } from "~/lib/seo/jsonld";
import { buildMeta } from "~/lib/seo/meta";

const crumbs = [
  { name: "Home", path: "/" },
  { name: "Partners", path: "/partners" },
];

export async function loader({ request }: Route.LoaderArgs) {
  const content = getContentSource();
  const [packages, settings] = await Promise.all([content.listPackages(), content.getPartnerSettings()]);
  const selected = new URL(request.url).searchParams.get("package") ?? undefined;
  return { packages, settings, selected, sample: content.name === "fixtures", jsonLd: graph(breadcrumbJsonLd(crumbs)) };
}

type ActionResult =
  | { ok: true; reference: string; packageName: string; instructions: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/**
 * Booking → b2b_leads + orders (pending) → manual invoice reference → team notification + confirmation email.
 * The price comes from the CMS package, never from the form.
 */
export async function action({ request }: Route.ActionArgs) {
  const deps = getCaptureDeps();
  const rl = await deps.limiter.limit(`lead:${clientIp(request)}`, LIMITS.lead.max, LIMITS.lead.windowSeconds);
  if (!rl.ok) return data<ActionResult>({ ok: false, error: "Too many requests. Please email us instead." }, { status: 429 });

  const parsed = parseLeadForm(await request.formData());
  if (!parsed.success) {
    const fieldErrors = Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message]));
    if (fieldErrors.fax_number) return data<ActionResult>({ ok: false, error: "Something went wrong. Please try again." }, { status: 400 });
    return data<ActionResult>({ ok: false, error: "Please fix the highlighted fields.", fieldErrors }, { status: 400 });
  }
  const input = parsed.data;
  const pkg = (await getContentSource().listPackages()).find((p) => p.code === input.package);
  if (!pkg) return data<ActionResult>({ ok: false, error: "That package isn't available.", fieldErrors: { package: "Choose a package." } }, { status: 400 });

  try {
    const utm = (await readUtm(request)) as Record<string, string>;
    const leadId = await deps.store.createLead({
      name: input.name,
      email: input.email,
      company: input.company,
      website: input.website,
      telegram: input.telegram,
      service: pkg.code,
      budget_range: input.budget,
      countries: input.countries,
      message: input.message,
      source: "partners:/partners",
      utm,
    });
    const invoice = await deps.payments.createInvoice({ packageCode: pkg.code, packageName: pkg.name, amountUsd: pkg.priceUsd, email: input.email, company: input.company });
    await deps.store.createOrder({ lead_id: leadId, package_code: pkg.code, amount_usd: pkg.priceUsd, payment_ref: invoice.reference });

    const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(pkg.priceUsd);
    const failures = await deps.notifier.notifyTeam(
      [
        `New booking: ${pkg.name} (${usd})`,
        `From: ${input.name} <${input.email}>${input.company ? `, ${input.company}` : ""}`,
        `Countries: ${input.countries.join(", ")} · Budget: ${input.budget ?? "n/a"} · Telegram: ${input.telegram ?? "n/a"}`,
        `Invoice ref: ${invoice.reference}`,
        input.message ? `Message: ${input.message}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    if (failures.length) console.error("[partners] team notification failed", failures);
    await deps.notifier
      .sendEmail({
        to: input.email,
        subject: `We've received your booking (${invoice.reference})`,
        text: `Hi ${input.name},\n\nThanks for booking ${pkg.name}. ${invoice.instructions}\n\nReference: ${invoice.reference}\n\n${site.name}`,
      })
      .catch((error: unknown) => console.error("[partners] confirmation email failed", error));

    return data<ActionResult>({ ok: true, reference: invoice.reference, packageName: pkg.name, instructions: invoice.instructions });
  } catch (error) {
    console.error("[partners] booking failed", error);
    return data<ActionResult>({ ok: false, error: `Something went wrong. Please email ${site.contactEmail}.` }, { status: 500 });
  }
}

export function meta({ data: d }: Route.MetaArgs) {
  return buildMeta({
    title: "Partners & advertising: reach crypto users in Africa",
    description: "Labelled sponsored articles, newsletter placements, directory listings and research. Public prices, self-serve booking.",
    path: "/partners",
    jsonLd: d?.jsonLd,
  });
}

const usd = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

export default function Partners({ loaderData, actionData }: Route.ComponentProps) {
  const { packages, settings, selected, sample } = loaderData;
  const busy = useNavigation().state === "submitting";
  const fe = actionData && !actionData.ok ? (actionData.fieldErrors ?? {}) : {};
  const done = actionData?.ok === true;
  useEffect(() => {
    if (done) track("lead_submit", { package: actionData.packageName });
  }, [done, actionData]);

  const err = (name: string) => (fe[name] ? <p id={`${name}-error`} className="mt-1 text-sm text-alert">{fe[name]}</p> : null);
  const field = "mt-1 h-11 w-full rounded-brand border border-border bg-bg px-3";

  return (
    <div className="container-content space-y-12 py-6 sm:py-8">
      <Breadcrumbs items={crumbs} />
      <header className="max-w-3xl space-y-3">
        <h1 className="text-3xl font-bold sm:text-4xl">{settings.headline}</h1>
        {settings.intro ? <p className="text-lg text-muted">{settings.intro}</p> : null}
        <div className="flex flex-wrap gap-3 pt-2">
          <a href="#book" className="inline-flex h-11 items-center rounded-brand bg-signal px-5 font-semibold text-on-signal">Book a package</a>
          <a href={settings.mediaKitUrl} download className="inline-flex h-11 items-center rounded-brand border border-border px-5 font-semibold" data-testid="media-kit">
            Download media kit (PDF)
          </a>
        </div>
      </header>

      {settings.audienceStats.length ? (
        <section aria-labelledby="audience" className="space-y-3">
          <h2 id="audience" className="text-xl font-semibold">Audience</h2>
          {sample ? <p className="text-sm text-warning">Sample figures for development. Real numbers are set in the CMS.</p> : null}
          <dl className="grid gap-3 sm:grid-cols-3">
            {settings.audienceStats.map((s) => (
              <div key={s.label} className="rounded-brand border border-border bg-surface p-4">
                <dt className="text-sm text-muted">{s.label}</dt>
                <dd className="tabular mt-1 text-2xl font-semibold">{s.value}</dd>
                {s.note ? <dd className="text-xs text-muted">{s.note}</dd> : null}
              </div>
            ))}
          </dl>
          <p className="text-xs text-muted">
            Markets: {settings.countries.map((c) => launchedCountries.find((x) => x.code === c)?.name ?? c.toUpperCase()).join(", ")}
            {settings.statsUpdatedAt ? ` · Updated ${formatDate(settings.statsUpdatedAt)}` : ""}
          </p>
        </section>
      ) : null}

      {settings.formats.length ? (
        <section aria-labelledby="formats" className="space-y-3">
          <h2 id="formats" className="text-xl font-semibold">Formats</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {settings.formats.map((f) => (
              <li key={f.name} className="rounded-brand border border-border bg-surface p-4">
                <p className="font-semibold">{f.name}</p>
                {f.description ? <p className="mt-1 text-sm text-muted">{f.description}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="prices" className="space-y-3">
        <h2 id="prices" className="text-xl font-semibold">Packages and prices</h2>
        <p className="text-sm text-muted">
          Public prices in USD. All paid content is labelled and follows our <Link className="underline" to="/standards#sponsored">sponsored content policy</Link>.
          We don't accept gambling, betting or loan advertisers.
        </p>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-testid="price-list">
          {packages.map((p) => (
            <li key={p.code} className="flex flex-col rounded-brand border border-border bg-surface p-4">
              <p className="font-semibold">{p.name}</p>
              <p className="tabular mt-1 text-2xl font-bold">
                {p.priceNote === "from" ? <span className="text-sm font-normal text-muted">from </span> : null}
                {usd(p.priceUsd)}
                {p.priceNote && p.priceNote !== "from" ? <span className="text-sm font-normal text-muted"> {p.priceNote}</span> : null}
              </p>
              <p className="mt-2 text-sm text-muted">{p.summary}</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {p.deliverables.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
              <Link to={`/partners?package=${p.code}#book`} preventScrollReset className="mt-auto pt-4 text-sm font-semibold text-signal-ink underline">
                Book {p.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="book" aria-labelledby="book-heading" className="mx-auto max-w-2xl scroll-mt-24 space-y-4 rounded-brand border border-border bg-surface p-4 sm:p-6">
        <h2 id="book-heading" className="text-xl font-semibold">Book a package</h2>
        {done ? (
          <div role="status" className="space-y-2" data-testid="booking-confirmation">
            <p className="font-semibold text-signal-ink">Thanks, we've got your booking for {actionData.packageName}.</p>
            <p>{actionData.instructions}</p>
            <p className="text-sm">
              Reference: <strong className="tabular">{actionData.reference}</strong>. We've emailed you a copy.
            </p>
          </div>
        ) : (
          <Form method="post" preventScrollReset className="grid gap-4" noValidate>
            {actionData && !actionData.ok ? (
              <p role="alert" className="rounded-brand border border-alert p-3 text-sm text-alert">{actionData.error}</p>
            ) : null}
            <div className="absolute -left-[9999px]" aria-hidden>
              <label htmlFor="fax_number">Fax number</label>
              <input id="fax_number" name="fax_number" type="text" tabIndex={-1} autoComplete="off" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="text-sm">
                <label htmlFor="book-name">Name</label>
                <input id="book-name" name="name" required autoComplete="name" className={field} aria-invalid={fe.name ? true : undefined} aria-describedby={fe.name ? "name-error" : undefined} />
                {err("name")}
              </div>
              <div className="text-sm">
                <label htmlFor="book-email">Work email</label>
                <input id="book-email" name="email" type="email" required autoComplete="email" className={field} aria-invalid={fe.email ? true : undefined} aria-describedby={fe.email ? "email-error" : undefined} />
                {err("email")}
              </div>
              <div className="text-sm">
                <label htmlFor="book-company">Company</label>
                <input id="book-company" name="company" autoComplete="organization" className={field} />
              </div>
              <div className="text-sm">
                <label htmlFor="book-website">Website</label>
                <input id="book-website" name="website" type="url" placeholder="https://" className={field} aria-invalid={fe.website ? true : undefined} />
                {err("website")}
              </div>
              <div className="text-sm">
                <label htmlFor="book-telegram">Telegram</label>
                <input id="book-telegram" name="telegram" placeholder="@yourname" className={field} aria-invalid={fe.telegram ? true : undefined} />
                {err("telegram")}
              </div>
              <div className="text-sm">
                <label htmlFor="book-package">Package</label>
                <select id="book-package" name="package" defaultValue={selected} className={field} aria-invalid={fe.package ? true : undefined}>
                  <option value="">Choose…</option>
                  {packages.map((p) => (
                    <option key={p.code} value={p.code}>{p.name} ({usd(p.priceUsd)})</option>
                  ))}
                </select>
                {err("package")}
              </div>
              <div className="text-sm">
                <label htmlFor="book-budget">Budget</label>
                <select id="book-budget" name="budget" className={field}>
                  <option value="">Prefer not to say</option>
                  {budgetRanges.map((b) => (
                    <option key={b.value} value={b.value}>{b.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <fieldset className="text-sm">
              <legend>Target countries</legend>
              <div className="mt-1 flex flex-wrap gap-4">
                {launchedCountries.map((c) => (
                  <label key={c.code} className="inline-flex items-center gap-2">
                    <input type="checkbox" name="countries" value={c.code} /> {c.flag} {c.name}
                  </label>
                ))}
              </div>
              {err("countries")}
            </fieldset>
            <div className="text-sm">
              <label htmlFor="book-message">Message (optional)</label>
              <textarea id="book-message" name="message" rows={4} className="mt-1 w-full rounded-brand border border-border bg-bg p-3" />
              {err("message")}
            </div>
            <label className="inline-flex items-start gap-2 text-sm">
              <input type="checkbox" name="consent" className="mt-1" />
              <span>
                I agree to be contacted about this booking. See our <Link className="underline" to="/privacy">privacy policy</Link>.
              </span>
            </label>
            {err("consent")}
            <button type="submit" disabled={busy} className="h-11 rounded-brand bg-signal px-5 font-semibold text-on-signal disabled:opacity-60">
              {busy ? "Sending…" : "Send booking request"}
            </button>
            <p className="text-xs text-muted">No payment now. We confirm dates and deliverables, then send an invoice.</p>
          </Form>
        )}
      </section>
    </div>
  );
}
