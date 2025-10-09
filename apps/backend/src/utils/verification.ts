import {
  ImportUserInput,
  PrivyClient,
} from "@privy-io/server-auth";
import jwt from "jsonwebtoken";
import { PRIVY_APP_ID, PRIVY_SECRET, PRIVY_VERIFICATION_KEY } from "./env";

export type AuthedUser = { id: string };

export async function requireAuth(bearer?: string): Promise<AuthedUser> {
  if (!bearer) throw new Error('UNAUTHORIZED')
  const token = bearer.replace(/^Bearer\s+/i, '')
  return await validateTokenWithUser(token);
}

export async function validateTokenWithUser(token: string): Promise<AuthedUser> {
  const privyClient = new PrivyClient(PRIVY_APP_ID as string, PRIVY_SECRET as string, {
      walletApi: { authorizationPrivateKey: PRIVY_VERIFICATION_KEY as string },
  });

  try {
      const tokenType = detectPrivyTokenType(token);

      if (tokenType === "access_token") {
          const verifiedClaims = await privyClient.verifyAuthToken(
            token,
            PRIVY_VERIFICATION_KEY
          );
          // Avoid an extra network hop; we only need the DID
          return { id: verifiedClaims.userId };
      }

      if (tokenType === "id_token") {
          const decoded = jwt.decode(token, { complete: true }) as any;
          const sub = decoded?.payload?.sub as string | undefined;
          if (!sub) throw new Error("INVALID_ID_TOKEN");
          return { id: sub };
      }

      throw new Error("UNKNOWN_TOKEN_TYPE");
  } catch (error) {
      throw new Error("Invalid token");
  }
}

export function detectPrivyTokenType(
token: string
): "access_token" | "id_token" | "unknown" {
try {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.payload) return "unknown";

  const { iss, linked_accounts, sid, aud, sub } = decoded.payload as Record<
    string, string | undefined
  >;

  if (iss && typeof linked_accounts !== "undefined" && aud && sub) {
    return "id_token";
  }

  if (aud && sid && sub) {
    return "access_token";
  }

  return "unknown";
} catch {
  return "unknown";
}
}