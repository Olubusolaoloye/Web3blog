import type { RouteConfig } from "@react-router/dev/routes";
import { flatRoutes } from "@react-router/fs-routes";

// File names in ./routes follow CLAUDE.md §3 (flat routes convention).
export default flatRoutes() satisfies RouteConfig;
