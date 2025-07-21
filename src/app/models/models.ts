import { GridState } from "@progress/kendo-angular-grid";

export interface DataLoadParams {
    page: number;
    pageSize: number;
    filters?: any;
    sorts?: any;
    groups?: any;
  }
  
  export interface GridStateEntity {
    gridKey: string;
    state: GridState | null;
    loading: boolean;
    error: string | null;
    lastSaved?: Date;
  }
  
  export interface GridDataEntity<T = any> {
    gridKey: string;
    data: T[];
    totalCount: number;
    loading: boolean;
    error: string | null;
  }
  
  export interface SaveGridStateRequest {
    gridKey: string;
    userId: string;
    applicationId: number;
    routeUrl: string;
    consumingComponent: string;
    state: GridState;
  }
  
  export interface GridStateResponse {
    gridKey: string;
    userId: string;
    state: GridState;
    lastModified: Date;
  }
  
  export interface PagedResult<T> {
    data: T[];
    totalCount: number;
    page: number;
    pageSize: number;
  }
  
  export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }
  
  export interface Order {
    orderId: string;
    customerName: string;
    orderDate: Date;
    total: number;
  }
  
  export interface Customer {
    customerId: string;
    customerName: string;
    email: string;
    phone: string;
  }