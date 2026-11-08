import { createCookie } from "react-router";

const ONE_YEAR = 60 * 60 * 24 * 365;

export const themeCookie = createCookie("hl_theme", {
  path: "/",
  sameSite: "lax",
  httpOnly: false,
  maxAge: ONE_YEAR,
});

export const countryCookie = createCookie("hl_country", {
  path: "/",
  sameSite: "lax",
  httpOnly: false,
  maxAge: ONE_YEAR,
});
