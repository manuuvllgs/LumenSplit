import { getStaticFiles, staticFile } from "remotion";

/** Returns the staticFile() URL if the file exists in public/, otherwise null. */
export const optionalStatic = (path: string): string | null => {
  const exists = getStaticFiles().some((f) => f.name === path);
  return exists ? staticFile(path) : null;
};
