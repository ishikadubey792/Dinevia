import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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

