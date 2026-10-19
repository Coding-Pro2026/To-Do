import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State { failed: boolean }

/** Last line of defence: shows a recovery screen instead of a blank page if rendering ever throws. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Momentum crashed while rendering', error, info.componentStack)
  }

  private resetData = () => {
    try {
      localStorage.removeItem('momentum.tasks.v1')
    } catch { /* storage unavailable */ }
    location.reload()
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="crash" role="alert">
        <h1>Something went wrong</h1>
        <p>Momentum hit an unexpected error. Reloading usually fixes it. If it keeps happening, your saved data may be damaged and you can reset it.</p>
        <div className="crash-actions">
          <button className="btn primary" onClick={() => location.reload()}>Reload</button>
          <button className="btn ghost" onClick={this.resetData}>Reset saved tasks</button>
        </div>
      </div>
    )
  }
}
