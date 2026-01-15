import { relations } from "drizzle-orm";
import {
  boolean,
  index,
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
  // Default shipping address
  shippingStreet: text("shippingStreet"),
  shippingApartment: text("shippingApartment"),
  shippingCity: text("shippingCity"),
  shippingPostalCode: text("shippingPostalCode"),
  createdAt: timestamp("createdAt").notNull(),
  updatedAt: timestamp("updatedAt").notNull(),
});

export const session = pgTable(
  "session",
  {
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
  },
  (table) => ({
    userIdIdx: index("session_user_id_idx").on(table.userId),
  }),
);

export const account = pgTable(
  "account",
  {
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
  },
  (table) => ({
    userIdIdx: index("account_user_id_idx").on(table.userId),
  }),
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt"),
  updatedAt: timestamp("updatedAt"),
});

// App-specific tables
export const wardrobes = pgTable(
  "wardrobe",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    data: json("data").notNull().$type<Record<string, any>>(),
    thumbnail: text("thumbnail"), // Base64 data URL of canvas screenshot
    // Full cut list with CNC dimensions (stored at save time for historical accuracy)
    cutList: json("cutList").$type<{
      items: Array<{
        code: string;
        desc: string;
        widthCm: number;
        heightCm: number;
        thicknessMm: number;
        areaM2: number;
        cost: number;
        element: string;
        materialType: "korpus" | "front" | "back";
      }>;
      pricePerM2: number;
      frontPricePerM2: number;
      backPricePerM2: number;
      totalArea: number;
      totalCost: number;
    }>(),
    userId: text("userId")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("wardrobe_user_id_idx").on(table.userId),
  }),
);

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
  categories: text("categories").array().notNull(), // ["Materijal za Korpus (18mm)", "Materijal za Lica/Vrata (18mm)"]
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

// Orders table
export const orders = pgTable(
  "order",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Human-readable order number (like Shopify #1001, #1002)
    orderNumber: serial("orderNumber").notNull().unique(),
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
    frontMaterialId: integer("frontMaterialId")
      .notNull()
      .references(() => materials.id),
    backMaterialId: integer("backMaterialId").references(() => materials.id),
    // Dimensions and pricing
    area: integer("area").notNull(), // Area in cm² for precision
    totalPrice: integer("totalPrice").notNull(), // Price in RSD
    // Price breakdown per material type (stored at order time)
    priceBreakdown: json("priceBreakdown").$type<{
      korpus: { areaM2: number; price: number; materialName: string };
      front: { areaM2: number; price: number; materialName: string };
      back: { areaM2: number; price: number; materialName: string };
    }>(),
    // Full cut list with CNC dimensions (stored at order time for historical accuracy)
    cutList: json("cutList").$type<{
      items: Array<{
        code: string;
        desc: string;
        widthCm: number;
        heightCm: number;
        thicknessMm: number;
        areaM2: number;
        cost: number;
        element: string;
        materialType: "korpus" | "front" | "back";
      }>;
      pricePerM2: number;
      frontPricePerM2: number;
      backPricePerM2: number;
    }>(),
    // Customer contact (stored on order for guest checkout)
    customerName: text("customerName").notNull(),
    customerEmail: text("customerEmail"), // Optional if phone provided
    customerPhone: text("customerPhone"), // Optional if email provided
    // Shipping address
    shippingStreet: text("shippingStreet").notNull(),
    shippingApartment: text("shippingApartment"), // Optional apartment number
    shippingCity: text("shippingCity").notNull(),
    shippingPostalCode: text("shippingPostalCode").notNull(),
    // Statuses
    status: orderStatusEnum("status").notNull().default("open"),
    paymentStatus: paymentStatusEnum("paymentStatus")
      .notNull()
      .default("unpaid"),
    fulfillmentStatus: fulfillmentStatusEnum("fulfillmentStatus")
      .notNull()
      .default("unfulfilled"),
    returnStatus: returnStatusEnum("returnStatus").notNull().default("none"),
    // Notes
    notes: text("notes"),
    // Timestamps
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("order_user_id_idx").on(table.userId),
    wardrobeIdIdx: index("order_wardrobe_id_idx").on(table.wardrobeId),
    materialIdIdx: index("order_material_id_idx").on(table.materialId),
    frontMaterialIdIdx: index("order_front_material_id_idx").on(
      table.frontMaterialId,
    ),
    backMaterialIdIdx: index("order_back_material_id_idx").on(
      table.backMaterialId,
    ),
  }),
);

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
  frontMaterial: one(materials, {
    fields: [orders.frontMaterialId],
    references: [materials.id],
  }),
  backMaterial: one(materials, {
    fields: [orders.backMaterialId],
    references: [materials.id],
  }),
}));
