"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  RowSelectionState,
  SortingState,
  type PaginationState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  onRowClick?: (row: TData) => void;
  getRowId?: (row: TData) => string;
  enableRowSelection?: boolean;
  bulkActions?: (selectedRows: TData[]) => React.ReactNode;
  pageIndex?: number;
  pageSize?: number;
  pageCount?: number;
  totalCount?: number;
  onPageChange?: (pageIndex: number) => void;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Pretrazi...",
  onRowClick,
  getRowId,
  enableRowSelection = false,
  bulkActions,
  pageIndex,
  pageSize,
  pageCount,
  totalCount,
  onPageChange,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const manualPagination =
    pageIndex !== undefined &&
    pageSize !== undefined &&
    pageCount !== undefined &&
    !!onPageChange;

  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const paginationState = manualPagination
    ? { pageIndex, pageSize }
    : pagination;

  const handlePaginationChange = React.useCallback(
    (
      updater:
        | PaginationState
        | ((old: PaginationState) => PaginationState),
    ) => {
      const next =
        typeof updater === "function" ? updater(paginationState) : updater;
      if (manualPagination && onPageChange) {
        onPageChange(next.pageIndex);
      } else {
        setPagination(next);
      }
    },
    [manualPagination, onPageChange, paginationState],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: manualPagination
      ? undefined
      : getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    onPaginationChange: handlePaginationChange,
    manualPagination,
    pageCount: manualPagination ? pageCount : undefined,
    enableRowSelection,
    getRowId,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      pagination: paginationState,
    },
  });

  const selectedRows = table
    .getFilteredSelectedRowModel()
    .rows.map((row) => row.original);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        {searchKey && (
          <Input
            placeholder={searchPlaceholder}
            value={
              (table.getColumn(searchKey)?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        )}
        {!searchKey && <div />}
        {bulkActions && bulkActions(selectedRows)}
      </div>
      <div className="overflow-x-auto rounded-md border">
        <Table className="min-w-[600px]">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => {
                  return (
                    <TableHead
                      key={header.id}
                      className={cn(
                        index === 1 && "sticky left-0 bg-background z-10",
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick?.(row.original)}
                  className={cn("group", onRowClick && "cursor-pointer")}
                >
                  {row.getVisibleCells().map((cell, index) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        index === 1 &&
                          "sticky left-0 bg-background z-10 before:absolute before:inset-0 before:-z-10 before:bg-muted/50 before:opacity-0 group-hover:before:opacity-100 group-data-[state=selected]:before:opacity-100 group-data-[state=selected]:before:bg-muted before:transition-opacity",
                      )}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Nema rezultata.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-2">
        <div className="text-sm text-muted-foreground">
          {enableRowSelection && selectedRows.length > 0
            ? `${selectedRows.length} od ${
                manualPagination && totalCount !== undefined
                  ? totalCount
                  : table.getFilteredRowModel().rows.length
              } izabrano`
            : `${manualPagination && totalCount !== undefined ? totalCount : table.getFilteredRowModel().rows.length} ukupno`}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Prethodna
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Sledeća
          </Button>
        </div>
      </div>
    </div>
  );
}
