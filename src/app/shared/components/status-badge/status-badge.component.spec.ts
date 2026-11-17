import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusBadgeComponent } from './status-badge.component';

describe('StatusBadgeComponent', () => {
  let component: StatusBadgeComponent;
  let fixture: ComponentFixture<StatusBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBadgeComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StatusBadgeComponent);
    component = fixture.componentInstance;
  });

  it('should create the status badge', () => {
    component.status = 'Confirmed';
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should format label and compute badge-confirmed for Confirmed', () => {
    component.status = 'Confirmed';
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.status-badge');
    expect(badge.classList.contains('badge-confirmed')).toBe(true);
    expect(badge.textContent).toContain('Confirmed');
  });

  it('should compute badge-pending for Pending status', () => {
    component.status = 'Pending';
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.status-badge');
    expect(badge.classList.contains('badge-pending')).toBe(true);
  });

  it('should compute badge-cancelled for Cancelled status', () => {
    component.status = 'Cancelled';
    fixture.detectChanges();

    const badge = fixture.nativeElement.querySelector('.status-badge');
    expect(badge.classList.contains('badge-cancelled')).toBe(true);
  });

  it('should hide status dot when showDot is false', () => {
    component.status = 'Success';
    component.showDot = false;
    fixture.detectChanges();

    const dot = fixture.nativeElement.querySelector('.status-dot');
    expect(dot).toBeNull();
  });
});
