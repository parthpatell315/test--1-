import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function UnauthorizedPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center p-6 animate-fade-in">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-full bg-red-600/10 flex items-center justify-center text-red-600 animate-pulse border-2 border-red-500/20">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full border-4 border-background animate-ping" />
      </div>

      <h1 className="text-xl font-bold text-slate-800 mb-2">Access Denied</h1>
      <p className="text-[10px] uppercase tracking-wider text-red-600 font-bold mb-6">
        Error Code: 403 Forbidden
      </p>

      <div className="max-w-md bg-white border border-[#E2E8F0] rounded-[4px] p-6 shadow-none mb-8">
        <p className="text-slate-600 font-medium text-xs leading-relaxed">
          You do not have permission to access this area. If you believe this is
          an error, please contact your administrator to upgrade your role or
          permissions.
        </p>
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="rounded-[4px] border border-slate-200 font-semibold text-xs px-4 h-8.5 flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Go Back
        </Button>
        <Button
          onClick={() => navigate("/admin")}
          className="rounded-[4px] font-semibold text-xs px-4 h-8.5 bg-primary-orange hover:bg-primary-orange/90 text-white"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}


