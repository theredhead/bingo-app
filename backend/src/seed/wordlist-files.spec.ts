import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { loadWordlistsFromDirectory } from "./wordlist-files";

describe("wordlist file loading", () => {
  it("loads only .json files and parses description and words", () => {
    const tempDir = mkdtempSync(join(tmpdir(), "wordlist-seed-"));

    try {
      writeFileSync(
        join(tempDir, "starter-bingo.json"),
        JSON.stringify({
          name: "Starter Bingo",
          description: "Classic bingo game words",
          words: ["Bingo!", "Full House"],
        }),
      );
      writeFileSync(
        join(tempDir, "office-phrases.json"),
        JSON.stringify({
          name: "Office Phrases",
          description: "Corporate jargon",
          words: ["Circle back", "Low-hanging fruit"],
        }),
      );
      writeFileSync(join(tempDir, "ignore.md"), "# Not a wordlist\n");

      const wordlists = loadWordlistsFromDirectory(tempDir);

      expect(wordlists).toHaveLength(2);
      expect(wordlists).toEqual([
        {
          fileName: "office-phrases.json",
          name: "Office Phrases",
          description: "Corporate jargon",
          words: ["Circle back", "Low-hanging fruit"],
        },
        {
          fileName: "starter-bingo.json",
          name: "Starter Bingo",
          description: "Classic bingo game words",
          words: ["Bingo!", "Full House"],
        },
      ]);
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
