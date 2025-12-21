// Type extensions for NextAuth.js v5
// Extends Session and JWT types to include GitHub OAuth access token

import NextAuth, { DefaultSession } from "next-auth";

declare module "next-auth" {
  /**
   * Extended Session interface
   * Includes GitHub OAuth access token and error state
   */
  interface Session {
    user: {
      id: string;
      name?: string;
      email?: string;
      image?: string;
    };
    accessToken: string;
    expires: string; // ISO 8601 date string
    error?: string;
  }

  /**
   * Extended User interface
   * Used during OAuth callback to capture access token
   */
  interface User {
    id: string;
    name?: string;
    email?: string;
    image?: string;
    accessToken?: string;
  }
}

declare module "@auth/core/jwt" {
  /**
   * Extended JWT interface
   * Stores access token and error state in encrypted JWT
   */
  interface JWT {
    sub: string; // User ID
    accessToken?: string;
    error?: string;
    exp: number; // Expiration timestamp
    iat: number; // Issued at timestamp
  }
}
