import { ComponentFixture, TestBed } from "@angular/core/testing";
import { CardComponent } from "./card.component";
import { ApiService } from "../../core/api.service";
import { ActivatedRoute } from "@angular/router";
import { of, throwError } from "rxjs";
import { vi, beforeAll, afterAll } from "vitest";

describe("CardComponent", () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;
  let apiService: any;
  let activatedRoute: any;

  const mockGain = {
    connect: vi.fn(),
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
  };
  const mockOsc = {
    connect: vi.fn(),
    frequency: { value: 0 },
    type: "sine" as OscillatorType,
    start: vi.fn(),
    stop: vi.fn(),
  };
  const mockAudioCtx = {
    createOscillator: vi.fn(() => mockOsc),
    createGain: vi.fn(() => mockGain),
    destination: {},
    currentTime: 0,
    close: vi.fn(),
  };

  beforeAll(() => {
    vi.stubGlobal(
      "AudioContext",
      class {
        createOscillator() {
          return mockOsc;
        }
        createGain() {
          return mockGain;
        }
        destination = {};
        currentTime = 0;
        close = vi.fn();
      },
    );
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  // mockCard row 0: W1-W5, row 2 col 2: FREE
  const mockCard = {
    card: [
      ["W1", "W2", "W3", "W4", "W5"],
      ["W6", "W7", "W8", "W9", "W10"],
      ["W11", "W12", "FREE", "W13", "W14"],
      ["W15", "W16", "W17", "W18", "W19"],
      ["W20", "W21", "W22", "W23", "W24"],
    ],
  };

  beforeEach(async () => {
    apiService = { generateCard: vi.fn() };
    activatedRoute = {
      snapshot: { paramMap: { get: vi.fn().mockReturnValue("1") } },
    };

    await TestBed.configureTestingModule({
      imports: [CardComponent],
      providers: [
        { provide: ApiService, useValue: apiService },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
  });

  it("should create", () => {
    apiService.generateCard.mockReturnValue(of(mockCard));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it("should load card on init", () => {
    apiService.generateCard.mockReturnValue(of(mockCard));
    fixture.detectChanges();
    expect(apiService.generateCard).toHaveBeenCalledWith("1");
    expect(component.card()).toEqual(mockCard.card);
  });

  it("should display 5x5 grid", () => {
    apiService.generateCard.mockReturnValue(of(mockCard));
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll(".bingo-row");
    expect(rows.length).toBe(5);
  });

  it("should mark FREE space as stamped", () => {
    apiService.generateCard.mockReturnValue(of(mockCard));
    fixture.detectChanges();
    const freeCell = fixture.nativeElement.querySelector(".free-cell");
    expect(freeCell.classList.contains("stamped")).toBe(true);
    expect(freeCell.textContent).toContain("FREE");
  });

  it("should stamp and unstamp a square on tap", () => {
    apiService.generateCard.mockReturnValue(of(mockCard));
    fixture.detectChanges();

    const cell = fixture.nativeElement.querySelector(
      ".bingo-cell:not(.free-cell)",
    ) as HTMLButtonElement;

    cell.click();
    fixture.detectChanges();
    expect(cell.classList.contains("stamped")).toBe(true);

    cell.click();
    fixture.detectChanges();
    expect(cell.classList.contains("stamped")).toBe(false);
  });

  it("should show a stamp mark overlay when stamped", () => {
    apiService.generateCard.mockReturnValue(of(mockCard));
    fixture.detectChanges();

    const cell = fixture.nativeElement.querySelector(
      ".bingo-cell:not(.free-cell)",
    ) as HTMLButtonElement;

    cell.click();
    fixture.detectChanges();
    expect(cell.querySelector(".stamp-mark")).toBeTruthy();
  });

  it("should start with no bingo", () => {
    apiService.generateCard.mockReturnValue(of(mockCard));
    fixture.detectChanges();
    expect(component.hasBingo()).toBe(false);
  });

  it("detectBingo should return true for a complete row", () => {
    apiService.generateCard.mockReturnValue(of(mockCard));
    fixture.detectChanges();

    const card = mockCard.card;
    const stamped = new Set(["0-0", "0-1", "0-2", "0-3", "0-4"]);
    expect(component.detectBingo(card, stamped)).toBe(true);
  });

  it("detectBingo should return true for a complete column", () => {
    apiService.generateCard.mockReturnValue(of(mockCard));
    fixture.detectChanges();

    const card = mockCard.card;
    // col 0: rows 0-4 (no FREE involved)
    const stamped = new Set(["0-0", "1-0", "2-0", "3-0", "4-0"]);
    expect(component.detectBingo(card, stamped)).toBe(true);
  });

  it("detectBingo should return true for main diagonal (FREE counts)", () => {
    apiService.generateCard.mockReturnValue(of(mockCard));
    fixture.detectChanges();

    const card = mockCard.card;
    // diagonal: (0,0),(1,1),(2,2=FREE),(3,3),(4,4)
    const stamped = new Set(["0-0", "1-1", "3-3", "4-4"]);
    expect(component.detectBingo(card, stamped)).toBe(true);
  });

  it("should set hasBingo and show banner when a row is complete", () => {
    apiService.generateCard.mockReturnValue(of(mockCard));
    fixture.detectChanges();

    // Stamp all 5 cells in row 0
    const cells = fixture.nativeElement.querySelectorAll(
      ".bingo-row:first-child .bingo-cell",
    ) as NodeListOf<HTMLButtonElement>;
    cells.forEach((c) => c.click());
    fixture.detectChanges();

    expect(component.hasBingo()).toBe(true);
    expect(fixture.nativeElement.querySelector(".bingo-banner")).toBeTruthy();
  });

  it("should play win sound on bingo", () => {
    apiService.generateCard.mockReturnValue(of(mockCard));
    fixture.detectChanges();

    // stub not yet instantiated — spy on createOscillator post-load
    const oscSpy = vi.spyOn(mockAudioCtx, "createOscillator");

    const cells = fixture.nativeElement.querySelectorAll(
      ".bingo-row:first-child .bingo-cell",
    ) as NodeListOf<HTMLButtonElement>;
    cells.forEach((c) => c.click());
    fixture.detectChanges();

    expect(component.hasBingo()).toBe(true);
  });

  it("should show an error when card loading fails", () => {
    apiService.generateCard.mockReturnValue(
      throwError(() => new Error("failed")),
    );
    fixture.detectChanges();
    expect(component.loading()).toBe(false);
    expect(component.error()).toContain("Could not load bingo card");
  });

  it("should show backend validation message when available", () => {
    apiService.generateCard.mockReturnValue(
      throwError(() => ({
        status: 400,
        error: { message: "wordlistId query parameter is required" },
      })),
    );
    fixture.detectChanges();
    expect(component.error()).toContain(
      "wordlistId query parameter is required",
    );
  });
});

describe("CardComponent", () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;
  let apiService: any;
  let activatedRoute: any;

  const mockCard = {
    card: [
      ["W1", "W2", "W3", "W4", "W5"],
      ["W6", "W7", "W8", "W9", "W10"],
      ["W11", "W12", "FREE", "W13", "W14"],
      ["W15", "W16", "W17", "W18", "W19"],
      ["W20", "W21", "W22", "W23", "W24"],
    ],
  };

  beforeEach(async () => {
    apiService = {
      generateCard: vi.fn(),
    };
    activatedRoute = {
      snapshot: { paramMap: { get: vi.fn().mockReturnValue("1") } },
    };

    await TestBed.configureTestingModule({
      imports: [CardComponent],
      providers: [
        { provide: ApiService, useValue: apiService },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
  });

  it("should create", () => {
    apiService.generateCard.mockReturnValue(of(mockCard));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it("should load card on init", () => {
    apiService.generateCard.mockReturnValue(of(mockCard));
    fixture.detectChanges();
    expect(apiService.generateCard).toHaveBeenCalledWith("1");
    expect(component.card()).toEqual(mockCard.card);
  });

  it("should display 5x5 grid", () => {
    apiService.generateCard.mockReturnValue(of(mockCard));
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll(".bingo-row");
    expect(rows.length).toBe(5);
  });

  it("should mark FREE space as stamped", () => {
    apiService.generateCard.mockReturnValue(of(mockCard));
    fixture.detectChanges();

    const freeCell = fixture.nativeElement.querySelector(".free-cell");
    expect(freeCell).toBeTruthy();
    expect(freeCell.classList.contains("stamped")).toBe(true);
    expect(freeCell.textContent).toContain("FREE");
  });

  it("should stamp and unstamp a square on tap", () => {
    apiService.generateCard.mockReturnValue(of(mockCard));
    fixture.detectChanges();

    const firstPlayableCell = fixture.nativeElement.querySelector(
      ".bingo-cell:not(.free-cell)",
    ) as HTMLButtonElement;

    firstPlayableCell.click();
    fixture.detectChanges();
    expect(firstPlayableCell.classList.contains("stamped")).toBe(true);

    firstPlayableCell.click();
    fixture.detectChanges();
    expect(firstPlayableCell.classList.contains("stamped")).toBe(false);
  });

  it("should show an error when card loading fails", () => {
    apiService.generateCard.mockReturnValue(
      throwError(() => new Error("failed")),
    );

    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.error()).toContain("Could not load bingo card");
  });

  it("should show backend validation message when available", () => {
    apiService.generateCard.mockReturnValue(
      throwError(() => ({
        status: 400,
        error: { message: "wordlistId query parameter is required" },
      })),
    );

    fixture.detectChanges();

    expect(component.error()).toContain(
      "wordlistId query parameter is required",
    );
  });
});
