import Inventory from "../models/Inventory.js";

import ApiError from "../utils/ApiError.js";
import { ROLES } from "../constants/roles.js";

import {
  INVENTORY_LOCATION_VALUES,
} from "../constants/inventoryLocations.js";

/*
|--------------------------------------------------------------------------
| HELPERS
|--------------------------------------------------------------------------
*/

const ensureInventoryPermission = (
  currentUser
) => {
  const allowedRoles = [
    ROLES.SUPER_ADMIN,
    ROLES.SUB_ADMIN,
  ];

  if (!allowedRoles.includes(currentUser.role)) {
    throw new ApiError(
      403,
      "You do not have permission to manage inventory data"
    );
  }
};

const validateLocation = (
  location,
  { required = false } = {}
) => {
  if (!location) {
    if (required) {
      throw new ApiError(
        400,
        "Inventory location is required"
      );
    }

    return null;
  }

  if (
    !INVENTORY_LOCATION_VALUES.includes(
      location
    )
  ) {
    throw new ApiError(
      400,
      "Location must be LOCATION_A or LOCATION_B"
    );
  }

  return location;
};

const populateInventory = (query) =>
  query
    .populate(
      "createdBy",
      "name username email role"
    )
    .populate(
      "updatedBy",
      "name username email role"
    )
    .populate(
      "deletedBy",
      "name username email role"
    )
    .lean();

/*
|--------------------------------------------------------------------------
| CREATE INVENTORY
|--------------------------------------------------------------------------
*/

export const createInventory = async ({
  data,
  currentUser,
}) => {
  ensureInventoryPermission(currentUser);

  const location = validateLocation(
    data.location,
    {
      required: true,
    }
  );

  const normalizedItemCode =
    data.itemCode.trim().toUpperCase();

  const duplicate =
    await Inventory.findOne({
      location,
      itemCode: normalizedItemCode,
      isDeleted: false,
    });

  if (duplicate) {
    throw new ApiError(
      409,
      "Inventory item with this code already exists at this location"
    );
  }

  const inventory =
    await Inventory.create({
      itemCode: normalizedItemCode,

      itemName: data.itemName,

      category: data.category || "",

      brand: data.brand || "",

      size: data.size || "",

      quantity:
        data.quantity !== undefined
          ? data.quantity
          : 0,

      unit:
        data.unit
          ?.trim()
          .toUpperCase() ||
        "PCS",

      purchaseRate:
        data.purchaseRate !== undefined
          ? data.purchaseRate
          : 0,

      minimumStock:
        data.minimumStock !== undefined
          ? data.minimumStock
          : 0,

      location,

      remarks: data.remarks || "",

      status:
        data.status || "ACTIVE",

      createdBy: currentUser._id,

      updatedBy: currentUser._id,
    });

  return populateInventory(
    Inventory.findById(inventory._id)
  );
};

/*
|--------------------------------------------------------------------------
| GET INVENTORY
|--------------------------------------------------------------------------
|
| Without location: returns inventory from both locations.
| With location: returns inventory from selected location.
|
*/

export const getInventory = async ({
  currentUser,
  location = null,
}) => {
  ensureInventoryPermission(currentUser);

  const filter = {
    isDeleted: false,
  };

  const validatedLocation =
    validateLocation(location);

  if (validatedLocation) {
    filter.location =
      validatedLocation;
  }

  return populateInventory(
    Inventory.find(filter)
  ).sort({
    createdAt: -1,
  });
};

/*
|--------------------------------------------------------------------------
| GET SINGLE INVENTORY ITEM
|--------------------------------------------------------------------------
*/

export const getInventoryById = async ({
  id,
  currentUser,
}) => {
  ensureInventoryPermission(currentUser);

  const inventory =
    await populateInventory(
      Inventory.findOne({
        _id: id,
        isDeleted: false,
      })
    );

  if (!inventory) {
    throw new ApiError(
      404,
      "Inventory item not found"
    );
  }

  return inventory;
};

/*
|--------------------------------------------------------------------------
| UPDATE INVENTORY
|--------------------------------------------------------------------------
*/

export const updateInventory = async ({
  id,
  data,
  currentUser,
}) => {
  ensureInventoryPermission(currentUser);

  const inventory =
    await Inventory.findOne({
      _id: id,
      isDeleted: false,
    });

  if (!inventory) {
    throw new ApiError(
      404,
      "Inventory item not found"
    );
  }

  /*
  |--------------------------------------------------------------------------
  | ITEM CODE AND LOCATION
  |--------------------------------------------------------------------------
  |
  | Duplicate is checked using the final itemCode + location combination.
  |
  */

  const nextItemCode =
    data.itemCode !== undefined
      ? data.itemCode
          .trim()
          .toUpperCase()
      : inventory.itemCode;

  const nextLocation =
    data.location !== undefined
      ? validateLocation(
          data.location,
          {
            required: true,
          }
        )
      : inventory.location;

  if (
    nextItemCode !==
      inventory.itemCode ||
    nextLocation !==
      inventory.location
  ) {
    const duplicate =
      await Inventory.findOne({
        _id: {
          $ne: inventory._id,
        },

        itemCode: nextItemCode,

        location: nextLocation,

        isDeleted: false,
      });

    if (duplicate) {
      throw new ApiError(
        409,
        "Inventory item with this code already exists at this location"
      );
    }
  }

  inventory.itemCode =
    nextItemCode;

  inventory.location =
    nextLocation;

  /*
  |--------------------------------------------------------------------------
  | STANDARD FIELDS
  |--------------------------------------------------------------------------
  */

  const allowedFields = [
    "itemName",
    "category",
    "brand",
    "size",
    "quantity",
    "purchaseRate",
    "minimumStock",
    "remarks",
    "status",
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      inventory[field] =
        data[field];
    }
  }

  /*
  |--------------------------------------------------------------------------
  | UNIT
  |--------------------------------------------------------------------------
  */

  if (data.unit !== undefined) {
    inventory.unit =
      data.unit
        .trim()
        .toUpperCase();
  }

  inventory.updatedBy =
    currentUser._id;

  await inventory.save();

  return populateInventory(
    Inventory.findById(inventory._id)
  );
};

/*
|--------------------------------------------------------------------------
| SOFT DELETE INVENTORY
|--------------------------------------------------------------------------
*/

export const deleteInventory = async ({
  id,
  currentUser,
}) => {
  ensureInventoryPermission(currentUser);

  const inventory =
    await Inventory.findOne({
      _id: id,
      isDeleted: false,
    });

  if (!inventory) {
    throw new ApiError(
      404,
      "Inventory item not found"
    );
  }

  inventory.isDeleted = true;

  inventory.deletedAt = new Date();

  inventory.deletedBy =
    currentUser._id;

  inventory.updatedBy =
    currentUser._id;

  await inventory.save();

  return true;
};

/*
|--------------------------------------------------------------------------
| GET DELETED INVENTORY
|--------------------------------------------------------------------------
*/

export const getDeletedInventory =
  async ({
    currentUser,
    location = null,
  }) => {
    ensureInventoryPermission(
      currentUser
    );

    const filter = {
      isDeleted: true,
    };

    const validatedLocation =
      validateLocation(location);

    if (validatedLocation) {
      filter.location =
        validatedLocation;
    }

    return populateInventory(
      Inventory.find(filter)
    ).sort({
      deletedAt: -1,
    });
  };

/*
|--------------------------------------------------------------------------
| RESTORE INVENTORY
|--------------------------------------------------------------------------
*/

export const restoreInventory = async ({
  id,
  currentUser,
}) => {
  ensureInventoryPermission(currentUser);

  const inventory =
    await Inventory.findOne({
      _id: id,
      isDeleted: true,
    });

  if (!inventory) {
    throw new ApiError(
      404,
      "Deleted inventory item not found"
    );
  }

  const duplicate =
    await Inventory.findOne({
      _id: {
        $ne: inventory._id,
      },

      location:
        inventory.location,

      itemCode:
        inventory.itemCode,

      isDeleted: false,
    });

  if (duplicate) {
    throw new ApiError(
      409,
      "An active inventory item with this code already exists at this location"
    );
  }

  inventory.isDeleted = false;

  inventory.deletedAt = null;

  inventory.deletedBy = null;

  inventory.updatedBy =
    currentUser._id;

  await inventory.save();

  return populateInventory(
    Inventory.findById(inventory._id)
  );
};