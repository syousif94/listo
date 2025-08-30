import { and, eq } from 'drizzle-orm';
import { importJWK, jwtVerify, SignJWT } from 'jose';
import { db } from './db';
import { users, userTokens, type User } from './schema';

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
  if (appleKeys && now - keysLastFetched < KEYS_CACHE_DURATION) {
    return appleKeys;
  }

  try {
    const response = await fetch('https://appleid.apple.com/auth/keys');
    if (!response.ok) {
      throw new Error(`Failed to fetch Apple keys: ${response.status}`);
    }

    const data = (await response.json()) as AppleKeysResponse;
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

export async function verifyAppleToken(
  identityToken: string
): Promise<AppleTokenPayload> {
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
    const matchingKey = appleKeys.find((key) => key.kid === kid);
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

export async function createUserSession(
  appleId: string,
  email?: string,
  name?: string
): Promise<{ user: User; token: string }> {
  console.log('createUserSession called with:', { appleId, email, name });

  // Check if user exists
  let [user] = await db.select().from(users).where(eq(users.appleId, appleId));

  if (!user) {
    console.log('Creating new user');
    // Create new user
    const newUser = {
      id: crypto.randomUUID(),
      appleId,
      email,
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.insert(users).values(newUser);
    user = newUser as User;
    console.log('New user created:', { id: user.id, name: user.name });
  } else {
    console.log('Existing user found:', { id: user.id, name: user.name });
    // Update existing user's name if provided and not already set
    if (name && !user.name) {
      console.log('Updating user name from', user.name, 'to', name);
      await db
        .update(users)
        .set({ name, updatedAt: new Date() })
        .where(eq(users.id, user.id));

      // Update the user object to reflect the change
      user = { ...user, name, updatedAt: new Date() };
      console.log('User name updated:', { id: user.id, name: user.name });
    }
  }

  // Create JWT token with no expiration
  const tokenId = crypto.randomUUID();
  const jwt = await new SignJWT({ userId: user.id, tokenId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    // No expiration time set for permanent tokens
    .sign(JWT_SECRET);

  // Store JWT in database
  await db.insert(userTokens).values({
    id: tokenId,
    userId: user.id,
    jwt,
    isActive: true,
    createdAt: new Date(),
  });

  return { user, token: jwt };
}

export async function verifySession(jwt: string): Promise<User | null> {
  try {
    const { payload } = await jwtVerify(jwt, JWT_SECRET);
    const { userId, tokenId } = payload as { userId: string; tokenId: string };

    // Check if JWT token exists and is active
    const [userToken] = await db
      .select()
      .from(userTokens)
      .where(
        and(
          eq(userTokens.id, tokenId),
          eq(userTokens.jwt, jwt),
          eq(userTokens.isActive, true)
        )
      );

    if (!userToken) {
      return null;
    }

    // Update last used timestamp
    await db
      .update(userTokens)
      .set({ lastUsedAt: new Date() })
      .where(eq(userTokens.id, tokenId));

    // Get user
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return user || null;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export async function revokeToken(jwt: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(jwt, JWT_SECRET);
    const { tokenId } = payload as { tokenId: string };

    // Deactivate the token
    await db
      .update(userTokens)
      .set({ isActive: false })
      .where(eq(userTokens.id, tokenId));

    return true;
  } catch (error) {
    console.error('Token revocation failed:', error);
    return false;
  }
}
