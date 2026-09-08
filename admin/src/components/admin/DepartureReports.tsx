import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  FileText,
  Printer,
  CheckCircle2,
  Download,
  Table,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { opsService } from "@/services/ops.service";

interface DepartureReportsProps {
  tripId: string;
  departureDateStr: string;
}

export default function DepartureReports({
  tripId,
  departureDateStr,
}: DepartureReportsProps) {
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState<string>("PASSENGER");

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const data = await opsService.getReportData(tripId, departureDateStr);
      setReportData(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to compile report datasets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [tripId, departureDateStr]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    let headers: string[] = [];
    let rows: string[][] = [];
    const filename = `report_${selectedReport.toLowerCase()}.csv`;

    if (selectedReport === "PASSENGER") {
      headers = [
        "Passenger Name",
        "Age/Gender",
        "Contact",
        "Booking ID",
        "Payment Status",
        "Boarding Point",
      ];
      const pax = reportData.bookings.flatMap((b: any) => {
        try {
          const parsed = JSON.parse(b.passengersRoomDetails || "[]");
          return parsed.map((p: any) => [
            p.name,
            `${p.age || ""} / ${p.gender || ""}`,
            p.phone || b.customerPhone || "—",
            b.bookingId,
            b.paymentStatus,
            b.boardingPoint || "—",
          ]);
        } catch {
          return [
            [
              b.customerName,
              "—",
              b.customerPhone || "—",
              b.bookingId,
              b.paymentStatus,
              b.boardingPoint || "—",
            ],
          ];
        }
      });
      rows = pax;
    } else if (selectedReport === "CLIENT_PAYMENTS") {
      headers = [
        "Booking ID",
        "Client Name",
        "Total Package",
        "Paid",
        "Balance",
        "Payment Mode",
        "Status",
      ];
      rows = reportData.bookings.map((b: any) => [
        b.bookingId,
        b.customerName,
        String(b.totalAmount || 0),
        String(b.advancePaid || 0),
        String((b.totalAmount || 0) - (b.advancePaid || 0)),
        b.paymentMode || "—",
        b.paymentStatus,
      ]);
    } else if (selectedReport === "ACCOUNTS") {
      headers = [
        "Title / Particular",
        "Type",
        "Agreed Cost",
        "Paid Amount",
        "Outstanding",
        "Status",
      ];
      const clientTotal = reportData.bookings.reduce(
        (sum: number, b: any) => sum + (b.totalAmount || 0),
        0,
      );
      const clientReceived = reportData.bookings.reduce(
        (sum: number, b: any) => sum + (b.advancePaid || 0),
        0,
      );
      rows = [
        [
          "Total Client Package Receipts",
          "INFLOW (REVENUE)",
          String(clientTotal),
          String(clientReceived),
          String(clientTotal - clientReceived),
          "—",
        ],
        ...reportData.hotels.map((h: any) => [
          h.hotelName,
          "Hotel Payable",
          String(h.totalAmount),
          String(h.advancePaid),
          String(h.balanceAmount),
          h.confirmed,
        ]),
        ...reportData.transports.map((t: any) => [
          t.vehicleType,
          "Transport Payable",
          String(t.totalAmount),
          String(t.advancePaid),
          String(t.balanceAmount),
          "—",
        ]),
        ...reportData.guides.map((g: any) => [
          g.guideName,
          "Guide Payable",
          String(g.agreedAmount),
          String(g.advancePaid),
          String(g.balanceAmount),
          g.paymentStatus,
        ]),
      ];
    } else if (selectedReport === "HOTELS") {
      headers = [
        "Hotel Name",
        "Location",
        "Check In",
        "Check Out",
        "Rooms",
        "Total Cost",
        "Paid",
        "Balance",
      ];
      rows = reportData.hotels.map((h: any) => [
        h.hotelName,
        h.location || "—",
        h.checkInDate ? h.checkInDate.substring(0, 10) : "—",
        h.checkOutDate ? h.checkOutDate.substring(0, 10) : "—",
        String(h.numberOfRooms || 0),
        String(h.totalAmount || 0),
        String(h.advancePaid || 0),
        String(h.balanceAmount || 0),
      ]);
    } else if (selectedReport === "TRANSPORT") {
      headers = [
        "Vehicle Type",
        "Driver Name",
        "Driver Phone",
        "Capacity",
        "Route",
        "Total Cost",
        "Paid",
        "Balance",
      ];
      rows = reportData.transports.map((t: any) => [
        t.vehicleType,
        t.driverName || "—",
        t.driverPhone || "—",
        String(t.capacity || 0),
        t.route || "—",
        String(t.totalAmount || 0),
        String(t.advancePaid || 0),
        String(t.balanceAmount || 0),
      ]);
    } else if (selectedReport === "GUIDE") {
      headers = [
        "Guide Name",
        "Phone",
        "Assigned Trip",
        "Agreed Fee",
        "Advance Paid",
        "Balance Due",
        "Status",
      ];
      rows = reportData.guides.map((g: any) => [
        g.guideName,
        g.guidePhone || "—",
        tripId,
        String(g.agreedAmount || 0),
        String(g.advancePaid || 0),
        String(g.balanceAmount || 0),
        g.paymentStatus,
      ]);
    } else if (selectedReport === "ACTIVITIES") {
      headers = [
        "Day No",
        "Activity Name",
        "Type",
        "Location",
        "Responsible Guide",
        "Status",
        "Remarks",
      ];
      rows = reportData.activities.map((a: any) => [
        String(a.dayNumber),
        a.name,
        a.type || "—",
        a.location || "—",
        a.responsibleGuide?.name || a.responsibleStaff || "—",
        a.status,
        a.remarks || "",
      ]);
    } else if (selectedReport === "DOCUMENTS") {
      headers = [
        "File Name",
        "Category",
        "Verification Status",
        "Uploaded By",
        "Date",
      ];
      rows = reportData.docs.map((d: any) => [
        d.originalFileName,
        d.category,
        d.verificationStatus,
        d.uploadedBy?.name || "Staff",
        new Date(d.createdAt).toLocaleDateString(),
      ]);
    } else if (selectedReport === "TASKS") {
      headers = [
        "Task Name",
        "Stage",
        "Assigned To",
        "Priority",
        "Status",
        "Remarks",
      ];
      rows = reportData.tasks.map((t: any) => [
        t.taskName,
        t.stage,
        t.assignedTo || "—",
        t.priority,
        t.status,
        t.remarks || "",
      ]);
    }

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        headers.join(","),
        ...rows.map((r) => r.map((val) => `"${val}"`).join(",")),
      ].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 font-medium text-xs">
        Compiling departure reports from live database tables...
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="p-8 text-center text-slate-400 font-medium text-xs">
        No departure report datasets available.
      </div>
    );
  }

  // Calculate matching totals
  const totalRevenue = reportData.bookings.reduce(
    (sum: number, b: any) => sum + (b.totalAmount || 0),
    0,
  );
  const totalReceived = reportData.bookings.reduce(
    (sum: number, b: any) => sum + (b.advancePaid || 0),
    0,
  );
  const totalHotelCost = reportData.hotels.reduce(
    (sum: number, h: any) => sum + (h.totalAmount || 0),
    0,
  );
  const totalTransportCost = reportData.transports.reduce(
    (sum: number, t: any) => sum + (t.totalAmount || 0),
    0,
  );
  const totalGuideCost = reportData.guides.reduce(
    (sum: number, g: any) => sum + (g.agreedAmount || 0),
    0,
  );
  const totalVendorCost = totalHotelCost + totalTransportCost + totalGuideCost;

  return (
    <div className="space-y-4 printable-section">
      {/* Reports Tabs Sidebar + Table Preview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Reports Navigation */}
        <div className="bg-slate-50 border border-[#E2E8F0] p-3 rounded-[6px] space-y-1.5 h-fit">
          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider p-1">
            Report Datasets
          </h4>
          {[
            {
              key: "PASSENGER",
              label: "Passenger Manifest",
              desc: "Names, Age/Gender, Contacts",
            },
            {
              key: "CLIENT_PAYMENTS",
              label: "Client Receivables",
              desc: "Packages, Advances, Balances",
            },
            {
              key: "ACCOUNTS",
              label: "Departure PL Statement",
              desc: "Inflows vs. Vendor Payables",
            },
            {
              key: "HOTELS",
              label: "Hotel Voucher Report",
              desc: "Booked rooms & payouts",
            },
            {
              key: "TRANSPORT",
              label: "Transport Fleet Report",
              desc: "Drivers, capacities & fuel",
            },
            {
              key: "GUIDE",
              label: "Guide Payout Report",
              desc: "Agreed guide fees & status",
            },
            {
              key: "ACTIVITIES",
              label: "Activities Run Sheet",
              desc: "Log checklist and schedule",
            },
            {
              key: "DOCUMENTS",
              label: "Documents Inventory",
              desc: "Aadhaar cards & vouchers",
            },
            {
              key: "TASKS",
              label: "Operational Checklist",
              desc: "Status of SOP activities",
            },
          ].map((rep) => (
            <button
              key={rep.key}
              onClick={() => setSelectedReport(rep.key)}
              className={cn(
                "w-full text-left p-2 rounded-[4px] transition-all hover:bg-slate-150",
                selectedReport === rep.key
                  ? "bg-white border border-[#E2E8F0] font-black text-slate-800 shadow-3xs"
                  : "text-slate-650",
              )}
            >
              <p className="text-[11.5px]">{rep.label}</p>
              <p className="text-[9px] text-slate-400 font-medium">
                {rep.desc}
              </p>
            </button>
          ))}
        </div>

        {/* Report Preview Board */}
        <div className="md:col-span-3 bg-white border border-[#E2E8F0] rounded-[6px] p-4 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
            <div>
              <h3 className="text-sm font-black uppercase text-slate-800 tracking-wide">
                {selectedReport.replace(/_/g, " ")} REPORT
              </h3>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                Departure Code:{" "}
                <strong className="text-slate-600">{tripId}</strong> | Date:{" "}
                <strong className="text-slate-600">{departureDateStr}</strong>
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleExportCSV}
                className="h-8 text-[11px] font-bold border border-slate-200 rounded-[4px] px-3.5 bg-white text-slate-700 flex items-center gap-1.5 shadow-3xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />{" "}
                Export CSV
              </button>
              <button
                onClick={handlePrint}
                className="h-8 text-[11px] font-bold border border-slate-200 rounded-[4px] px-3.5 bg-white text-slate-700 flex items-center gap-1.5 shadow-3xs"
              >
                <Printer className="w-3.5 h-3.5 text-blue-650" /> Print PDF
              </button>
            </div>
          </div>

          {/* Quick Summary Statement on Top */}
          <div className="grid grid-cols-3 gap-3 bg-slate-50/50 border border-slate-100 p-3 rounded-[4px] text-xs">
            <div>
              <p className="text-[9px] font-black text-slate-450 uppercase">
                Total Revenue (INFLOW)
              </p>
              <p className="text-sm font-black text-slate-800 mt-0.5">
                ₹{totalRevenue.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-450 uppercase">
                Vendor Costs (OUTFLOW)
              </p>
              <p className="text-sm font-black text-slate-800 mt-0.5">
                ₹{totalVendorCost.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-450 uppercase">
                Trip Net Margin
              </p>
              <p
                className={cn(
                  "text-sm font-black mt-0.5",
                  totalRevenue - totalVendorCost >= 0
                    ? "text-green-600"
                    : "text-red-650",
                )}
              >
                ₹{(totalRevenue - totalVendorCost).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Dynamic Table Preview */}
          <div className="overflow-x-auto max-h-[300px]">
            {selectedReport === "PASSENGER" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                  <tr className="text-[9px] font-black text-slate-450 uppercase">
                    <th className="p-2.5">Passenger Name</th>
                    <th className="p-2.5">Age/Gender</th>
                    <th className="p-2.5">Contact</th>
                    <th className="p-2.5">Booking ID</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {reportData.bookings.flatMap((b: any) => {
                    let pDetails = [];
                    try {
                      pDetails = JSON.parse(b.passengersRoomDetails || "[]");
                    } catch {
                      pDetails = [
                        {
                          name: b.customerName,
                          age: "—",
                          gender: "—",
                          phone: b.customerPhone,
                        },
                      ];
                    }
                    return pDetails.map((p: any, idx: number) => (
                      <tr
                        key={`${b.id}-${idx}`}
                        className="hover:bg-slate-50/50"
                      >
                        <td className="p-2.5 font-bold text-slate-800">
                          {p.name}
                        </td>
                        <td className="p-2.5 font-medium text-slate-550">
                          {p.age || "—"} / {p.gender || "—"}
                        </td>
                        <td className="p-2.5 font-semibold text-slate-600">
                          {p.phone || b.customerPhone || "—"}
                        </td>
                        <td className="p-2.5 font-extrabold text-slate-650">
                          {b.bookingId}
                        </td>
                        <td className="p-2.5 font-extrabold text-green-600 uppercase">
                          {b.paymentStatus}
                        </td>
                      </tr>
                    ));
                  })}
                </tbody>
              </table>
            )}

            {selectedReport === "CLIENT_PAYMENTS" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                  <tr className="text-[9px] font-black text-slate-450 uppercase">
                    <th className="p-2.5">Booking ID</th>
                    <th className="p-2.5">Client</th>
                    <th className="p-2.5">Package</th>
                    <th className="p-2.5">Paid</th>
                    <th className="p-2.5">Balance</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {reportData.bookings.map((b: any) => (
                    <tr key={b.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-black text-slate-800">
                        {b.bookingId}
                      </td>
                      <td className="p-2.5 font-bold text-slate-700">
                        {b.customerName}
                      </td>
                      <td className="p-2.5 font-bold">
                        ₹{(b.totalAmount || 0).toLocaleString()}
                      </td>
                      <td className="p-2.5 font-semibold text-green-600">
                        ₹{(b.advancePaid || 0).toLocaleString()}
                      </td>
                      <td className="p-2.5 font-semibold text-slate-500">
                        ₹
                        {(
                          (b.totalAmount || 0) - (b.advancePaid || 0)
                        ).toLocaleString()}
                      </td>
                      <td className="p-2.5 font-extrabold text-slate-500">
                        {b.paymentStatus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedReport === "ACCOUNTS" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                  <tr className="text-[9px] font-black text-slate-450 uppercase">
                    <th className="p-2.5">Title / Particular</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Total Amount</th>
                    <th className="p-2.5">Paid</th>
                    <th className="p-2.5">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  <tr className="bg-green-50/20 font-bold">
                    <td className="p-2.5 font-black text-green-700">
                      Total Client Packages
                    </td>
                    <td className="p-2.5 text-green-700">INFLOW</td>
                    <td className="p-2.5">₹{totalRevenue.toLocaleString()}</td>
                    <td className="p-2.5 text-green-600">
                      ₹{totalReceived.toLocaleString()}
                    </td>
                    <td className="p-2.5">
                      ₹{(totalRevenue - totalReceived).toLocaleString()}
                    </td>
                  </tr>
                  {reportData.hotels.map((h: any) => (
                    <tr key={h.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-bold text-slate-800">
                        {h.hotelName}
                      </td>
                      <td className="p-2.5 text-slate-500">Hotel</td>
                      <td className="p-2.5">
                        ₹{h.totalAmount.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-slate-600">
                        ₹{h.advancePaid.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-red-650">
                        ₹{h.balanceAmount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {reportData.transports.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-bold text-slate-800">
                        {t.vehicleType}
                      </td>
                      <td className="p-2.5 text-slate-500">Transport</td>
                      <td className="p-2.5">
                        ₹{t.totalAmount.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-slate-600">
                        ₹{t.advancePaid.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-red-650">
                        ₹{t.balanceAmount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {reportData.guides.map((g: any) => (
                    <tr key={g.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-bold text-slate-800">
                        {g.guideName}
                      </td>
                      <td className="p-2.5 text-slate-500">Guide</td>
                      <td className="p-2.5">
                        ₹{g.agreedAmount.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-slate-600">
                        ₹{g.advancePaid.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-red-650">
                        ₹{g.balanceAmount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedReport === "HOTELS" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                  <tr className="text-[9px] font-black text-slate-450 uppercase">
                    <th className="p-2.5">Hotel Name</th>
                    <th className="p-2.5">In/Out Date</th>
                    <th className="p-2.5">Rooms</th>
                    <th className="p-2.5">Total Cost</th>
                    <th className="p-2.5">Paid</th>
                    <th className="p-2.5">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {reportData.hotels.map((h: any) => (
                    <tr key={h.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-bold text-slate-800">
                        {h.hotelName}
                      </td>
                      <td className="p-2.5 text-slate-550">
                        {h.checkInDate?.substring(0, 10)} to{" "}
                        {h.checkOutDate?.substring(0, 10)}
                      </td>
                      <td className="p-2.5 font-extrabold">
                        {h.numberOfRooms}
                      </td>
                      <td className="p-2.5">
                        ₹{h.totalAmount.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-green-600">
                        ₹{h.advancePaid.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-red-650">
                        ₹{h.balanceAmount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedReport === "TRANSPORT" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                  <tr className="text-[9px] font-black text-slate-450 uppercase">
                    <th className="p-2.5">Vehicle Type</th>
                    <th className="p-2.5">Driver</th>
                    <th className="p-2.5">Contact</th>
                    <th className="p-2.5">Total Cost</th>
                    <th className="p-2.5">Paid</th>
                    <th className="p-2.5">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {reportData.transports.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-bold text-slate-800">
                        {t.vehicleType}
                      </td>
                      <td className="p-2.5 font-bold text-slate-700">
                        {t.driverName || "—"}
                      </td>
                      <td className="p-2.5 font-semibold text-slate-550">
                        {t.driverPhone || "—"}
                      </td>
                      <td className="p-2.5">
                        ₹{t.totalAmount.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-green-600">
                        ₹{t.advancePaid.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-red-650">
                        ₹{t.balanceAmount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedReport === "GUIDE" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                  <tr className="text-[9px] font-black text-slate-450 uppercase">
                    <th className="p-2.5">Guide Name</th>
                    <th className="p-2.5">Trip</th>
                    <th className="p-2.5">Agreed Fee</th>
                    <th className="p-2.5">Paid</th>
                    <th className="p-2.5">Balance Due</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {reportData.guides.map((g: any) => (
                    <tr key={g.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-bold text-slate-800">
                        {g.guideName}
                      </td>
                      <td className="p-2.5 text-slate-500">{tripId}</td>
                      <td className="p-2.5">
                        ₹{g.agreedAmount.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-green-600">
                        ₹{g.advancePaid.toLocaleString()}
                      </td>
                      <td className="p-2.5 text-red-650">
                        ₹{g.balanceAmount.toLocaleString()}
                      </td>
                      <td className="p-2.5 uppercase font-bold text-slate-550">
                        {g.paymentStatus}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedReport === "ACTIVITIES" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                  <tr className="text-[9px] font-black text-slate-450 uppercase">
                    <th className="p-2.5">Day No</th>
                    <th className="p-2.5">Activity Name</th>
                    <th className="p-2.5">Location</th>
                    <th className="p-2.5">Responsible</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {reportData.activities.map((a: any) => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-extrabold text-slate-800">
                        {a.dayNumber}
                      </td>
                      <td className="p-2.5 font-bold text-slate-700">
                        {a.name}
                      </td>
                      <td className="p-2.5 text-slate-550">
                        {a.location || "—"}
                      </td>
                      <td className="p-2.5 text-slate-600">
                        {a.responsibleGuide?.name || a.responsibleStaff || "—"}
                      </td>
                      <td className="p-2.5 font-black uppercase text-slate-500">
                        {a.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedReport === "DOCUMENTS" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                  <tr className="text-[9px] font-black text-slate-450 uppercase">
                    <th className="p-2.5">File Name</th>
                    <th className="p-2.5">Category</th>
                    <th className="p-2.5">Verification</th>
                    <th className="p-2.5">Uploaded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {reportData.docs.map((d: any) => (
                    <tr key={d.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-bold text-slate-800">
                        {d.originalFileName}
                      </td>
                      <td className="p-2.5 text-slate-550">{d.category}</td>
                      <td className="p-2.5 font-extrabold text-green-600">
                        {d.verificationStatus}
                      </td>
                      <td className="p-2.5 text-slate-600">
                        {d.uploadedBy?.name || "Staff"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {selectedReport === "TASKS" && (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-[#E2E8F0]">
                  <tr className="text-[9px] font-black text-slate-450 uppercase">
                    <th className="p-2.5">Task Name</th>
                    <th className="p-2.5">Stage</th>
                    <th className="p-2.5">Assigned To</th>
                    <th className="p-2.5">Priority</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {reportData.tasks.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="p-2.5 font-bold text-slate-800">
                        {t.taskName}
                      </td>
                      <td className="p-2.5 text-slate-500 uppercase">
                        {t.stage.replace(/_/g, " ")}
                      </td>
                      <td className="p-2.5 font-bold text-slate-700">
                        {t.assignedTo || "—"}
                      </td>
                      <td className="p-2.5 font-extrabold text-slate-550">
                        {t.priority}
                      </td>
                      <td className="p-2.5 font-black uppercase text-slate-600">
                        {t.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

