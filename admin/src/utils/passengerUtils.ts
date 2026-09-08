/**
 * Unified Passenger Normalization Utility
 * Used across Booking Details, Departure Hub, Ticketing, PDFs, Manifests, and Hotel Allocation.
 */

export interface NormalizedPassenger {
  id: string;
  name: string;
  age: number | null;
  gender: "M" | "F" | "O" | "U";
  genderFull: string;
  dob: string | null;
  phone: string;
  email: string;
  roomSharing: string;
  foodPreference: string;
  aadhaar: string;
  aadhaarUrl?: string;
  idProofUrl?: string;
  documents: any[];
  formattedAgeGender: string; // e.g. "24y / M"
  emergencyContact: string;
  medicalConditions: string;
  sharingWith: string;
  tempoAllocation: string;
  seatNumber: string;
  pickupPoint: string;
  trainDetails: string;
  activitySelection: string;
  remarks: string;
  internalNotes: string;
  isCancelled: boolean;
  status: string;
  cancellationReason?: string;
  cancellationDate?: string;
}

export function calculateAgeFromDOB(dobStr?: string | null): number | null {
  if (!dobStr || typeof dobStr !== "string") return null;
  const trimmed = dobStr.trim();
  if (!trimmed) return null;

  let birthDate: Date | null = null;

  if (trimmed.includes("-")) {
    const parts = trimmed.split("T")[0].split("-");
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        birthDate = new Date(
          parseInt(parts[0]),
          parseInt(parts[1]) - 1,
          parseInt(parts[2]),
        );
      } else if (parts[2].length === 4) {
        // DD-MM-YYYY
        birthDate = new Date(
          parseInt(parts[2]),
          parseInt(parts[1]) - 1,
          parseInt(parts[0]),
        );
      }
    }
  } else if (trimmed.includes("/")) {
    const parts = trimmed.split("/");
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // DD/MM/YYYY
        birthDate = new Date(
          parseInt(parts[2]),
          parseInt(parts[1]) - 1,
          parseInt(parts[0]),
        );
      } else if (parts[0].length === 4) {
        // YYYY/MM/DD
        birthDate = new Date(
          parseInt(parts[0]),
          parseInt(parts[1]) - 1,
          parseInt(parts[2]),
        );
      }
    }
  }

  if (!birthDate || isNaN(birthDate.getTime())) {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) birthDate = parsed;
  }

  if (!birthDate || isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  return age >= 0 && age < 120 ? age : null;
}

export function inferGenderFromName(nameStr?: string | null): "M" | "F" | "U" {
  if (!nameStr || typeof nameStr !== "string") return "U";
  const lower = nameStr.toLowerCase().trim();

  // Explicit title prefixes
  if (
    lower.startsWith("mrs.") ||
    lower.startsWith("mrs ") ||
    lower.startsWith("ms.") ||
    lower.startsWith("ms ") ||
    lower.startsWith("miss ") ||
    lower.startsWith("miss.") ||
    lower.startsWith("smt.") ||
    lower.startsWith("smt ") ||
    lower.startsWith("dr. mrs") ||
    lower.startsWith("dr. ms")
  ) {
    return "F";
  }

  if (
    lower.startsWith("mr.") ||
    lower.startsWith("mr ") ||
    lower.startsWith("shri ") ||
    lower.startsWith("shree ") ||
    lower.startsWith("master ")
  ) {
    return "M";
  }

  // Token-based matching on individual name words
  const tokens = lower
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const femaleTokens = new Set([
    "riddhi",
    "ridhi",
    "sneha",
    "vanshika",
    "khushi",
    "rushvi",
    "khushbu",
    "khushboo",
    "khushbuben",
    "ruchi",
    "priya",
    "priyanka",
    "pooja",
    "puja",
    "anjali",
    "neha",
    "shreya",
    "tanvi",
    "dimple",
    "hetal",
    "kinjal",
    "nisha",
    "payal",
    "bhavna",
    "bhavana",
    "monika",
    "monica",
    "heena",
    "hina",
    "divya",
    "disha",
    "aditi",
    "kriti",
    "isha",
    "aarti",
    "arti",
    "kajal",
    "sonal",
    "prachi",
    "mansi",
    "kruti",
    "urvashi",
    "drasti",
    "drashti",
    "vaishali",
    "diya",
    "jiya",
    "siya",
    "riya",
    "jinal",
    "hiral",
    "twinkle",
    "swati",
    "sweta",
    "shweta",
    "charmy",
    "dharti",
    "dhwani",
    "foram",
    "bansari",
    "nirali",
    "saloni",
    "vidhi",
    "shivali",
    "purvi",
    "namrata",
    "khushali",
    "jahnvi",
    "janvi",
    "yashvi",
    "janhavi",
    "grishma",
    "shraddha",
    "tejal",
    "nikita",
    "komal",
    "nidhi",
    "simran",
    "radhika",
    "megha",
    "bhumika",
    "ashima",
    "anushka",
    "avani",
    "avni",
    "sakshi",
    "muskan",
    "kavya",
    "dipti",
    "deepa",
    "deepika",
    "jyoti",
    "rekha",
    "geeta",
    "gita",
    "seema",
    "sita",
    "parul",
    "alka",
    "chhaya",
    "meena",
    "leena",
    "sheetal",
    "shital",
    "sapna",
  ]);

  for (const token of tokens) {
    if (
      femaleTokens.has(token) ||
      token.endsWith("ben") ||
      token.endsWith("ba") ||
      token.endsWith("devi")
    ) {
      return "F";
    }
  }

  return "U";
}

export function normalizeGenderCode(
  genderStr?: string | null,
  nameStr?: string | null,
): "M" | "F" | "O" | "U" {
  if (genderStr && typeof genderStr === "string") {
    const clean = genderStr.trim().toLowerCase();
    if (
      clean.startsWith("f") ||
      clean === "female" ||
      clean === "girl" ||
      clean === "girls" ||
      clean === "woman" ||
      clean === "women" ||
      clean === "lady" ||
      clean === "ladies" ||
      clean === "she"
    ) {
      return "F";
    }
    if (
      clean.startsWith("m") ||
      clean === "male" ||
      clean === "boy" ||
      clean === "boys" ||
      clean === "man" ||
      clean === "men" ||
      clean === "he"
    ) {
      return "M";
    }
    if (clean.startsWith("o") || clean === "other") return "O";
  }

  if (nameStr) {
    const inferred = inferGenderFromName(nameStr);
    if (inferred !== "U") return inferred;
  }

  return "U";
}

export function normalizeGenderFull(
  genderStr?: string | null,
  nameStr?: string | null,
): string {
  const code = normalizeGenderCode(genderStr, nameStr);
  if (code === "M") return "Male";
  if (code === "F") return "Female";
  if (code === "O") return "Other";
  return "Unspecified";
}

export function formatDOBForInput(
  dobStr?: string | null,
): string {
  if (!dobStr || typeof dobStr !== "string" || dobStr.trim() === "") {
    return "";
  }
  const trimmed = dobStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (trimmed.includes("T")) {
    const isoDate = trimmed.split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  }
  if (trimmed.includes("-") || trimmed.includes("/")) {
    const parts = trimmed.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      } else if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, "0")}-${parts[2].padStart(2, "0")}`;
      }
    }
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return "";
}

/**
 * Normalizes all passenger data from any booking/passenger object into a single standard object.
 */
export function normalizePassenger(
  booking?: any,
  targetInput?: any,
  index: number = 0,
): NormalizedPassenger {
  let pObj: any = targetInput || {};
  let bookingDetails: any = {};
  let bookingPassengersList: any[] = [];

  if (booking) {
    if (booking.details) {
      if (typeof booking.details === "string") {
        try {
          bookingDetails = JSON.parse(booking.details);
        } catch (e) {}
      } else if (typeof booking.details === "object") {
        bookingDetails = booking.details;
      }
    }

    if (booking.passengers) {
      if (Array.isArray(booking.passengers)) {
        bookingPassengersList = booking.passengers;
      } else if (
        typeof booking.passengers === "object" &&
        Array.isArray(booking.passengers.persons)
      ) {
        bookingPassengersList = booking.passengers.persons;
      } else if (typeof booking.passengers === "string") {
        try {
          const parsed = JSON.parse(booking.passengers);
          bookingPassengersList = Array.isArray(parsed)
            ? parsed
            : parsed.persons || [];
        } catch (e) {}
      }
    }

    if (!targetInput && bookingPassengersList.length > index) {
      pObj = bookingPassengersList[index];
    }
  }

  // Extract raw properties
  const id =
    pObj.id || pObj.passengerId || (index === 0 ? "primary" : `p_${index}`);
  const firstName = pObj.firstName || "";
  const lastName = pObj.lastName || "";
  const firstLast =
    firstName || lastName ? `${firstName} ${lastName}`.trim() : null;

  // Only fallback to booking.fullName for the main passenger (index 0)
  const fallbackName =
    index === 0
      ? booking?.fullName || booking?.name || "Traveler"
      : `Traveler ${index + 1}`;
  const name =
    pObj.name ||
    pObj.fullName ||
    pObj.passengerName ||
    firstLast ||
    fallbackName;

  const phone =
    pObj.phone ||
    pObj.mobile ||
    pObj.contact ||
    pObj.phoneNumber ||
    pObj.phoneNo ||
    pObj.mobileNo ||
    pObj.contactNumber ||
    (index === 0 ? booking?.mobile || booking?.phone : "") ||
    "";
  const email = pObj.email || (index === 0 ? booking?.email : "") || "";
  const roomSharing =
    pObj.roomSharing ||
    pObj.roomType ||
    bookingDetails.roomSharing ||
    booking?.roomType ||
    "Double Sharing";
  const foodPreference =
    pObj.foodPreference ||
    pObj.food ||
    bookingDetails.foodPreference ||
    "Regular";
  const aadhaar =
    pObj.aadhaar ||
    pObj.aadhar ||
    pObj.idProofNumber ||
    pObj.idNumber ||
    bookingDetails.aadhaar ||
    "";

  // Extract DOB & compute dynamic age
  const rawDob =
    pObj.dob ||
    pObj.dateOfBirth ||
    pObj.birthDate ||
    bookingDetails.dob ||
    bookingDetails.dateOfBirth ||
    booking?.dob ||
    booking?.dateOfBirth ||
    null;
  let age: number | null = calculateAgeFromDOB(rawDob);

  if (age === null) {
    const rawAge =
      pObj.age ||
      pObj.personAge ||
      bookingDetails.age ||
      (index === 0 ? booking?.age : null);
    if (rawAge !== undefined && rawAge !== null && rawAge !== "") {
      const parsedNum = parseInt(String(rawAge), 10);
      if (!isNaN(parsedNum) && parsedNum >= 0 && parsedNum < 120) {
        age = parsedNum;
      }
    }
  }

  const dob = rawDob ? formatDOBForInput(rawDob) : null;

  // Extract gender
  const rawGender =
    pObj.gender ||
    pObj.sex ||
    bookingDetails.gender ||
    (index === 0 ? booking?.gender : null);
  const gender = normalizeGenderCode(rawGender);
  const genderFull = normalizeGenderFull(rawGender);

  const ageStr = age !== null ? `${age}y` : "N/A";
  const formattedAgeGender = `${ageStr} / ${gender}`;

  // New fields for the Passenger Module
  const emergencyContact = pObj.emergencyContact || pObj.emergency || bookingDetails.emergencyContact || "";
  const medicalConditions = pObj.medicalConditions || pObj.medical || bookingDetails.medicalConditions || "";
  const sharingWith = pObj.sharingWith || pObj.partner || "";
  const tempoAllocation = pObj.tempoAllocation || pObj.tempo || pObj.vehicle || "";
  const seatNumber = pObj.seatNumber || pObj.seat || "";
  const pickupPoint = pObj.pickupPoint || pObj.pickup || bookingDetails.pickupPoint || booking?.pickupCity || "";
  const trainDetails = pObj.trainDetails || pObj.pnr || "";
  const activitySelection = pObj.activitySelection || pObj.activities || "";
  const remarks = pObj.remarks || "";
  const internalNotes = pObj.internalNotes || "";

  // Extract direct ID / Aadhaar proof URL if present
  const directIdProof =
    pObj.aadhaarUrl ||
    pObj.idProofUrl ||
    (typeof pObj.aadhaar === "string" && (pObj.aadhaar.startsWith("http") || pObj.aadhaar.startsWith("/")) ? pObj.aadhaar : null) ||
    (typeof pObj.idProof === "string" && (pObj.idProof.startsWith("http") || pObj.idProof.startsWith("/")) ? pObj.idProof : null) ||
    (index === 0 && bookingDetails.aadhaarUrl) ||
    (index === 0 && bookingDetails.idProofUrl) ||
    null;

  // Match documents from all available sources
  const docList: any[] = [];

  if (booking && Array.isArray(booking.documents)) {
    booking.documents.forEach((d: any) => {
      if (
        d &&
        (String(d.passengerId) === String(id) ||
          (index === 0 && (!d.passengerId || d.passengerId === "primary" || d.passengerId === "main")))
      ) {
        docList.push({
          id: d.id || `bdoc-${d.storagePath || Math.random()}`,
          title: d.originalFileName || d.title || "Aadhaar / ID Proof",
          originalFileName: d.originalFileName || d.title || "Aadhaar / ID Proof",
          url: d.url || d.fileUrl || (booking.id && d.id ? `/api/bookings/${booking.id}/documents/${d.id}` : ""),
          fileUrl: d.url || d.fileUrl || (booking.id && d.id ? `/api/bookings/${booking.id}/documents/${d.id}` : ""),
          mimeType: d.mimeType || "application/octet-stream",
          fileSize: d.fileSize,
          status: d.status || "UPLOADED",
          uploadedAt: d.createdAt || d.uploadedAt,
        });
      }
    });
  }

  if (Array.isArray(pObj.documents)) {
    pObj.documents.forEach((d: any) => {
      if (d) {
        docList.push({
          id: d.id || `pdoc-${d.url || Math.random()}`,
          title: d.title || d.originalFileName || "Document",
          originalFileName: d.originalFileName || d.title || "Document",
          url: d.url || d.fileUrl || "",
          fileUrl: d.url || d.fileUrl || "",
          mimeType: d.mimeType,
          uploadedAt: d.uploadedAt || d.createdAt,
        });
      }
    });
  }

  if (directIdProof) {
    docList.push({
      id: `direct-idproof-${id}`,
      title: "Aadhaar / ID Proof",
      originalFileName: "Aadhaar / ID Proof",
      url: directIdProof,
      fileUrl: directIdProof,
      mimeType: "image/jpeg",
    });
  }

  // De-duplicate documents
  const documents = docList.filter(
    (doc, idx, self) =>
      doc &&
      (doc.url || doc.id) &&
      self.findIndex(
        (d) =>
          (d.url && doc.url && d.url === doc.url) ||
          (d.id && doc.id && d.id === doc.id),
      ) === idx,
  );

  const isCancelled =
    pObj.isCancelled === true ||
    pObj.status === "CANCELLED" ||
    (typeof pObj.status === "string" && pObj.status.toLowerCase().includes("cancel")) ||
    (typeof pObj.notes === "string" && pObj.notes.toLowerCase().includes("cancel"));
  const status = isCancelled ? "CANCELLED" : pObj.status || "CONFIRMED";
  const cancellationReason = pObj.cancellationReason || pObj.cancelReason || "";
  const cancellationDate = pObj.cancellationDate || "";

  return {
    id,
    name,
    age,
    gender,
    genderFull,
    dob: dob ? String(dob) : null,
    phone: String(phone),
    email: String(email),
    roomSharing: String(roomSharing),
    foodPreference: String(foodPreference),
    aadhaar: String(aadhaar),
    aadhaarUrl: directIdProof || undefined,
    idProofUrl: directIdProof || undefined,
    documents,
    formattedAgeGender,
    emergencyContact: String(emergencyContact),
    medicalConditions: String(medicalConditions),
    sharingWith: String(sharingWith),
    tempoAllocation: String(tempoAllocation),
    seatNumber: String(seatNumber),
    pickupPoint: String(pickupPoint),
    trainDetails: String(trainDetails),
    activitySelection: String(activitySelection),
    remarks: String(remarks),
    internalNotes: String(internalNotes),
    isCancelled,
    status,
    cancellationReason: cancellationReason ? String(cancellationReason) : undefined,
    cancellationDate: cancellationDate ? String(cancellationDate) : undefined,
  };
}

/**
 * Normalizes all passengers for a booking into an array of NormalizedPassenger
 */
export function normalizeBookingPassengers(
  booking: any,
): NormalizedPassenger[] {
  if (!booking) return [normalizePassenger()];

  let personsList: any[] = [];
  if (booking.passengers) {
    if (Array.isArray(booking.passengers)) {
      personsList = booking.passengers;
    } else if (
      typeof booking.passengers === "object" &&
      Array.isArray(booking.passengers.persons)
    ) {
      personsList = booking.passengers.persons;
    } else if (typeof booking.passengers === "string") {
      try {
        const parsed = JSON.parse(booking.passengers);
        personsList = Array.isArray(parsed) ? parsed : parsed.persons || [];
      } catch (e) {}
    }
  }

  if (personsList.length === 0) {
    return [normalizePassenger(booking)];
  }

  return personsList.map((p, idx) => normalizePassenger(booking, p, idx));
}
