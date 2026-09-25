import "server-only";

import { render } from "@react-email/components";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin, captcha } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import * as schema from "@/db/schema";
import { sendEmail } from "./email-rate-limiter";
import ResetPasswordEmail from "./emails/reset-password-email";
import VerificationEmail from "./emails/verification-email";
import { validatePassword } from "./password-validation";
import { allowEmailTo, betterAuthRateLimitStorage } from "./upstash-rate-limit";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true, // Auto-login after registration
    // One-time inbox check before the first password login, so nobody can
    // register someone else's address and later share or watch that account.
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    // Opening a reset link proves the inbox is theirs. Admin-created and
    // guest-checkout accounts get their first password this way.
    onPasswordReset: async ({ user }) => {
      await db
        .update(schema.user)
        .set({ emailVerified: true, updatedAt: new Date() })
        .where(eq(schema.user.id, user.id));
    },
    sendResetPassword: async ({
      user,
      url,
    }: {
      user: { email: string };
      url: string;
    }) => {
      if (!(await allowEmailTo(user.email, "auth"))) return;
      const html = await render(ResetPasswordEmail({ url }));

      await sendEmail({
        to: user.email,
        subject: "Postavite vasu lozinku",
        html,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({
      user,
      url,
    }: {
      user: { email: string; emailVerified?: boolean };
      url: string;
    }) => {
      if (user.emailVerified) return;
      if (!(await allowEmailTo(user.email, "auth"))) return;
      // Modify the callback URL to redirect to verify-success page
      const verificationUrl = new URL(url);
      verificationUrl.searchParams.set("callbackURL", "/verify-success");
      const finalUrl = verificationUrl.toString();

      const html = await render(VerificationEmail({ url: finalUrl }));

      await sendEmail({
        to: user.email,
        subject: "Verifikujte vašu email adresu",
        html,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"], // Auto-link Google accounts to existing users with same email
    },
  },
  rateLimit: {
    customStorage: betterAuthRateLimitStorage,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 600, max: 3 },
      "/request-password-reset": { window: 3600, max: 3 },
      "/send-verification-email": { window: 3600, max: 3 },
      "/change-password": { window: 600, max: 5 },
      "/update-user": { window: 60, max: 10 },
    },
  },
  hooks: {
    // The strength rules the signup form shows, enforced for direct API calls.
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email" && ctx.path !== "/reset-password") {
        return;
      }
      const password =
        ctx.path === "/reset-password"
          ? ctx.body?.newPassword
          : ctx.body?.password;
      if (typeof password !== "string") return;
      const result = validatePassword(password);
      if (!result.valid) {
        throw new APIError("BAD_REQUEST", { message: result.error });
      }
    }),
  },
  databaseHooks: {
    user: {
      create: {
        // Checkout files phone-only guests under phone.<digits>@internal.local
        // (inserted directly, not through Better Auth). Signing up with such
        // an address would receive that guest's future orders.
        before: async (newUser) => {
          if (newUser.email?.toLowerCase().endsWith("@internal.local")) {
            return false;
          }
        },
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "user",
        input: false, // Don't allow users to set their own role
      },
      phone: {
        type: "string",
        required: false,
        input: true, // Allow users to update their phone
      },
    },
  },
  plugins: [
    admin(), // Admin plugin for role management
    // Browser requests only; the server's own auth.api calls skip it.
    captcha({
      provider: "cloudflare-turnstile",
      secretKey: process.env.TURNSTILE_SECRET_KEY as string,
      endpoints: [
        "/sign-in/email",
        "/sign-up/email",
        "/request-password-reset",
      ],
    }),
    nextCookies(), // Must be last plugin
  ],
});
