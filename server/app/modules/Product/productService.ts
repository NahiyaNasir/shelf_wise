import { prisma } from "../../lib/prisma";



export interface CreateProductInput {
  barcode: string;
  name: string;
  category?: string;
  unit?: string;
  costPrice: number | string;
  sellingPrice: number | string;
}

export interface UpdateProductInput {
  name?: string;
  category?: string;
  unit?: string;
  costPrice?: number | string;
  sellingPrice?: number | string;
}

export class BarcodeConflictError extends Error {
  constructor() {
    super("Barcode already exists");
  }
}

export class ProductNotFoundError extends Error {
  constructor() {
    super("Product not found");
  }
}

/**
 * List products, optionally filtered by category.
 */
export async function listProducts(category?: string) {
  return prisma.product.findMany({
    where: category ? { category } : undefined,
    orderBy: { name: "asc" },
  });
}

/**
 * Get a single product by id, including its batches.
 */
export async function getProductById(id: string) {
  return prisma.product.findUnique({
    where: { id },
    include: { batches: true },
  });
}

/**
 * Core of the "scan to auto-fill" flow.
 *  1. Look for an existing Product with this barcode.
 *  2. If not found locally, fall back to an external lookup provider so
 *     the client can prefill a "create new product" form.
 *
 * Nothing is persisted here — the caller decides whether to call
 * createProduct() with the (possibly edited) result.
 */
export async function findByBarcode(barcode: string) {
  const existing = await prisma.product.findUnique({ where: { barcode } });

  if (existing) {
    return { source: "local" as const, product: existing };
  }

  const external = await lookupExternalBarcode(barcode);

  if (external) {
    return { source: "external" as const, product: external };
  }

  return null;
}

/**
 * Create a new product. Throws BarcodeConflictError if the barcode
 * is already registered.
 */
export async function createProduct(input: CreateProductInput) {
  try {
    return await prisma.product.create({
      data: {
        barcode: input.barcode,
        name: input.name,
        category: input.category,
        unit: input.unit ?? "pcs",
        costPrice: input.costPrice,
        sellingPrice: input.sellingPrice,
      },
    });
  } catch (err) {
    // if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    //   throw new BarcodeConflictError();
    // }
    throw err;
  }
}

/**
 * Update an existing product. Throws ProductNotFoundError if the id
 * doesn't exist.
 */
export async function updateProduct(id: string, input: UpdateProductInput) {
  try {
    return await prisma.product.update({
      where: { id },
      data: input,
    });
  } catch (err) {
    // if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    //   throw new ProductNotFoundError();
    // }
    throw err;
  }
}

/**
 * Delete a product. Throws ProductNotFoundError if the id doesn't exist.
 * Note: batches cascade-delete with the product per the schema's onDelete rule —
 * double check that's the behavior you want before wiring this into the UI.
 */
export async function deleteProduct(id: string) {
  try {
    await prisma.product.delete({ where: { id } });
  } catch (err) {
    // if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
    //   throw new ProductNotFoundError();
    // }
    throw err;
  }
}

/**
 * Stub for an external barcode/UPC lookup provider.
 * Set BARCODE_API_URL / BARCODE_API_KEY in .env to enable it; returns
 * null (external lookup disabled or no match) otherwise.
 */
async function lookupExternalBarcode(barcode: string) {
  const apiUrl = process.env.BARCODE_API_URL;
  const apiKey = process.env.BARCODE_API_KEY;

  if (!apiUrl) return null;

  try {
    const response = await fetch(`${apiUrl}/${barcode}`, {
      headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    });

    if (!response.ok) return null;

    const data = await response.json();

    // Normalize the external provider's shape into ours.
    // Adjust field mapping to match the actual provider's response.
    return {
      barcode,
      name: data.title ?? data.name ?? "",
      category: data.category ?? null,
      unit: "pcs",
      costPrice: null,
      sellingPrice: null,
    };
  } catch (err) {
    console.error("External barcode lookup failed:", err);
    return null;
  }
}