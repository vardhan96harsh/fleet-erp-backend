import { z } from "zod";

const normalizeLocation = (val) => {
  if (typeof val !== "string") return val;
  const s = val.trim().toUpperCase();
  if (s === "VIDISHA" || s === "LOCATION_A" || s === "LOCATION A") return "LOCATION_A";
  if (s === "MANAWAR" || s === "LOCATION_B" || s === "LOCATION B") return "LOCATION_B";
  return val;
};

const locationSchema = z.preprocess(
  normalizeLocation,
  z.enum(["LOCATION_A", "LOCATION_B"], {
    message: "Location must be Vidisha (LOCATION_A) or Manawar (LOCATION_B)",
  })
);

export const createAssignmentSchema = z.object({
  body: z.object({
    vehicleId: z.string().trim().min(1, "Vehicle is required"),
    inventoryItemId: z.string().trim().min(1, "Inventory item is required"),
    quantity: z.coerce.number().positive("Quantity must be greater than zero"),
    location: locationSchema,
    assignedDate: z.string().optional().or(z.date().optional()),
    driverId: z.string().trim().optional().nullable(),
    purpose: z.string().trim().max(200).optional(),
    remarks: z.string().trim().max(1000).optional(),
  }),
});

export const updateAssignmentSchema = z.object({
  body: z
    .object({
      quantity: z.coerce.number().positive("Quantity must be greater than zero").optional(),
      assignedDate: z.string().optional().or(z.date().optional()),
      driverId: z.string().trim().optional().nullable(),
      purpose: z.string().trim().max(200).optional(),
      remarks: z.string().trim().max(1000).optional(),
      status: z.enum(["ASSIGNED", "RETURNED", "CONSUMED"]).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "At least one field is required to update",
    }),
});

export const returnAssignmentSchema = z.object({
  body: z.object({
    returnedQuantity: z.coerce.number().positive("Returned quantity must be greater than zero").optional(),
    returnQuantity: z.coerce.number().positive("Returned quantity must be greater than zero").optional(),
    remarks: z.string().trim().max(1000).optional(),
    returnNotes: z.string().trim().max(1000).optional(),
    conditionOnReturn: z.string().trim().max(100).optional(),
  }),
});
