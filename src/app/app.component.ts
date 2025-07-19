import { Component } from '@angular/core';
import {
  GridStatePersistenceDirective,
  GridStateResponse,
} from './corgan-grid-state.directive';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { KENDO_BUTTON } from '@progress/kendo-angular-buttons';
import {
  ColumnMenuSettings,
  CreateFormGroupArgs,
  GridComponent,
  GridState,
  KENDO_GRID,
} from '@progress/kendo-angular-grid';
import { columnsIcon, SVGIcon } from '@progress/kendo-svg-icons';
import { Product } from './model';
import { products } from './products';

@Component({
  selector: 'my-app',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    KENDO_GRID,
    KENDO_BUTTON,
    GridStatePersistenceDirective,
  ],
  template: `
    <kendo-grid
      #grid
      [appGridStatePersistence]="'corgan-products-grid'"
      [config]="{
        appId: 'Frame',
        userId: 'alex.torres@corgan.com',
        autoSave: true,
        autoLoad: true,
        debounceTime: 500
      }"
      [kendoGridBinding]="gridData"
      [kendoGridReactiveEditing]="createFormGroup"
      [pageable]="true"
      [pageSize]="10"
      [sortable]="true"
      [groupable]="true"
      filterable="menu"
      [reorderable]="true"
      resizable="constrained"
      [columnMenu]="columnMenuSettings"
      [height]="480"
    >

      <kendo-grid-column
        field="ProductID"
        title="ID"
        [width]="100"
        [editable]="false"
      >
      </kendo-grid-column>
      <kendo-grid-column field="ProductName" title="Product Name" [width]="180">
      </kendo-grid-column>
      <kendo-grid-column
        field="Category.CategoryName"
        title="Category"
        [width]="180"
      ></kendo-grid-column>
      <kendo-grid-column
        field="UnitPrice"
        title="Unit Price"
        [width]="180"
        filter="numeric"
        editor="numeric"
        format="c"
      ></kendo-grid-column>
      <kendo-grid-command-column [width]="160" title="Commands">
        <ng-template kendoGridCellTemplate let-isNew="isNew">
          <button kendoGridEditCommand [primary]="true">Edit</button>
          <button kendoGridRemoveCommand>Remove</button>
          <button kendoGridSaveCommand [disabled]="formGroup?.invalid">
            {{ isNew ? "Add" : "Update" }}
          </button>
          <button kendoGridCancelCommand>
            {{ isNew ? "Discard" : "Cancel" }}
          </button>
        </ng-template>
      </kendo-grid-command-column>
    </kendo-grid>
  `,
})
export class AppComponent {
  public gridData: Product[] = products;
  public formGroup: FormGroup;
  public columnMenuSettings: ColumnMenuSettings = {
    filter: true,
    lock: true,
    stick: true,
    autoSizeAllColumns: true,
    autoSizeColumn: true,
    columnChooser: false,
    sort: false,
  };
  public chooserIcon: SVGIcon = columnsIcon;

  constructor(private formBuilder: FormBuilder) {
    this.createFormGroup = this.createFormGroup.bind(this);
  }

  public get savedStateExists(): boolean {
    return !!this.getState();
  }

  public saveState(grid: GridComponent): void {
    this.setState(grid.currentState);
  }

  public loadState(grid: GridComponent): void {
    const state = this.getState();
    if (state) {
      grid.loadState(state);
    }
  }

  public getState(): GridState | null {
    const stateString = localStorage.getItem('grid-state');
    if (!stateString) {
      return null;
    }
    try {
      return JSON.parse(stateString);
    } catch (e) {
      console.error('Error parsing grid state:', e);
      return null;
    }
  }

  public setState(state: GridState): void {
    localStorage.setItem('grid-state', JSON.stringify(state));
  }

  public createFormGroup(args: CreateFormGroupArgs): FormGroup {
    const item = args.isNew ? {} : args.dataItem;
    this.formGroup = this.formBuilder.group({
      ProductID: item.ProductID,
      ProductName: [item.ProductName, Validators.required],
      UnitPrice: item.UnitPrice,
    });

    return this.formGroup;
  }
}
