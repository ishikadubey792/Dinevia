import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmModalComponent } from './confirm-modal.component';

describe('ConfirmModalComponent', () => {
  let component: ConfirmModalComponent;
  let fixture: ComponentFixture<ConfirmModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmModalComponent);
    component = fixture.componentInstance;
  });

  it('should create the confirm modal component', () => {
    expect(component).toBeTruthy();
  });

  it('should not render anything when isOpen is false', () => {
    component.isOpen = false;
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('.admin-modal');
    expect(dialog).toBeNull();
  });

  it('should render dialog when isOpen is true', () => {
    component.isOpen = true;
    component.title = 'Delete Table #4';
    component.message = 'Are you sure?';
    fixture.detectChanges();

    const dialog = fixture.nativeElement.querySelector('.admin-modal');
    expect(dialog).toBeTruthy();
    expect(dialog.textContent).toContain('Delete Table #4');
    expect(dialog.textContent).toContain('Are you sure?');
  });

  it('should emit confirm event when confirm button is clicked', () => {
    component.isOpen = true;
    fixture.detectChanges();

    const confirmSpy = vi.fn();
    component.confirm.subscribe(confirmSpy);

    const confirmBtn = fixture.nativeElement.querySelector('.modal-footer button.btn-danger');
    confirmBtn.click();
    expect(confirmSpy).toHaveBeenCalledTimes(1);
  });

  it('should emit cancel event when cancel button is clicked', () => {
    component.isOpen = true;
    fixture.detectChanges();

    const cancelSpy = vi.fn();
    component.cancel.subscribe(cancelSpy);

    const cancelBtn = fixture.nativeElement.querySelector('.modal-footer button.btn-outline');
    cancelBtn.click();
    expect(cancelSpy).toHaveBeenCalledTimes(1);
  });
});
