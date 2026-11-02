import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { PartnerWithUsComponent } from './partner-with-us.component';
import { AuthService } from '../../core/services/auth.service';

describe('PartnerWithUsComponent', () => {
  let component: PartnerWithUsComponent;
  let fixture: ComponentFixture<PartnerWithUsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnerWithUsComponent],
      providers: [
        provideRouter([
          { path: 'partner-with-us', component: PartnerWithUsComponent },
          { path: 'admin/register', component: PartnerWithUsComponent },
          { path: 'admin/login', component: PartnerWithUsComponent },
          { path: 'admin/dashboard', component: PartnerWithUsComponent }
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

    fixture = TestBed.createComponent(PartnerWithUsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the partner with us landing page', () => {
    expect(component).toBeTruthy();
  });

  it('should render the hero section with heading and description', () => {
    const heroTitle = fixture.nativeElement.querySelector('.hero-title');
    expect(heroTitle).toBeTruthy();
    expect(heroTitle.textContent).toContain('Grow Your Restaurant with');
    expect(heroTitle.textContent).toContain('Dinevia.');

    const heroDesc = fixture.nativeElement.querySelector('.hero-description');
    expect(heroDesc).toBeTruthy();
    expect(heroDesc.textContent).toContain('discerning epicures');
  });

  it('should render Get Started and Restaurant Owner Login hero action links', () => {
    const getStartedBtn = fixture.nativeElement.querySelector('.hero-actions a[routerLink="/admin/register"]');
    expect(getStartedBtn).toBeTruthy();
    expect(getStartedBtn.textContent).toContain('Get Started');

    const ownerLoginBtn = fixture.nativeElement.querySelector('.hero-actions a[routerLink="/admin/login"]');
    expect(ownerLoginBtn).toBeTruthy();
    expect(ownerLoginBtn.textContent).toContain('Restaurant Owner Login');
  });

  it('should display the 4 core restaurant partner benefits', () => {
    expect(component.benefits.length).toBe(4);

    const benefitCards = fixture.nativeElement.querySelectorAll('.benefit-card');
    expect(benefitCards.length).toBe(4);

    const titles = Array.from(benefitCards).map((card: any) => card.querySelector('.benefit-title')?.textContent.trim());
    expect(titles).toContain('Elevated Online Visibility');
    expect(titles).toContain('Intelligent Reservation Management');
    expect(titles).toContain('Precision Table & Floor Management');
    expect(titles).toContain('Affluent Customer Reach');
  });

  it('should display onboarding steps explaining how onboarding works', () => {
    expect(component.onboardingSteps.length).toBe(4);

    const stepCards = fixture.nativeElement.querySelectorAll('.step-card');
    expect(stepCards.length).toBe(4);

    const stepNumbers = Array.from(stepCards).map((card: any) => card.querySelector('.step-number')?.textContent.trim());
    expect(stepNumbers).toEqual(['01', '02', '03', '04']);
  });

  it('should render partner performance metrics strip', () => {
    expect(component.metrics.length).toBe(4);

    const metricBlocks = fixture.nativeElement.querySelectorAll('.metric-block');
    expect(metricBlocks.length).toBe(4);
  });

  it('should render the final CTA section with register and login actions', () => {
    const ctaRegister = fixture.nativeElement.querySelector('.cta-actions a[routerLink="/admin/register"]');
    const ctaLogin = fixture.nativeElement.querySelector('.cta-actions a[routerLink="/admin/login"]');

    expect(ctaRegister).toBeTruthy();
    expect(ctaLogin).toBeTruthy();
  });
});

