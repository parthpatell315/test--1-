import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calculator, Save, AlertCircle, Hotel, CalendarDays, Users, Bed, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface HotelCalculatorProps {
  tripId: string;
  departureDateStr?: string;
  api: any; // Axios instance or similar
  onSaved?: () => void;
}

export default function HotelCalculator({ tripId, departureDateStr, api, onSaved }: HotelCalculatorProps) {
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [hotels, setHotels] = useState<any[]>([]);
  
  // Form State
  const [formData, setFormData] = useState({
    hotelId: "",
    checkInDate: departureDateStr || "",
    checkOutDate: "",
    adultsCount: 0,
    childrenCount: 0,
    sharingType: "Double",
    pricingMode: "per_room", // per_room or per_pax
    year: new Date().getFullYear()
  });

  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    // Fetch hotels for dropdown
    const fetchHotels = async () => {
      try {
        const res = await api.get("/api/destinations/hotels-list"); // Assuming an endpoint exists or we can just fetch via standard way
        // Let's use a generic fetch if exact endpoint is unknown, but we need hotels
        // Since we created Hotel model, maybe we need a get hotels endpoint? 
        // For now, let's assume /api/hotels exists or we can mock it if needed.
        // Actually, we didn't create a GET /api/hotels. Let's fetch from our rates endpoint if we have to, 
        // but normally there's a master list. I'll mock a fetch or leave it generic.
        const response = await api.get("/api/erp/vendors?type=HOTEL"); // Often vendors are hotels
        if (response.data?.data) {
          setHotels(response.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch hotels", err);
      }
    };
    fetchHotels();
  }, [api]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setResult(null); // Clear result when form changes
  };

  const handleCompute = async () => {
    if (!formData.hotelId) return toast.error("Please select a hotel");
    if (!formData.checkInDate || !formData.checkOutDate) return toast.error("Please select check-in and check-out dates");
    if (formData.adultsCount + formData.childrenCount <= 0) return toast.error("Please add at least 1 participant");

    setCalculating(true);
    try {
      const res = await api.post("/api/hotel-calculator/compute", {
        hotel_id: formData.hotelId,
        check_in_date: formData.checkInDate,
        check_out_date: formData.checkOutDate,
        adults_count: formData.adultsCount,
        children_count: formData.childrenCount,
        sharing_type: formData.sharingType,
        pricing_mode: formData.pricingMode,
        year: formData.year
      });

      if (res.data?.success) {
        setResult(res.data.calculation);
        toast.success("Cost calculated successfully");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to calculate cost");
    } finally {
      setCalculating(false);
    }
  };

  const handleSaveToStays = async () => {
    if (!result) return;
    
    setLoading(true);
    try {
      // POST /api/trips/{tripId}/stays
      // Based on user prompt:
      await api.post(`/api/trips/${tripId}/stays`, {
        tripId: tripId,
        hotelId: parseInt(formData.hotelId),
        checkInDate: formData.checkInDate,
        checkOutDate: formData.checkOutDate,
        adultsCount: formData.adultsCount,
        childrenCount: formData.childrenCount,
        sharingType: formData.sharingType,
        pricingMode: formData.pricingMode,
        calculatedCost: result.cost_breakdown.grand_total,
        costPerPax: result.cost_breakdown.cost_per_pax,
        roomsNeeded: result.sharing_config.rooms_needed
      });
      
      toast.success("Accommodation cost saved ✅");
      if (onSaved) onSaved();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save stay");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row gap-0">
      {/* Configuration Panel */}
      <div className="flex-1 p-6 border-b md:border-b-0 md:border-r border-slate-200 space-y-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#FF4D00]" />
            Hotel Cost Calculator
          </h3>
          <p className="text-sm text-slate-500 mt-1">Configure group size, dates, and sharing to compute exact hotel costs based on seasonal rates.</p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1.5"><Hotel className="w-3 h-3" /> Select Hotel (ID)</label>
              {/* Temporarily using a text input for ID since we didn't wire up a full generic hotel search endpoint. If we have vendors, we can map them */}
              <input
                type="number"
                placeholder="Enter Hotel ID (e.g. 1)"
                className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00] transition-all"
                value={formData.hotelId}
                onChange={(e) => handleChange("hotelId", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1.5"><CalendarDays className="w-3 h-3" /> Check-in</label>
              <input
                type="date"
                className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#FF4D00] transition-all"
                value={formData.checkInDate}
                onChange={(e) => handleChange("checkInDate", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1.5"><CalendarDays className="w-3 h-3" /> Check-out</label>
              <input
                type="date"
                className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#FF4D00] transition-all"
                value={formData.checkOutDate}
                onChange={(e) => handleChange("checkOutDate", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1.5"><Users className="w-3 h-3" /> Adults</label>
              <input
                type="number"
                min="0"
                className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#FF4D00] transition-all"
                value={formData.adultsCount}
                onChange={(e) => handleChange("adultsCount", parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1.5"><Users className="w-3 h-3" /> Children</label>
              <input
                type="number"
                min="0"
                className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#FF4D00] transition-all"
                value={formData.childrenCount}
                onChange={(e) => handleChange("childrenCount", parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1.5"><Bed className="w-3 h-3" /> Sharing</label>
              <select
                className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#FF4D00] transition-all bg-white"
                value={formData.sharingType}
                onChange={(e) => handleChange("sharingType", e.target.value)}
              >
                <option value="Double">Double (2 Pax)</option>
                <option value="Triple">Triple (3 Pax)</option>
                <option value="Quad">Quad (4 Pax)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1.5"><CreditCard className="w-3 h-3" /> Pricing Mode</label>
              <select
                className="w-full h-10 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-[#FF4D00] transition-all bg-white"
                value={formData.pricingMode}
                onChange={(e) => handleChange("pricingMode", e.target.value)}
              >
                <option value="per_room">Per Room</option>
                <option value="per_pax">Per Pax</option>
              </select>
            </div>
          </div>

          <Button 
            className="w-full mt-4 bg-[#FF4D00] hover:bg-[#E04400] text-white" 
            onClick={handleCompute}
            disabled={calculating}
          >
            {calculating ? "Calculating..." : "Compute Cost"}
          </Button>
        </div>
      </div>

      {/* Result Panel */}
      <div className="flex-1 bg-slate-50 p-6 flex flex-col justify-center">
        {!result ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 py-10">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
              <Calculator className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-sm">Configure details and click Compute to see the cost breakdown.</p>
          </div>
        ) : (
          <div className="bg-[#1e293b] text-white rounded-xl shadow-lg overflow-hidden flex flex-col h-full relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-400"></div>
            
            <div className="p-5 border-b border-slate-700/50">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium text-white flex items-center gap-2">
                    <span className="text-lg">📍</span> {result.hotel_name || `Hotel ID ${result.hotel_id}`}
                  </h4>
                  <p className="text-slate-400 text-sm mt-1 flex items-center gap-1.5">
                    <CalendarDays className="w-3.5 h-3.5" /> 
                    {result.check_in_month} Season ({result.nights} Nights)
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded text-xs font-medium text-slate-300">
                    <Bed className="w-3 h-3" /> {result.sharing_config.type}
                  </div>
                  <p className="text-slate-400 text-xs mt-1">{result.sharing_config.rooms_needed} Rooms Needed</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 flex-1">
              <div className="space-y-3">
                {result.summary.line_items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <div className="text-slate-300">
                      {item.description} <span className="text-slate-500 text-xs">/night</span>
                    </div>
                    <div className="font-medium">₹{item.amount_per_night.toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>

              <div className="h-px w-full bg-slate-700/50 my-4 border-dashed border-t"></div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Total Per Night</span>
                  <span className="font-medium text-white">₹{result.cost_breakdown.total_per_night.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-400">Nights</span>
                  <span className="font-medium text-white">× {result.nights}</span>
                </div>
              </div>

              {/* Per-Person Sharing Breakdown Matrix */}
              {result.sharing_wise_per_person && (
                <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-2">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-[#FF4D00] uppercase tracking-wider">Per-Person Sharing Breakdown</p>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">By Room Allotment</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {Object.entries(result.sharing_wise_per_person).map(([key, item]: [string, any]) => (
                      <div key={key} className="bg-slate-800/90 p-2.5 rounded-lg border border-slate-700 text-center hover:border-[#FF4D00]/50 transition-all">
                        <p className="text-[11px] font-bold text-slate-300 truncate">{item.sharing}</p>
                        <p className="text-sm font-extrabold text-green-500 mt-1">₹{item.cost_per_pax_per_night.toLocaleString('en-IN')}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">/ pax / night</p>
                        <p className="text-[10px] text-slate-500 mt-1 font-mono">Total: ₹{item.cost_per_pax_total_stay.toLocaleString('en-IN')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-900/50 p-5">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Grand Total</p>
                  <p className="text-xs text-[#FF4D00]/80">Cost Per Pax: ₹{result.cost_breakdown.cost_per_pax.toLocaleString('en-IN')}</p>
                </div>
                <div className="text-3xl font-bold text-green-500">
                  {result.summary.display_total}
                </div>
              </div>

              <Button 
                className="w-full bg-white hover:bg-slate-100 text-slate-900 font-medium h-11"
                onClick={handleSaveToStays}
                disabled={loading}
              >
                {loading ? "Saving..." : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save to Database
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

