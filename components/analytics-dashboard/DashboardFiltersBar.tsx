"use client";

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { PROGRAM_OPTIONS } from "./programs";
import type { DashboardPreset } from "./url-state";

type DashboardFiltersBarProps = {
  programId: string;
  onProgramChange: (value: string | null) => void;
  selectedPreset: string;
  onPresetChange: (value: string | null) => void;
  datePresets: DashboardPreset[];
  dateRange: DateRange | undefined;
  onDateRangeSelect: (range: DateRange | undefined) => void;
  onRefresh: () => void;
  loading?: boolean;
  trailing?: ReactNode;
};

export function DashboardFiltersBar({
  programId,
  onProgramChange,
  selectedPreset,
  onPresetChange,
  datePresets,
  dateRange,
  onDateRangeSelect,
  onRefresh,
  loading,
  trailing,
}: DashboardFiltersBarProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={programId} onValueChange={onProgramChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROGRAM_OPTIONS.map((program) => (
              <SelectItem key={program.id} value={program.id}>
                {program.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedPreset} onValueChange={onPresetChange}>
          <SelectTrigger className="w-[220px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {datePresets.map((preset) => (
              <SelectItem key={preset.label} value={preset.label}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Popover>
          <PopoverTrigger render={<Button variant="outline" />}>
            <CalendarIcon className="mr-2 size-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "MMM d")} -{" "}
                  {format(dateRange.to, "MMM d")}
                </>
              ) : (
                format(dateRange.from, "MMM d, yyyy")
              )
            ) : (
              "Pick dates"
            )}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              numberOfMonths={2}
              selected={dateRange}
              onSelect={onDateRangeSelect}
            />
          </PopoverContent>
        </Popover>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
        {trailing}
      </div>
    </div>
  );
}
