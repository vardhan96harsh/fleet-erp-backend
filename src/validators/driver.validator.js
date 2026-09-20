import { z } from "zod";

const objectIdRegex =
  /^[0-9a-fA-F]{24}$/;

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
      !Number.isNaN(
        Date.parse(value)
      ),
    "Invalid date"
  )
  .nullable()
  .optional();

const mobileSchema = z
  .string()
  .trim()
  .max(
    30,
    "Mobile number is too long"
  )
  .nullable()
  .optional();

/*
|--------------------------------------------------------------------------
| CREATE DRIVER
|--------------------------------------------------------------------------
*/

export const createDriverSchema = z.object({
  body: z.object({
    name: z
      .string()
      .trim()
      .min(
        2,
        "Driver name is required"
      )
      .max(100),

    driverId: z
      .string()
      .trim()
      .max(50)
      .optional(),

    fatherName: z
      .string()
      .trim()
      .max(100)
      .optional(),

    mobile: mobileSchema,

    licenceNo: z
      .string()
      .trim()
      .max(100)
      .optional(),

    licenceExpiry:
      optionalDateSchema,

    joiningDate:
      optionalDateSchema,

    status: z
      .enum([
        "ACTIVE",
        "INACTIVE",
        "ON_LEAVE",
      ])
      .optional(),

    assignedVehicleId: z
      .string()
      .regex(
        objectIdRegex,
        "Invalid vehicle ID"
      )
      .nullable()
      .optional(),
  }),
});

/*
|--------------------------------------------------------------------------
| UPDATE DRIVER
|--------------------------------------------------------------------------
*/

export const updateDriverSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .trim()
        .min(
          2,
          "Driver name cannot be empty"
        )
        .max(100)
        .optional(),

      driverId: z
        .string()
        .trim()
        .max(50)
        .optional(),

      fatherName: z
        .string()
        .trim()
        .max(100)
        .optional(),

      mobile: mobileSchema,

      licenceNo: z
        .string()
        .trim()
        .max(100)
        .optional(),

      licenceExpiry:
        optionalDateSchema,

      joiningDate:
        optionalDateSchema,

      status: z
        .enum([
          "ACTIVE",
          "INACTIVE",
          "ON_LEAVE",
        ])
        .optional(),

      assignedVehicleId: z
        .string()
        .regex(
          objectIdRegex,
          "Invalid vehicle ID"
        )
        .nullable()
        .optional(),
    })
    .refine(
      (data) =>
        Object.keys(data).length > 0,
      {
        message:
          "At least one driver field is required to update",
      }
    ),
});