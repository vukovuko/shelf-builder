import "server-only";

import { render } from "@react-email/components";
import { db } from "@/db/db";
import { user } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import OrderConfirmationEmail from "./emails/order-confirmation-email";
import AdminNewOrderEmail from "./emails/admin-new-order-email";
import InvoiceEmail from "./emails/invoice-email";
import { sendEmail } from "./email-rate-limiter";
import { generateIpsQrBuffer } from "./ips-qr";
import { getPaymentConfig, formatAccountNumber } from "./payment-config";

interface OrderConfirmationData {
  to: string;
  orderNumber: number;
  customerName: string;
  totalPrice: number;
  basePrice?: number;
  adjustments?: { description: string; amount: number }[];
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
      basePrice: data.basePrice,
      adjustments: data.adjustments,
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
  orderNumber: number;
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

  // Send to all opted-in admins (rate limiter handles delays automatically)
  for (const admin of admins) {
    await sendEmail({
      to: admin.email,
      subject: `Nova porudžbina #${data.orderNumber} - ${data.totalPrice.toLocaleString("sr-RS")} RSD`,
      html,
    });
  }
}

// ── Invoice email (priznanica + IPS QR) ──────────────────────────────

interface InvoiceEmailData {
  to: string;
  orderNumber: number;
  customerName: string;
  totalPrice: number;
}

/**
 * Send an invoice email with a Serbian priznanica (payment slip) and IPS QR code.
 * Reusable — call from checkout route, admin "send invoice" button, etc.
 */
export async function sendInvoiceEmail(data: InvoiceEmailData) {
  const config = await getPaymentConfig();
  const paymentPurpose = `Porudzbina #${data.orderNumber}`;
  const referenceNumber = `00${data.orderNumber}`;

  const qrCid = "ips-qr";
  const qrBuffer = await generateIpsQrBuffer({
    receiverName: config.receiverName,
    receiverAccount: config.receiverAccount,
    amount: data.totalPrice,
    paymentCode: config.paymentCode,
    paymentPurpose,
    referenceNumber,
  });

  const html = await render(
    InvoiceEmail({
      orderNumber: data.orderNumber,
      customerName: data.customerName,
      totalPrice: data.totalPrice,
      qrCid,
      receiverName: config.receiverName,
      receiverAccountFormatted: formatAccountNumber(config.receiverAccount),
      paymentCode: config.paymentCode,
      paymentPurpose,
      referenceNumber,
    }),
  );

  await sendEmail({
    to: data.to,
    subject: `Faktura za porudžbinu #${data.orderNumber} - Ormani po meri`,
    html,
    attachments: [
      {
        filename: "ips-qr.png",
        content: qrBuffer,
        contentId: qrCid,
        contentType: "image/png",
      },
    ],
  });
}
