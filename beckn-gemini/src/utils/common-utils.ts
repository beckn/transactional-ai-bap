export const isEmpty = (value: any): boolean => {
  // Check for undefined/null including string "undefined"
  if (value === undefined || value === null || value === "undefined") {
    return true;
  }

  // Check if it's a string
  if (typeof value === "string") {
    return value.trim().length === 0;
  }

  // Check if it's an array
  if (Array.isArray(value)) {
    return value.length === 0;
  }

  // Check if it's an object
  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }

  // For numbers, booleans etc.
  return false;
};
