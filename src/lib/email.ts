import "server-only";

import { render } from "@react-email/components";
import { db } from "@/db/db";
import { user } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import OrderConfirmationEmail from "./emails/order-confirmation-email";
import AdminNewOrderEmail from "./emails/admin-new-order-email";
import { sendEmail } from "./email-rate-limiter";

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

  await sendEmail({
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

  console.log(
    `[Admin Email] Found ${admins.length} admins with notifications enabled:`,
    admins.map((a) => a.email),
  );

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

  // Send to all opted-in admins (rate limiter handles delays automatically)
  for (const admin of admins) {
    await sendEmail({
      to: admin.email,
      subject: `Nova porudžbina #${orderIdShort} - ${data.totalPrice.toLocaleString("sr-RS")} RSD`,
      html,
    });
  }
  console.log(`[Admin Email] Sent ${admins.length} admin notification emails`);
}
