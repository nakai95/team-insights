import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

/**
 * NextAuth.js v5 Configuration
 *
 * Features:
 * - GitHub OAuth provider with custom scopes (read:user, user:email, repo)
 * - JWT-based session strategy (no database required)
 * - 7-day session expiry with 24-hour activity-based extension
 * - Access token stored in encrypted JWT
 * - Custom error pages for authentication failures
 *
 * Environment Variables Required:
 * - AUTH_GITHUB_ID: GitHub OAuth app client ID
 * - AUTH_GITHUB_SECRET: GitHub OAuth app client secret
 * - AUTH_SECRET: Secret for JWT encryption (min 32 characters)
 */
export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: {
        params: {
          // Request GitHub OAuth scopes for repository analysis
          // read:user - Read user profile information
          // user:email - Access user email addresses
          // repo - Full control of private repositories (required for private repo access)
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt", // JWT-based sessions (no database required)
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    updateAge: 24 * 60 * 60, // Extend session every 24 hours of activity
  },
  pages: {
    signIn: "/login", // Custom login page
    error: "/auth/error", // Custom error page
  },
  callbacks: {
    /**
     * JWT Callback
     * Called when a JWT is created or updated.
     * Stores the GitHub OAuth access token in the JWT.
     */
    async jwt({ token, account }) {
      // On initial sign-in, account will contain the OAuth access token
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
        };
      }

      // For subsequent requests, return the existing token
      return token;
    },

    /**
     * Session Callback
     * Called when a session is checked.
     * Adds the access token from JWT to the session object.
     */
    async session({ session, token }) {
      return {
        ...session,
        accessToken: token.accessToken as string,
        error: token.error as string | undefined,
      };
    },
  },
});
