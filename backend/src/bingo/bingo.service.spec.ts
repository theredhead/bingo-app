import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BingoService } from "./bingo.service";
import { Wordlist } from "../wordlists/entities/wordlist.entity";
import { NotFoundException, BadRequestException } from "@nestjs/common";

describe("BingoService", () => {
  let service: BingoService;
  let wordlistRepo: Repository<Wordlist>;

  const mockWordlistRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BingoService,
        { provide: getRepositoryToken(Wordlist), useValue: mockWordlistRepo },
      ],
    }).compile();

    service = module.get<BingoService>(BingoService);
    wordlistRepo = module.get<Repository<Wordlist>>(
      getRepositoryToken(Wordlist),
    );
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("generateCard", () => {
    it("should generate a 5x5 bingo card with FREE space in center", async () => {
      const wordlist = {
        id: "1",
        words: Array.from({ length: 30 }, (_, i) => ({ text: `Word${i}` })),
      };
      mockWordlistRepo.findOne.mockResolvedValue(wordlist);

      const card = await service.generateCard("1");

      expect(card).toHaveLength(5); // 5 rows
      expect(card[0]).toHaveLength(5); // 5 columns
      expect(card[2][2]).toBe("FREE"); // Center is FREE
    });

    it("should have 24 words + 1 FREE space", async () => {
      const wordlist = {
        id: "1",
        words: Array.from({ length: 30 }, (_, i) => ({ text: `Word${i}` })),
      };
      mockWordlistRepo.findOne.mockResolvedValue(wordlist);

      const card = await service.generateCard("1");
      const flatCard = card.flat();
      const words = flatCard.filter((cell) => cell !== "FREE");

      expect(words).toHaveLength(24);
      expect(flatCard).toContain("FREE");
    });

    it("should throw NotFoundException if wordlist not found", async () => {
      mockWordlistRepo.findOne.mockResolvedValue(null);

      await expect(service.generateCard("999")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw BadRequestException if wordlist has less than 24 words", async () => {
      const wordlist = {
        id: "1",
        words: Array.from({ length: 20 }, (_, i) => ({ text: `Word${i}` })), // Only 20 words
      };
      mockWordlistRepo.findOne.mockResolvedValue(wordlist);

      await expect(service.generateCard("1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should throw BadRequestException when repository lookup fails", async () => {
      mockWordlistRepo.findOne.mockRejectedValue(new Error("database error"));

      await expect(service.generateCard("1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should randomize words on each call (Fisher-Yates shuffle)", async () => {
      const wordlist = {
        id: "1",
        words: Array.from({ length: 30 }, (_, i) => ({ text: `Word${i}` })),
      };
      mockWordlistRepo.findOne.mockResolvedValue(wordlist);

      const card1 = await service.generateCard("1");
      const card2 = await service.generateCard("1");

      // Cards should be different (very high probability with randomization)
      const flat1 = card1.flat().join(",");
      const flat2 = card2.flat().join(",");
      expect(flat1).not.toEqual(flat2);
    });
  });
});
