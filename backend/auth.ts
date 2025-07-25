import { and, eq, gt } from 'drizzle-orm';
import { importJWK, jwtVerify, SignJWT } from 'jose';
import { db } from './db';
import { sessions, users, type User } from './schema';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

interface AppleJWK {
  kty: string;
  kid: string;
  use: string;
  alg: string;
  n: string;
  e: string;
}

interface AppleKeysResponse {
  keys: AppleJWK[];
}

// Cache for Apple's public keys
let appleKeys: AppleJWK[] | null = null;
let keysLastFetched: number = 0;
const KEYS_CACHE_DURATION = 60 * 60 * 1000; // 1 hour

async function getApplePublicKeys(): Promise<AppleJWK[]> {
  const now = Date.now();
  
  // Return cached keys if they're still fresh
  if (appleKeys && (now - keysLastFetched) < KEYS_CACHE_DURATION) {
    return appleKeys;
  }
  
  try {
    const response = await fetch('https://appleid.apple.com/auth/keys');
    if (!response.ok) {
      throw new Error(`Failed to fetch Apple keys: ${response.status}`);
    }
    
    const data = await response.json() as AppleKeysResponse;
    appleKeys = data.keys;
    keysLastFetched = now;
    
    return appleKeys;
  } catch (error) {
    console.error('Error fetching Apple public keys:', error);
    throw new Error('Failed to fetch Apple public keys');
  }
}

export interface AppleTokenPayload {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  c_hash: string;
  email?: string;
  email_verified?: string;
  is_private_email?: string;
  auth_time: number;
  nonce_supported: boolean;
}

export async function verifyAppleToken(identityToken: string): Promise<AppleTokenPayload> {
  try {
    // Parse the token header to get the key ID
    const parts = identityToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid token format');
    }
    
    const header = JSON.parse(atob(parts[0]!));
    const kid = header.kid;
    
    if (!kid) {
      throw new Error('Token missing key ID');
    }
    
    // Get Apple's public keys
    const appleKeys = await getApplePublicKeys();
    
    // Find the key that matches the token's key ID
    const matchingKey = appleKeys.find(key => key.kid === kid);
    if (!matchingKey) {
      throw new Error('No matching public key found');
    }
    
    // Import the JWK for verification
    const publicKey = await importJWK(matchingKey, matchingKey.alg);
    
    // Verify the token
    const { payload } = await jwtVerify(identityToken, publicKey, {
      issuer: 'https://appleid.apple.com',
      audience: process.env.APPLE_CLIENT_ID, // You should set this in your environment
    });
    
    return payload as unknown as AppleTokenPayload;
  } catch (error) {
    console.error('Apple token verification failed:', error);
    throw new Error('Invalid Apple token');
  }
}

export async function createUserSession(appleId: string, email?: string): Promise<{ user: User; token: string }> {
  // Check if user exists
  let [user] = await db.select().from(users).where(eq(users.appleId, appleId));
  
  if (!user) {
    // Create new user
    const newUser = {
      id: crypto.randomUUID(),
      appleId,
      email,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db.insert(users).values(newUser);
    user = newUser as User;
  }

  // Create session token
  const sessionId = crypto.randomUUID();
  const token = await new SignJWT({ userId: user.id, sessionId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);

  // Store session in database
  await db.insert(sessions).values({
    id: sessionId,
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    createdAt: new Date(),
  });

  return { user, token };
}

export async function verifySession(token: string): Promise<User | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const { userId, sessionId } = payload as { userId: string; sessionId: string };

    // Check if session exists and is not expired
    const [session] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.id, sessionId),
          eq(sessions.token, token),
          gt(sessions.expiresAt, new Date())
        )
      );

    if (!session) {
      return null;
    }

    // Get user
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user || null;
  } catch (error) {
    console.error('Session verification failed:', error);
    return null;
  }
}
