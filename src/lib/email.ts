import "server-only";

import { Resend } from "resend";
import { render } from "@react-email/components";
import { db } from "@/db/db";
import { user } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import OrderConfirmationEmail from "./emails/order-confirmation-email";
import AdminNewOrderEmail from "./emails/admin-new-order-email";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Ormani po meri <noreply@ormanipomeri.com>";

interface OrderConfirmationData {
  to: string;
  orderNumber: number;
  customerName: string;
  totalPrice: number;
  shippingStreet: string;
  shippingCity: string;
  shippingPostalCode: string;
}

export async function sendOrderConfirmationEmail(data: OrderConfirmationData) {
  const html = await render(
    OrderConfirmationEmail({
      orderNumber: data.orderNumber,
      customerName: data.customerName,
      totalPrice: data.totalPrice,
      shippingStreet: data.shippingStreet,
      shippingCity: data.shippingCity,
      shippingPostalCode: data.shippingPostalCode,
    }),
  );

  await resend.emails.send({
    from: FROM_EMAIL,
    to: data.to,
    subject: `Potvrda porudžbine #${data.orderNumber} - Ormani po meri`,
    html,
  });
}

interface AdminOrderNotificationData {
  orderId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  totalPrice: number;
  shippingStreet: string;
  shippingCity: string;
  shippingPostalCode: string;
}

export async function sendAdminNewOrderEmail(data: AdminOrderNotificationData) {
  // Get all admins who have opted in to receive order emails
  const admins = await db
    .select({ email: user.email })
    .from(user)
    .where(and(eq(user.role, "admin"), eq(user.receiveOrderEmails, true)));

  console.log(`[Admin Email] Found ${admins.length} admins with notifications enabled:`, admins.map(a => a.email));

  if (admins.length === 0) {
    // No admins opted in, skip
    return;
  }

  const html = await render(
    AdminNewOrderEmail({
      orderId: data.orderId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      customerPhone: data.customerPhone,
      totalPrice: data.totalPrice,
      shippingStreet: data.shippingStreet,
      shippingCity: data.shippingCity,
      shippingPostalCode: data.shippingPostalCode,
    }),
  );

  const orderIdShort = data.orderId.slice(0, 8).toUpperCase();

  // Send to all opted-in admins with delay to avoid rate limiting (2 req/sec on Resend)
  let sentCount = 0;
  for (const admin of admins) {
    if (sentCount > 0) {
      // Wait 1 second between emails to stay under rate limit
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    await resend.emails.send({
      from: FROM_EMAIL,
      to: admin.email,
      subject: `Nova porudžbina #${orderIdShort} - ${data.totalPrice.toLocaleString("sr-RS")} RSD`,
      html,
    });
    sentCount++;
  }
  console.log(`[Admin Email] Sent ${sentCount} admin notification emails`);
}
