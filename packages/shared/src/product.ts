import { z } from "zod";

const name = z.string().trim().min(1);
/** An empty SKU means "no SKU". */
const sku = z.string().trim().transform((s) => s || null);
const piecesPerBlock = z.number().int().positive();
/** Whole so'm per piece. */
const defaultSalePrice = z.number().int().nonnegative();

/**
 * Average cost and on-hand quantity are computed by the system, so the write schemas are strict:
 * a request that tries to set them is rejected instead of silently ignored.
 */
export const createProductRequestSchema = z.strictObject({
  name,
  sku: sku.optional(),
  piecesPerBlock,
  defaultSalePrice,
});
export type CreateProductRequest = z.infer<typeof createProductRequestSchema>;

export const updateProductRequestSchema = z.strictObject({
  name: name.optional(),
  sku: sku.optional(),
  piecesPerBlock: piecesPerBlock.optional(),
  defaultSalePrice: defaultSalePrice.optional(),
});
export type UpdateProductRequest = z.infer<typeof updateProductRequestSchema>;

export const listProductsQuerySchema = z.object({
  search: z.string().trim().optional(),
  includeArchived: z.enum(["true", "false"]).optional().transform((v) => v === "true"),
});
export type ListProductsQuery = z.input<typeof listProductsQuerySchema>;

export const productSchema = z.object({
  id: z.string(),
  name: z.string(),
  sku: z.string().nullable(),
  piecesPerBlock: z.number().int(),
  defaultSalePrice: z.number().int(),
  /** So'm per piece, moving weighted average; 0 until purchases exist. */
  averageCost: z.number().int(),
  /** Total pieces across all warehouses. */
  onHandQuantity: z.number().int(),
  archived: z.boolean(),
});
export type Product = z.infer<typeof productSchema>;
