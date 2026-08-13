import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { UserSessionService } from '../../services/user-session.service';

@Component({
  selector: 'app-profile-modal',
  imports: [ReactiveFormsModule],
  templateUrl: './profile-modal.component.html',
  styleUrl: './profile-modal.component.scss',
})
export class ProfileModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly session = inject(UserSessionService);

  readonly closed = output<void>();

  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[+]?[\d\s-]{8,15}$/)]],
  });

  constructor() {
    const profile = this.session.userProfile();
    if (profile) {
      this.form.patchValue({
        email: profile.email ?? '',
        phoneNumber: profile.phoneNumber ?? '',
      });
    }
  }

  onDismiss(): void {
    this.closed.emit();
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    this.error.set(null);

    if (this.form.invalid) {
      return;
    }

    const { email, phoneNumber } = this.form.getRawValue();
    this.saving.set(true);
    this.session.updateContactProfile(email.trim(), phoneNumber.trim());
    this.saving.set(false);
    this.closed.emit();
  }
}
