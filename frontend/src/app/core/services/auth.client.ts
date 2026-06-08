import { createAuthClient } from "better-auth/client";
import { environment } from "../../../environments/environment";

export const authClient = createAuthClient({
  baseURL: window.location.origin, // Pointing to the host, BetterAuth will hit /api/auth by default
});
