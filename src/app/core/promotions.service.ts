import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export type PromoType = 'discount_percent' | 'discount_fixed' | '2x1' | 'bundle';

export interface Promotion {
  id: number;
  title: string;
  description: string | null;
  type: PromoType;
  discount_value: number;
  /** Fechas como texto AAAA-MM-DD (o null si no tiene) */
  start_date: string | null;
  end_date: string | null;
  is_active: number;
  created_by: string | null;
  created_at: string;
  product_ids: number[];
}

export interface PromotionInput {
  title: string;
  description: string | null;
  type: PromoType;
  discount_value: number;
  start_date: string | null;
  end_date: string | null;
  product_ids: number[];
}

// mysql2 puede entregar el DECIMAL como texto ("3000.00"): aquí se convierte a número
/* eslint-disable @typescript-eslint/no-explicit-any */
const toPromotion = (r: any): Promotion => ({
  ...r,
  discount_value: Number(r.discount_value),
  product_ids: (r.product_ids ?? []).map(Number),
});

@Injectable({ providedIn: 'root' })
export class PromotionsService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/promotions`;

  /** Todas las promociones (solo admin) */
  all(): Observable<Promotion[]> {
    return this.http.get<any[]>(`${this.api}/all`).pipe(map((rows) => rows.map(toPromotion)));
  }

  /** Solo las activas (para el catálogo del preventista) */
  active(): Observable<Promotion[]> {
    return this.http.get<any[]>(this.api).pipe(map((rows) => rows.map(toPromotion)));
  }

  create(body: PromotionInput): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(this.api, body);
  }

  update(id: number, body: PromotionInput): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.api}/${id}`, body);
  }

  toggle(id: number): Observable<{ message: string; is_active: number }> {
    return this.http.patch<{ message: string; is_active: number }>(`${this.api}/${id}/toggle`, {});
  }

  remove(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/${id}`);
  }
}
