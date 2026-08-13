import { HttpContextToken } from '@angular/common/http';

/** When true, the session interceptor will not attach a Bearer token. */
export const SKIP_SESSION_AUTH = new HttpContextToken<boolean>(() => false);
