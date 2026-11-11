import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AuthModalService } from '../../../core/services/auth-modal.service';
import { AuthService } from '../../../core/services/auth.service';
import { AuthModalComponent } from './auth-modal.component';

describe('AuthModalComponent', () => {
  let fixture: ComponentFixture<AuthModalComponent>;
  let authModalService: AuthModalService;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [AuthModalComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
        AuthModalService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthModalComponent);
    authModalService = TestBed.inject(AuthModalService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    document.body.style.overflow = '';
    localStorage.clear();
  });

  it('renders nothing when modal is closed', () => {
    fixture.detectChanges();
    const backdrop = fixture.nativeElement.querySelector('.auth-modal-backdrop');
    expect(backdrop).toBeNull();
  });

  it('renders embedded Login form by default when opened in login mode with empty inputs', () => {
    authModalService.open('login');
    fixture.detectChanges();

    const backdrop = fixture.nativeElement.querySelector('.auth-modal-backdrop');
    expect(backdrop).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-login')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-signup')).toBeNull();

    const emailInput = fixture.nativeElement.querySelector('app-login input[type="email"]') as HTMLInputElement;
    const passwordInput = fixture.nativeElement.querySelector('app-login input[type="password"]') as HTMLInputElement;
    const rememberCheckbox = fixture.nativeElement.querySelector('app-login input[type="checkbox"]') as HTMLInputElement;
    expect(emailInput.value).toBe('');
    expect(passwordInput.value).toBe('');
    expect(rememberCheckbox.checked).toBe(false);
  });

  it('switches to Signup form when clicking Sign Up tab and shows empty inputs + unchecked terms', () => {
    authModalService.open('login');
    fixture.detectChanges();

    const tabs = fixture.nativeElement.querySelectorAll('.mode-tab-btn') as NodeListOf<HTMLButtonElement>;
    tabs[1].click();
    fixture.detectChanges();

    expect(authModalService.activeMode()).toBe('signup');
    expect(fixture.nativeElement.querySelector('app-signup')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('app-login')).toBeNull();

    const termsCheckbox = fixture.nativeElement.querySelector('app-signup input[type="checkbox"]') as HTMLInputElement;
    expect(termsCheckbox.checked).toBe(false);
  });

  it('closes cleanly via close button and dismiss action', () => {
    authModalService.open('login');
    fixture.detectChanges();

    const closeBtn = fixture.nativeElement.querySelector('.modal-close-btn') as HTMLButtonElement;
    closeBtn.click();
    fixture.detectChanges();

    expect(authModalService.isOpen()).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('closes on forgotPassword event and navigates to forgot-password', () => {
    authModalService.open('login');
    fixture.detectChanges();

    fixture.componentInstance.onForgotPassword();
    expect(authModalService.isOpen()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/forgot-password']);
  });
});
