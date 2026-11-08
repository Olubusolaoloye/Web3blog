import { redirect } from "react-router";
import type { Route } from "./+types/api.theme";
import { themeCookie } from "~/lib/cookies.server";
import { safeRedirectPath } from "~/lib/redirect";
import { parseTheme } from "~/lib/theme";

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const theme = parseTheme(form.get("theme"));
  return redirect(safeRedirectPath(form.get("redirectTo")), {
    headers: { "Set-Cookie": await themeCookie.serialize(theme) },
  });
}

export function loader() {
  return redirect("/");
}
