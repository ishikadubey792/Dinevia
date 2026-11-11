import {
  Component,
  HostListener,
  OnDestroy,
  PLATFORM_ID,
  effect,
  inject
} from '@angular/core';
import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthModalMode, AuthModalService } from '../../../core/services/auth-modal.service';
import { LoginComponent } from '../../../features/auth/login/login.component';
import { SignupComponent } from '../../../features/auth/signup/signup.component';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, LoginComponent, SignupComponent],
  templateUrl: './auth-modal.component.html',
  styleUrl: './auth-modal.component.scss'
})
export class AuthModalComponent implements OnDestroy {
  readonly authModalService = inject(AuthModalService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);

  constructor() {
    effect(() => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }
      this.document.body.style.overflow = this.authModalService.isOpen() ? 'hidden' : '';
    });
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.authModalService.isOpen()) {
      this.close();
    }
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  switchMode(mode: AuthModalMode): void {
    this.authModalService.switchMode(mode);
  }

  close(): void {
    this.authModalService.close(true);
  }

  onAuthSuccess(): void {
    this.authModalService.handleAuthSuccess();
  }

  onForgotPassword(): void {
    this.authModalService.close(true);
    this.router.navigate(['/forgot-password']);
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.document.body.style.overflow = '';
    }
  }
}

