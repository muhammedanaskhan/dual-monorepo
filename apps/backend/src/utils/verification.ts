import {
    ImportUserInput,
    PrivyClient,
    User,
    WalletWithMetadata,
  } from "@privy-io/server-auth";
import jwt from "jsonwebtoken";
import { PRIVY_APP_ID, PRIVY_SECRET, PRIVY_VERIFICATION_KEY } from "./env";


export async function requireAuth(bearer?: string): Promise<User> {
    if (!bearer) throw new Error('UNAUTHORIZED')
    const token = bearer.replace(/^Bearer\s+/i, '')

    return await validateTokenWithUser(token);
  }
  
export async function validateTokenWithUser(token: string): Promise<User> {
    const privyClient = new PrivyClient(PRIVY_APP_ID as string, PRIVY_SECRET as string, {
        walletApi: {
          authorizationPrivateKey: PRIVY_VERIFICATION_KEY as string,
        },
      });
      try {
        const tokenType = detectPrivyTokenType(token);
  
        if (tokenType === "access_token") {
          const verifiedClaims = await privyClient.verifyAuthToken(
            token,
            PRIVY_VERIFICATION_KEY
          );

  
          const user = await privyClient.getUserById(verifiedClaims.userId);
  
          return (user);
        }
  
        if (tokenType === "id_token") {
          const user = await privyClient.getUserFromIdToken(token);
          return (user);
        }
  
        throw new Error("Unknown token type");
      } catch (error) {
        throw new Error("Invalid token");
      }
    }

export function detectPrivyTokenType(
  token: string
): "access_token" | "id_token" | "unknown" {
  try {
    const decoded = jwt.decode(token, { complete: true });

    if (!decoded || !decoded.payload) {
      return "unknown";
    }

    const { iss, linked_accounts, sid, aud, sub } = decoded.payload as Record<
      string,
      string | undefined
    >;

    // ✅ ID Token Detection (OIDC)
    // payload {
    //   cr: '1738077809',
    //   linked_accounts: '[{"type":"email","address":"mbeltowski@fountainplatform.com","lv":1741274061},{"type":"wallet","address":"0x4c5fF9dD74F8677684EAB3B011C9C2cfc0A60881","chain_type":"ethereum","wallet_client_type":"privy","lv":1738085847},{"type":"wallet","address":"9vi9Tt14Yr3zDctzUHNHBcVRknkMaxo8myLKdiKJrsLi","chain_type":"solana","wallet_client_type":"privy","lv":1738085847},{"type":"smart_wallet","smart_wallet_type":"kernel","lv":1738085850,"address":"0x1491c16383Ed7FcBf960DbbE87E271101AD3c7dd"}]',
    //   iss: 'privy.io',
    //   iat: 1741274197,
    //   aud: 'cm4htn60w00jnjgubmwgyuicl',
    //   sub: 'did:privy:cm6gmngzq01ta12y0pe6lkate',
    //   exp: 1741277797
    // }
    if (iss && typeof linked_accounts !== "undefined" && aud && sub) {
      return "id_token";
    }

    // ✅ Access Token Detection (OAuth2)
    //   payload {
    //   sid: 'cm7xhm8fy00i2wdttrisd4r12',
    //   iss: 'privy.io',
    //   iat: 1741274061,
    //   aud: 'cm4htn60w00jnjgubmwgyuicl',
    //   sub: 'did:privy:cm6gmngzq01ta12y0pe6lkate',
    //   exp: 1741277661
    // }
    if (aud && sid && sub) {
      return "access_token";
    }

    return "unknown";
  } catch {
    return "unknown";
  }
}