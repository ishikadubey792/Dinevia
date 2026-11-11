import { Component, DestroyRef, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { AuthModalComponent } from './shared/components/auth-modal/auth-modal.component';
import { AuthModalService } from './core/services/auth-modal.service';

@Component({
  imports: [RouterOutlet, AuthModalComponent],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App implements OnInit {
  protected readonly title = signal('dinevia');
  private readonly authModalService = inject(AuthModalService);
  private readonly router = inject(Router);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    const rawPathname =
      isPlatformBrowser(this.platformId) && this.document.location?.pathname
        ? this.document.location.pathname
        : this.router.url;
    const initialUrl =
      rawPathname === '/context.html' ? this.router.url || '/' : rawPathname || '/';

    this.authModalService.evaluateInitialLoad(initialUrl);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(event => {
        this.authModalService.handleRouteChange(event.urlAfterRedirects);
      });
  }
}
