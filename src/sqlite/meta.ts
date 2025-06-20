/**
 * Meta SQLite module.
 * @module
 */
import { ark } from "arktype";
import * as dz from "drizzle-orm";
import { type Meta, meta } from "@src/arktypes.ts";
import { db, metaTable } from "./drizzle.ts";

/** Return Meta keys starting with prefix */
export const getMetaKeys = async (prefix: string): Promise<Array<string>> => {
  const entries = await db
    .select({
      key: metaTable.key,
    })
    .from(metaTable)
    .where(dz.like(metaTable.key, `${prefix}%`))
    .all();
  return entries.map((item) => item.key);
};

/** Return Meta by Key */
export const getMeta = async <T extends Meta["value"]>(
  key: string,
): Promise<Meta & { value: T } | null> => {
  const entries = await db
    .select()
    .from(metaTable)
    .where(dz.eq(metaTable.key, key))
    .limit(1)
    .all();
  if (entries.length) {
    const data = entries[0] as Meta & { value: T };
    if (data.type === "number") {
      data.value = Number.parseFloat(entries[0].value) as T;
    }
    return data;
  }
  return null;
};

/** Add new or update existing Meta */
export const setMeta = async (data: Meta): Promise<boolean> => {
  const validate = meta(data);
  if (validate instanceof ark.type.errors) {
    throw new Error(validate.summary);
  }
  const dbData = {
    ...data,
    value: String(data.value),
  };
  const existing = await getMeta(data.key);
  if (existing) {
    await db
      .update(metaTable)
      .set(dbData)
      .where(dz.eq(metaTable.key, existing.key))
      .run();
  } else {
    await db
      .insert(metaTable)
      .values(dbData)
      .run();
  }
  return true;
};

/** Delete Meta by Key */
export const deleteMeta = async (key: string): Promise<boolean> => {
  const existing = await getMeta(key);
  if (!existing) return false;
  await db
    .delete(metaTable)
    .where(dz.eq(metaTable.key, existing.key))
    .run();
  return true;
};
