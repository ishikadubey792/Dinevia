import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdminTablesComponent } from './admin-tables.component';
import { RestaurantTableService } from '../../../core/services/restaurant-table.service';
import { AdminDataService } from '../../../core/services/admin-data.service';
import { RestaurantTable } from '../../../core/models/restaurant-table.model';
import { OwnerRestaurant } from '../../../core/models/admin.model';

describe('AdminTablesComponent', () => {
  let component: AdminTablesComponent;
  let fixture: ComponentFixture<AdminTablesComponent>;
  let tableServiceSpy: any;
  let adminDataSpy: any;

  const mockRestaurants: OwnerRestaurant[] = [
    {
      id: '10',
      name: 'Le Gabriel Paris',
      address: 'Avenue Gabriel',
      city: 'Paris',
      description: 'Haute cuisine',
      phone: '+33 1 44 31',
      email: 'contact@legabriel.fr',
      cuisines: ['French Haute Cuisine'],
      coverImageUrl: 'https://example.com/cover.jpg',
      status: 'active',
      createdAt: '2026-01-01'
    },
    {
      id: '20',
      name: 'Mirazur Menton',
      address: 'Route de Menton',
      city: 'Menton',
      description: 'Coastal gastronomy',
      phone: '+33 4 93 57',
      email: 'contact@mirazur.fr',
      cuisines: ['Mediterranean'],
      coverImageUrl: 'https://example.com/cover2.jpg',
      status: 'active',
      createdAt: '2026-01-01'
    }
  ];

  const mockTables: RestaurantTable[] = [
    { id: 101, restaurantId: 10, tableNumber: 1, capacity: 2, status: 'Available' },
    { id: 102, restaurantId: 10, tableNumber: 2, capacity: 4, status: 'Occupied' },
    { id: 103, restaurantId: 10, tableNumber: 3, capacity: 6, status: 'Reserved' }
  ];

  beforeEach(async () => {
    tableServiceSpy = {
      getTablesByRestaurant: vi.fn().mockReturnValue(of(mockTables)),
      createTable: vi.fn().mockReturnValue(of({ id: 104, restaurantId: 10, tableNumber: 4, capacity: 4, status: 'Available' })),
      updateTable: vi.fn().mockReturnValue(of({ id: 102 })),
      deleteTable: vi.fn().mockReturnValue(of({ id: 101 }))
    };

    adminDataSpy = {
      loadOwnerRestaurants: vi.fn().mockReturnValue(of(mockRestaurants)),
      ownerRestaurants: vi.fn().mockReturnValue(mockRestaurants)
    };

    await TestBed.configureTestingModule({
      imports: [AdminTablesComponent],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: RestaurantTableService, useValue: tableServiceSpy },
        { provide: AdminDataService, useValue: adminDataSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminTablesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should initialize and load restaurants and tables for first owner restaurant', () => {
    expect(adminDataSpy.loadOwnerRestaurants).toHaveBeenCalled();
    expect(component.restaurants().length).toBe(2);
    expect(component.selectedRestaurantId()).toBe(10);
    expect(tableServiceSpy.getTablesByRestaurant).toHaveBeenCalledWith(10);
    expect(component.tables().length).toBe(3);
    expect(component.totalTablesCount()).toBe(3);
    expect(component.totalSeatsCount()).toBe(12);
  });

  it('should switch restaurant and load tables for selected owned restaurant', () => {
    component.onRestaurantChange('20');
    expect(component.selectedRestaurantId()).toBe(20);
    expect(tableServiceSpy.getTablesByRestaurant).toHaveBeenCalledWith(20);
  });

  it('should reject selecting restaurant ID not owned by authenticated owner', () => {
    component.onRestaurantChange('999'); // Non-owned ID
    expect(component.selectedRestaurantId()).toBe(10); // remains unchanged
  });

  it('should render loading and empty states properly', () => {
    tableServiceSpy.getTablesByRestaurant.mockReturnValue(of([]));
    component.loadTables(10);
    fixture.detectChanges();

    expect(component.tables().length).toBe(0);
    expect(component.totalTablesCount()).toBe(0);
  });

  it('should handle table loading errors gracefully', () => {
    tableServiceSpy.getTablesByRestaurant.mockReturnValue(throwError(() => ({
      error: { message: 'Network connection lost' }
    })));
    component.loadTables(10);
    fixture.detectChanges();

    expect(component.tablesError()).toBe('Network connection lost');
    expect(component.isLoadingTables()).toBe(false);
  });

  it('should open Add Table modal and pre-suggest next table number', () => {
    component.openAddModal();
    expect(component.isAddModalOpen()).toBe(true);
    expect(component.addForm.tableNumber).toBe(4); // max is 3, so next is 4
    expect(component.addForm.status).toBe('Available');
  });

  it('should validate add form fields and block empty or invalid input', () => {
    component.openAddModal();
    component.addForm.tableNumber = 0;
    component.submitAddTable();
    expect(component.addError()).toBe('Table number must be greater than 0.');

    component.addForm.tableNumber = 5;
    component.addForm.capacity = 0;
    component.submitAddTable();
    expect(component.addError()).toBe('Table capacity must be at least 1 guest.');

    component.addForm.capacity = 4;
    component.addForm.tableNumber = 1; // Already exists
    component.submitAddTable();
    expect(component.addError()).toContain('already exists');
  });

  it('should submit Add Table and refresh list on success', () => {
    component.openAddModal();
    component.addForm.tableNumber = 4;
    component.addForm.capacity = 4;
    component.addForm.status = 'Available';

    component.submitAddTable();

    expect(tableServiceSpy.createTable).toHaveBeenCalledWith({
      restaurantId: 10,
      tableNumber: 4,
      capacity: 4,
      status: 'Available'
    });
    expect(component.isAddModalOpen()).toBe(false);
    expect(component.toastMessage()).toContain('Table #4 added');
  });

  it('should open Edit Table modal with table data and update via PUT', () => {
    const tableToEdit = mockTables[1]; // Table #2
    component.openEditModal(tableToEdit);

    expect(component.editingTable()).toEqual(tableToEdit);
    expect(component.editForm.tableNumber).toBe(2);
    expect(component.editForm.capacity).toBe(4);

    component.editForm.capacity = 6;
    component.submitEditTable();

    expect(tableServiceSpy.updateTable).toHaveBeenCalledWith(102, {
      restaurantId: 10,
      tableNumber: 2,
      capacity: 6,
      status: 'Occupied'
    });
    expect(component.editingTable()).toBeNull();
    expect(component.toastMessage()).toContain('Table #2 updated');
  });

  it('should open Delete confirmation and execute DELETE on confirm', () => {
    const tableToDelete = mockTables[0];
    component.openDeleteModal(tableToDelete);

    expect(component.deletingTable()).toEqual(tableToDelete);

    component.confirmDeleteTable();

    expect(tableServiceSpy.deleteTable).toHaveBeenCalledWith(101);
    expect(component.deletingTable()).toBeNull();
    expect(component.toastMessage()).toContain('removed successfully');
  });

  it('should display friendly error if table deletion fails due to existing bookings', () => {
    const tableToDelete = mockTables[0];
    component.openDeleteModal(tableToDelete);

    tableServiceSpy.deleteTable.mockReturnValue(throwError(() => ({
      status: 400,
      error: { message: 'Table has associated bookings and cannot be deleted.' }
    })));

    component.confirmDeleteTable();

    expect(component.deleteError()).toContain('associated bookings');
    expect(component.deletingTable()).toEqual(tableToDelete); // Dialog remains open so owner sees the error
  });
});
