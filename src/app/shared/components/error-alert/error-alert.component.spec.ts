import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ErrorAlertComponent } from './error-alert.component';

describe('ErrorAlertComponent', () => {
  let component: ErrorAlertComponent;
  let fixture: ComponentFixture<ErrorAlertComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorAlertComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ErrorAlertComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the error alert component', () => {
    expect(component).toBeTruthy();
  });

  it('should display title and message', () => {
    fixture.componentRef.setInput('title', 'Database Offline');
    fixture.componentRef.setInput('message', 'Please check network connectivity.');
    fixture.detectChanges();

    const titleEl = fixture.nativeElement.querySelector('.error-title');
    const msgEl = fixture.nativeElement.querySelector('.error-message');
    expect(titleEl?.textContent).toContain('Database Offline');
    expect(msgEl?.textContent).toContain('Please check network connectivity.');
  });

  it('should emit retry event when retry button is clicked', () => {
    const retrySpy = vi.fn();
    component.retry.subscribe(retrySpy);

    const btn = fixture.nativeElement.querySelector('.retry-button');
    btn.click();

    expect(retrySpy).toHaveBeenCalledTimes(1);
  });

  it('should hide retry button when showRetry is false', () => {
    fixture.componentRef.setInput('showRetry', false);
    fixture.detectChanges();

    const btn = fixture.nativeElement.querySelector('.retry-button');
    expect(btn).toBeNull();
  });
});
