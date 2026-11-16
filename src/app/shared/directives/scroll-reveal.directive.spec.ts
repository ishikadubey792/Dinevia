import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ScrollRevealDirective } from './scroll-reveal.directive';
import { ScrollRevealService } from './scroll-reveal.service';

@Component({
  standalone: true,
  imports: [ScrollRevealDirective],
  template: `
    <div id="testTarget" appScrollReveal [revealDelay]="100">Test Item</div>
  `
})
class TestHostComponent {}

describe('ScrollRevealDirective & ScrollRevealService', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let service: ScrollRevealService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    service = TestBed.inject(ScrollRevealService);
    fixture.detectChanges();
  });

  it('should create directive and attach scroll-reveal class to target', () => {
    const el = fixture.debugElement.query(By.css('#testTarget')).nativeElement as HTMLElement;
    expect(el).toBeTruthy();
    expect(el.classList.contains('scroll-reveal')).toBe(true);
    expect(el.style.transitionDelay).toBe('100ms');
  });

  it('should immediately add is-revealed class if in fallback environment', () => {
    const el = document.createElement('div');
    service.observe(el);
    expect(el.classList.contains('is-revealed')).toBe(true);
  });

  it('should clean up observed elements on unobserve', () => {
    const el = document.createElement('div');
    expect(() => service.unobserve(el)).not.toThrow();
  });
});

