export const isLocalDev = () => {
  if (typeof window !== "undefined") {
    return ["localhost", "127.0.0.1"].includes(window.location.hostname);
  }

  return process.env.NODE_ENV === "development";
};
