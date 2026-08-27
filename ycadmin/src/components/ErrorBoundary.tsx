import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("React Crash caught by ErrorBoundary:", error, errorInfo);
    if (
      error &&
      error.message &&
      (error.message.includes("dynamically imported module") ||
        error.message.includes("module script") ||
        error.message.includes("Importing a module script failed") ||
        error.message.includes("Failed to fetch dynamically"))
    ) {
      const lastReload = sessionStorage.getItem("chunk_retry_timestamp");
      const now = Date.now();
      if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
        sessionStorage.setItem("chunk_retry_timestamp", now.toString());
        window.location.reload();
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4 font-sans">
          <div className="max-w-md w-full bg-white rounded-[32px] p-10 shadow-2xl text-center space-y-8 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-red-500/10">
              <AlertTriangle className="h-10 w-10 text-red-600" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tight">
                Application Crashed
              </h1>
              <p className="text-sm text-gray-500 font-medium leading-relaxed">
                Something went wrong while rendering this page. This is usually
                caused by malformed data or a network glitch.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 text-left overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-1">
                  Error Message
                </p>
                <p className="text-xs font-mono text-red-700 break-words whitespace-pre-wrap max-h-[100px] overflow-y-auto">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => window.location.reload()}
                className="bg-[#0f172a] hover:bg-black text-white rounded-xl h-12 font-black uppercase tracking-widest text-[10px] flex items-center gap-2"
              >
                <RefreshCw className="h-3 w-3" /> Reload App
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/admin")}
                className="border-2 border-gray-100 hover:bg-gray-50 text-gray-900 rounded-xl h-12 font-black uppercase tracking-widest text-[10px] flex items-center gap-2"
              >
                <Home className="h-3 w-3" /> Dashboard
              </Button>
            </div>

            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-300">
              YouthCamping Admin Suite v4.0
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

