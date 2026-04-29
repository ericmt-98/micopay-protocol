import { Component, ReactNode } from 'react';
import SupportLink from './SupportLink';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-container-lowest px-6">
          <div className="text-center max-w-sm">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="font-headline font-bold text-xl text-on-surface mb-2">
              Algo salió mal
            </h2>
            <p className="text-sm text-on-surface-variant mb-2">
              Tus fondos están seguros. Esto fue un error de la interfaz, no de la blockchain.
            </p>
            {this.state.error && (
              <p className="text-xs text-on-surface-variant/60 font-mono mb-6 break-all">
                {this.state.error.message}
              </p>
            )}
            <div className="flex flex-col gap-3 items-center">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm active:scale-95 transition-transform"
              >
                Reintentar
              </button>
              <SupportLink state="ERROR" />
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;