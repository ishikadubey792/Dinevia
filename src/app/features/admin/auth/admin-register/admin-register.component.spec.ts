import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AdminRegisterComponent } from './admin-register.component';

describe('AdminRegisterComponent', () => {
  let component: AdminRegisterComponent;
  let fixture: ComponentFixture<AdminRegisterComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRegisterComponent],
      providers: [
        provideRouter([
          { path: 'admin/register', component: AdminRegisterComponent },
          { path: 'admin/dashboard', component: AdminRegisterComponent },
          { path: 'admin/login', component: AdminRegisterComponent },
          { path: 'partner-with-us', component: AdminRegisterComponent }
        ])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRegisterComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the admin register component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form fields with sensible defaults', () => {
    expect(component.restaurantName).toBeTruthy();
    expect(component.businessEmail).toBeTruthy();
    expect(component.termsAccepted()).toBe(true);
    expect(component.isSubmitting()).toBe(false);
  });

  it('should navigate to /admin/dashboard on registration submit', () => {
    vi.useFakeTimers();
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.onSubmit();
    expect(component.isSubmitting()).toBe(true);

    vi.advanceTimersByTime(700);
    expect(component.isSubmitting()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/dashboard']);
    vi.useRealTimers();
  });
});
