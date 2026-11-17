import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadingSpinnerComponent } from './loading-spinner.component';

describe('LoadingSpinnerComponent', () => {
  let component: LoadingSpinnerComponent;
  let fixture: ComponentFixture<LoadingSpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingSpinnerComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingSpinnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the loading spinner component', () => {
    expect(component).toBeTruthy();
  });

  it('should display the default loading message', () => {
    const textEl = fixture.nativeElement.querySelector('.loading-text');
    expect(textEl?.textContent).toContain('Loading culinary experiences...');
  });

  it('should display custom message and subtitle when provided', () => {
    fixture.componentRef.setInput('message', 'Fetching table inventory...');
    fixture.componentRef.setInput('subtitle', 'Connecting to concierge backend');
    fixture.detectChanges();

    const textEl = fixture.nativeElement.querySelector('.loading-text');
    const subEl = fixture.nativeElement.querySelector('.loading-subtitle');
    expect(textEl?.textContent).toContain('Fetching table inventory...');
    expect(subEl?.textContent).toContain('Connecting to concierge backend');
  });

  it('should apply size classes correctly', () => {
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    const stage = fixture.nativeElement.querySelector('.restaurants-loading-stage');
    expect(stage?.classList.contains('loading-stage-sm')).toBe(true);
  });
});
