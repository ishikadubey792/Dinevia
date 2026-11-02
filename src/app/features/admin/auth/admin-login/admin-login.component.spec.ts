import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AdminLoginComponent } from './admin-login.component';
import { AuthService } from '../../../../core/services/auth.service';

describe('AdminLoginComponent', () => {
  let component: AdminLoginComponent;
  let fixture: ComponentFixture<AdminLoginComponent>;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminLoginComponent],
      providers: [
        provideRouter([
          { path: 'admin/login', component: AdminLoginComponent },
          { path: 'admin/dashboard', component: AdminLoginComponent },
          { path: 'admin/register', component: AdminLoginComponent },
          { path: 'partner-with-us', component: AdminLoginComponent }
        ]),
        {
          provide: AuthService,
          useValue: {
            currentUser: () => null,
            logout: () => {}
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('should create the admin login component', () => {
    expect(component).toBeTruthy();
  });

  it('should have initial credentials and loading false', () => {
    expect(component.email).toBeTruthy();
    expect(component.isLoading()).toBe(false);
    expect(component.errorMessage()).toBeNull();
  });

  it('should populate demo credentials on demo button click', () => {
    component.useDemoCredentials('arpege');
    expect(component.email).toBe('owner@arpege-paris.fr');
    expect(component.password).toBe('DineviaPass2026!');
  });

  it('should navigate to /admin/dashboard on login submit', () => {
    vi.useFakeTimers();
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.onLogin();
    expect(component.isLoading()).toBe(true);

    vi.advanceTimersByTime(600);
    expect(component.isLoading()).toBe(false);
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/dashboard']);
    vi.useRealTimers();
  });
});
