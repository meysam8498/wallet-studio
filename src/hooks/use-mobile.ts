import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  // قاعدهٔ رسانه از ابتدا می‌سازیم تا نخستین رندر مقدار درست داشته باشد؛
  // سپس با susbcribe تغییرهای زنده را می‌گیریم — بدون setState در effect.
  const [isMobile, setIsMobile] = React.useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches,
  )

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches)
    }
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
