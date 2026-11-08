import { redirect } from "react-router";
import type { Route } from "./+types/api.country";
import { getCountry } from "~/config/countries";
import { countryCookie } from "~/lib/cookies.server";
import { safeRedirectPath } from "~/lib/redirect";

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const country = getCountry(String(form.get("country") ?? ""));
  const to = safeRedirectPath(form.get("redirectTo"));
  if (!country) return redirect(to);
  return redirect(to, { headers: { "Set-Cookie": await countryCookie.serialize(country.code) } });
}

export function loader() {
  return redirect("/");
}
