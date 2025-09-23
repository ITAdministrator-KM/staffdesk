import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Clipboard utility with fallback for permissions issues
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // First try the modern Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
    
    // Fallback method for non-HTTPS environments
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)
    
    return successful
  } catch (error) {
    console.warn('Failed to copy to clipboard:', error)
    return false
  }
}

// Utility to check if clipboard is available
export function isClipboardAvailable(): boolean {
  return !!(navigator.clipboard && window.isSecureContext) || document.queryCommandSupported('copy')
}
