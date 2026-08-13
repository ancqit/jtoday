import { Component, computed, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProfileLevel } from '../../models/location.model';
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
  readonly profileLevel = computed(() => this.session.profileLevel());

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    phoneNumber: ['', [Validators.required, Validators.pattern(/^[+]?[\d\s-]{8,15}$/)]],
    verificationCode: ['', [Validators.pattern(/^\d{6}$/)]],
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

  isStepComplete(level: ProfileLevel): boolean {
    const current = this.profileLevel();
    if (!current) {
      return false;
    }

    const order: ProfileLevel[] = ['created', 'contact', 'authenticated'];
    return order.indexOf(current) >= order.indexOf(level);
  }

  onDismiss(): void {
    this.closed.emit();
  }

  onSaveContact(): void {
    this.form.controls.email.markAsTouched();
    this.form.controls.phoneNumber.markAsTouched();
    this.error.set(null);

    if (this.form.controls.email.invalid || this.form.controls.phoneNumber.invalid) {
      return;
    }

    const { email, phoneNumber } = this.form.getRawValue();
    this.saving.set(true);
    this.session.updateContactProfile(email.trim(), phoneNumber.trim());
    this.saving.set(false);
  }

  onAuthenticate(): void {
    this.error.set(null);

    if (!this.session.hasContactProfile()) {
      this.error.set('Add your email and phone first.');
      return;
    }

    const code = this.form.controls.verificationCode.value.trim();
    if (!/^\d{6}$/.test(code)) {
      this.form.controls.verificationCode.markAsTouched();
      this.error.set('Enter the 6-digit verification code.');
      return;
    }

    this.saving.set(true);
    this.session.authenticateProfile();
    this.saving.set(false);
    this.closed.emit();
  }
}
