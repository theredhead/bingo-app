import { DataSource } from "typeorm";
import { config } from "dotenv";
import { existsSync } from "fs";
import { join } from "path";
import { Wordlist } from "../wordlists/entities/wordlist.entity";
import { Word } from "../wordlists/entities/word.entity";
import { loadWordlistsFromDirectory } from "./wordlist-files";

config();

const dataSource = new DataSource({
  type: "sqlite",
  database: process.env.DATABASE_PATH || "./db.sqlite",
  entities: [Wordlist, Word],
  // Keep schema in sync for local/dev seeding without migrations.
  synchronize: true,
});

async function seed() {
  await dataSource.initialize();
  console.log("Database connected");

  const wordlistRepo = dataSource.getRepository(Wordlist);
  const wordRepo = dataSource.getRepository(Word);

  const wordlistsDir = join(process.cwd(), "wordlists");
  if (!existsSync(wordlistsDir)) {
    console.log(
      `No wordlists directory found at ${wordlistsDir}. Skipping seed.`,
    );
    await dataSource.destroy();
    return;
  }

  const seedWordlists = loadWordlistsFromDirectory(wordlistsDir);
  if (seedWordlists.length === 0) {
    console.log(`No .txt wordlist files found in ${wordlistsDir}.`);
    await dataSource.destroy();
    return;
  }

  for (const seedWordlist of seedWordlists) {
    if (seedWordlist.words.length === 0) {
      console.log(`Skipping ${seedWordlist.fileName}: no words found.`);
      continue;
    }

    const existing = await wordlistRepo.findOne({
      where: { name: seedWordlist.name },
    });
    if (existing) {
      console.log(`${seedWordlist.name} already exists`);
      continue;
    }

    const wordlist = wordlistRepo.create({
      name: seedWordlist.name,
      description: seedWordlist.description,
    });
    await wordlistRepo.save(wordlist);

    const wordEntities = seedWordlist.words.map((text) =>
      wordRepo.create({ text, wordlist }),
    );
    await wordRepo.save(wordEntities);

    console.log(
      `Seeded ${seedWordlist.name} with ${seedWordlist.words.length} words`,
    );
  }

  await dataSource.destroy();
  console.log("✅ Seed completed successfully!");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
