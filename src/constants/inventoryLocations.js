/*
|--------------------------------------------------------------------------
| INVENTORY LOCATION CODES
|--------------------------------------------------------------------------
|
| Database stores stable codes: LOCATION_A and LOCATION_B.
| Display names can be changed later without updating inventory records.
|
*/

export const INVENTORY_LOCATIONS = {
  LOCATION_A: "LOCATION_A",
  LOCATION_B: "LOCATION_B",
};

export const INVENTORY_LOCATION_VALUES =
  Object.values(INVENTORY_LOCATIONS);

/*
|--------------------------------------------------------------------------
| DISPLAY NAMES
|--------------------------------------------------------------------------
|
| Change only these labels when final location names are decided.
|
*/

export const INVENTORY_LOCATION_NAMES = {
  LOCATION_A: "Location A",
  LOCATION_B: "Location B",
};

export const getInventoryLocationName = (
  locationCode
) =>
  INVENTORY_LOCATION_NAMES[
    locationCode
  ] || locationCode;