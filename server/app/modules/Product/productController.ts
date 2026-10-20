import { Request, Response } from "express";
import * as productService from "./productService";

/**
 * GET /products
 * List all products. Supports optional ?category= filter.
 */
export async function listProducts(req: Request, res: Response) {
  const { category } = req.query;
  const products = await productService.listProducts(
    category ? String(category) : undefined
  );
  res.json(products);
}

/**
 * GET /products/:id
 */
export async function getProduct(req: Request, res: Response) {
  const product = await productService.getProductById(String(req.params.id));

  if (!product) {
    return res.status(404).json({ error: "Product not found" });
  }

  res.json(product);
}

/**
 * GET /products/barcode/:barcode
 * Core of the "scan to auto-fill" flow — see product.service.ts for details.
 */
export async function lookupBarcode(req: Request, res: Response) {
  const result = await productService.findByBarcode(String(req.params.barcode));

  if (!result) {
    return res.status(404).json({
      error: "Barcode not recognized locally or externally",
      barcode: req.params.barcode,
    });
  }

  res.json(result);
}

/**
 * POST /products
 * Creates a new product, typically after a barcode scan comes back
 * unrecognized and staff confirm/edit the prefilled details.
 */
export async function createProduct(req: Request, res: Response) {
  const { barcode, name, category, unit, costPrice, sellingPrice } = req.body;

  if (!barcode || !name || costPrice == null || sellingPrice == null) {
    return res.status(400).json({
      error: "barcode, name, costPrice and sellingPrice are required",
    });
  }

  try {
    const product = await productService.createProduct({
      barcode,
      name,
      category,
      unit,
      costPrice,
      sellingPrice,
    });
    res.status(201).json(product);
  } catch (err) {
    if (err instanceof productService.BarcodeConflictError) {
      return res.status(409).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to create product" });
  }
}

/**
 * PUT /products/:id
 */
export async function updateProduct(req: Request, res: Response) {
  const { name, category, unit, costPrice, sellingPrice } = req.body;

  try {
    const product = await productService.updateProduct(String(req.params.id), {
      name,
      category,
      unit,
      costPrice,
      sellingPrice,
    });
    res.json(product);
  } catch (err) {
    if (err instanceof productService.ProductNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to update product" });
  }
}

/**
 * DELETE /products/:id
 */
export async function deleteProduct(req: Request, res: Response) {
  try {
    await productService.deleteProduct (String(req.params.id));
    res.status(204).send();
  } catch (err) {
    if (err instanceof productService.ProductNotFoundError) {
      return res.status(404).json({ error: err.message });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to delete product" });
  }
}