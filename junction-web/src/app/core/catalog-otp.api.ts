import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { resolveApiBaseUrl } from './api.config';

export interface CatalogOtpRequestResponse {
  message: string;
  expires_in_seconds: number;
  session_info: string;
}

export interface CatalogOtpVerifyResponse {
  verified: boolean;
  phone_number: string;
  message: string;
}

/** GCP Identity Platform SMS OTP for junction.today checkout (not owner login). */
@Injectable({ providedIn: 'root' })
export class CatalogOtpApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = resolveApiBaseUrl();

  requestOtp(
    phoneNumber: string,
    recaptchaToken: string,
    displayName?: string,
  ): Observable<CatalogOtpRequestResponse> {
    return this.http.post<CatalogOtpRequestResponse>(this.url('/auth/catalog-otp/request'), {
      phone_number: phoneNumber,
      display_name: displayName || undefined,
      recaptcha_token: recaptchaToken,
      client_type: 'web',
    });
  }

  verifyOtp(phoneNumber: string, otp: string, sessionInfo: string): Observable<CatalogOtpVerifyResponse> {
    return this.http.post<CatalogOtpVerifyResponse>(this.url('/auth/catalog-otp/verify'), {
      phone_number: phoneNumber,
      otp,
      session_info: sessionInfo,
    });
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }
}
