import { Component, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

type Props = { children?: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError || !this.props.children) {
      return (
        <div className="d-flex flex-column align-items-center justify-content-center min-vh-100 gap-3 text-center px-3">
          <h1 className="h3">Something went wrong</h1>
          <p className="text-muted">An unexpected error occurred. Your session is still active.</p>
          <div className="d-flex gap-2">
            <button className="btn btn-primary" onClick={() => location.reload()}>
              Reload
            </button>
            <Link to="/" className="btn btn-outline-secondary">
              Go home
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
