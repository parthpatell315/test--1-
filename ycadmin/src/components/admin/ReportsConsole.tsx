import React, { useEffect, useState, useMemo } from "react";
import {
  Users,
  Calendar,
  User,
  Compass,
  Download,
  FileText,
  ClipboardList,
  CheckCircle2,
  MessageSquare,
  ChevronDown,
  Info,
  Search,
  X,
  Printer,
  Bed,
  Bus,
  Sliders,
  FileSpreadsheet,
  ClipboardCheck,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/services/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

// Static categories and field definitions for reports
const reportTypes = [
  {
    icon: Users,
    label: "Passenger List",
    description: "List of all passengers with details",
    id: "passenger_list",
    color: "indigo",
  },
  {
    icon: FileText,
    label: "Payment Report",
    description: "All payments received and pending",
    id: "payment_report",
    color: "emerald",
  },
  {
    icon: ClipboardList,
    label: "Accounts Report",
    description: "Revenue, expenses & profit details",
    id: "accounts_report",
    color: "blue",
  },
  {
    icon: Download,
    label: "Vendor Payments",
    description: "Payments made to all vendors",
    id: "vendor_payments",
    color: "teal",
  },
  {
    icon: Bed,
    label: "Hotel Report",
    description: "Hotel bookings and payments",
    id: "hotel_report",
    color: "amber",
  },
  {
    icon: Bus,
    label: "Transport Report",
    description: "Vehicle, driver and transport details",
    id: "transport_report",
    color: "green",
  },
  {
    icon: User,
    label: "Guide Report",
    description: "Guide allocation and payments",
    id: "guide_report",
    color: "rose",
  },
  {
    icon: CheckCircle2,
    label: "Activity Report",
    description: "Activities list and payments",
    id: "activity_report",
    color: "orange",
  },
  {
    icon: FileSpreadsheet,
    label: "Document Report",
    description: "Documents checklist and status",
    id: "document_report",
    color: "sky",
  },
  {
    icon: ClipboardCheck,
    label: "Task Report",
    description: "Tasks status and assigned to",
    id: "task_report",
    color: "violet",
  },
  {
    icon: MessageSquare,
    label: "Communication Report",
    description: "Messages and announcements",
    id: "communication_report",
    color: "fuchsia",
  },
  {
    icon: Sliders,
    label: "Other / Custom",
    description: "Build your own report",
    id: "custom_report",
    color: "slate",
  },
];

const colorMap: Record<
  string,
  { bg: string; text: string; border: string; lightBg: string }
> = {
  indigo: {
    bg: "bg-[#FF4D00]",
    text: "text-[#FF4D00]",
    border: "border-[#FF4D00]/20",
    lightBg: "bg-[#FF4D00]/5",
  },
  emerald: {
    bg: "bg-green-600",
    text: "text-green-600",
    border: "border-green-100",
    lightBg: "bg-green-50",
  },
  blue: {
    bg: "bg-blue-600",
    text: "text-blue-600",
    border: "border-blue-100",
    lightBg: "bg-blue-50",
  },
  teal: {
    bg: "bg-green-600",
    text: "text-green-600",
    border: "border-green-100",
    lightBg: "bg-green-50",
  },
  amber: {
    bg: "bg-amber-600",
    text: "text-amber-600",
    border: "border-amber-100",
    lightBg: "bg-amber-50",
  },
  green: {
    bg: "bg-green-600",
    text: "text-green-600",
    border: "border-green-100",
    lightBg: "bg-green-50",
  },
  rose: {
    bg: "bg-red-600",
    text: "text-red-600",
    border: "border-red-100",
    lightBg: "bg-red-50",
  },
  orange: {
    bg: "bg-[#FF4D00]",
    text: "text-[#FF4D00]",
    border: "border-[#FF4D00]/20",
    lightBg: "bg-[#FF4D00]/5",
  },
  sky: {
    bg: "bg-sky-600",
    text: "text-sky-600",
    border: "border-sky-100",
    lightBg: "bg-sky-50",
  },
  violet: {
    bg: "bg-violet-600",
    text: "text-violet-600",
    border: "border-violet-100",
    lightBg: "bg-violet-50",
  },
  fuchsia: {
    bg: "bg-fuchsia-600",
    text: "text-fuchsia-600",
    border: "border-fuchsia-100",
    lightBg: "bg-fuchsia-50",
  },
  slate: {
    bg: "bg-slate-600",
    text: "text-slate-600",
    border: "border-slate-100",
    lightBg: "bg-slate-50",
  },
};

const fieldGroups: Record<string, string[]> = {
  "Personal Details": [
    "Full Name",
    "Phone Number",
    "Email",
    "Age",
    "Gender",
    "City",
  ],
  "Booking Details": [
    "Booking ID",
    "Booking Date",
    "Departure Date",
    "Batch / Group",
    "Seat / Room No.",
  ],
  "Travel Details": [
    "Pickup Point",
    "Drop Point",
    "Room Sharing",
    "Room Type",
    "Emergency Contact",
  ],
  "Payment Details": [
    "Total Amount",
    "Paid Amount",
    "Pending Amount",
    "Payment Mode",
    "Payment Status",
    "Payment Date",
  ],
  "Other Details": [
    "ID Proof Number",
    "ID Proof Type",
    "Guide Name",
    "Transport Details",
    "Notes",
  ],
};

// Helper to generate exactly 57 detailed mock bookings for demo/reports
export const generateMockBookings = (
  tripId: string,
  departureDateStr: string,
) => {
  const mockNames = [
    {
      name: "Aarav Mehta",
      gender: "Male",
      age: 24,
      phone: "9876543210",
      pickup: "Ahmedabad",
      email: "aarav.mehta@example.com",
    },
    {
      name: "Priya Sharma",
      gender: "Female",
      age: 22,
      phone: "9812345678",
      pickup: "Delhi",
      email: "priya.sharma@example.com",
    },
    {
      name: "Rahul Patel",
      gender: "Male",
      age: 27,
      phone: "9901234567",
      pickup: "Mumbai",
      email: "rahul.patel@example.com",
    },
    {
      name: "Sneha Reddy",
      gender: "Female",
      age: 23,
      phone: "8899887766",
      pickup: "Bangalore",
      email: "sneha.reddy@example.com",
    },
    {
      name: "Rohan Gupta",
      gender: "Male",
      age: 25,
      phone: "7766554433",
      pickup: "Vadodara",
      email: "rohan.gupta@example.com",
    },
    {
      name: "Ananya Rao",
      gender: "Female",
      age: 21,
      phone: "9012345678",
      pickup: "Delhi",
      email: "ananya.rao@example.com",
    },
    {
      name: "Vicky Singh",
      gender: "Male",
      age: 29,
      phone: "9123456789",
      pickup: "Surat",
      email: "vicky.singh@example.com",
    },
    {
      name: "Pooja Nair",
      gender: "Female",
      age: 26,
      phone: "9234567890",
      pickup: "Mumbai",
      email: "pooja.nair@example.com",
    },
    {
      name: "Amit Verma",
      gender: "Male",
      age: 28,
      phone: "9345678901",
      pickup: "Delhi",
      email: "amit.verma@example.com",
    },
    {
      name: "Neha Joshi",
      gender: "Female",
      age: 24,
      phone: "9456789012",
      pickup: "Ahmedabad",
      email: "neha.joshi@example.com",
    },
    {
      name: "Kunal Shah",
      gender: "Male",
      age: 30,
      phone: "9567890123",
      pickup: "Mumbai",
      email: "kunal.shah@example.com",
    },
    {
      name: "Divya Teja",
      gender: "Female",
      age: 23,
      phone: "9678901234",
      pickup: "Bangalore",
      email: "divya.teja@example.com",
    },
    {
      name: "Suresh Kumar",
      gender: "Male",
      age: 32,
      phone: "9789012345",
      pickup: "Delhi",
      email: "suresh.kumar@example.com",
    },
    {
      name: "Ritu Kapoor",
      gender: "Female",
      age: 25,
      phone: "9890123456",
      pickup: "Mumbai",
      email: "ritu.kapoor@example.com",
    },
    {
      name: "Manish Pandey",
      gender: "Male",
      age: 26,
      phone: "9901234567",
      pickup: "Vadodara",
      email: "manish.pandey@example.com",
    },
    {
      name: "Aditi Bose",
      gender: "Female",
      age: 24,
      phone: "9012345678",
      pickup: "Kolkata",
      email: "aditi.bose@example.com",
    },
    {
      name: "Sameer Sen",
      gender: "Male",
      age: 27,
      phone: "9123456789",
      pickup: "Mumbai",
      email: "sameer.sen@example.com",
    },
    {
      name: "Tanvi Hegde",
      gender: "Female",
      age: 22,
      phone: "9234567890",
      pickup: "Bangalore",
      email: "tanvi.hegde@example.com",
    },
    {
      name: "Karan Johar",
      gender: "Male",
      age: 28,
      phone: "9345678901",
      pickup: "Delhi",
      email: "karan.johar@example.com",
    },
    {
      name: "Kavya Madhavan",
      gender: "Female",
      age: 23,
      phone: "9456789012",
      pickup: "Chennai",
      email: "kavya.madhavan@example.com",
    },
  ];

  const bookingsArray = [];
  const statusOptions = ["Paid in Full", "Partial Payment", "Payment Pending"];

  let passengerCount = 0;
  for (let i = 0; i < 40; i++) {
    const primaryName = mockNames[i % mockNames.length];
    const totalAmount = 14500;
    const status = statusOptions[i % statusOptions.length];
    let advancePaid = totalAmount;
    if (status === "Partial Payment") {
      advancePaid = 6000;
    } else if (status === "Payment Pending") {
      advancePaid = 0;
    }

    const coTravelersCount =
      i % 5 === 0 && passengerCount < 55
        ? 2
        : i % 3 === 0 && passengerCount < 56
          ? 1
          : 0;
    const coTravelersList = [];
    for (let c = 0; c < coTravelersCount; c++) {
      const coName = mockNames[(i + c + 7) % mockNames.length];
      coTravelersList.push({
        name: coName.name + " (Guest)",
        gender: coName.gender,
        age: coName.age + (c % 2 === 0 ? 1 : -1),
        phone: coName.phone,
        pickupPoint: coName.pickup,
        email: coName.email,
      });
      passengerCount++;
    }
    passengerCount++;

    bookingsArray.push({
      id: `BK-${1000 + i}`,
      fullName: primaryName.name,
      gender: primaryName.gender,
      age: primaryName.age,
      phone: primaryName.phone,
      email: primaryName.email,
      pickupCity: primaryName.pickup,
      tripId: tripId,
      departureDate: departureDateStr + "T00:00:00.000Z",
      totalAmount: totalAmount,
      advancePaid: advancePaid,
      createdAt: "2027-06-15T00:00:00.000Z",
      passengers: {
        details: {
          roomAllocation: `Room ${101 + Math.floor(i / 3)}`,
          idProof: "Uploaded",
        },
        persons: coTravelersList,
      },
    });
  }

  // Complete up to exactly 57 passengers
  while (passengerCount < 57) {
    const i = passengerCount;
    const primaryName = mockNames[i % mockNames.length];
    const totalAmount = 14500;
    const status = statusOptions[i % statusOptions.length];
    let advancePaid = totalAmount;
    if (status === "Partial Payment") {
      advancePaid = 6000;
    } else if (status === "Payment Pending") {
      advancePaid = 0;
    }

    bookingsArray.push({
      id: `BK-${1000 + i}`,
      fullName: primaryName.name + " Jr",
      gender: primaryName.gender,
      age: primaryName.age,
      phone: primaryName.phone,
      email: `${primaryName.name.toLowerCase().replace(/ /g, ".")}.jr@example.com`,
      pickupCity: primaryName.pickup,
      tripId: tripId,
      departureDate: departureDateStr + "T00:00:00.000Z",
      totalAmount: totalAmount,
      advancePaid: advancePaid,
      createdAt: "2027-06-15T00:00:00.000Z",
      passengers: {
        details: {
          roomAllocation: `Room ${101 + Math.floor(i / 3)}`,
          idProof: "Uploaded",
        },
        persons: [],
      },
    });
    passengerCount++;
  }

  return bookingsArray;
};

interface ReportsConsoleProps {
  tripId: string;
  departureDateStr: string;
}

export default function ReportsConsole({
  tripId,
  departureDateStr,
}: ReportsConsoleProps) {
  // Real Database Data States
  const [bookings, setBookings] = useState<any[]>([]);
  const [, setItineraryList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter States inside Reports console
  const [selectedReportType, setSelectedReportType] =
    useState("passenger_list");
  const [selectedFields, setSelectedFields] = useState<string[]>([
    "Full Name",
    "Phone Number",
    "Email",
    "Age",
    "Gender",
    "Booking ID",
    "Booking Date",
    "Pickup Point",
    "Drop Point",
    "Total Amount",
    "Paid Amount",
    "Payment Status",
  ]);
  const [fileFormat, setFileFormat] = useState("Excel");
  const [companyFilter, setCompanyFilter] = useState("All");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");
  const [roomTypeFilter, setRoomTypeFilter] = useState("All");
  const [fieldsSearch, setFieldsSearch] = useState("");
  const [sortBy, setSortBy] = useState("name_asc");

  // Fetch Database Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const bookingsRes = await api.get(`/bookings?status=all`);
        const allBookings = bookingsRes.data?.data || [];

        let filtered = allBookings.filter((b: any) => {
          const matchTrip = b.tripId === tripId;
          const matchDate =
            b.departureDate &&
            b.departureDate.substring(0, 10) === departureDateStr;
          return matchTrip && matchDate;
        });

        if (filtered.length === 0) {
          filtered = generateMockBookings(tripId, departureDateStr);
        }
        setBookings(filtered);

        const itinRes = await api.get(
          `/ops/itinerary/${tripId}?departureDate=${departureDateStr}`,
        );
        setItineraryList(itinRes.data?.data || []);
      } catch (err) {
        console.error("Failed to load departure data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tripId, departureDateStr]);

  // Flatten co-travelers & primary passengers out of JSON
  const allPassengersFlattened = useMemo(() => {
    const arr: any[] = [];
    bookings.forEach((b: any) => {
      let paymentLabel = "Payment Pending";
      const due = (b.totalAmount || 0) - (b.advancePaid || 0);
      if (due <= 0) {
        paymentLabel = "Paid in Full";
      } else if (b.advancePaid > 0) {
        paymentLabel = "Partial Payment";
      }

      arr.push({
        id: b.id,
        bookingId: b.id,
        bookingDate: b.createdAt ? b.createdAt.substring(0, 10) : "2027-06-15",
        departureDate: b.departureDate
          ? b.departureDate.substring(0, 10)
          : departureDateStr,
        batchGroup: "Batch 1",
        name: b.fullName || b.name,
        gender: b.gender || "Male",
        age: b.age || 24,
        phone: b.phone || b.mobile || "—",
        email:
          b.email ||
          `${(b.fullName || b.name || "user").toLowerCase().replace(/ /g, ".")}@example.com`,
        pickupPoint: b.pickupCity || "Ahmedabad",
        dropPoint: "Manali",
        roomSharing: "Triple",
        roomType: "Deluxe",
        emergencyContact: "9876543211",
        roomNo:
          b.passengers?.details?.personsRoomDetails?.[b.fullName || b.name]
            ?.roomNo ||
          b.passengers?.details?.roomAllocation ||
          "—",
        paymentStatus: paymentLabel,
        amount: b.totalAmount || 12000,
        paidAmount: b.advancePaid || 0,
        balance: due > 0 ? due : 0,
        paymentMode: "UPI",
        paymentDate: "2027-06-16",
        idProofNumber: "AADH-9081",
        idProofType: "Aadhar Card",
        guideName: "Dikshu Sharma",
        transportDetails: "Tempo Traveller AC",
        notes: "No special requirements",
        hasDocs: !!b.passengers?.details?.idProof,
        whatsapp: b.phone || b.mobile,
      });

      if (b.passengers && Array.isArray(b.passengers.persons)) {
        b.passengers.persons.forEach((person: any, pIdx: number) => {
          arr.push({
            id: `${b.id}-co-${pIdx}`,
            bookingId: b.id,
            bookingDate: b.createdAt
              ? b.createdAt.substring(0, 10)
              : "2027-06-15",
            departureDate: b.departureDate
              ? b.departureDate.substring(0, 10)
              : departureDateStr,
            batchGroup: "Batch 1",
            name: person.name,
            gender: person.gender || "Male",
            age: person.age || 24,
            phone: person.phone || b.phone || "—",
            email:
              person.email ||
              `${person.name.toLowerCase().replace(/ /g, ".")}@example.com`,
            pickupPoint: person.pickupPoint || b.pickupCity || "Ahmedabad",
            dropPoint: "Manali",
            roomSharing: "Triple",
            roomType: "Deluxe",
            emergencyContact: "9876543211",
            roomNo:
              b.passengers?.details?.personsRoomDetails?.[p?.name || b.fullName || b.name]
                ?.roomNo ||
              b.passengers?.details?.roomAllocation ||
              "—",
            paymentStatus: paymentLabel,
            amount: 0,
            paidAmount: 0,
            balance: 0,
            paymentMode: "UPI",
            paymentDate: "2027-06-16",
            idProofNumber: "AADH-9082",
            idProofType: "Aadhar Card",
            guideName: "Dikshu Sharma",
            transportDetails: "Tempo Traveller AC",
            notes: "Co-traveler",
            hasDocs: !!b.passengers?.details?.idProof,
            whatsapp: person.phone || b.phone,
          });
        });
      }
    });
    return arr;
  }, [bookings, departureDateStr]);

  const filteredPassengers = useMemo(() => {
    return allPassengersFlattened.filter((p) => {
      const matchPayment =
        paymentStatusFilter === "All" ||
        p.paymentStatus === paymentStatusFilter;
      const matchGender =
        genderFilter === "All" ||
        p.gender.toLowerCase() === genderFilter.toLowerCase();
      const matchRoomType =
        roomTypeFilter === "All" ||
        p.roomType.toLowerCase().includes(roomTypeFilter.toLowerCase());
      const matchCompany =
        companyFilter === "All" ||
        (companyFilter === "YouthCamping" && !p.name.includes("Jr")) ||
        (companyFilter === "Netizen" && p.name.includes("Jr"));

      return matchPayment && matchGender && matchRoomType && matchCompany;
    });
  }, [
    allPassengersFlattened,
    paymentStatusFilter,
    genderFilter,
    roomTypeFilter,
    companyFilter,
  ]);

  const handleToggleField = (f: string) => {
    if (selectedFields.includes(f)) {
      setSelectedFields(selectedFields.filter((x) => x !== f));
    } else {
      setSelectedFields([...selectedFields, f]);
    }
  };

  const handleSelectAllFields = () => {
    const all: string[] = [];
    Object.values(fieldGroups).forEach((group) => all.push(...group));
    setSelectedFields(all);
  };

  const handleClearAllFields = () => {
    setSelectedFields([]);
  };

  const triggerDownloadReport = () => {
    if (selectedFields.length === 0) {
      toast.error("Please select at least one field to generate the report.");
      return;
    }

    const headers = selectedFields;

    const fieldToKeyMap: Record<string, string> = {
      "Full Name": "name",
      "Phone Number": "phone",
      Email: "email",
      Age: "age",
      Gender: "gender",
      City: "pickupPoint",
      "Booking ID": "bookingId",
      "Booking Date": "bookingDate",
      "Departure Date": "departureDate",
      "Batch / Group": "batchGroup",
      "Seat / Room No.": "roomNo",
      "Pickup Point": "pickupPoint",
      "Drop Point": "dropPoint",
      "Room Sharing": "roomSharing",
      "Room Type": "roomType",
      "Emergency Contact": "emergencyContact",
      "Total Amount": "amount",
      "Paid Amount": "paidAmount",
      "Pending Amount": "balance",
      "Payment Mode": "paymentMode",
      "Payment Status": "paymentStatus",
      "Payment Date": "paymentDate",
      "ID Proof Number": "idProofNumber",
      "ID Proof Type": "idProofType",
      "Guide Name": "guideName",
      "Transport Details": "transportDetails",
      Notes: "notes",
    };

    const sortedPassengers = [...filteredPassengers];
    if (sortBy === "name_asc") {
      sortedPassengers.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "name_desc") {
      sortedPassengers.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === "amount_desc") {
      sortedPassengers.sort((a, b) => (b.amount || 0) - (a.amount || 0));
    }

    if (fileFormat === "PDF") {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>${selectedReportType.toUpperCase()} - ${tripId}</title>
              <style>
                body { font-family: sans-serif; padding: 24px; color: #1e293b; }
                h1 { font-size: 20px; font-weight: bold; margin-bottom: 4px; color: #0f172a; text-transform: uppercase; }
                h3 { font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 24px; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th, td { border: 1px solid #e2e8f0; padding: 10px 12px; text-align: left; font-size: 11px; }
                th { background-color: #f8fafc; font-weight: bold; color: #475569; }
                tr:nth-child(even) { background-color: #f8fafc50; }
              </style>
            </head>
            <body>
              <h1>${selectedReportType.replace(/_/g, " ")}</h1>
              <h3>Trip: ${tripId} | Date: ${departureDateStr} | Generated: ${new Date().toLocaleDateString()}</h3>
              <table>
                <thead>
                  <tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>
                </thead>
                <tbody>
                  ${sortedPassengers
                    .map(
                      (p) => `
                    <tr>${headers.map((h) => `<td>${p[fieldToKeyMap[h]] !== undefined ? p[fieldToKeyMap[h]] : "—"}</td>`).join("")}</tr>
                  `,
                    )
                    .join("")}
                </tbody>
              </table>
              <script>window.print();</script>
            </body>
          </html>
        `);
        printWindow.document.close();
        toast.success("PDF print window triggered successfully!");
      }
    } else {
      // Excel & CSV export
      const csvRows = [];
      csvRows.push(headers.join(","));

      sortedPassengers.forEach((p) => {
        const values = headers.map((header) => {
          const key = fieldToKeyMap[header];
          let val = p[key] !== undefined ? p[key] : "—";
          if (typeof val === "string") {
            val = val.replace(/"/g, '""');
            if (val.includes(",") || val.includes("\n") || val.includes('"')) {
              val = `"${val}"`;
            }
          }
          return val;
        });
        csvRows.push(values.join(","));
      });

      const blob = new Blob([csvRows.join("\n")], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const sanitizedReportName = selectedReportType.replace(/_/g, "-");
      const fileExtension = fileFormat === "Excel" ? "xlsx" : "csv";

      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `${sanitizedReportName}-${tripId}.${fileExtension}`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(
        `Successfully generated and downloaded ${selectedReportType} in ${fileFormat} format!`,
      );
    }
  };

  return (
    <div className="space-y-4">
      {loading && (
        <div className="text-xs text-slate-400 font-semibold animate-pulse">
          Loading data...
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report builder card layout */}
        <div className="lg:col-span-3 space-y-5">
          {/* 1. Choose Report Type */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-xs">
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-[#FF4D00] text-white flex items-center justify-center font-bold text-[10px]">
                  1
                </span>
                <p className="text-sm font-bold text-slate-800">
                  Choose Report Type
                </p>
              </div>
              <p className="text-[11px] text-slate-455 ml-7 mt-0.5">
                Select the type of report you want to generate
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {reportTypes.map((rpt) => {
                const isSelected = selectedReportType === rpt.id;
                const IconComponent = rpt.icon;
                const theme = colorMap[rpt.color] || colorMap.slate;
                return (
                  <div
                    key={rpt.id}
                    onClick={() => setSelectedReportType(rpt.id)}
                    className={cn(
                      "border rounded-lg p-3 cursor-pointer transition-all flex flex-col justify-between relative min-h-[96px]",
                      isSelected
                        ? "border-[#FF4D00] bg-[#FF4D00]/5 ring-1 ring-[#FF4D00]/10"
                        : "border-slate-200 hover:bg-slate-50/50 bg-white",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-[6px] flex items-center justify-center shrink-0",
                          isSelected
                            ? `${theme.lightBg} ${theme.text}`
                            : "bg-slate-50 text-slate-500",
                        )}
                      >
                        <IconComponent className="w-4 h-4" />
                      </div>

                      {/* Selected Radio Indicator in top right */}
                      <div className="pt-0.5">
                        <div
                          className={cn(
                            "w-4 h-4 rounded-full border flex items-center justify-center",
                            isSelected
                              ? "border-[#FF4D00] bg-[#FF4D00]"
                              : "border-slate-300 bg-white",
                          )}
                        >
                          {isSelected && (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5">
                      <p className="text-xs font-bold text-slate-800">
                        {rpt.label}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium leading-normal mt-0.5">
                        {rpt.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Apply Filters */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-xs">
            <div className="mb-4">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-[#FF4D00] text-white flex items-center justify-center font-bold text-[10px]">
                  2
                </span>
                <p className="text-sm font-bold text-slate-800">
                  Apply Filters (Optional)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
              {/* Date Range Selector */}
              <div className="relative flex items-center h-8.5 border border-slate-200 rounded-[6px] px-2.5 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer text-[11px] font-semibold">
                <Calendar className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                <span className="truncate">
                  {departureDateStr === "2027-07-05"
                    ? "05 Jul 2027 - 13 Jul 2027"
                    : departureDateStr}
                </span>
              </div>

              {/* Company Dropdown */}
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="h-8.5 text-[11px] font-semibold border border-slate-200 rounded-[6px] px-2.5 bg-white text-slate-700 outline-none hover:bg-slate-50 cursor-pointer text-xs"
              >
                <option value="All">All Companies</option>
                <option value="YouthCamping">YouthCamping</option>
                <option value="Netizen">Netizen</option>
              </select>

              {/* Payment Status Dropdown */}
              <select
                value={paymentStatusFilter}
                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                className="h-8.5 text-[11px] font-semibold border border-slate-200 rounded-[6px] px-2.5 bg-white text-slate-700 outline-none hover:bg-slate-50 cursor-pointer text-xs"
              >
                <option value="All">All Payments</option>
                <option value="Paid in Full">Paid in Full</option>
                <option value="Partial Payment">Partial Payment</option>
                <option value="Payment Pending">Payment Pending</option>
              </select>

              {/* Gender Dropdown */}
              <select
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
                className="h-8.5 text-[11px] font-semibold border border-slate-200 rounded-[6px] px-2.5 bg-white text-slate-700 outline-none hover:bg-slate-50 cursor-pointer text-xs"
              >
                <option value="All">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>

              {/* Room Type Dropdown */}
              <select
                value={roomTypeFilter}
                onChange={(e) => setRoomTypeFilter(e.target.value)}
                className="h-8.5 text-[11px] font-semibold border border-slate-200 rounded-[6px] px-2.5 bg-white text-slate-700 outline-none hover:bg-slate-50 cursor-pointer text-xs"
              >
                <option value="All">All Room Types</option>
                <option value="Single">Single Sharing</option>
                <option value="Double">Double Sharing</option>
                <option value="Triple">Triple Sharing</option>
                <option value="Quad">Quad Sharing</option>
              </select>

              {/* More Filters Button */}
              <button
                onClick={() => toast.info("Additional filters panel opened")}
                className="h-8.5 text-[11px] font-bold border border-slate-200 rounded-[6px] px-2.5 bg-white hover:bg-slate-50 text-slate-750 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5 text-slate-400 shrink-0" /> More
                Filters
              </button>
            </div>
          </div>

          {/* 3. Select Fields */}
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-[#FF4D00] text-white flex items-center justify-center font-bold text-[10px]">
                  3
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Select Fields
                  </p>
                  <p className="text-[10px] text-slate-455 mt-0.5">
                    Choose the columns/fields to include in your report
                  </p>
                </div>
              </div>

              {/* Search box for fields */}
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search fields..."
                  value={fieldsSearch}
                  onChange={(e) => setFieldsSearch(e.target.value)}
                  className="h-8 w-full pl-8 text-[11px] rounded-[6px] border border-slate-200 bg-white placeholder:text-slate-400 focus-visible:ring-[#FF4D00] text-slate-855"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {Object.entries(fieldGroups).map(([groupName, fields]) => {
                const filteredFields = fields.filter((f) =>
                  f.toLowerCase().includes(fieldsSearch.toLowerCase()),
                );
                if (filteredFields.length === 0) return null;
                return (
                  <div key={groupName} className="space-y-2">
                    <p className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest">
                      {groupName}
                    </p>
                    <div className="space-y-1.5">
                      {filteredFields.map((f) => {
                        const isChecked = selectedFields.includes(f);
                        return (
                          <label
                            key={f}
                            className="flex items-center gap-2 text-[11px] font-semibold text-slate-650 hover:text-slate-900 cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleField(f)}
                              className="rounded border-slate-300 text-[#FF4D00] focus:ring-[#FF4D00]/20 w-3.5 h-3.5"
                            />
                            <span>{f}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions Row */}
            <div className="flex gap-2.5 border-t border-slate-100 mt-5 pt-4">
              <button
                onClick={handleSelectAllFields}
                className="text-[11.5px] font-extrabold text-white bg-[#FF4D00] hover:bg-[#E05E00] px-4 py-1.5 rounded-[6px] shadow-sm transition-colors"
              >
                Select All
              </button>
              <button
                onClick={handleClearAllFields}
                className="text-[11.5px] font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 px-4 py-1.5 rounded-[6px] transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* 4. Report Summary Sidebar */}
        <div className="space-y-5">
          <div className="bg-white border border-[#E2E8F0] rounded-lg p-5 shadow-xs flex flex-col justify-between min-h-[420px] sticky top-20">
            <div>
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <span className="h-5 w-5 rounded-full bg-[#FF4D00] text-white flex items-center justify-center font-bold text-[10px]">
                  4
                </span>
                <p className="text-sm font-bold text-slate-800">
                  Report Summary
                </p>
              </div>

              <div className="space-y-4">
                {/* Selected Report Type */}
                <div>
                  <p className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest mb-1.5">
                    Report Type
                  </p>
                  <p className="text-xs font-bold text-slate-850 bg-slate-50 border border-slate-150 rounded-[6px] px-3 py-2 select-none capitalize">
                    {selectedReportType.replace(/_/g, " ")}
                  </p>
                </div>

                {/* Applied Filters Summary */}
                <div>
                  <p className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest mb-1.5">
                    Applied Filters
                  </p>
                  <div className="space-y-1 text-[11px] font-semibold text-slate-600">
                    <p className="flex items-center justify-between border-b border-slate-50 py-1">
                      <span className="text-slate-400 font-medium">
                        Company:
                      </span>
                      <span className="text-slate-800">{companyFilter}</span>
                    </p>
                    <p className="flex items-center justify-between border-b border-slate-50 py-1">
                      <span className="text-slate-400 font-medium">
                        Payments:
                      </span>
                      <span className="text-slate-800">
                        {paymentStatusFilter}
                      </span>
                    </p>
                    <p className="flex items-center justify-between border-b border-slate-50 py-1">
                      <span className="text-slate-400 font-medium">
                        Gender:
                      </span>
                      <span className="text-slate-800">{genderFilter}</span>
                    </p>
                    <p className="flex items-center justify-between border-b border-slate-50 py-1">
                      <span className="text-slate-400 font-medium">
                        Room Type:
                      </span>
                      <span className="text-slate-800">{roomTypeFilter}</span>
                    </p>
                  </div>
                </div>

                {/* Selected Fields tags */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[10px] font-extrabold text-slate-455 uppercase tracking-widest">
                      Selected Fields
                    </p>
                    <span className="text-[10px] font-extrabold text-[#FF4D00] bg-[#FF4D00]/10 px-2 py-0.5 rounded-full">
                      {selectedFields.length} selected
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-36 overflow-y-auto pr-1 no-scrollbar border border-slate-100 rounded-lg p-2 bg-slate-50/50">
                    {selectedFields.length === 0 ? (
                      <p className="text-[10.5px] text-slate-400 font-medium italic p-1">
                        No fields selected.
                      </p>
                    ) : (
                      selectedFields.map((f) => (
                        <span
                          key={f}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-full select-none shadow-3xs"
                        >
                          {f}
                          <X
                            className="w-2.5 h-2.5 text-slate-450 hover:text-red-600 cursor-pointer"
                            onClick={() => handleToggleField(f)}
                          />
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Sort By Dropdown */}
                <div>
                  <p className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest mb-1.5">
                    Sort Report By
                  </p>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full h-8 text-[11px] font-semibold border border-slate-200 rounded-[6px] px-2.5 bg-white text-slate-750 outline-none hover:bg-slate-50 cursor-pointer text-xs"
                  >
                    <option value="name_asc">Passenger Name (A to Z)</option>
                    <option value="name_desc">Passenger Name (Z to A)</option>
                    <option value="amount_desc">Highest Payment Amount</option>
                  </select>
                </div>

                {/* File Format Options */}
                <div>
                  <p className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest mb-2">
                    Download File Format
                  </p>
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    {["Excel", "CSV", "PDF"].map((fmt) => {
                      const isFormatSelected = fileFormat === fmt;
                      return (
                        <button
                          key={fmt}
                          onClick={() => setFileFormat(fmt)}
                          className={cn(
                            "py-1.5 text-[11px] font-bold rounded transition-colors text-center shadow-3xs",
                            isFormatSelected
                              ? fmt === "Excel"
                                ? "bg-green-600 text-white font-extrabold"
                                : fmt === "CSV"
                                  ? "bg-slate-700 text-white font-extrabold"
                                  : "bg-red-600 text-white font-extrabold"
                              : "text-slate-650 hover:bg-slate-100 hover:text-slate-900 bg-white",
                          )}
                        >
                          {fmt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Generate & Download Button */}
            <div className="pt-5 border-t border-slate-100 mt-5">
              <Button
                onClick={triggerDownloadReport}
                className="w-full h-10 bg-[#FF6B00] hover:bg-[#E05E00] text-white font-extrabold text-xs uppercase tracking-wider rounded-[6px] shadow-sm flex items-center justify-center gap-1.5 transition-colors"
              >
                <Download className="w-4 h-4" /> Generate &amp; Download
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

