import React from "react";
import { Laptop, Smartphone, Globe, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoginSession } from "@/types";

interface SessionTableProps {
  sessions: LoginSession[];
  onLogoutSession: (sessionId: string) => void;
  onLogoutAllOthers: () => void;
  isLoading?: boolean;
}

export function SessionTable({
  sessions,
  onLogoutSession,
  onLogoutAllOthers,
  isLoading,
}: SessionTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className="text-xs font-bold text-slate-800 dark:text-white">
            Active Login Sessions
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Devices currently logged into your YouthCamping account
          </p>
        </div>
        {sessions.length > 1 && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onLogoutAllOthers}
            disabled={isLoading}
            className="h-8 text-xs font-semibold px-3 bg-red-600 hover:bg-red-700 w-full sm:w-auto"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Sign Out All Other Devices
          </Button>
        )}
      </div>

      {/* Desktop & Tablet Table View */}
      <div className="hidden md:block border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-4">Device</th>
                <th className="py-2.5 px-4">Location & IP</th>
                <th className="py-2.5 px-4">Last Activity</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal">
              {sessions.map((sess) => (
                <tr
                  key={sess.id}
                  className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                        {sess.deviceName.toLowerCase().includes("mobile") ||
                        sess.deviceName.toLowerCase().includes("iphone") ||
                        sess.deviceName.toLowerCase().includes("android") ? (
                          <Smartphone className="w-4 h-4" />
                        ) : (
                          <Laptop className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-white">
                          <span>{sess.deviceName}</span>
                          {sess.isCurrent && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-green-50 dark:bg-green-900/60 text-green-700 dark:text-green-500 border border-green-200 dark:border-emerald-800">
                              Current Device
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>{sess.location}</span>
                      <span className="text-slate-400 font-mono text-[11px]">
                        ({sess.ipAddress})
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">
                    {new Date(sess.lastActivityAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {sess.isCurrent ? (
                      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-500 font-semibold text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5" /> Active Now
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onLogoutSession(sess.id)}
                        disabled={isLoading}
                        className="h-7 text-xs text-red-600 hover:bg-red-50 dark:hover:bg-rose-950/50 hover:text-red-700 font-semibold"
                      >
                        Sign Out
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Stacked Card View (< 768px) */}
      <div className="block md:hidden space-y-3">
        {sessions.map((sess) => (
          <div
            key={sess.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl space-y-3 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 shrink-0">
                  {sess.deviceName.toLowerCase().includes("mobile") ||
                  sess.deviceName.toLowerCase().includes("iphone") ||
                  sess.deviceName.toLowerCase().includes("android") ? (
                    <Smartphone className="w-4 h-4" />
                  ) : (
                    <Laptop className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                    {sess.deviceName}
                    {sess.isCurrent && (
                      <span className="px-1.5 py-0.2 rounded text-[8px] font-extrabold uppercase bg-green-50 text-green-700 border border-green-200">
                        Current
                      </span>
                    )}
                  </h5>
                  <p className="text-[10px] text-slate-500 font-mono">
                    {sess.ipAddress}
                  </p>
                </div>
              </div>
              {sess.isCurrent ? (
                <span className="text-green-600 font-bold text-[10px] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Active
                </span>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onLogoutSession(sess.id)}
                  disabled={isLoading}
                  className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50 font-semibold px-2.5"
                >
                  Sign Out
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-slate-400" /> {sess.location}
              </span>
              <span>
                {new Date(sess.lastActivityAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


