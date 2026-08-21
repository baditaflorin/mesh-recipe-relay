import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-recipe-relay",
  description: "A browser-local, turn-based recipe relay with one safe step per peer.",
  accentHex: "#ef8354",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
