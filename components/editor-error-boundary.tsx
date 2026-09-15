"use client"

import { Component, type ReactNode } from "react"

type EditorErrorBoundaryProps = {
  children: ReactNode
  fallback?: ReactNode
}

type EditorErrorBoundaryState = {
  error: Error | null
}

export class EditorErrorBoundary extends Component<EditorErrorBoundaryProps, EditorErrorBoundaryState> {
  state: EditorErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        this.props.fallback ?? (
          <p className="text-sm text-white/70" role="alert">
            Could not open the editor. Close and try again, or refresh the page.
          </p>
        )
      )
    }
    return this.props.children
  }
}
