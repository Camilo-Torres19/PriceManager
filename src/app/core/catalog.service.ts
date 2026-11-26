import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Category {
  id: number;
  name: string;
  icon: string | null;
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  category_id: number | null;
  category_name: string | null;
  brand: string | null;
  unit: string;
  base_price: number;
  current_price: number;
  stock: number;
  is_active: number;
  updated_by: string | null;
  updated_at: string;
}

export interface PriceHistory {
  id: number;
  product_id: number;
  old_price: number;
  new_price: number;
  changed_by: string;
  reason: string | null;
  changed_at: string;
}

/** Campos que se envían al editar (el precio se cambia aparte, con historial) */
export interface ProductInput {
  name: string;
  description: string | null;
  category_id: number | null;
  brand: string | null;
  unit: string;
  base_price: number;
  stock: number;
}

export interface ProductCreateInput extends ProductInput {
  current_price: number;
}

// mysql2 entrega los DECIMAL como texto ("4800.00"): aquí se convierten a número
/* eslint-disable @typescript-eslint/no-explicit-any */
const toProduct = (r: any): Product => ({
  ...r,
  base_price: Number(r.base_price),
  current_price: Number(r.current_price),
  stock: Number(r.stock ?? 0),
});
const toHistory = (r: any): PriceHistory => ({
  ...r,
  old_price: Number(r.old_price),
  new_price: Number(r.new_price),
});

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  categories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.api}/categories`);
  }

  products(): Observable<Product[]> {
    return this.http.get<any[]>(`${this.api}/products`).pipe(map((rows) => rows.map(toProduct)));
  }

  product(id: number): Observable<Product> {
    return this.http.get<any>(`${this.api}/products/${id}`).pipe(map(toProduct));
  }

  createProduct(body: ProductCreateInput): Observable<{ id: number; message: string }> {
    return this.http.post<{ id: number; message: string }>(`${this.api}/products`, body);
  }

  updateProduct(id: number, body: ProductInput): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.api}/products/${id}`, body);
  }

  changePrice(id: number, newPrice: number, reason: string) {
    return this.http.patch<{ message: string; old_price: number; new_price: number }>(
      `${this.api}/products/${id}/price`,
      { new_price: newPrice, reason }
    );
  }

  /** "Eliminar" en el API = desactivar (is_active = 0) */
  deactivateProduct(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.api}/products/${id}`);
  }

  priceHistory(id: number): Observable<PriceHistory[]> {
    return this.http
      .get<any[]>(`${this.api}/products/${id}/history`)
      .pipe(map((rows) => rows.map(toHistory)));
  }
}
