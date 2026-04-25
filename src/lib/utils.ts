import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimeAgo(dateString: string | Date) {
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return formatDistanceToNow(date, { addSuffix: true, locale: vi });
  } catch (e) {
    return '';
  }
}
