import { sql } from "drizzle-orm";
import { materials } from "@/db/schema";
import type { PriceChange } from "@/lib/agacija-prices";

/** All changed prices in one statement: one round trip instead of ~500. */
export function updatePricesSql(changes: PriceChange[]) {
  const rows = sql.join(
    changes.map(
      (c) =>
        sql`(${c.id}::integer, ${c.newPrice}::integer, ${c.supplierPrice}::integer)`,
    ),
    sql`, `,
  );
  return sql`update ${materials} set "price" = v.price, "costPrice" = v.cost, "updatedAt" = now() from (values ${rows}) as v(id, price, cost) where ${materials.id} = v.id`;
}
