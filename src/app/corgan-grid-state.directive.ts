// grid-state-persistence.directive.ts - Simplified Version
import {
  Directive,
  OnInit,
  inject,
  DestroyRef,
  Host,
  Optional,
  input,
  output,
  computed,
  effect,
  EffectRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GridComponent, GridState } from '@progress/kendo-angular-grid';
import { Subject, of } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  tap,
  filter,
} from 'rxjs/operators';

// Models
export interface GridStateRequest {
  appId: string;
  userId: string;
  gridKey?: string;
  state: GridState;
  ngRoute: string;
}

export interface GridStateResponse {
  gridKey: string;
  userId: string;
  state: GridState;
  lastModified?: Date;
}

export interface GridStatePersistenceConfig {
  appId: string;
  apiUrl?: string;
  debounceTime?: number;
  autoLoad?: boolean;
  autoSave?: boolean;
  userId?: string;
  gridKey?: string;
}

@Directive({
  selector: 'kendo-grid[appGridStatePersistence]',
  standalone: true,
})
export class GridStatePersistenceDirective implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  // Inputs
  readonly gridKey = input.required<string>({
    alias: 'appGridStatePersistence',
  });
  readonly config = input.required<GridStatePersistenceConfig>();

  // Computed values
  readonly debounceMs = computed(() => this.config().debounceTime ?? 500);
  readonly autoLoad = computed(() => this.config().autoLoad ?? true);
  readonly autoSave = computed(() => this.config().autoSave ?? true);
  readonly appId = computed(() => this.config().appId);
  readonly userId = computed(() => this.config().userId || 'default-user');
  readonly effectiveGridKey = computed(
    () => this.config().gridKey || this.gridKey()
  );

  // Outputs
  readonly stateSaved = output<GridStateResponse>();
  readonly stateLoaded = output<GridState>();
  readonly stateError = output<Error>();

  // Subject for state changes
  private stateChange$ = new Subject<GridStateRequest>();

  // Reference to the grid component
  private grid: GridComponent;

  // Mock storage (replace with HTTP calls in production)
  private mockStorage = new Map<string, GridState>();

  constructor(@Host() @Optional() grid: GridComponent) {
    if (!grid) {
      throw new Error(
        'GridStatePersistenceDirective must be used on a kendo-grid element'
      );
    }
    this.grid = grid;
  }

  // Effect for auto-save configuration
  private readonly configEffect: EffectRef = effect(() => {
    const autoSave = this.autoSave();
    const debounce = this.debounceMs();

    if (autoSave) {
      this.setupSavePipeline(debounce);
    }
  });

  // Effect for auto-loading when grid is ready
  private readonly loadEffect = effect(() => {
    if (this.autoLoad() && this.gridKey()) {
      setTimeout(() => {
        this.loadSavedState();
      }, 100); // Small delay to ensure grid is ready
    }
  });

  ngOnInit(): void {
    console.log('🚀 Grid State Directive Initialized', {
      gridKey: this.gridKey(),
      config: this.config(),
    });
    this.setupStateChangeListener();
  }

  private setupSavePipeline(debounceMs: number): void {
    this.stateChange$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        tap((request) => console.log('📝 State change detected:', request)),
        debounceTime(debounceMs),
        distinctUntilChanged(
          (prev, curr) =>
            JSON.stringify(prev.state) === JSON.stringify(curr.state)
        ),
        filter(() => this.autoSave()),
        tap((request) => {
          console.log('💾 WOULD SEND TO SERVER:', request);
          console.log('  - App ID:', request.appId);
          console.log('  - User ID:', request.userId);
          console.log('  - Grid Key:', request.gridKey);
          console.log('  - State:', JSON.stringify(request.state, null, 2));

          // Mock save to storage
          const storageKey = `${request.appId}-${request.userId}-${request.gridKey}`;
          this.mockStorage.set(storageKey, request.state);

          // Emit success
          const response: GridStateResponse = {
            gridKey: request.gridKey || 'default',
            userId: request.userId,
            state: request.state,
            lastModified: new Date(),
          };
          this.stateSaved.emit(response);
        })
      )
      .subscribe();
  }

  private setupStateChangeListener(): void {
    if (this.grid && this.grid.gridStateChange) {
      this.grid.gridStateChange
        .pipe(
          takeUntilDestroyed(this.destroyRef),
          filter(() => this.autoSave())
        )
        .subscribe((state: GridState) => {
          this.emitStateChange(state);
        });
    }
  }

  private emitStateChange(state: GridState): void {
    const request: GridStateRequest = {
      appId: this.appId(),
      userId: this.userId(),
      gridKey: this.effectiveGridKey(),
      state,
      ngRoute: '/current-route', // Simplified - no router dependency
    };
    this.stateChange$.next(request);
  }

  private loadSavedState(): void {
    const storageKey = `${this.appId()}-${this.userId()}-${this.effectiveGridKey()}`;

    console.log('🔍 Looking for saved state with key:', storageKey);

    const savedState = this.mockStorage.get(storageKey);

    if (savedState) {
      console.log('✅ Found saved state:', savedState);
      this.grid.loadState(savedState);
      this.stateLoaded.emit(savedState);
    } else {
      console.log('❌ No saved state found');
    }
  }

  // Public methods for manual control
  saveState(): void {
    console.log('💾 Manual save triggered');
    const currentState = this.grid.currentState;
    this.emitStateChange(currentState);
  }

  loadState(): void {
    console.log('📂 Manual load triggered');
    this.loadSavedState();
  }

  getCurrentState(): GridState {
    return this.grid.currentState;
  }
}
