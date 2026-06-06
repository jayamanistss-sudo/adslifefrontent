/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-unused-vars */
import { AgGridReact, type AgGridReactProps } from "ag-grid-react";
import { type CellClickedEvent, type ColDef, type SortChangedEvent, ModuleRegistry, AllCommunityModule } from "ag-grid-community";
import React, { type PropsWithChildren, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import "./TableStyle.scss";

ModuleRegistry.registerModules([AllCommunityModule]);

export type ColumnEvent = {
  colId: string;
  sort?: "asc" | "desc" | null;
  value?: string | number | null;
};

export interface DataTableProps extends AgGridReactProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-explicit-any
  onCellClick?: (event: CellClickedEvent<any>) => void;
  onSelection?: (event: any) => void;
  //   onSearch?: (filter: ColumnEvent) => void;
  onSort?: (sort: SortChangedEvent) => void;
  enableTopScroll?: boolean;
}

// @typescript-eslint/no-explicit-any
export const DataTable: React.FC<DataTableProps> = React.forwardRef<
  HTMLTableElement,
  PropsWithChildren<DataTableProps>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
>((props, ref: any) => {
  const gridRef = useRef<any>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const topScrollRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useRef<any>(null);
  const columnApiRef = useRef<any>(null);

  // Expose the AG Grid api (and raw gridRef) so consumers can call grid methods
  useImperativeHandle(ref, () => ({
    get api() {
      return apiRef.current;
    },
    get gridRef() {
      return gridRef.current;
    },
  }));

  const { onCellClick, onSelection, onSort, columnDefs, enableTopScroll } = props;

  const onSelectionChanged = useCallback(() => {
    if (apiRef.current && onSelection) {
      onSelection(apiRef.current.getSelectedRows());
    }
  }, [onSelection]);

  const onGridReady = (params: any) => {
    apiRef.current = params.api;
    columnApiRef.current = params.columnApi;
  };
  useEffect(() => {
    if (!enableTopScroll) return;

    const root = rootRef.current;
    const top = topScrollRef.current;
    if (!root || !top) return;

    // The center viewport is the actual horizontal scroll area of the grid
    const centerViewport = root.querySelector<HTMLElement>(".ag-center-cols-viewport");
    const centerContainer = root.querySelector<HTMLElement>(".ag-center-cols-container");

    if (!centerViewport || !centerContainer) return;

    const inner = top.firstElementChild as HTMLElement;

    // Match the inner dummy div width so the top scrollbar's max scrollLeft
    // equals the center viewport's max scrollLeft exactly.
    // Formula: inner.width - top.clientWidth = centerContainer.scrollWidth - centerViewport.clientWidth
    // => inner.width = centerContainer.scrollWidth - centerViewport.clientWidth + top.clientWidth
    const syncWidth = () => {
      const contentWidth = centerContainer.scrollWidth;
      const viewportWidth = centerViewport.clientWidth;
      const topWidth = top.clientWidth;
      if (contentWidth > 0 && topWidth > 0) {
        inner.style.width = `${contentWidth - viewportWidth + topWidth}px`;
      }
    };

    // Run syncWidth after grid has rendered
    setTimeout(syncWidth, 0);
    setTimeout(syncWidth, 150);

    let isSyncing = false;

    // When the grid scrolls horizontally, mirror it to the top scrollbar
    const onGridScroll = () => {
      if (isSyncing) return;
      isSyncing = true;
      top.scrollLeft = centerViewport.scrollLeft;
      requestAnimationFrame(() => {
        isSyncing = false;
      });
    };

    // When the top scrollbar is dragged, mirror it to the grid viewport
    const onTopScroll = () => {
      if (isSyncing) return;
      isSyncing = true;
      centerViewport.scrollLeft = top.scrollLeft;
      requestAnimationFrame(() => {
        isSyncing = false;
      });
    };

    centerViewport.addEventListener("scroll", onGridScroll);
    top.addEventListener("scroll", onTopScroll);

    // Observe the container for width changes (column resize, show/hide)
    const resizeObserver = new ResizeObserver(syncWidth);
    resizeObserver.observe(centerContainer);

    return () => {
      centerViewport.removeEventListener("scroll", onGridScroll);
      top.removeEventListener("scroll", onTopScroll);
      resizeObserver.disconnect();
    };
  }, [enableTopScroll, columnDefs, props.rowData]);
  return (
    <div
      ref={rootRef}
      className={`ag-theme-quartz w-[100%] ${
        props.containerClass || "h-[calc(100vh-250px)] min-h-[300px]"
      } ${enableTopScroll ? "has-top-scroll" : ""}`}
    >
      {enableTopScroll && (
        <div className="ag-top-horizontal-scroll" ref={topScrollRef}>
          <div className="ag-top-horizontal-scroll-inner" />
        </div>
      )}
      <AgGridReact
        ref={gridRef}
        onCellClicked={onCellClick}
        onSelectionChanged={onSelectionChanged}
        onSortChanged={onSort}
        defaultColDef={{
          sortable: false,
          resizable: true,
          flex: 1,
          unSortIcon: true,
          suppressSizeToFit: true,
          suppressHeaderMenuButton: true,
          ...props.defaultColDef,
        }}
        domLayout={props.domLayout || "normal"}
        pagination={false}
        columnDefs={columnDefs?.map((value: ColDef) => ({ ...value }))}
        onGridReady={onGridReady}
        {...props}
      />
    </div>
  );
});
