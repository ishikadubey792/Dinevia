import { Injectable, inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ScrollRevealService implements OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private observer?: IntersectionObserver;
  private readonly callbacks = new Map<Element, () => void>();

  constructor() {
    this.initObserver();
  }

  private initObserver(): void {
    if (!isPlatformBrowser(this.platformId) || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const target = entry.target;
            target.classList.add('is-revealed');
            const cb = this.callbacks.get(target);
            if (cb) {
              cb();
            }
            this.unobserve(target);
          }
        }
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -70px 0px'
      }
    );
  }

  observe(element: Element, onReveal?: () => void): void {
    if (!isPlatformBrowser(this.platformId) || !this.observer) {
      // In SSR or fallback environments, reveal immediately so content is visible
      element.classList.add('is-revealed');
      onReveal?.();
      return;
    }

    if (onReveal) {
      this.callbacks.set(element, onReveal);
    }
    this.observer.observe(element);
  }

  unobserve(element: Element): void {
    if (this.observer) {
      this.observer.unobserve(element);
    }
    this.callbacks.delete(element);
  }

  ngOnDestroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = undefined;
    }
    this.callbacks.clear();
  }
}

