import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable } from "rxjs";
import { DataLoadParams, PagedResult } from "src/app/models/models";

@Injectable({
    providedIn: 'root'
  })
  export class ProductsDataService {
    private readonly http = inject(HttpClient);
    private readonly baseUrl = '/api/products';
  
    getProducts(params: DataLoadParams): Observable<PagedResult<any>> {
      return this.http.get<PagedResult<any>>(this.baseUrl);
    }
  }