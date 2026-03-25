
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { type CheckedState } from "@radix-ui/react-checkbox"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts a CheckedState to a boolean value
 * This is useful for components that expect boolean checked states
 */
export function checkedStateToBoolean(checked: CheckedState): boolean {
  if (checked === "indeterminate") {
    return false;
  }
  return checked;
}
