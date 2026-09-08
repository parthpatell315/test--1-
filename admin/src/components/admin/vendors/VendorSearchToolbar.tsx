import type { ReactNode } from "react";
import { Search, RotateCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-9 text-[12px] font-medium bg-white border-[#E8EEF4] text-[#0B1528] shadow-none rounded-md focus:ring-1 focus:ring-[#FF4D00]/30 focus:ring-offset-0";

interface VendorSearchToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  placeholder: string;
  destinations: string[];
  filterDestination: string;
  onDestinationChange: (value: string) => void;
  onReset: () => void;
  extraFilters?: ReactNode;
}

export function VendorSearchToolbar({
  searchTerm,
  onSearchChange,
  placeholder,
  destinations,
  filterDestination,
  onDestinationChange,
  onReset,
  extraFilters,
}: VendorSearchToolbarProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center">
      <div className="relative min-w-0 w-full flex-1">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
          strokeWidth={1.75}
        />
        <Input
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            fieldClass,
            "w-full pl-8 pr-3 placeholder:font-normal placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[#FF4D00]/30",
          )}
        />
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Select value={filterDestination} onValueChange={onDestinationChange}>
          <SelectTrigger className={cn(fieldClass, "w-full sm:w-44")}>
            <SelectValue placeholder="All destinations" />
          </SelectTrigger>
          <SelectContent className="bg-white text-[12px]">
            <SelectItem value="ALL">All destinations</SelectItem>
            {destinations.map((d, i) => (
              <SelectItem key={i} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {extraFilters}

        <button
          type="button"
          onClick={onReset}
          title="Reset"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-[#F4F7FB] hover:text-[#0B1528]"
        >
          <RotateCw className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

export const vendorSelectFieldClass = fieldClass;
