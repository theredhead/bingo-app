import { Test, TestingModule } from "@nestjs/testing";
import { BingoController } from "./bingo.controller";
import { BingoService } from "./bingo.service";
import { BadRequestException, NotFoundException } from "@nestjs/common";

describe("BingoController", () => {
  let controller: BingoController;
  let service: BingoService;

  const mockService = {
    generateCard: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BingoController],
      providers: [{ provide: BingoService, useValue: mockService }],
    }).compile();

    controller = module.get<BingoController>(BingoController);
    service = module.get<BingoService>(BingoService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("GET /api/bingo/generate", () => {
    it("should return a bingo card for valid wordlistId", async () => {
      const card = [
        ["W1", "W2", "W3", "W4", "W5"],
        ["W6", "W7", "W8", "W9", "W10"],
        ["W11", "W12", "FREE", "W13", "W14"],
        ["W15", "W16", "W17", "W18", "W19"],
        ["W20", "W21", "W22", "W23", "W24"],
      ];
      mockService.generateCard.mockResolvedValue(card);

      const result = await controller.generateCard({ wordlistId: "1" });
      expect(result).toEqual({ card });
      expect(mockService.generateCard).toHaveBeenCalledWith("1");
    });

    it("should throw NotFoundException if wordlist not found", async () => {
      mockService.generateCard.mockRejectedValue(new NotFoundException());

      await expect(
        controller.generateCard({ wordlistId: "999" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException if wordlist has insufficient words", async () => {
      mockService.generateCard.mockRejectedValue(new BadRequestException());

      await expect(
        controller.generateCard({ wordlistId: "1" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if wordlistId is missing", async () => {
      await expect(controller.generateCard({ wordlistId: "" })).rejects.toThrow(
        BadRequestException,
      );
      expect(mockService.generateCard).not.toHaveBeenCalled();
    });
  });
});
