import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, from, switchMap } from 'rxjs';
import { CatalogOtpApi } from '../../core/catalog-otp.api';
import { RecaptchaService } from '../../core/recaptcha.service';
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
  private readonly catalogOtp = inject(CatalogOtpApi);
  private readonly recaptcha = inject(RecaptchaService);
  readonly session = inject(UserSessionService);

  readonly mode = input<'settings' | 'checkout'>('settings');
  readonly closed = output<void>();
  readonly checkoutCompleted = output<void>();

  readonly saving = signal(false);
  readonly sendingOtp = signal(false);
  readonly error = signal<string | null>(null);
  readonly otpHint = signal<string | null>(null);
  readonly otpSessionInfo = signal<string | null>(null);
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

    if (this.mode() === 'checkout' && this.session.hasContactProfile() && this.profileLevel() !== 'authenticated') {
      this.sendSmsOtp();
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
    this.otpHint.set(null);

    if (this.form.controls.email.invalid || this.form.controls.phoneNumber.invalid) {
      return;
    }

    const { email, phoneNumber } = this.form.getRawValue();
    this.saving.set(true);
    this.session.updateContactProfile(email.trim(), phoneNumber.trim());
    this.otpSessionInfo.set(null);
    this.form.controls.verificationCode.reset('');
    this.saving.set(false);

    if (this.mode() === 'checkout' && this.session.hasContactProfile()) {
      this.sendSmsOtp();
      return;
    }

    if (this.mode() === 'settings') {
      this.closed.emit();
    }
  }

  sendSmsOtp(): void {
    if (!this.session.hasContactProfile()) {
      this.error.set('Add your email and phone first.');
      return;
    }

    const phone = this.session.userProfile()?.phoneNumber?.trim() || this.form.controls.phoneNumber.value.trim();
    const name = this.session.userProfile()?.name?.trim();
    this.error.set(null);
    this.otpHint.set(null);
    this.sendingOtp.set(true);

    from(this.recaptcha.getToken())
      .pipe(
        switchMap((recaptchaToken) => this.catalogOtp.requestOtp(phone, recaptchaToken, name)),
        finalize(() => this.sendingOtp.set(false)),
      )
      .subscribe({
        next: (res) => {
          this.otpSessionInfo.set(res.session_info);
          this.otpHint.set('We sent a 6-digit code by SMS.');
        },
        error: (err: unknown) => {
          this.error.set(this.readError(err, 'Could not send SMS OTP.'));
        },
      });
  }

  onAuthenticate(): void {
    this.error.set(null);

    if (!this.session.hasContactProfile()) {
      this.error.set('Add your email and phone first.');
      return;
    }

    const sessionInfo = this.otpSessionInfo();
    if (!sessionInfo) {
      this.error.set('Request an SMS code first.');
      this.sendSmsOtp();
      return;
    }

    const code = this.form.controls.verificationCode.value.trim();
    if (!/^\d{6}$/.test(code)) {
      this.form.controls.verificationCode.markAsTouched();
      this.error.set('Enter the 6-digit verification code.');
      return;
    }

    const phone = this.session.userProfile()?.phoneNumber?.trim() || this.form.controls.phoneNumber.value.trim();
    this.saving.set(true);

    this.catalogOtp
      .verifyOtp(phone, code, sessionInfo)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => {
          this.session.authenticateProfile();
          this.otpSessionInfo.set(null);
          this.otpHint.set(null);

          if (this.mode() === 'checkout') {
            this.checkoutCompleted.emit();
            return;
          }

          this.closed.emit();
        },
        error: (err: unknown) => {
          this.error.set(this.readError(err, 'Invalid or expired verification code.'));
        },
      });
  }

  private readError(err: unknown, fallback: string): string {
    if (err instanceof HttpErrorResponse) {
      const detail = err.error?.detail;
      if (typeof detail === 'string' && detail.trim()) {
        return detail.trim();
      }
      if (Array.isArray(detail) && detail[0]?.msg) {
        return String(detail[0].msg);
      }
    }
    if (err instanceof Error && err.message.trim()) {
      return err.message.trim();
    }
    return fallback;
  }
}
