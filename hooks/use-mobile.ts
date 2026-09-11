"use client"

import { useState, useEffect } from "react"

export function useMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    // Check if we're on the client side
    if (typeof window === "undefined") return

    // Function to check if the device is mobile
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera

      // Check for touch support
      const hasTouchSupport =
        "ontouchstart" in window || navigator.maxTouchPoints > 0 || (navigator as any).msMaxTouchPoints > 0

      // Check for mobile user agent
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)

      // Check for small screen
      const isSmallScreen = window.innerWidth < 768

      // Consider it mobile if it has touch support AND (is a mobile device OR has a small screen)
      setIsMobile(hasTouchSupport && (isMobileUA || isSmallScreen))
    }

    // Initial check
    checkMobile()

    // Add event listener for resize
    window.addEventListener("resize", checkMobile)

    // Cleanup
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  return isMobile
}
