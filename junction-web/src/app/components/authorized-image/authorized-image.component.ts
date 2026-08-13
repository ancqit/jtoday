import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { switchMap } from 'rxjs';
import {
  isExternalImageUrl,
  toAbsoluteApiUrl,
} from '../../core/product-image.util';
import { SessionService } from '../../core/session.service';

@Component({
  selector: 'app-authorized-image',
  template: `
    @if (displayUrl()) {
      <img [src]="displayUrl()" [alt]="alt()" loading="lazy" />
    } @else {
      <div class="authorized-image-placeholder" aria-hidden="true"></div>
    }
  `,
  styles: `
    :host {
      display: block;
      overflow: hidden;
    }

    img,
    .authorized-image-placeholder {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .authorized-image-placeholder {
      background: linear-gradient(145deg, #e2e8f0, #f8fafc);
    }
  `,
})
export class AuthorizedImageComponent {
  private readonly http = inject(HttpClient);
  private readonly session = inject(SessionService);
  private readonly destroyRef = inject(DestroyRef);

  readonly src = input<string | null>(null);
  readonly alt = input('');

  readonly displayUrl = signal<string | null>(null);
  private blobUrl: string | null = null;

  constructor() {
    effect(() => {
      this.load(this.src());
    });

    this.destroyRef.onDestroy(() => this.revokeBlob());
  }

  private load(source: string | null): void {
    this.revokeBlob();

    if (!source) {
      this.displayUrl.set(null);
      return;
    }

    if (isExternalImageUrl(source)) {
      this.displayUrl.set(source);
      return;
    }

    const url = toAbsoluteApiUrl(source);
    this.session
      .ensureSession()
      .pipe(
        switchMap(() => this.http.get(url, { responseType: 'blob' })),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (blob) => {
          this.blobUrl = URL.createObjectURL(blob);
          this.displayUrl.set(this.blobUrl);
        },
        error: () => {
          this.displayUrl.set(null);
        },
      });
  }

  private revokeBlob(): void {
    if (this.blobUrl) {
      URL.revokeObjectURL(this.blobUrl);
      this.blobUrl = null;
    }
  }
}
