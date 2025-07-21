import { computed, inject } from "@angular/core";
import { tapResponse } from "@ngrx/operators";
import { signalStore, withState, withComputed, withMethods, patchState, withHooks } from "@ngrx/signals";
import { GridState } from "@progress/kendo-angular-grid";
import { pipe, EMPTY, combineLatest, of } from "rxjs";
import { switchMap, tap, catchError, debounceTime, distinctUntilChanged, map } from "rxjs/operators";
import { Order, Customer } from "../model";
import { GridStateEntity, GridDataEntity, DataLoadParams } from "../models/models";
import { AuthService } from "./services/auth.service";
import { CustomersDataService } from "./services/customer-data.service";
import { GridStateApiService } from "./services/grid-state-api.service";
import { OrdersDataService } from "./services/order-data.service";
import { ProductsDataService } from "./services/product-data.service";
import { rxMethod } from '@ngrx/signals/rxjs-interop';


export const GridStateStore = signalStore(
  { providedIn: 'root' },
  
  withState({
    gridStates: {} as Record<string, GridStateEntity>,
    gridData: {} as Record<string, GridDataEntity>,
    globalLoading: false
  }),
  
  withComputed((store) => ({
    isAnyGridLoading: computed(() => 
      Object.values(store.gridStates()).some(grid => grid.loading) ||
      Object.values(store.gridData()).some(grid => grid.loading)
    ),
    
    hasAnyErrors: computed(() =>
      Object.values(store.gridStates()).some(grid => grid.error) ||
      Object.values(store.gridData()).some(grid => grid.error)
    ),
    
    getGridState: computed(() => (gridKey: string) => 
      store.gridStates()[gridKey]?.state || null
    ),
    
    isGridLoading: computed(() => (gridKey: string) => 
      store.gridStates()[gridKey]?.loading || 
      store.gridData()[gridKey]?.loading || 
      false
    ),
    
    getGridData: computed(() => <T>(gridKey: string) => 
      store.gridData()[gridKey] as GridDataEntity<T> | undefined
    ),
    
    getGridError: computed(() => (gridKey: string) => 
      store.gridStates()[gridKey]?.error || 
      store.gridData()[gridKey]?.error || 
      null
    ),
    
    // Convenience computed for specific grids
    ordersGridData: computed(() => 
      store.gridData()['orders-grid'] as GridDataEntity<Order> | undefined
    ),
    
    customersGridData: computed(() => 
      store.gridData()['customers-grid'] as GridDataEntity<Customer> | undefined
    ),
    
    isOrdersGridLoading: computed(() => 
      store.gridStates()['orders-grid']?.loading || 
      store.gridData()['orders-grid']?.loading || 
      false
    )
  })),
  
  withMethods((store) => {
    // ✅ Inject ALL services the store needs
    const gridStateApiService = inject(GridStateApiService);
    const authService = inject(AuthService);
    
    // Data services - all encapsulated in store
    const ordersDataService = inject(OrdersDataService);
    const customersDataService = inject(CustomersDataService);
    const productsDataService = inject(ProductsDataService);
    
    // Service registry for dynamic dispatch
    const dataServices: DataServiceRegistry = {
      orders: ordersDataService,
      customers: customersDataService,
      products: productsDataService
    };
    
    return {
      // High-level grid operations - components call these
      
      /**
       * Initialize Orders Grid - Component calls this one method
       */
      initializeOrdersGrid: rxMethod<void>(
        pipe(
          switchMap(() => {
            return store.loadGridWithStateInternal({
              gridKey: 'orders-grid',
              dataServiceKey: 'orders',
              loadMethod: 'getOrders'
            });
          })
        )
      ),
      
      /**
       * Initialize Customers Grid - Component calls this one method
       */
      initializeCustomersGrid: rxMethod<void>(
        pipe(
          switchMap(() => {
            return store.loadGridWithStateInternal({
              gridKey: 'customers-grid',
              dataServiceKey: 'customers',
              loadMethod: 'getCustomers'
            });
          })
        )
      ),
      
      /**
       * Refresh Orders Grid - Component calls this
       */
      refreshOrdersGrid: rxMethod<DataLoadParams | void>(
        pipe(
          switchMap((params) => {
            const currentState = store.getGridState()('orders-grid');
            const loadParams = params || stateToDataParams(currentState).loadParams;
            
            return store.loadGridDataInternal({
              gridKey: 'orders-grid',
              params: loadParams,
              dataServiceKey: 'orders',
              loadMethod: 'getOrders'
            });
          })
        )
      ),
      
      /**
       * Load Orders with Specific Parameters - Component calls this
       */
      loadOrdersData: rxMethod<DataLoadParams>(
        pipe(
          switchMap((params) => {
            return store.loadGridDataInternal({
              gridKey: 'orders-grid',
              params,
              dataServiceKey: 'orders',
              loadMethod: 'getOrders'
            });
          })
        )
      ),
      
      /**
       * Export Orders - Component calls this
       */
      exportOrders: rxMethod<DataLoadParams>(
        pipe(
          switchMap((params) => {
            return ordersDataService.exportOrders(params).pipe(
              tap((blob) => {
                // Handle file download
                const url = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `orders-${new Date().toISOString().split('T')[0]}.xlsx`;
                link.click();
                window.URL.revokeObjectURL(url);
              }),
              catchError((error) => {
                console.error('Export failed:', error);
                return EMPTY;
              })
            );
          })
        )
      ),
      
      /**
       * Save Grid State - Called by directive
       */
      saveGridState: rxMethod<{
        gridKey: string;
        state: GridState;
        applicationId: number;
        routeUrl: string;
        consumingComponent: string;
      }>(
        pipe(
          debounceTime(500),
          distinctUntilChanged((prev, curr) => 
            prev.gridKey === curr.gridKey && 
            JSON.stringify(prev.state) === JSON.stringify(curr.state)
          ),
          
          switchMap(({ gridKey, state, applicationId, routeUrl, consumingComponent }) => {
            const userId = authService.currentUserId();
            
            return gridStateApiService.saveGridState({
              gridKey,
              userId,
              applicationId,
              routeUrl,
              consumingComponent,
              state
            }).pipe(
              tapResponse(
                (response) => {
                  patchState(store, (storeState) => ({
                    gridStates: {
                      ...storeState.gridStates,
                      [gridKey]: {
                        ...storeState.gridStates[gridKey],
                        state,
                        lastSaved: response.lastModified,
                        error: null
                      }
                    }
                  }));
                },
                (error) => {
                  console.error('Failed to save grid state:', error);
                }
              ),
              catchError(() => EMPTY)
            );
          }
        )
      ),
      
      /**
       * Clear Grid State
       */
      clearGridState: (gridKey: string) => {
        patchState(store, (state) => {
          const { [gridKey]: removedState, ...restStates } = state.gridStates;
          const { [gridKey]: removedData, ...restData } = state.gridData;
          
          return {
            gridStates: restStates,
            gridData: restData
          };
        });
      },
      
      // Internal methods - not exposed to components
      
      /**
       * Internal: Load grid state and coordinate with data loading
       */
      loadGridWithStateInternal: rxMethod<{
        gridKey: string;
        dataServiceKey: keyof DataServiceRegistry;
        loadMethod: string;
      }>(
        pipe(
          tap(({ gridKey }) => {
            patchState(store, (state) => ({
              gridStates: {
                ...state.gridStates,
                [gridKey]: {
                  gridKey,
                  state: null,
                  loading: true,
                  error: null
                }
              }
            }));
          }),
          
          switchMap(({ gridKey, dataServiceKey, loadMethod }) => {
            const userId = authService.currentUserId();
            
            return gridStateApiService.getGridState(gridKey, userId).pipe(
              map(savedState => ({ gridKey, savedState, dataServiceKey, loadMethod }))
            );
          }),
          
          switchMap(({ gridKey, savedState, dataServiceKey, loadMethod }) => {
            const loadParams = stateToDataParams(savedState);
            const dataService = dataServices[dataServiceKey];
            
            return combineLatest([
              of({ gridKey, savedState }),
              dataService[loadMethod](loadParams.loadParams)
            ]);
          }),
          
          tapResponse(
            ([{ gridKey, savedState }, dataResult]) => {
              patchState(store, (state) => ({
                gridStates: {
                  ...state.gridStates,
                  [gridKey]: {
                    gridKey,
                    state: savedState,
                    loading: false,
                    error: null,
                    lastSaved: savedState ? new Date() : undefined
                  }
                },
                gridData: {
                  ...state.gridData,
                  [gridKey]: {
                    gridKey,
                    data: dataResult.data,
                    totalCount: dataResult.totalCount,
                    loading: false,
                    error: null
                  }
                }
              }));
            },
            (error, { gridKey }) => {
              patchState(store, (state) => ({
                gridStates: {
                  ...state.gridStates,
                  [gridKey]: {
                    gridKey,
                    state: null,
                    loading: false,
                    error: error.message
                  }
                }
              }));
            }
          )
        )
      ),
      
      /**
       * Internal: Load data for specific grid
       */
      loadGridDataInternal: rxMethod<{
        gridKey: string;
        params: DataLoadParams;
        dataServiceKey: keyof DataServiceRegistry;
        loadMethod: string;
      }>(
        pipe(
          tap(({ gridKey }) => {
            patchState(store, (state) => ({
              gridData: {
                ...state.gridData,
                [gridKey]: {
                  ...state.gridData[gridKey],
                  loading: true,
                  error: null
                }
              }
            }));
          }),
          
          switchMap(({ gridKey, params, dataServiceKey, loadMethod }) => {
            const dataService = dataServices[dataServiceKey];
            
            return dataService[loadMethod](params).pipe(
              tapResponse(
                (result) => {
                  patchState(store, (state) => ({
                    gridData: {
                      ...state.gridData,
                      [gridKey]: {
                        gridKey,
                        data: result.data,
                        totalCount: result.totalCount,
                        loading: false,
                        error: null
                      }
                    }
                  }));
                },
                (error) => {
                  patchState(store, (state) => ({
                    gridData: {
                      ...state.gridData,
                      [gridKey]: {
                        ...state.gridData[gridKey],
                        loading: false,
                        error: error.message
                      }
                    }
                  }));
                }
              )
            );
          })
        )
      )
    };
  }),
  
  withHooks({
    onInit(store) {
      console.log('GridStateStore initialized with all services');
    }
  })
);