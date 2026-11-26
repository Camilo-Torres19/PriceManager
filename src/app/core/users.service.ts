import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Role } from './auth.service';

export interface UserSummary {
  id: number;
  name: string;
  email: string;
  role: Role;
  zone: string | null;
  is_active: number;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/users`;

  /** Solo admin. role = 'preventista' para filtros y asignaciones */
  list(role?: Role): Observable<UserSummary[]> {
    const params = role ? new HttpParams().set('role', role) : undefined;
    return this.http.get<UserSummary[]>(this.api, { params });
  }
}
