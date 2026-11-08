import type { Config } from "@react-router/dev/config";

export default {
  appDirectory: "src/app",
  ssr: true,
  // Static trust/tool shells are added here as they are built (Phase 2+), e.g. "/about", "/standards".
  async prerender() {
    return [];
  },
} satisfies Config;
