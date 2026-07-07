"use client"

import createGlobe, { COBEOptions } from "cobe"
import { useEffect, useRef } from "react"

import { ORIGINS } from "@/lib/airports"
import { cn } from "@/lib/utils"

// International orange — the ledger's stamp colour.
const SKY: [number, number, number] = [228 / 255, 87 / 255, 46 / 255]

export interface GlobeLane {
  coords: [number, number]
  weight: number
  origin: "MUMBAI" | "DELHI"
}

// Decorative markers for the public landing page — generic cargo airports only.
const DECORATIVE_MARKERS = [
  { location: [19.09, 72.87], size: 0.08 },
  { location: [28.56, 77.1], size: 0.05 },
  { location: [50.04, 8.56], size: 0.06 },
  { location: [25.25, 55.36], size: 0.05 },
  { location: [40.64, -73.78], size: 0.05 },
  { location: [51.47, -0.45], size: 0.04 },
  { location: [1.36, 103.99], size: 0.05 },
  { location: [35.55, 139.78], size: 0.04 },
  { location: [-33.94, 151.18], size: 0.04 },
] as COBEOptions["markers"]

// Paper globe: warm sepia sphere, ink map dots, orange arcs — engraving feel.
const BASE_CONFIG: Omit<COBEOptions, "width" | "height"> = {
  devicePixelRatio: 2,
  phi: 0,
  theta: 0.28,
  dark: 0,
  diffuse: 1.15,
  mapSamples: 18000,
  mapBrightness: 9,
  baseColor: [0.87, 0.84, 0.76],
  markerColor: SKY,
  glowColor: [0.95, 0.93, 0.87],
  arcColor: SKY,
  arcWidth: 0.35,
  arcHeight: 0.55,
}

export function AirGlobe({ className, lanes }: { className?: string; lanes?: GlobeLane[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerInteracting = useRef<number | null>(null)
  const pointerInteractionMovement = useRef(0)
  const rotationOffset = useRef(0)
  const lanesRef = useRef(lanes)
  lanesRef.current = lanes

  const updatePointerInteraction = (value: number | null) => {
    pointerInteracting.current = value
    if (canvasRef.current) {
      canvasRef.current.style.cursor = value !== null ? "grabbing" : "grab"
    }
  }

  const updateMovement = (clientX: number) => {
    if (pointerInteracting.current !== null) {
      const delta = clientX - pointerInteracting.current
      pointerInteractionMovement.current = delta
      rotationOffset.current = delta / 200
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const currentLanes = lanesRef.current
    const options: Omit<COBEOptions, "width" | "height"> = { ...BASE_CONFIG }

    if (currentLanes && currentLanes.length > 0) {
      const maxWeight = Math.max(...currentLanes.map((l) => l.weight), 1)
      options.markers = [
        { location: ORIGINS.MUMBAI.coords, size: 0.08 },
        { location: ORIGINS.DELHI.coords, size: 0.05 },
        ...currentLanes.map((lane) => ({
          location: lane.coords,
          size: 0.03 + 0.05 * (lane.weight / maxWeight),
        })),
      ]
      options.arcs = currentLanes.map((lane) => ({
        from: ORIGINS[lane.origin].coords,
        to: lane.coords,
        color: SKY,
      }))
    } else {
      options.markers = DECORATIVE_MARKERS
      options.arcs = []
    }

    let width = canvas.offsetWidth
    let phi = 2.35 // start centred between India and Europe
    let frame = 0

    const onResize = () => {
      width = canvas.offsetWidth
    }
    window.addEventListener("resize", onResize)

    const globe = createGlobe(canvas, {
      ...options,
      width: width * 2,
      height: width * 2,
      phi,
    })

    const render = () => {
      if (pointerInteracting.current === null) phi += 0.0028
      globe.update({
        phi: phi + rotationOffset.current,
        width: width * 2,
        height: width * 2,
      })
      frame = requestAnimationFrame(render)
    }
    frame = requestAnimationFrame(render)

    const reveal = setTimeout(() => {
      canvas.style.opacity = "1"
    })

    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(reveal)
      window.removeEventListener("resize", onResize)
      globe.destroy()
    }
  }, [])

  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-[600px]", className)}>
      <canvas
        className="size-full opacity-0 transition-opacity duration-700 [contain:layout_paint_size]"
        ref={canvasRef}
        onPointerDown={(e) => updatePointerInteraction(e.clientX - pointerInteractionMovement.current)}
        onPointerUp={() => updatePointerInteraction(null)}
        onPointerOut={() => updatePointerInteraction(null)}
        onMouseMove={(e) => updateMovement(e.clientX)}
        onTouchMove={(e) => e.touches[0] && updateMovement(e.touches[0].clientX)}
      />
    </div>
  )
}
