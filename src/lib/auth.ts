import "server-only";

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { Resend } from "resend";
import { render } from "@react-email/components";
import { db } from "@/db/db";
import * as schema from "@/db/schema";
import VerificationEmail from "./emails/verification-email";

const resend = new Resend(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true, // Auto-login after registration
    requireEmailVerification: true,
  },
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
      const html = await render(VerificationEmail({ url }));

      await resend.emails.send({
        from: "Ormani po meri <noreply@ormanipomeri.com>",
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
    nextCookies(), // Must be last plugin
  ],
});
