import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminRestaurantsComponent } from './admin-restaurants.component';
import { AdminDataService } from '../../../core/services/admin-data.service';
import { AuthService } from '../../../core/services/auth.service';

describe('AdminRestaurantsComponent', () => {
  let component: AdminRestaurantsComponent;
  let fixture: ComponentFixture<AdminRestaurantsComponent>;
  let adminData: AdminDataService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminRestaurantsComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        AdminDataService,
        {
          provide: AuthService,
          useValue: {
            currentUser: () => ({ fullName: 'Chef Julien Laurent', email: 'owner@legabriel.fr' }),
            logout: () => {}
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminRestaurantsComponent);
    component = fixture.componentInstance;
    adminData = TestBed.inject(AdminDataService);

    adminData.setOwnerRestaurants([
      {
        id: 'owner-rest-1',
        name: 'Le Gabriel Paris',
        address: '42 Avenue Gabriel',
        city: 'Paris',
        description: 'An intimate 3-Michelin-starred dining sanctuary.',
        phone: '+33 1 58 36 60 50',
        email: 'reservations@legabriel.fr',
        cuisines: ['French Haute', 'Contemporary'],
        coverImageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947',
        galleryImages: [],
        rating: 4.96,
        reviewCount: 312,
        status: 'active',
        createdAt: '2026-01-15'
      },
      {
        id: 'owner-rest-2',
        name: 'L\'Arpège Heritage',
        address: '84 Rue de Varenne',
        city: 'Paris',
        description: 'Pioneering biodynamic gastronomy.',
        phone: '+33 1 47 05 09 06',
        email: 'contact@arpege-paris.fr',
        cuisines: ['French Haute', 'Biodynamic'],
        coverImageUrl: 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c',
        galleryImages: [],
        rating: 4.92,
        reviewCount: 284,
        status: 'active',
        createdAt: '2026-02-10'
      }
    ]);

    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should render owner restaurants from AdminDataService', () => {
    expect(component.filteredRestaurants().length).toBeGreaterThan(0);
    const cards = fixture.nativeElement.querySelectorAll('.restaurant-card');
    expect(cards.length).toBe(component.filteredRestaurants().length);
  });

  it('should filter restaurants by search query', () => {
    component.searchQuery.set('Gabriel');
    fixture.detectChanges();

    expect(component.filteredRestaurants().length).toBe(1);
    expect(component.filteredRestaurants()[0].name).toContain('Gabriel');
  });

  it('should open and close details modal', () => {
    const first = component.filteredRestaurants()[0];
    component.openDetails(first);
    fixture.detectChanges();

    expect(component.selectedRestaurant()).toEqual(first);
    const modal = fixture.nativeElement.querySelector('.details-modal');
    expect(modal).toBeTruthy();

    component.closeDetails();
    fixture.detectChanges();
    expect(component.selectedRestaurant()).toBeNull();
  });

  it('should open edit modal and save updates', () => {
    const first = component.filteredRestaurants()[0];
    component.openEdit(first);
    fixture.detectChanges();

    expect(component.editingRestaurant()).toEqual(first);
    expect(component.editName).toBe(first.name);

    component.editName = 'Updated Restaurant Name';
    component.saveEdit();
    fixture.detectChanges();

    expect(component.editingRestaurant()).toBeNull();
    const updated = adminData.ownerRestaurants().find(r => r.id === first.id);
    expect(updated?.name).toBe('Updated Restaurant Name');
  });

  it('should delete a restaurant after confirmation', () => {
    const initialCount = adminData.ownerRestaurants().length;
    const toDelete = adminData.ownerRestaurants()[0];

    component.confirmDelete(toDelete);
    expect(component.deletingRestaurant()).toEqual(toDelete);

    component.executeDelete();
    expect(component.deletingRestaurant()).toBeNull();
    expect(adminData.ownerRestaurants().length).toBe(initialCount - 1);
  });
});
