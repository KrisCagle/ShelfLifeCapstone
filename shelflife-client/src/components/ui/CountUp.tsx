import { useEffect, useState } from 'react'
import { animate, useReducedMotion } from 'motion/react'

/** Number that counts up from 0 when it first renders (instant with reduced motion). */
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString() }: { value: number; format?: (n: number) => string }) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(reduce ? value : 0)

  useEffect(() => {
    if (reduce) {
      setDisplay(value)
      return
    }
    const controls = animate(0, value, { duration: 1.2, ease: [0.16, 1, 0.3, 1], onUpdate: setDisplay })
    return () => controls.stop()
  }, [value, reduce])

  return <>{format(display)}</>
}
