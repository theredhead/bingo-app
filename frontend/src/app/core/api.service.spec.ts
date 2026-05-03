import { ApiService } from "./api.service";
import { vi } from "vitest";
import { HttpParams } from "@angular/common/http";

describe("ApiService", () => {
  let service: ApiService;
  let httpClient: any;

  beforeEach(() => {
    httpClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    service = new ApiService(httpClient);
  });

  it("should be created", () => {
    expect(service).toBeDefined();
  });

  describe("getWordlists", () => {
    it("should call GET /api/wordlists", () => {
      httpClient.get.mockReturnValue({ toPromise: () => Promise.resolve([]) });
      service.getWordlists();
      expect(httpClient.get).toHaveBeenCalledWith("/api/wordlists");
    });
  });

  describe("getWordlist", () => {
    it("should call GET /api/wordlists/:id", () => {
      httpClient.get.mockReturnValue({});
      service.getWordlist("1");
      expect(httpClient.get).toHaveBeenCalledWith("/api/wordlists/1");
    });
  });

  describe("generateCard", () => {
    it("should call GET /api/bingo/generate?wordlistId=:id", () => {
      httpClient.get.mockReturnValue({});
      service.generateCard("1");

      const call = httpClient.get.mock.calls[0];
      expect(call[0]).toBe("/api/bingo/generate");
      expect(call[1].params).toBeInstanceOf(HttpParams);
      expect(call[1].params.get("wordlistId")).toBe("1");
    });
  });

  describe("createGame", () => {
    it("should call POST /api/games with trimmed payload", () => {
      httpClient.post.mockReturnValue({});
      service.createGame(" wordlist-1 ", " Host ");

      expect(httpClient.post).toHaveBeenCalledWith("/api/games", {
        wordlistId: "wordlist-1",
        hostName: "Host",
      });
    });
  });

  describe("getGame", () => {
    it("should call GET /api/games/:joinCode with playerId query param", () => {
      httpClient.get.mockReturnValue({});
      service.getGame(" abc123 ", "player-1");

      const call = httpClient.get.mock.calls[0];
      expect(call[0]).toBe("/api/games/ABC123");
      expect(call[1].params).toBeInstanceOf(HttpParams);
      expect(call[1].params.get("playerId")).toBe("player-1");
    });
  });

  describe("joinGame", () => {
    it("should call POST /api/games/:joinCode/join with trimmed name", () => {
      httpClient.post.mockReturnValue({});
      service.joinGame(" abc123 ", " Guest ");

      expect(httpClient.post).toHaveBeenCalledWith("/api/games/ABC123/join", {
        displayName: "Guest",
      });
    });
  });

  describe("startGame", () => {
    it("should call POST /api/games/:joinCode/start", () => {
      httpClient.post.mockReturnValue({});
      service.startGame(" abc123 ", "player-1");

      expect(httpClient.post).toHaveBeenCalledWith("/api/games/ABC123/start", {
        playerId: "player-1",
      });
    });
  });

  describe("toggleStamp", () => {
    it("should call POST /api/games/:joinCode/stamps", () => {
      httpClient.post.mockReturnValue({});
      service.toggleStamp(" abc123 ", "player-1", 2, 4);

      expect(httpClient.post).toHaveBeenCalledWith("/api/games/ABC123/stamps", {
        playerId: "player-1",
        row: 2,
        col: 4,
      });
    });
  });
});
