export interface AboutTripCard {
  id: string;
  title: string;
  subtitle: string;
  icon: string; // e.g. "Users", "ShieldCheck", "UserCheck", "PhoneCall", "Compass", "Award", "Clock"
  iconColor?: string; // hex or tailwind class
  bgColor?: string;
  borderColor?: string;
  isVisible: boolean;
  order: number;
}

export interface AboutTripCmsData {
  title: string;
  description: string;
  cards: AboutTripCard[];
}

export interface VariantItineraryDay {
  day: number;
  title: string;
  description: string;
  meals?: string;
  hotel?: string;
  transport?: string;
  activities?: string[];
  images?: string[];
  notes?: string;
}

export interface LocationVariantV2 {
  id: string;
  name: string;
  duration?: string;
  price: number;
  originalPrice?: number;
  isDirectJoin?: boolean;
  travelOptions?: { name: string; priceDelta: number; isDefault?: boolean }[];
  roomOptions?: { name: string; priceDelta: number; isDefault?: boolean }[];
  itinerary?: VariantItineraryDay[];
  gallery?: string[];
  documents?: { name: string; url: string; type?: string }[];
  notes?: string;
}

export interface DepartureDateV2 {
  id?: string;
  date: string; // YYYY-MM-DD
  status:
    | "AVAILABLE"
    | "GUARANTEED"
    | "FEW_SEATS"
    | "SOLD_OUT"
    | "COMPLETED"
    | "CANCELLED";
  price?: number;
  offerPrice?: number;
  capacity?: number;
  bookedSeats?: number;
  guideName?: string;
  vehicleName?: string;
  hotelName?: string;
  notes?: string;
  isPublished?: boolean;
}
