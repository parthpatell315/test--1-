import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "./ui/button";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

import { brandConfig } from "@/config/brand.config";

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
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 font-sans">
          <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-xl border border-slate-200 text-center space-y-6 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="h-8 w-8 text-rose-600" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Application Error
              </h1>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Something went wrong while rendering this component.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-left overflow-hidden">
                <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600 mb-1">
                  Error Details
                </p>
                <p className="text-xs font-mono text-rose-700 break-words whitespace-pre-wrap max-h-[100px] overflow-y-auto">
                  {this.state.error.message}
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => window.location.reload()}
                className="bg-slate-900 hover:bg-black text-white rounded-lg h-10 font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-3 w-3" /> Reload App
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/admin")}
                className="border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-lg h-10 font-bold uppercase tracking-wider text-[10px] flex items-center justify-center gap-2"
              >
                <Home className="h-3 w-3" /> Dashboard
              </Button>
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {brandConfig.name} {brandConfig.badgeText}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

