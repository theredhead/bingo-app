import { ComponentFixture, TestBed } from "@angular/core/testing";
import { FireworksOverlayComponent } from "./fireworks-overlay.component";

describe("FireworksOverlayComponent", () => {
  let fixture: ComponentFixture<FireworksOverlayComponent>;
  let component: FireworksOverlayComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FireworksOverlayComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FireworksOverlayComponent);
    component = fixture.componentInstance;
  });

  it("does not render fireworks when inactive", () => {
    fixture.componentRef.setInput("active", false);
    fixture.componentRef.setInput("token", 1);
    fixture.detectChanges();

    const bursts = fixture.nativeElement.querySelectorAll(".firework-burst");
    expect(bursts.length).toBe(0);
  });

  it("renders bursts when active token changes", () => {
    fixture.componentRef.setInput("active", true);
    fixture.componentRef.setInput("token", 1);
    fixture.detectChanges();

    const bursts = fixture.nativeElement.querySelectorAll(".firework-burst");
    expect(bursts.length).toBeGreaterThan(0);
  });
});
