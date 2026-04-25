"use client";

import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface DatePickerFieldProps {
  value?: any;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

/**
 * A native date picker that supports:
 * 1. Native browser date picker UI
 * 2. Handles both yyyy-MM-dd and dd/MM/yyyy formats internally for robustness
 */
export function DatePickerField({ value, onChange, disabled, placeholder, className }: DatePickerFieldProps) {
  // Native date input expects yyyy-MM-dd
  const nativeValue = React.useMemo(() => {
    if (!value) return "";
    
    // Handle case where value is not a string (e.g. Date object or Firestore Timestamp)
    if (typeof value !== 'string') {
      try {
        let dateObj: Date | null = null;
        
        if (value instanceof Date) {
          dateObj = value;
        } else if (value && typeof (value as any).toDate === 'function') {
          // Firestore Timestamp
          dateObj = (value as any).toDate();
        } else if (value && (value as any).seconds) {
          // Plain object Timestamp
          dateObj = new Date((value as any).seconds * 1000);
        }

        if (dateObj && isValid(dateObj)) {
          return format(dateObj, "yyyy-MM-dd");
        }
      } catch (e) {
        console.error("DatePickerField: Error parsing non-string value", e);
      }
      return "";
    }

    // 1. Try ISO date (yyyy-MM-dd)
    if (value.includes('-') && value.length === 10) {
      const date = new Date(value);
      return isValid(date) ? value : "";
    }
    
    // 2. Try dd/MM/yyyy
    if (value.length === 10 && value.includes('/')) {
      const parsed = parse(value, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        return format(parsed, "yyyy-MM-dd");
      }
    }

    return "";
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; // This will be yyyy-MM-dd from native input
    
    if (!val) {
      onChange("");
      return;
    }

    // Determine return format based on current value's format
    if (typeof value === 'string' && value.includes('/')) {
      const date = new Date(val);
      if (isValid(date)) {
        onChange(format(date, "dd/MM/yyyy"));
      }
    } else {
      onChange(val);
    }
  };

  const clearDate = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
  };

  return (
    <div className={cn("relative flex items-center w-full group", className)}>
      <Input
        type="date"
        value={nativeValue}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          "h-8 md:h-9 pl-3 pr-10 bg-white font-medium relative cursor-pointer",
          !nativeValue && "text-muted-foreground",
          "datepicker-input-reset"
        )}
      />

      {/* 1. Icon chỉ dẫn ở cuối (Suffix) */}
      <div className="absolute right-3 flex items-center pointer-events-none z-10">
        <CalendarIcon className="h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
      </div>

      {/* 2. Nút xóa ở bên trái icon lịch (Suffix) */}
      <div className="absolute right-8 flex items-center z-10">
        {nativeValue && !disabled && (
          <button
            type="button"
            onClick={clearDate}
            className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-destructive transition-all active:scale-90"
            title="Xóa giá trị"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      
      {/* CSS Reset để ẩn các icon mặc định của trình duyệt */}
      <style dangerouslySetInnerHTML={{ __html: `
        .datepicker-input-reset::-webkit-calendar-picker-indicator {
          background: transparent !important;
          bottom: 0;
          color: transparent !important;
          cursor: pointer;
          height: auto;
          left: 0;
          position: absolute;
          right: 0;
          top: 0;
          width: auto;
          opacity: 0 !important;
          z-index: 5;
        }
        .datepicker-input-reset::-webkit-inner-spin-button,
        .datepicker-input-reset::-webkit-clear-button {
          display: none !important;
          -webkit-appearance: none !important;
        }
      `}} />
    </div>
  );
}
