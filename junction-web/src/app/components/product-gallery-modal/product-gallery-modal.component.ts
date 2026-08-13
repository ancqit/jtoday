import { Component, input, OnInit, output, signal } from '@angular/core';
import { AuthorizedImageComponent } from '../authorized-image/authorized-image.component';

@Component({
  selector: 'app-product-gallery-modal',
  imports: [AuthorizedImageComponent],
  templateUrl: './product-gallery-modal.component.html',
  styleUrl: './product-gallery-modal.component.scss',
})
export class ProductGalleryModalComponent implements OnInit {
  readonly productName = input.required<string>();
  readonly imageSources = input.required<string[]>();
  readonly startIndex = input(0);

  readonly closed = output<void>();

  readonly activeIndex = signal(0);

  ngOnInit(): void {
    this.activeIndex.set(this.startIndex());
  }

  onDismiss(): void {
    this.closed.emit();
  }

  showPrevious(): void {
    const total = this.imageSources().length;
    if (total <= 1) {
      return;
    }

    this.activeIndex.update((index) => (index - 1 + total) % total);
  }

  showNext(): void {
    const total = this.imageSources().length;
    if (total <= 1) {
      return;
    }

    this.activeIndex.update((index) => (index + 1) % total);
  }

  selectImage(index: number): void {
    this.activeIndex.set(index);
  }
}
