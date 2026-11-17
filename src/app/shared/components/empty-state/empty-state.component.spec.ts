import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';
import { provideRouter } from '@angular/router';

describe('EmptyStateComponent', () => {
  let component: EmptyStateComponent;
  let fixture: ComponentFixture<EmptyStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmptyStateComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(EmptyStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the empty state component', () => {
    expect(component).toBeTruthy();
  });

  it('should display title and description', () => {
    fixture.componentRef.setInput('title', 'No Reservations Found');
    fixture.componentRef.setInput('description', 'You have not booked any tables yet.');
    fixture.detectChanges();

    const titleEl = fixture.nativeElement.querySelector('.empty-title');
    const descEl = fixture.nativeElement.querySelector('.empty-desc');
    expect(titleEl?.textContent).toContain('No Reservations Found');
    expect(descEl?.textContent).toContain('You have not booked any tables yet.');
  });

  it('should render action button and emit actionClick', () => {
    fixture.componentRef.setInput('actionLabel', 'Explore Restaurants');
    fixture.detectChanges();

    const emitSpy = vi.fn();
    component.actionClick.subscribe(emitSpy);

    const btn = fixture.nativeElement.querySelector('button.btn');
    expect(btn?.textContent).toContain('Explore Restaurants');
    btn.click();
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });

  it('should render routerLink anchor when actionRoute is provided', () => {
    fixture.componentRef.setInput('actionLabel', 'Browse Destinations');
    fixture.componentRef.setInput('actionRoute', '/explore');
    fixture.detectChanges();

    const anchor = fixture.nativeElement.querySelector('a.btn');
    expect(anchor).toBeTruthy();
    expect(anchor?.textContent).toContain('Browse Destinations');
  });
});
