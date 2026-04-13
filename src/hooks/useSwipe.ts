import { useRef, useCallback } from 'react'

interface SwipeHandlers {
  onTouchStart: (e: React.TouchEvent) => void
  onTouchEnd: (e: React.TouchEvent) => void
}

/**
 * Detect horizontal swipe gestures on touch devices.
 * Ignores swipes that originated inside a [data-swipeable] element.
 */
export function useSwipe(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  minDistance = 50
): SwipeHandlers {
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    // Don't capture if touch started inside a swipeable child
    const target = e.target as HTMLElement
    if (target.closest?.('[data-swipeable]')) {
      touchStart.current = null
      return
    }
    const touch = e.touches[0]
    touchStart.current = { x: touch.clientX, y: touch.clientY }
  }, [])

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStart.current) return

    const touch = e.changedTouches[0]
    const dx = touch.clientX - touchStart.current.x
    const dy = touch.clientY - touchStart.current.y
    touchStart.current = null

    if (Math.abs(dx) < minDistance || Math.abs(dx) < Math.abs(dy)) return

    if (dx < 0) {
      onSwipeLeft()
    } else {
      onSwipeRight()
    }
  }, [onSwipeLeft, onSwipeRight, minDistance])

  return { onTouchStart, onTouchEnd }
}
