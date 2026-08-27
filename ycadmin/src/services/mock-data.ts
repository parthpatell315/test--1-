import type { MediaItem } from "@/types";

/**
 * Development fixtures only used by MediaPage (mockMedia).
 *
 * Dead mock fixtures (mockTrips/mockBookings/mockInquiries/etc.) were
 * removed — they did not match the current API contracts and broke
 * production typechecking. Real data always comes from the backend API.
 */

export const mockMedia: MediaItem[] = [
  {
    id: "m1",
    url: "https://vl-prod-static.b-cdn.net/system/images/000/888/076/6f012c2f939c45fd491d86b3d33b0cbb/x540gt/IMG_3309.jpg",
    name: "manali-kasol-cover.jpg",
    size: 245000,
    type: "image/jpeg",
    createdAt: "2024-03-01",
  },
  {
    id: "m2",
    url: "https://vl-prod-static.b-cdn.net/system/images/000/862/062/b7cb9dc7ccc9fe863f0f009c4fe1746f/x540gt/Website_Itinerary_Ohotos__2_.png",
    name: "winter-spiti-cover.png",
    size: 312000,
    type: "image/png",
    createdAt: "2024-03-02",
  },
];