import { z } from "zod";

/*
|--------------------------------------------------------------------------
| LOCATION VALIDATOR
|--------------------------------------------------------------------------
*/

const normalizeLocation = (val) => {
  if (typeof val !== "string") return val;
  const s = val.trim().toUpperCase();
  if (s === "VIDISHA" || s === "LOCATION_A" || s === "LOCATION A") return "LOCATION_A";
  if (s === "MANAWAR" || s === "LOCATION_B" || s === "LOCATION B") return "LOCATION_B";
  return val;
};

const inventoryLocationSchema = z.preprocess(
  normalizeLocation,
  z.enum(
    [
      "LOCATION_A",
      "LOCATION_B",
    ],
    {
      message:
        "Location must be Vidisha (LOCATION_A) or Manawar (LOCATION_B)",
    }
  )
);

/*
|--------------------------------------------------------------------------
| CREATE INVENTORY
|--------------------------------------------------------------------------
*/

export const createInventorySchema = z.object({
  body: z.object({
    itemCode: z
      .string()
      .trim()
      .min(
        1,
        "Item code is required"
      )
      .max(100),

    itemName: z
      .string()
      .trim()
      .min(
        2,
        "Item name is required"
      )
      .max(150),

    category: z
      .string()
      .trim()
      .max(100)
      .optional(),

    brand: z
      .string()
      .trim()
      .max(100)
      .optional(),

    size: z
      .string()
      .trim()
      .max(100)
      .optional(),

    quantity: z
      .coerce
      .number()
      .min(
        0,
        "Quantity cannot be negative"
      )
      .optional(),

    unit: z
      .string()
      .trim()
      .max(30)
      .optional(),

    purchaseRate: z
      .coerce
      .number()
      .min(
        0,
        "Purchase rate cannot be negative"
      )
      .optional(),

    minimumStock: z
      .coerce
      .number()
      .min(
        0,
        "Minimum stock cannot be negative"
      )
      .optional(),

    location:
      inventoryLocationSchema,

    remarks: z
      .string()
      .trim()
      .max(1000)
      .optional(),

    status: z
      .enum([
        "ACTIVE",
        "INACTIVE",
      ])
      .optional(),
  }),
});

/*
|--------------------------------------------------------------------------
| UPDATE INVENTORY
|--------------------------------------------------------------------------
*/

export const updateInventorySchema = z.object({
  body: z
    .object({
      itemCode: z
        .string()
        .trim()
        .min(
          1,
          "Item code cannot be empty"
        )
        .max(100)
        .optional(),

      itemName: z
        .string()
        .trim()
        .min(
          2,
          "Item name cannot be empty"
        )
        .max(150)
        .optional(),

      category: z
        .string()
        .trim()
        .max(100)
        .optional(),

      brand: z
        .string()
        .trim()
        .max(100)
        .optional(),

      size: z
        .string()
        .trim()
        .max(100)
        .optional(),

      quantity: z
        .coerce
        .number()
        .min(
          0,
          "Quantity cannot be negative"
        )
        .optional(),

      unit: z
        .string()
        .trim()
        .max(30)
        .optional(),

      purchaseRate: z
        .coerce
        .number()
        .min(
          0,
          "Purchase rate cannot be negative"
        )
        .optional(),

      minimumStock: z
        .coerce
        .number()
        .min(
          0,
          "Minimum stock cannot be negative"
        )
        .optional(),

      location:
        inventoryLocationSchema
          .optional(),

      remarks: z
        .string()
        .trim()
        .max(1000)
        .optional(),

      status: z
        .enum([
          "ACTIVE",
          "INACTIVE",
        ])
        .optional(),
    })
    .refine(
      (data) =>
        Object.keys(data).length > 0,
      {
        message:
          "At least one inventory field is required to update",
      }
    ),
});