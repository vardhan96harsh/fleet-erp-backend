import { z } from "zod";

/*
|--------------------------------------------------------------------------
| COMMON VALIDATORS
|--------------------------------------------------------------------------
*/

const optionalDateSchema = z
  .string()
  .refine(
    (value) =>
      value === "" ||
      !Number.isNaN(Date.parse(value)),
    "Invalid date"
  )
  .nullable()
  .optional();

const requiredDateSchema = z
  .string()
  .min(1, "Date is required")
  .refine(
    (value) =>
      !Number.isNaN(Date.parse(value)),
    "Invalid date"
  );

/*
|--------------------------------------------------------------------------
| HISTORY SCHEMAS
|--------------------------------------------------------------------------
*/

const serviceHistoryItemSchema = z.object({
  date: requiredDateSchema,

  description: z
    .string()
    .trim()
    .min(
      1,
      "Service description is required"
    )
    .max(1000),
});

const accidentReportItemSchema = z.object({
  date: requiredDateSchema,

  description: z
    .string()
    .trim()
    .min(
      1,
      "Accident description is required"
    )
    .max(1000),
});

/*
|--------------------------------------------------------------------------
| CREATE VEHICLE
|--------------------------------------------------------------------------
*/

export const createVehicleSchema = z.object({
  body: z.object({
    vehicleNo: z
      .string()
      .trim()
      .min(
        1,
        "Vehicle number is required"
      )
      .max(50),

    type: z
      .string()
      .trim()
      .max(100)
      .optional(),

    capacity: z
      .string()
      .trim()
      .max(100)
      .optional(),

    ownership: z
      .string()
      .trim()
      .max(100)
      .optional(),

    ownerName: z
      .string()
      .trim()
      .max(150)
      .optional(),

    ownerMobile: z
      .string()
      .trim()
      .max(30)
      .optional(),

    pucExpiry: optionalDateSchema,

    fitnessExpiry: optionalDateSchema,

    insuranceExpiry: optionalDateSchema,

    permitExpiry: optionalDateSchema,

    rcNumber: z
      .string()
      .trim()
      .max(100)
      .optional(),

    rcExpiry: optionalDateSchema,

    serviceHistory: z
      .array(serviceHistoryItemSchema)
      .optional(),

    accidentReports: z
      .array(accidentReportItemSchema)
      .optional(),

    status: z
      .enum([
        "ACTIVE",
        "INACTIVE",
        "UNDER_SERVICE",
        "DRIVER_NOT_AVAILABLE",
      ])
      .optional(),
  }),
});

/*
|--------------------------------------------------------------------------
| UPDATE VEHICLE
|--------------------------------------------------------------------------
*/

export const updateVehicleSchema = z.object({
  body: z
    .object({
      vehicleNo: z
        .string()
        .trim()
        .min(
          1,
          "Vehicle number cannot be empty"
        )
        .max(50)
        .optional(),

      type: z
        .string()
        .trim()
        .max(100)
        .optional(),

      capacity: z
        .string()
        .trim()
        .max(100)
        .optional(),

      ownership: z
        .string()
        .trim()
        .max(100)
        .optional(),

      ownerName: z
        .string()
        .trim()
        .max(150)
        .optional(),

      ownerMobile: z
        .string()
        .trim()
        .max(30)
        .optional(),

      pucExpiry: optionalDateSchema,

      fitnessExpiry: optionalDateSchema,

      insuranceExpiry:
        optionalDateSchema,

      permitExpiry: optionalDateSchema,

      rcNumber: z
        .string()
        .trim()
        .max(100)
        .optional(),

      rcExpiry: optionalDateSchema,

      serviceHistory: z
        .array(serviceHistoryItemSchema)
        .optional(),

      accidentReports: z
        .array(accidentReportItemSchema)
        .optional(),

      status: z
        .enum([
          "ACTIVE",
          "INACTIVE",
          "UNDER_SERVICE",
          "DRIVER_NOT_AVAILABLE",
        ])
        .optional(),
    })
    .refine(
      (data) =>
        Object.keys(data).length > 0,
      {
        message:
          "At least one vehicle field is required to update",
      }
    ),
});