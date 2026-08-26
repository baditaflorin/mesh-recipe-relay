import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-recipe-relay",
  breadcrumbs: false,
  displayName: "Recipe Relay",
  visualProfile: "gather",
  shellLayout: "inset",
  description: "A shared kitchen card where every cook contributes one clear next step.",
  accentHex: "#e9b56d",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
