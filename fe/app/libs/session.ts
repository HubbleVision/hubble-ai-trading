import { randomBytes } from "crypto";
import type { EnvContextType } from "../context";

/**
 * Session data interface
 */
export interface SessionData {
  userId: string;
  email: string;
  role: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Generate random session ID
 */
function generateSessionId(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Create session ID, format: userId:randomId
 */
function createSessionKey(userId: string): string {
  const randomId = generateSessionId();
  return `${userId}:${randomId}`;
}

/**
 * Parse session ID from cookie
 */
function parseSessionFromCookie(
  cookieValue: string
): { userId: string; sessionId: string } | null {
  try {
    const parts = cookieValue.split(":");
    if (parts.length !== 2) return null;

    const userId = parts[0];
    if (!userId) return null;

    return {
      userId,
      sessionId: cookieValue,
    };
  } catch {
    return null;
  }
}

/**
 * Create new session
 */
export async function createSession(
  sessionKV: EnvContextType["sessionKV"],
  sessionExpiry: string,
  user: { id: string; email: string; role: string }
): Promise<string> {
  const sessionId = createSessionKey(user.id);
  const expirySeconds = parseInt(sessionExpiry);
  const now = Date.now();

  const sessionData: SessionData = {
    userId: user.id,
    email: user.email,
    role: user.role,
    createdAt: now,
    expiresAt: now + expirySeconds * 1000,
  };

  await sessionKV.put(sessionId, JSON.stringify(sessionData), {
    expirationTtl: expirySeconds,
  });

  return sessionId;
}

/**
 * Session validation result interface
 */
export interface SessionValidationResult {
  isValid: boolean;
  sessionData?: SessionData;
  reason?: "not_found" | "expired" | "invalid";
}

/**
 * Validate session - enhanced version, return detailed validation result
 */
export async function validateSessionDetailed(
  sessionKV: EnvContextType["sessionKV"],
  sessionId: string
): Promise<SessionValidationResult> {
  try {
    const sessionDataStr = await sessionKV.get(sessionId);
    if (!sessionDataStr) {
      return {
        isValid: false,
        reason: "not_found",
      };
    }

    const sessionData: SessionData = JSON.parse(sessionDataStr);
    const now = Date.now();

    if (sessionData.expiresAt < now) {
      await sessionKV.delete(sessionId);
      return {
        isValid: false,
        reason: "expired",
        sessionData,
      };
    }

    return {
      isValid: true,
      sessionData,
    };
  } catch (error) {
    console.error("Fail to validate session:", error);
    return {
      isValid: false,
      reason: "invalid",
    };
  }
}

/**
 * Validate session - keep backward compatibility
 */
export async function validateSession(
  sessionKV: EnvContextType["sessionKV"],
  sessionId: string
): Promise<SessionData | null> {
  const result = await validateSessionDetailed(sessionKV, sessionId);
  return result.isValid ? result.sessionData! : null;
}

/**
 * Delete session
 */
export async function destroySession(
  sessionKV: EnvContextType["sessionKV"],
  sessionId: string
): Promise<void> {
  try {
    await sessionKV.delete(sessionId);
  } catch (error) {
    console.error("Fail to delete session:", error);
  }
}

/**
 * Get session ID from request
 */
export function getSessionFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) {
    return null;
  }

  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((cookie) => {
      const [key, value] = cookie.trim().split("=");
      return [key, value];
    })
  );

  return cookies.session_id || null;
}

/**
 * Get and parse session information from request
 */
export function parseSessionFromRequest(
  request: Request
): { userId: string; sessionId: string } | null {
  const sessionId = getSessionFromRequest(request);
  if (!sessionId) {
    return null;
  }

  return parseSessionFromCookie(sessionId);
}

/**
 * Create session cookie response headers
 */
export function createSessionHeaders(
  sessionId: string,
  sessionExpiry: string
): Headers {
  const headers = new Headers();
  const expirySeconds = parseInt(sessionExpiry);

  headers.set(
    "Set-Cookie",
    `session_id=${sessionId}; HttpOnly; Secure; SameSite=Strict; Max-Age=${expirySeconds}; Path=/`
  );

  return headers;
}

/**
 * Create clear session cookie response headers
 */
export function createLogoutHeaders(): Headers {
  const headers = new Headers();
  headers.set(
    "Set-Cookie",
    `session_id=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`
  );
  return headers;
}

/**
 * Traditional session compatibility interface - keep backward compatibility
 */
export async function getSession(request: Request) {
  const sessionId = getSessionFromRequest(request);

  return {
    get: (key: string) => {
      console.warn(
        "getSession().get() is deprecated in new session implementation, please use user information in context"
      );
      return null;
    },
    set: () => {
      console.warn(
        "getSession().set() is deprecated in new session implementation, please use createSession"
      );
    },
    destroy: () => {
      console.warn(
        "getSession().destroy() is deprecated in new session implementation, please use destroySession"
      );
    },
  };
}

/**
 * Keep original JWT related exports for backward compatibility, but marked as deprecated
 */
export function getTokenFromRequest(request: Request): string | null {
  console.warn(
    "getTokenFromRequest is deprecated, please use getSessionFromRequest"
  );
  return getSessionFromRequest(request);
}

export async function verifyJWTToken(token: string): Promise<any> {
  console.warn("verifyJWTToken is deprecated, please use validateSession");
  return null;
}

export async function createJWTToken(payload: any): Promise<string> {
  console.warn("createJWTToken is deprecated, please use createSession");
  return "";
}

export function createAuthHeaders(token: string): Headers {
  console.warn("createAuthHeaders is deprecated, please use createSessionHeaders");
  return new Headers();
}
