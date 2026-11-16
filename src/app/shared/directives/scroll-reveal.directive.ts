import {
  Directive,
  ElementRef,
  Input,
  OnInit,
  AfterViewInit,
  OnDestroy,
  inject
} from '@angular/core';
import { ScrollRevealService } from './scroll-reveal.service';

@Directive({
  selector: '[appScrollReveal]',
  standalone: true
})
export class ScrollRevealDirective implements OnInit, AfterViewInit, OnDestroy {
  private readonly el = inject(ElementRef);
  private readonly scrollRevealService = inject(ScrollRevealService);

  @Input() revealClass = 'is-revealed';
  @Input() revealDelay?: number;

  ngOnInit(): void {
    const nativeEl = this.el.nativeElement as HTMLElement;
    nativeEl.classList.add('scroll-reveal');

    if (this.revealDelay !== undefined && this.revealDelay > 0) {
      nativeEl.style.transitionDelay = `${this.revealDelay}ms`;
    }
  }

  ngAfterViewInit(): void {
    const nativeEl = this.el.nativeElement as HTMLElement;
    this.scrollRevealService.observe(nativeEl, () => {
      nativeEl.classList.add(this.revealClass);
    });
  }

  ngOnDestroy(): void {
    this.scrollRevealService.unobserve(this.el.nativeElement);
  }
}

