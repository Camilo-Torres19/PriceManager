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
  /** Clientes activos asignados */
  clients_count?: number;
  /** Pedidos pendientes por confirmar */
  pending_orders?: number;
}

export interface UserInput {
  name: string;
  email: string;
  role: Role;
  zone: string | null;
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

  get(id: number): Observable<UserSummary> {
    return this.http.get<UserSummary>(`${this.api}/${id}`);
  }

  /** Crear usuario: usa /auth/register (solo admin) */
  create(body: UserInput & { password: string }): Observable<{ user: UserSummary }> {
    return this.http.post<{ user: UserSummary }>(`${environment.apiUrl}/auth/register`, body);
  }

  update(id: number, body: UserInput): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.api}/${id}`, body);
  }

  toggle(id: number): Observable<{ message: string; is_active: number }> {
    return this.http.patch<{ message: string; is_active: number }>(`${this.api}/${id}/toggle`, {});
  }

  setPassword(id: number, password: string): Observable<{ message: string }> {
    return this.http.patch<{ message: string }>(`${this.api}/${id}/password`, { password });
  }
}
