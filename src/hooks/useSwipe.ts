import { useRef, useCallback } from 'react'

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
}

/**
 * Detect horizontal swipe gestures on touch devices.
 * Requires a minimum distance and enforces that the swipe is
 * more horizontal than vertical (to avoid triggering on scroll).
 */
export function useSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  minDistance = 50
): SwipeHandlers {
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return

    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStart.current.x
    const dy = touch.clientY - touchStart.current.y
    touchStart.current = null

    // Only trigger if horizontal distance exceeds vertical (not a scroll)
    if (Math.abs(dx) < minDistance || Math.abs(dx) < Math.abs(dy)) return

    if (dx < 0) {
      onSwipeLeft() // swipe left = go forward
    } else {
      onSwipeRight() // swipe right = go back
    }
  }, [onSwipeLeft, onSwipeRight, minDistance])

  return { onTouchStart, onTouchEnd }
}
