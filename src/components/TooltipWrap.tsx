import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'

const TOOLTIP_GAP_PX = 6

type TooltipWrapProps = {
  label: string
  children: ReactNode
  disabled?: boolean
  className?: string
}

export function TooltipWrap({
  label,
  children,
  disabled = false,
  className,
}: TooltipWrapProps) {
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  const updateCoords = useCallback(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    setCoords({
      top: rect.bottom + TOOLTIP_GAP_PX,
      left: rect.left + rect.width / 2,
    })
  }, [])

  const show = useCallback(() => {
    if (disabled) return
    updateCoords()
  }, [disabled, updateCoords])

  const hide = useCallback(() => {
    setCoords(null)
  }, [])

  useEffect(() => {
    if (!coords) return
    const reposition = () => updateCoords()
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [coords, updateCoords])

  useEffect(() => {
    if (disabled) hide()
  }, [disabled, hide])

  const wrapClassName = ['uiTooltipWrap', className].filter(Boolean).join(' ')

  return (
    <span
      ref={anchorRef}
      className={wrapClassName}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusCapture={(event) => {
        if (disabled) return
        if (event.currentTarget.contains(event.target as Node)) show()
      }}
      onBlurCapture={(event) => {
        const next = event.relatedTarget
        if (!next || !event.currentTarget.contains(next)) hide()
      }}
    >
      {children}
      {coords
        ? createPortal(
            <span
              role="tooltip"
              className="uiTooltip uiTooltip--visible"
              style={{ top: coords.top, left: coords.left }}
            >
              {label}
            </span>,
            document.body,
          )
        : null}
    </span>
  )
}
