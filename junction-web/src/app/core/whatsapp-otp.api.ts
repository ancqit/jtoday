import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { resolveApiBaseUrl } from './api.config';

export interface WhatsAppOtpRequestResponse {
  message: string;
  expires_in_seconds: number;
  session_id: string;
  debug_otp?: string | null;
}

export interface WhatsAppOtpVerifyResponse {
  verified: boolean;
  phone_number: string;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class WhatsAppOtpApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = resolveApiBaseUrl();

  requestOtp(phoneNumber: string, displayName?: string): Observable<WhatsAppOtpRequestResponse> {
    return this.http.post<WhatsAppOtpRequestResponse>(this.url('/auth/whatsapp-otp/request'), {
      phone_number: phoneNumber,
      display_name: displayName || undefined,
    });
  }

  verifyOtp(phoneNumber: string, otp: string, sessionId: string): Observable<WhatsAppOtpVerifyResponse> {
    return this.http.post<WhatsAppOtpVerifyResponse>(this.url('/auth/whatsapp-otp/verify'), {
      phone_number: phoneNumber,
      otp,
      session_id: sessionId,
    });
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }
}
