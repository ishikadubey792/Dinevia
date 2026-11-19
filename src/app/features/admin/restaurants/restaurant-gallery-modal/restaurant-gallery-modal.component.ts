import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RestaurantMediaService, BatchUploadResult } from '../../../../core/services/restaurant-media.service';
import {
  RestaurantImageDto,
  GalleryImageItem,
  resolveGalleryImageUrl
} from '../../../../core/models/restaurant-media.model';
import { OwnerRestaurant } from '../../../../core/models/admin.model';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

@Component({
  selector: 'app-restaurant-gallery-modal',
  standalone: true,
  imports: [
    CommonModule,
    ConfirmModalComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './restaurant-gallery-modal.component.html',
  styleUrl: './restaurant-gallery-modal.component.scss'
})
export class RestaurantGalleryModalComponent implements OnChanges {
  private readonly mediaService = inject(RestaurantMediaService);

  @Input() isOpen = false;
  @Input() restaurant: OwnerRestaurant | null = null;

  @Output() close = new EventEmitter<void>();
  @Output() primaryImageChanged = new EventEmitter<{
    restaurantId: string;
    newCoverPath: string;
    newCoverUrl: string;
  }>();
  @Output() galleryChanged = new EventEmitter<{
    restaurantId: string;
    imagesCount: number;
    primaryUrl?: string;
  }>();

  // Gallery state
  readonly rawImages = signal<RestaurantImageDto[]>([]);
  readonly currentCoverPath = signal<string>('');
  readonly isLoading = signal<boolean>(false);
  readonly loadError = signal<string | null>(null);

  // Uploading state
  readonly isUploading = signal<boolean>(false);
  readonly uploadProgressMessage = signal<string>('');
  readonly uploadError = signal<string | null>(null);
  readonly isDragOver = signal<boolean>(false);

  // Actions state
  readonly settingPrimaryId = signal<number | null>(null);
  readonly deletingImage = signal<GalleryImageItem | null>(null);
  readonly isDeleting = signal<boolean>(false);
  readonly deleteError = signal<string | null>(null);

  // Fullscreen preview
  readonly previewingImage = signal<GalleryImageItem | null>(null);

  // Toast feedback
  readonly toastMessage = signal<string | null>(null);

  // Computed gallery items with absolute URLs and primary status
  readonly galleryItems = computed<GalleryImageItem[]>(() => {
    const list = this.rawImages();
    const cover = this.currentCoverPath().trim().toLowerCase();

    return list.map(img => {
      const pathClean = img.imagePath.trim().toLowerCase();
      const isPrimary = cover.length > 0 && (
        pathClean === cover ||
        cover.endsWith(pathClean) ||
        pathClean.endsWith(cover)
      );

      return {
        ...img,
        fullUrl: resolveGalleryImageUrl(img.imagePath),
        isPrimary
      };
    });
  });

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['isOpen'] && this.isOpen) || (changes['restaurant'] && this.restaurant && this.isOpen)) {
      this.initGallery();
    }
  }

  private initGallery(): void {
    if (!this.restaurant) return;

    this.currentCoverPath.set(this.restaurant.coverImagePath || this.restaurant.coverImageUrl || '');
    this.uploadError.set(null);
    this.loadError.set(null);
    this.loadGalleryImages();
  }

  loadGalleryImages(): void {
    if (!this.restaurant) return;

    this.isLoading.set(true);
    this.loadError.set(null);

    this.mediaService.getGalleryImages(this.restaurant.id).subscribe({
      next: (images) => {
        this.rawImages.set(images);
        this.isLoading.set(false);

        // If no explicit cover exists yet, the first image is used by the backend
        if (!this.currentCoverPath() && images.length > 0) {
          this.currentCoverPath.set(images[0].imagePath);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const errorMsg =
          err?.error?.message ||
          err?.message ||
          'Failed to load gallery images. Please try again.';
        this.loadError.set(errorMsg);
      }
    });
  }

  // Drag and drop handlers
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (!this.isUploading()) {
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

    if (this.isUploading()) return;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleSelectedFiles(Array.from(files));
    }
  }

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleSelectedFiles(Array.from(input.files));
      input.value = ''; // Reset input to allow re-uploading the same file
    }
  }

  private handleSelectedFiles(files: File[]): void {
    if (!this.restaurant || this.isUploading()) return;
    this.uploadError.set(null);

    const validFiles: File[] = [];
    const errorMessages: string[] = [];

    for (const file of files) {
      // Validate file format
      if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
        errorMessages.push(`"${file.name}" is not a supported format. Please select JPG, PNG, or WebP.`);
        continue;
      }

      // Validate file size (5MB max)
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

    // Start upload process
    this.isUploading.set(true);
    this.uploadProgressMessage.set(`Uploading ${validFiles.length} ${validFiles.length === 1 ? 'image' : 'images'}...`);

    this.mediaService.uploadMultipleGalleryImages(this.restaurant.id, validFiles).subscribe({
      next: (result: BatchUploadResult) => {
        this.isUploading.set(false);
        this.uploadProgressMessage.set('');

        if (result.successes.length > 0) {
          // Add successfully uploaded images to state
          const updated = [...this.rawImages(), ...result.successes];
          this.rawImages.set(updated);

          // If restaurant had no cover image, first uploaded image automatically became cover
          if (!this.currentCoverPath() && result.successes.length > 0) {
            const first = result.successes[0];
            this.currentCoverPath.set(first.imagePath);
            this.primaryImageChanged.emit({
              restaurantId: String(this.restaurant!.id),
              newCoverPath: first.imagePath,
              newCoverUrl: resolveGalleryImageUrl(first.imagePath)
            });
          }

          this.galleryChanged.emit({
            restaurantId: String(this.restaurant!.id),
            imagesCount: updated.length,
            primaryUrl: resolveGalleryImageUrl(this.currentCoverPath())
          });

          this.showToast(
            `Successfully uploaded ${result.successes.length} ${result.successes.length === 1 ? 'image' : 'images'}.`
          );
        }

        // Report partial failure if any
        if (result.failures.length > 0) {
          const failMsg = result.failures.map(f => `${f.file.name}: ${f.error}`).join('; ');
          this.uploadError.set(
            result.successes.length > 0
              ? `Uploaded ${result.successes.length} photos, but ${result.failures.length} failed (${failMsg}).`
              : `Upload failed: ${failMsg}`
          );
        } else if (errorMessages.length > 0) {
          this.uploadError.set(`Some skipped files: ${errorMessages.join(' ')}`);
        }
      },
      error: (err) => {
        this.isUploading.set(false);
        this.uploadProgressMessage.set('');
        const msg = err?.error?.message || err?.message || 'Failed to complete image upload. Please try again.';
        this.uploadError.set(msg);
      }
    });
  }

  // Set image as primary cover image
  setAsPrimary(item: GalleryImageItem): void {
    if (!this.restaurant || item.isPrimary || this.settingPrimaryId() !== null) return;

    this.settingPrimaryId.set(item.id);

    this.mediaService.setPrimaryImage(this.restaurant.id, item.id).subscribe({
      next: () => {
        this.settingPrimaryId.set(null);
        this.currentCoverPath.set(item.imagePath);

        this.primaryImageChanged.emit({
          restaurantId: String(this.restaurant!.id),
          newCoverPath: item.imagePath,
          newCoverUrl: item.fullUrl
        });

        this.showToast('Selected photo set as Primary Cover.');
      },
      error: (err) => {
        this.settingPrimaryId.set(null);
        const msg = err?.error?.message || err?.message || 'Failed to set primary cover photo.';
        this.showToast(msg);
      }
    });
  }

  // Deletion workflow
  confirmDelete(item: GalleryImageItem): void {
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

    this.mediaService.deleteGalleryImage(this.restaurant.id, item.id).subscribe({
      next: () => {
        this.isDeleting.set(false);
        const wasPrimary = item.isPrimary;

        // Remove from local list
        const remaining = this.rawImages().filter(img => img.id !== item.id);
        this.rawImages.set(remaining);

        // If the primary image was deleted, backend automatically reassigns the first remaining image
        if (wasPrimary) {
          if (remaining.length > 0) {
            const nextPrimary = remaining[0];
            this.currentCoverPath.set(nextPrimary.imagePath);
            this.primaryImageChanged.emit({
              restaurantId: String(this.restaurant!.id),
              newCoverPath: nextPrimary.imagePath,
              newCoverUrl: resolveGalleryImageUrl(nextPrimary.imagePath)
            });
          } else {
            this.currentCoverPath.set('');
            this.primaryImageChanged.emit({
              restaurantId: String(this.restaurant!.id),
              newCoverPath: '',
              newCoverUrl: ''
            });
          }
        }

        this.galleryChanged.emit({
          restaurantId: String(this.restaurant!.id),
          imagesCount: remaining.length,
          primaryUrl: remaining.length > 0 ? resolveGalleryImageUrl(this.currentCoverPath()) : undefined
        });

        this.showToast('Photo removed from your gallery.');
        this.cancelDelete();
      },
      error: (err) => {
        this.isDeleting.set(false);
        const msg = err?.error?.message || err?.message || 'Failed to delete photo. Please try again.';
        this.deleteError.set(msg);
      }
    });
  }

  // Lightbox preview
  openPreview(item: GalleryImageItem): void {
    this.previewingImage.set(item);
  }

  closePreview(): void {
    this.previewingImage.set(null);
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
