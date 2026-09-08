const API_BASE = "https://test-1-yhhs.onrender.com/api";

const DEMO_TRIPS = [
  {
    title: "Spiti Valley Road Trip",
    shortName: "SPT-1",
    slug: "spiti-valley-road-trip",
    location: "Himachal Pradesh",
    duration: "9D/8N",
    price: 21999,
    departureCity: "Delhi",
    category: "Roadtrip",
    heroImage: "https://images.unsplash.com/photo-1581793745862-99f579601e1b?w=1200&q=85",
    images: [
      "https://images.unsplash.com/photo-1581793745862-99f579601e1b?w=1200&q=85",
      "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=1200&q=85",
      "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=1200&q=85"
    ],
    status: "published",
    isActive: true,
    order: 1,
    description: "Explore the ancient monasteries of Kaza, camp beside Chandratal Lake, and traverse the world's highest motorable passes with a close-knit group.",
    availableDates: [
      { date: "2026-09-15", seats: 14 },
      { date: "2026-09-22", seats: 10 },
      { date: "2026-10-05", seats: 12 },
      { date: "2026-10-12", seats: 8 }
    ],
    highlights: [
      "Key Monastery & Dhankar Fort",
      "Chitkul - India's Last Inhabited Village",
      "Chandratal High Altitude Crescent Lake",
      "Fossil Village Langza & Highest Post Office in Hikkim"
    ],
    inclusions: [
      "Tempo Traveller / SUV Delhi to Delhi",
      "8 Nights Accommodation in Premium Homestays & Camps",
      "Nutritious Breakfast & Dinner daily",
      "Experienced Mountaineer Trip Captain",
      "Oxygen Cylinder & Comprehensive Medical Kit"
    ],
    exclusions: [
      "Lunch and personal cafe snacks",
      "Any adventure activity fees not listed",
      "GST as applicable"
    ]
  },
  {
    title: "Manali & Kasol Winter Trail",
    shortName: "MNL-1",
    slug: "manali-kasol-winter-trail",
    location: "Himachal Pradesh",
    duration: "6D/5N",
    price: 11499,
    departureCity: "Delhi",
    category: "Backpacking",
    heroImage: "https://images.unsplash.com/photo-1571536802807-30451e3955d8?w=1200&q=85",
    images: [
      "https://images.unsplash.com/photo-1571536802807-30451e3955d8?w=1200&q=85",
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1200&q=85"
    ],
    status: "published",
    isActive: true,
    order: 2,
    description: "Unwind along the crystal Parvati River in Kasol, hike to secluded waterfalls in Tosh, and experience fresh powder snow in Solang Valley.",
    availableDates: [
      { date: "2026-09-20", seats: 16 },
      { date: "2026-10-01", seats: 12 },
      { date: "2026-10-15", seats: 14 }
    ],
    highlights: [
      "Riverside Bonfire & Acoustic Jam in Kasol",
      "Solang Valley Snow Excursion & Skiing",
      "Café Hopping in Old Manali",
      "Scenic Tosh Valley Alpine Hike"
    ],
    inclusions: [
      "AC Volvo Bus Transfers Delhi ↔ Manali",
      "Cozy Boutique Hotel & Riverside Glamping",
      "Daily Breakfast & Dinner",
      "Verified Trrabb Trip Leader"
    ],
    exclusions: [
      "Personal gear rentals",
      "Extra meals and beverages"
    ]
  },
  {
    title: "Kedarkantha Snow Summit Trek",
    shortName: "KDK-1",
    slug: "kedarkantha-snow-summit-trek",
    location: "Uttarakhand",
    duration: "6D/5N",
    price: 9999,
    departureCity: "Dehradun",
    category: "Trek",
    heroImage: "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1200&q=85",
    images: [
      "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=1200&q=85",
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=85"
    ],
    status: "published",
    isActive: true,
    order: 3,
    description: "Conquer the legendary 12,500 ft Himalayan peak with unmatched 360-degree views of Swargarohini, Black Peak, and Bandarpoonch.",
    availableDates: [
      { date: "2026-10-10", seats: 15 },
      { date: "2026-10-24", seats: 12 },
      { date: "2026-11-07", seats: 16 }
    ],
    highlights: [
      "12,500 ft Summit Sunrise Push",
      "Juda Ka Talab Frozen High Altitude Lake",
      "360° Panorama of 13 Himalayan Peaks",
      "Warm Campsite Dinners under the Milky Way"
    ],
    inclusions: [
      "Dehradun to Sankri Return Transport",
      "High Altitude Alpine Tents & Warm Sleeping Bags",
      "Nutritious Vegetarian Mountain Meals",
      "Certified Mountaineering Guides & Forest Permits"
    ],
    exclusions: [
      "Renting personal trekking poles/jackets",
      "Travel to/from Dehradun"
    ]
  },
  {
    title: "Meghalaya Living Root Bridges",
    shortName: "MGH-1",
    slug: "meghalaya-living-root-bridges",
    location: "Meghalaya",
    duration: "7D/6N",
    price: 19500,
    departureCity: "Guwahati",
    category: "Expedition",
    heroImage: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1200&q=85",
    images: [
      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1200&q=85",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85"
    ],
    status: "published",
    isActive: true,
    order: 4,
    description: "Venture deep into the rainforests of Cherrapunji, boat on the crystal waters of Dawki, and trek to bio-engineered double-decker living root bridges.",
    availableDates: [
      { date: "2026-10-14", seats: 12 },
      { date: "2026-11-04", seats: 10 },
      { date: "2026-11-18", seats: 14 }
    ],
    highlights: [
      "Nongriat Double Decker Living Root Bridge Trek",
      "Dawki Umngot River Boat Ride",
      "Mawlynnong Cleanest Village in Asia",
      "Nohkalikai Falls & Mawsmai Limestone Caves"
    ],
    inclusions: [
      "Guwahati Airport Pick and Drop",
      "Cozy Eco-Lodges & Homestays",
      "Breakfast and Dinner throughout",
      "Entry Permits & Local Khasi Guides"
    ],
    exclusions: [
      "Airfare to Guwahati",
      "Personal adventure sports like zip lining"
    ]
  },
  {
    title: "Leh Ladakh High Passes Circuit",
    shortName: "LDK-1",
    slug: "leh-ladakh-high-passes-circuit",
    location: "Ladakh",
    duration: "8D/7N",
    price: 24999,
    departureCity: "Leh",
    category: "Roadtrip",
    heroImage: "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=1200&q=85",
    images: [
      "https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=1200&q=85",
      "https://images.unsplash.com/photo-1581793745862-99f579601e1b?w=1200&q=85"
    ],
    status: "published",
    isActive: true,
    order: 5,
    description: "The quintessential trans-Himalayan journey traversing Khardung La, the azure waters of Pangong Tso, and the sand dunes of Nubra Valley.",
    availableDates: [
      { date: "2026-09-18", seats: 10 },
      { date: "2026-09-28", seats: 8 },
      { date: "2026-10-08", seats: 12 }
    ],
    highlights: [
      "Khardung La Pass (17,982 ft)",
      "Pangong Tso Lakeside Luxury Camp Stay",
      "Hunder Sand Dunes & Bactrian Camel Safari",
      "Magnetic Hill & Hall of Fame"
    ],
    inclusions: [
      "Inner Line Permits & Environment Fees",
      "Deluxe Hotel in Leh + Camps in Nubra & Pangong",
      "All Breakfasts & Dinners",
      "Custom Mountain Vehicles with Oxygen Cylinders"
    ],
    exclusions: [
      "Flights to/from Leh Airport",
      "Camel rides and river rafting"
    ]
  },
  {
    title: "Kerala Backwaters & Munnar Trails",
    shortName: "KRL-1",
    slug: "kerala-backwaters-munnar-trails",
    location: "Kerala",
    duration: "6D/5N",
    price: 16999,
    departureCity: "Kochi",
    category: "Tour",
    heroImage: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200&q=85",
    images: [
      "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?w=1200&q=85",
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85"
    ],
    status: "published",
    isActive: true,
    order: 6,
    description: "Cruising palm-fringed canals in Alleppey, walking through misty tea gardens in Munnar, and relaxing atop the cliffs of Varkala Beach.",
    availableDates: [
      { date: "2026-10-02", seats: 14 },
      { date: "2026-10-20", seats: 16 },
      { date: "2026-11-10", seats: 12 }
    ],
    highlights: [
      "Alleppey Traditional Houseboat Cruise",
      "Munnar Tea Estate Trek & Spice Plantation Walk",
      "Varkala Beach & Sunset Cliff Crawl",
      "Authentic Kerala Sadhya Culinary Experience"
    ],
    inclusions: [
      "Dedicated AC Vehicle Kochi to Kochi",
      "Boutique Resorts + Houseboat Stay",
      "Breakfast & Dinner daily",
      "Local Experienced Tour Coordinator"
    ],
    exclusions: [
      "Travel to Kochi",
      "Personal ayurvedic treatments or spa"
    ]
  },
  {
    title: "Gokarna Beach Trek & Coastal Camping",
    shortName: "GKR-1",
    slug: "gokarna-beach-trek-coastal-camping",
    location: "Gokarna",
    duration: "4D/3N",
    price: 7999,
    departureCity: "Bangalore",
    category: "Trek",
    heroImage: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85",
    images: [
      "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200&q=85",
      "https://images.unsplash.com/photo-1510312305653-8ed496efae75?w=1200&q=85"
    ],
    status: "published",
    isActive: true,
    order: 7,
    description: "Hike across 5 golden beaches, camp under swaying coconut palms, jump into Vibhooti Waterfalls, and explore the historic Mirjan Fort.",
    availableDates: [
      { date: "2026-09-25", seats: 18 },
      { date: "2026-10-09", seats: 15 },
      { date: "2026-10-23", seats: 20 }
    ],
    highlights: [
      "5-Beach Cliff Trek (Kudle, Om, Half Moon, Paradise)",
      "Beachside Camping with Acoustic Bonfire",
      "Vibhooti Forest Waterfall Jump",
      "Mirjan Fort Architecture Tour"
    ],
    inclusions: [
      "Semi-Sleeper Non-AC Bus Bangalore to Gokarna Return",
      "Beachside Tents with Sleeping Mats",
      "Breakfast on all days",
      "Certified Trrabb Trek Leader"
    ],
    exclusions: [
      "Lunches and cafe dinners",
      "Water sports at Om Beach"
    ]
  }
];

const DEMO_REVIEWS = [
  {
    userName: "Aarav Sharma",
    userImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&q=80",
    tripName: "Spiti Valley Road Trip",
    tripType: "Joined Group Trip",
    rating: 5,
    comment: "The bonfire nights, riverfront camping, and café crawls in Spiti with Trrabb were out of this world. Super safe and great community vibe for solo travelers!",
    photos: [
      "https://images.unsplash.com/photo-1581793745862-99f579601e1b?w=600&q=80"
    ]
  },
  {
    userName: "Priya Nair",
    userImage: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&q=80",
    tripName: "Kedarkantha Snow Summit Trek",
    tripType: "Joined Group Trip",
    rating: 5,
    comment: "Summit push under a starlit Himalayan sky was the highlight of my year. Trrabb's trek leaders were supportive, experienced, and kept safety first.",
    photos: [
      "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?w=600&q=80"
    ]
  },
  {
    userName: "Rohan Mehta",
    userImage: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&q=80",
    tripName: "Meghalaya Living Root Bridges",
    tripType: "Joined Group Trip",
    rating: 5,
    comment: "Cliff jumping in Dawki, bamboo trails, and singing songs by the campfire. Met wonderful people who are now friends for life.",
    photos: [
      "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600&q=80"
    ]
  },
  {
    userName: "Zeel Patel",
    userImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80",
    tripName: "Manali & Kasol Winter Trail",
    tripType: "Joined Group Trip",
    rating: 5,
    comment: "Thank you Trrabb for crafting a trip that perfectly matched our pace and interests. Your attention to detail and trip captain support made all the difference!",
    photos: [
      "https://images.unsplash.com/photo-1571536802807-30451e3955d8?w=600&q=80"
    ]
  }
];

async function seed() {
  console.log("🚀 Authenticating with Render API...");
  const loginRes = await fetch(`${API_BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@trrabb.com", password: "Trrabb@2026" })
  });
  const loginJson = await loginRes.json();
  if (!loginJson.success || !loginJson.data?.token) {
    console.error("❌ Login failed:", loginJson);
    process.exit(1);
  }
  const token = loginJson.data.token;
  console.log("✅ Authenticated as Superadmin!");

  // 1. Update Footer Settings to clear address and phone
  console.log("📝 Updating Footer Settings in database...");
  const footerUpdateRes = await fetch(`${API_BASE}/settings/footer`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      brandName: "Trrabb",
      address: "",
      phone: "",
      email: "contact@trrabb.com",
      website: "trrabb.com",
      copyright: "All Rights Reserved.",
      showSocial: true,
      showAddress: false,
      showContact: false,
      showCopyright: true,
      columns: [
        {
          id: "col-explore",
          title: "Explore",
          visible: true,
          links: [
            { id: "l-ex-1", label: "All Trips", href: "/trips", visible: true },
            { id: "l-ex-2", label: "Destinations", href: "/trips", visible: true },
            { id: "l-ex-3", label: "Reviews", href: "/reviews", visible: true },
            { id: "l-ex-4", label: "Help & FAQs", href: "/questions", visible: true }
          ]
        },
        {
          id: "col-company",
          title: "Company",
          visible: true,
          links: [
            { id: "l-co-1", label: "About Us", href: "/about-us", visible: true },
            { id: "l-co-2", label: "Contact Us", href: "/contact", visible: true },
            { id: "l-co-3", label: "Terms & Conditions", href: "/terms-and-conditions", visible: true },
            { id: "l-co-4", label: "Privacy Policy", href: "/privacy-policy", visible: true }
          ]
        }
      ]
    })
  });
  const footerJson = await footerUpdateRes.json();
  console.log("✅ Footer settings updated:", footerJson.success);

  // 2. Create / Upsert Demo Trips
  console.log("🏔️ Seeding 7 Curated Demo Trips...");
  for (const trip of DEMO_TRIPS) {
    const tripRes = await fetch(`${API_BASE}/trips`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(trip)
    });
    const tripJson = await tripRes.json();
    if (tripJson.success) {
      console.log(`  ✓ Seeded trip: ${trip.title}`);
    } else {
      console.log(`  ⚠️ Trip creation result: ${trip.title}`, tripJson.message || tripJson);
    }
  }

  // 3. Create Demo Reviews
  console.log("⭐ Seeding Verified Demo Reviews...");
  for (const rev of DEMO_REVIEWS) {
    const revRes = await fetch(`${API_BASE}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(rev)
    });
    const revJson = await revRes.json();
    if (revJson.success || revJson.status === "success") {
      console.log(`  ✓ Seeded review from: ${rev.userName}`);
    } else {
      console.log(`  ⚠️ Review note: ${rev.userName}`, revJson.message || revJson);
    }
  }

  // 4. Update home page builder configuration
  console.log("🏠 Configuring home page sections...");
  const pageRes = await fetch(`${API_BASE}/page-builder/public/home`);
  const pageJson = await pageRes.json();
  console.log("Current home page sections count:", pageJson.data?.sections?.length || 0);

  console.log("🎉 All Demo Data Seeded Successfully!");
}

seed().catch(err => {
  console.error("Fatal seed error:", err);
  process.exit(1);
});
