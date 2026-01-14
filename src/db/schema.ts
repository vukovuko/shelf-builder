import { relations } from "drizzle-orm";
import {
  boolean,
  integer,
  json,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Role enum - expandable for future roles
export const roleEnum = pgEnum("user_role", ["user", "admin"]);

// Order status enums
export const orderStatusEnum = pgEnum("order_status", [
  "open",
  "archived",
  "cancelled",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "unpaid",
  "pending",
  "partially_paid",
  "paid",
  "partially_refunded",
  "refunded",
  "voided",
]);

export const fulfillmentStatusEnum = pgEnum("fulfillment_status", [
  "unfulfilled",
  "in_progress",
  "on_hold",
  "scheduled",
  "partially_fulfilled",
  "fulfilled",
]);

export const returnStatusEnum = pgEnum("return_status", [
  "none",
  "return_requested",
  "return_in_progress",
  "returned",
  "inspection_complete",
]);

// Better Auth Tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  phone: text("phone"),
  role: roleEnum("role").notNull().default("user"),
  banned: boolean("banned").default(false),
  banReason: text("banReason"),
  receiveOrderEmails: boolean("receiveOrderEmails").default(false),
  tags: text("tags"), // JSON array: '["vip","loyal"]'
  notes: text("notes"), // Internal admin notes
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

// App-specific tables
export const wardrobes = pgTable("wardrobe", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  data: json("data").notNull().$type<Record<string, any>>(),
  thumbnail: text("thumbnail"), // Base64 data URL of canvas screenshot
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

// Relations
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  wardrobes: many(wardrobes),
  orders: many(orders),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const wardrobeRelations = relations(wardrobes, ({ one, many }) => ({
  user: one(user, {
    fields: [wardrobes.userId],
    references: [user.id],
  }),
  orders: many(orders),
}));

// Materials table
export const materials = pgTable("material", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  img: text("img"),
  thickness: integer("thickness"),
  stock: integer("stock").default(0),
  category: text("category").notNull(),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

// Orders table
export const orders = pgTable("order", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  // Human-readable order number (like Shopify #1001, #1002)
  orderNumber: serial("orderNumber").notNull(),
  // User (guest users created without account/session)
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  // Optional linked wardrobe
  wardrobeId: text("wardrobeId").references(() => wardrobes.id, {
    onDelete: "set null",
  }),
  // Materials
  materialId: integer("materialId")
    .notNull()
    .references(() => materials.id),
  backMaterialId: integer("backMaterialId").references(() => materials.id),
  // Dimensions and pricing
  area: integer("area").notNull(), // Area in cm² for precision
  totalPrice: integer("totalPrice").notNull(), // Price in RSD
  // Customer contact (stored on order for guest checkout)
  customerName: text("customerName").notNull(),
  customerEmail: text("customerEmail"), // Optional if phone provided
  customerPhone: text("customerPhone"), // Optional if email provided
  // Shipping address
  shippingStreet: text("shippingStreet").notNull(),
  shippingCity: text("shippingCity").notNull(),
  shippingPostalCode: text("shippingPostalCode").notNull(),
  // Statuses
  status: orderStatusEnum("status").notNull().default("open"),
  paymentStatus: paymentStatusEnum("paymentStatus").notNull().default("unpaid"),
  fulfillmentStatus: fulfillmentStatusEnum("fulfillmentStatus")
    .notNull()
    .default("unfulfilled"),
  returnStatus: returnStatusEnum("returnStatus").notNull().default("none"),
  // Notes
  notes: text("notes"),
  // Timestamps
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

// Order relations
export const orderRelations = relations(orders, ({ one }) => ({
  user: one(user, {
    fields: [orders.userId],
    references: [user.id],
  }),
  wardrobe: one(wardrobes, {
    fields: [orders.wardrobeId],
    references: [wardrobes.id],
  }),
  material: one(materials, {
    fields: [orders.materialId],
    references: [materials.id],
  }),
  backMaterial: one(materials, {
    fields: [orders.backMaterialId],
    references: [materials.id],
  }),
}));
