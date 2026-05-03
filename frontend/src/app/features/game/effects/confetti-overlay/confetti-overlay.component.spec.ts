import { ComponentFixture, TestBed } from "@angular/core/testing";
import { ConfettiOverlayComponent } from "./confetti-overlay.component";

describe("ConfettiOverlayComponent", () => {
  let fixture: ComponentFixture<ConfettiOverlayComponent>;
  let component: ConfettiOverlayComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfettiOverlayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfettiOverlayComponent);
    component = fixture.componentInstance;
  });

  it("does not render confetti when inactive", () => {
    fixture.componentRef.setInput("active", false);
    fixture.componentRef.setInput("token", 1);
    fixture.detectChanges();

    const pieces = fixture.nativeElement.querySelectorAll(".confetti-piece");
    expect(pieces.length).toBe(0);
  });

  it("renders randomized pieces when active token changes", () => {
    fixture.componentRef.setInput("active", true);
    fixture.componentRef.setInput("token", 1);
    fixture.detectChanges();

    const pieces = fixture.nativeElement.querySelectorAll(".confetti-piece");
    expect(pieces.length).toBeGreaterThan(20);
  });
});
