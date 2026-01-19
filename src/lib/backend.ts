/**
 * Centralized backend URL configuration.
 * Throws an error if NEXT_PUBLIC_BACKEND_URL is not defined.
 */
export const BACKEND_URL = (() => {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_BACKEND_URL is not defined");
  }
  return url;
})();
