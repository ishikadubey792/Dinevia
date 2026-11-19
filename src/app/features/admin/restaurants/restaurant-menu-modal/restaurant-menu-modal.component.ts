import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ElementRef,
  inject,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestaurantMediaService, BatchUploadResult } from '../../../../core/services/restaurant-media.service';
import {
  MenuImageDto,
  MenuImageItem,
  resolveMenuImageUrl
} from '../../../../core/models/restaurant-media.model';
import { OwnerRestaurant } from '../../../../core/models/admin.model';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Component({
  selector: 'app-restaurant-menu-modal',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmModalComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './restaurant-menu-modal.component.html',
  styleUrl: './restaurant-menu-modal.component.scss'
})
export class RestaurantMenuModalComponent implements OnChanges {
  private readonly mediaService = inject(RestaurantMediaService);

  @ViewChild('fileInput') fileInputRef?: ElementRef<HTMLInputElement>;

  @Input() isOpen = false;
  @Input() restaurant: OwnerRestaurant | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() menuChanged = new EventEmitter<{
    restaurantId: string;
    imagesCount: number;
  }>();

  // Menu items state
  readonly rawImages = signal<MenuImageDto[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly loadError = signal<string | null>(null);
  readonly isInactive = signal<boolean>(false);

  // Uploading state
  readonly isUploading = signal<boolean>(false);
  readonly uploadProgressMessage = signal<string>('');
  readonly uploadError = signal<string | null>(null);
  readonly isDragOver = signal<boolean>(false);

  // Deletion state
  readonly deletingImage = signal<MenuImageItem | null>(null);
  readonly isDeleting = signal<boolean>(false);
  readonly deleteError = signal<string | null>(null);

  // Full-size Lightbox preview state
  readonly previewingImage = signal<MenuImageItem | null>(null);

  // Toast feedback
  readonly toastMessage = signal<string | null>(null);

  // Computed menu items with full URLs and page labels sorted by displayOrder
  readonly menuItems = computed<MenuImageItem[]>(() => {
    return this.rawImages()
      .slice()
      .sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id)
      .map((img, index) => ({
        ...img,
        fullUrl: resolveMenuImageUrl(img.imagePath),
        pageLabel: `Page ${img.displayOrder || index + 1}`
      }));
  });

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['isOpen'] && this.isOpen) || (changes['restaurant'] && this.restaurant && this.isOpen)) {
      this.initMenu();
    }
  }

  private initMenu(): void {
    if (!this.restaurant) return;

    this.uploadError.set(null);
    this.loadError.set(null);

    // If restaurant is deactivated, do not call GET (backend throws 404 for inactive restaurants)
    if (this.restaurant.isActive === false) {
      this.isInactive.set(true);
      this.rawImages.set([]);
      this.isLoading.set(false);
      return;
    }

    this.isInactive.set(false);
    this.loadMenuImages();
  }

  loadMenuImages(): void {
    if (!this.restaurant || this.isInactive()) return;

    this.isLoading.set(true);
    this.loadError.set(null);

    this.mediaService.getMenuImages(this.restaurant.id).subscribe({
      next: (images) => {
        this.rawImages.set(images);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        const errorMsg =
          err?.error?.message ||
          err?.message ||
          'Failed to load menu images. Please try again.';
        this.loadError.set(errorMsg);
      }
    });
  }

  // Drag and drop handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isUploading() && !this.isInactive()) {
      this.isDragOver.set(true);
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    if (this.isUploading() || this.isInactive()) return;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleSelectedFiles(Array.from(files));
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleSelectedFiles(Array.from(input.files));
      input.value = ''; // Reset input to allow re-uploading identical file
    }
  }

  private handleSelectedFiles(files: File[]): void {
    if (!this.restaurant || this.isUploading() || this.isInactive()) return;
    this.uploadError.set(null);

    const validFiles: File[] = [];
    const errorMessages: string[] = [];

    for (const file of files) {
      const fileNameLower = file.name.toLowerCase();

      // Check for PDF file
      if (fileNameLower.endsWith('.pdf') || file.type === 'application/pdf') {
        errorMessages.push(`"${file.name}" is a PDF. PDF menus cannot be processed directly; please upload JPG, PNG, or WebP images.`);
        continue;
      }

      // Validate allowed MIME types
      if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
        errorMessages.push(`"${file.name}" is not a supported format. Please select JPG, PNG, or WebP.`);
        continue;
      }

      // Validate 5MB limit
      if (file.size > MAX_FILE_SIZE) {
        errorMessages.push(`"${file.name}" exceeds the 5 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
        continue;
      }

      validFiles.push(file);
    }

    if (errorMessages.length > 0 && validFiles.length === 0) {
      this.uploadError.set(errorMessages.join(' '));
      return;
    }

    if (validFiles.length === 0) return;

    // Start sequential upload process
    this.isUploading.set(true);
    const totalFiles = validFiles.length;
    this.uploadProgressMessage.set(`Uploading 1 of ${totalFiles} menu ${totalFiles === 1 ? 'page' : 'pages'}...`);

    this.mediaService.uploadMultipleMenuImages(this.restaurant.id, validFiles).subscribe({
      next: (result: BatchUploadResult<MenuImageDto>) => {
        this.isUploading.set(false);
        this.uploadProgressMessage.set('');

        if (result.successes.length > 0) {
          const updated = [...this.rawImages(), ...result.successes];
          this.rawImages.set(updated);

          this.menuChanged.emit({
            restaurantId: String(this.restaurant!.id),
            imagesCount: updated.length
          });

          this.showToast(
            `Successfully uploaded ${result.successes.length} menu ${result.successes.length === 1 ? 'page' : 'pages'}.`
          );
        }

        if (result.failures.length > 0) {
          const failMsg = result.failures.map(f => `${f.file.name}: ${f.error}`).join('; ');
          this.uploadError.set(
            result.successes.length > 0
              ? `Uploaded ${result.successes.length} pages, but ${result.failures.length} failed (${failMsg}).`
              : `Upload failed: ${failMsg}`
          );
        } else if (errorMessages.length > 0) {
          this.uploadError.set(`Skipped files: ${errorMessages.join(' ')}`);
        }
      },
      error: (err) => {
        this.isUploading.set(false);
        this.uploadProgressMessage.set('');
        const msg = err?.error?.message || err?.message || 'Failed to complete menu upload. Please try again.';
        this.uploadError.set(msg);
      }
    });
  }

  // Deletion workflow
  confirmDelete(item: MenuImageItem): void {
    this.deleteError.set(null);
    this.deletingImage.set(item);
  }

  cancelDelete(): void {
    if (!this.isDeleting()) {
      this.deletingImage.set(null);
      this.deleteError.set(null);
    }
  }

  executeDelete(): void {
    const item = this.deletingImage();
    if (!this.restaurant || !item || this.isDeleting()) return;

    this.isDeleting.set(true);
    this.deleteError.set(null);

    this.mediaService.deleteMenuImage(this.restaurant.id, item.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        const remaining = this.rawImages().filter(img => img.id !== item.id);
        this.rawImages.set(remaining);

        this.menuChanged.emit({
          restaurantId: String(this.restaurant!.id),
          imagesCount: remaining.length
        });

        this.showToast(`${item.pageLabel} removed from menu showcase.`);
        this.cancelDelete();
      },
      error: (err) => {
        this.isDeleting.set(false);
        const msg = err?.error?.message || err?.message || 'Failed to delete menu page. Please try again.';
        this.deleteError.set(msg);
      }
    });
  }

  // Lightbox preview
  openPreview(item: MenuImageItem): void {
    this.previewingImage.set(item);
  }

  closePreview(): void {
    this.previewingImage.set(null);
  }

  triggerFileInput(): void {
    this.fileInputRef?.nativeElement.click();
  }

  // Close modal
  onClose(): void {
    if (!this.isUploading() && !this.isDeleting()) {
      this.close.emit();
    }
  }

  showToast(message: string): void {
    this.toastMessage.set(message);
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3200);
  }
}
