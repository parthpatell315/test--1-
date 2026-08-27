import React from "react";
import {
  Layout,
  Megaphone,
  Compass,
  ImageIcon,
  MessageSquare,
  BookOpen,
  Layers,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface FrontendSectionDefinition {
  id:
    | "hero"
    | "featured_trips"
    | "destinations"
    | "recent_photos"
    | "reviews"
    | "stories"
    | "footer"
    | string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultDraft: Record<string, any>;
}

export type SectionTypeDefinition = FrontendSectionDefinition;

export const FRONTEND_7_SECTIONS: FrontendSectionDefinition[] = [
  {
    id: "hero",
    name: "Hero Section",
    description:
      "Full-width hero banner with tagline, heading, background image & month filter bar.",
    icon: Layout,
    defaultDraft: {
      tagline: "• EXPLORE. CONNECT. BELONG.",
      headlinePrefix: "Trips for the",
      strikethroughWord: "Ordinary",
      rotatingWords: [
        "Curious",
        "Adventurous",
        "Wanderlust-Struck",
        "Colleagues",
        "Strangers",
        "Restless",
      ],
      subheadline:
        "Pick a month and explore group adventures that bring stories to life.",
      backgroundImage:
        "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=1800&q=85",
      months: [
        "All",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
        "Jan",
        "Feb",
        "Mar",
        "Apr",
      ],
    },
  },
  {
    id: "featured_trips",
    name: "Upcoming Group Trips",
    description:
      "Carousel or grid of trip cards with location badge, duration, price & View Trip CTA.",
    icon: Megaphone,
    defaultDraft: {
      title: "Upcoming Group Trips",
      carouselType: "carousel",
      columns: "3",
      cardStyle: "full",
      selectedTripIds: ["mka-1", "ladakh-1", "spiti-1", "kk-1"],
    },
  },
  {
    id: "destinations",
    name: "Popular Destinations",
    description:
      "Horizontal carousel of destination cards with portrait images & italic orange heading.",
    icon: Compass,
    defaultDraft: {
      titlePrimary: "Popular",
      titleAccent: "Destinations",
      selectedDestinations: [
        "Himachal Pradesh",
        "Uttarakhand",
        "Spiti Valley",
        "Ladakh",
        "Kerala",
      ],
    },
  },
  {
    id: "recent_photos",
    name: "Recent Photos From Our Trips",
    description:
      "Masonry or 6-column photo grid showcasing travel memories with lightbox support.",
    icon: ImageIcon,
    defaultDraft: {
      titlePrimary: "Recent Photos",
      titleAccent: "From Our Trips",
      showViewAllLink: true,
      layout: "grid",
      photos: [
        {
          id: "p1",
          src: "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=800&q=80",
          caption: "Snow Peak Camp",
        },
        {
          id: "p2",
          src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80",
          caption: "Valley Trail",
        },
        {
          id: "p3",
          src: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=800&q=80",
          caption: "Spiti Pass",
        },
        {
          id: "p4",
          src: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=80",
          caption: "Campfire Night",
        },
      ],
    },
  },
  {
    id: "reviews",
    name: "What Travelers Say",
    description:
      "Carousel of traveler reviews with avatars, trip links, 5-star rating & Read More.",
    icon: MessageSquare,
    defaultDraft: {
      title: "What Travelers Say",
      showViewAllLink: true,
      selectedReviewIds: ["gr1", "gr2", "gr3"],
    },
  },
  {
    id: "stories",
    name: "Stories From The Road",
    description:
      "Story card carousel with cover photo, bookmark icon, author avatar & read time.",
    icon: BookOpen,
    defaultDraft: {
      titlePrimary: "Stories",
      titleAccent: "From The Road",
      showViewAllLink: true,
      selectedStoryIds: ["st1", "st2", "st3", "st4"],
    },
  },
  {
    id: "footer",
    name: "Footer",
    description:
      "Dark navy footer with logo, address, 3 link columns, newsletter signup & social links.",
    icon: Layers,
    defaultDraft: {
      logoUrl: "/logo-white.png",
      address:
        "Money Plant High Street, A 738, Jagatpur Rd, Gota, Ahmedabad, Gujarat 382470",
      quickLinks: [
        { text: "All Trips", url: "/trips" },
        { text: "About Us", url: "/about-us" },
        { text: "Contact Us", url: "/contact" },
      ],
      usefulLinks: [
        { text: "Terms & Conditions", url: "/terms-and-conditions" },
        { text: "Cancellation Policy", url: "/cancellation-policy" },
        { text: "Privacy Policy", url: "/privacy-policy" },
      ],
      newsletterHeading: "STAY UPDATED",
      newsletterDescription:
        "Get travel stories, updates and exclusive offers...",
      socialLinks: {
        instagram: "https://instagram.com/youthcamping",
        facebook: "https://facebook.com/youthcamping",
        youtube: "https://youtube.com/youthcamping",
        whatsapp: "https://wa.me/919999999999",
      },
      copyright: "© 2026 YouthCamping. All Rights Reserved.",
    },
  },
];

export const CORE_SECTION_TYPES = FRONTEND_7_SECTIONS;

interface AddSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSectionType: (sectionType: FrontendSectionDefinition) => void;
}

export function AddSectionModal({
  isOpen,
  onClose,
  onSelectSectionType,
}: AddSectionModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xl">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-xl font-extrabold text-[#1A2332]">
            CHOOSE A SECTION TYPE
          </DialogTitle>
          <DialogDescription className="text-xs text-[#6b7280] font-medium">
            Select a live frontend component to add to your page layout.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 my-4 max-h-[420px] overflow-y-auto pr-1 no-scrollbar">
          {FRONTEND_7_SECTIONS.map((type) => {
            const Icon = type.icon;
            return (
              <button
                key={type.id}
                onClick={() => onSelectSectionType(type)}
                className="p-4 rounded-xl border border-[#e5e7eb] bg-white hover:bg-[#FF4D00]/5/30 hover:border-[#D97854] transition-all text-left group cursor-pointer flex items-start gap-3.5 space-y-0 shadow-xs"
              >
                <div className="w-10 h-10 rounded-xl bg-[#FF4D00]/5 border border-[#FF4D00]/20 text-[#D97854] group-hover:bg-[#D97854] group-hover:text-white transition-colors flex items-center justify-center shrink-0 shadow-2xs">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <h3 className="font-extrabold text-sm text-[#1A2332] group-hover:text-[#D97854] transition-colors">
                    {type.name}
                  </h3>
                  <p className="text-xs text-[#6b7280] font-medium leading-relaxed">
                    {type.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <DialogFooter className="pt-2 border-t border-[#e5e7eb] flex items-center justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-xs font-bold text-[#6b7280] hover:text-[#1A2332] cursor-pointer"
          >
            Never mind, go back
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
