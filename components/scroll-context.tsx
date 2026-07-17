"use client"

import Lenis from "lenis"
import { createContext, useContext, useEffect, useState } from "react"

const SmoothScrollContext = createContext<Lenis | null>(null)

export const useSmoothScroll = () => useContext(SmoothScrollContext)

// Lenis smooth scrolling for the whole app.
export default function ScrollContext({ children }: { children: React.ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null)

  useEffect(() => {
    const scroller = new Lenis()
    let rafId: number

    function raf(time: number) {
      scroller.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)
    setLenis(scroller)

    return () => {
      cancelAnimationFrame(rafId)
      scroller.destroy()
    }
  }, [])

  return <SmoothScrollContext.Provider value={lenis}>{children}</SmoothScrollContext.Provider>
}
