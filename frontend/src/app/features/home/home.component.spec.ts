import { ComponentFixture, TestBed } from "@angular/core/testing";
import { HomeComponent } from "./home.component";
import { ApiService } from "../../core/api.service";
import { Router } from "@angular/router";
import { of, throwError } from "rxjs";
import { Wordlist } from "../../core/models";

describe("HomeComponent", () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;
  let apiService: any;
  let router: any;

  const mockWordlists: Wordlist[] = [
    {
      id: "1",
      name: "Animals",
      description: "Animal words",
      words: [],
      createdAt: "",
    },
    {
      id: "2",
      name: "Food",
      description: "Food words",
      words: [],
      createdAt: "",
    },
  ];

  beforeEach(async () => {
    apiService = {
      getWordlists: vi.fn(),
    };
    router = {
      navigate: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        { provide: ApiService, useValue: apiService },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HomeComponent);
    component = fixture.componentInstance;
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should load wordlists on init", () => {
    apiService.getWordlists.mockReturnValue(of(mockWordlists));
    fixture.detectChanges(); // triggers ngOnInit
    expect(apiService.getWordlists).toHaveBeenCalled();
    expect(component.wordlists()).toEqual(mockWordlists);
  });

  it("should display wordlists", () => {
    apiService.getWordlists.mockReturnValue(of(mockWordlists));
    fixture.detectChanges();
    const compiled = fixture.nativeElement;
    expect(compiled.querySelectorAll(".wordlist-card").length).toBe(2);
  });

  it("should navigate to host setup on host button click", () => {
    apiService.getWordlists.mockReturnValue(of(mockWordlists));
    fixture.detectChanges();
    component.hostGame("1");
    expect(router.navigate).toHaveBeenCalledWith(["/bingo/host", "1"]);
  });

  it("should show an error when loading wordlists fails", () => {
    apiService.getWordlists.mockReturnValue(
      throwError(() => new Error("failed")),
    );

    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.error()).toContain("Could not load wordlists");
  });
});
