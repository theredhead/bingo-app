import { readdirSync, readFileSync } from "fs";
import { extname, join } from "path";

export interface SeedWordlistFile {
  fileName: string;
  name: string;
  description: string;
  words: string[];
}

export function loadWordlistsFromDirectory(
  directoryPath: string,
): SeedWordlistFile[] {
  const jsonFiles = readdirSync(directoryPath)
    .filter((fileName) => extname(fileName).toLowerCase() === ".json")
    .sort((a, b) => a.localeCompare(b));

  return jsonFiles.map((fileName) => {
    const filePath = join(directoryPath, fileName);
    const content = readFileSync(filePath, "utf8");
    const data = JSON.parse(content) as {
      name: string;
      description: string;
      words: string[];
    };

    return {
      fileName,
      name: data.name,
      description: data.description,
      words: data.words,
    };
  });
}
