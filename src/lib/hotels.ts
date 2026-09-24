export type AmenityId =
  | "wifi"
  | "parking"
  | "ac"
  | "tv"
  | "bathroom"
  | "hotWater"
  | "hairdryer"
  | "desk"
  | "wardrobe"
  | "safe"
  | "housekeeping"
  | "toiletries"
  | "tea"
  | "breakfast"
  | "reception"
  | "power"
  | "cctv"
  | "lift"
  | "laundry"
  | "luggage"
  | "doctor"
  | "cab"
  | "fire"
  | "nonsmoking"
  | "languages"
  | "wakeup";

export type RoomPhoto = {
  src: string;
  alt: string;
};

export type RoomType = {
  id: string;
  name: string;
  occupancy: number;
  size: string;
  price: number;
  photos: RoomPhoto[];
};

export type Hotel = {
  id: string;
  name: string;
  locality: string;
  city: string;
  pins: string[];
  address: string;
  stars: 3;
  tagline: string;
  description: string;
  price: number;
  inventory: number;
  amenities: AmenityId[];
  rooms: RoomType[];
  hero: RoomPhoto;
  slides: RoomPhoto[];
};

export const AMENITIES: Record<AmenityId, { label: string; group: "Room" | "Hotel" }> = {
  ac: { label: "Air conditioning", group: "Room" },
  tv: { label: "Flat-screen TV", group: "Room" },
  bathroom: { label: "Private bathroom", group: "Room" },
  hotWater: { label: "Hot water", group: "Room" },
  hairdryer: { label: "Hairdryer", group: "Room" },
  desk: { label: "Work desk", group: "Room" },
  wardrobe: { label: "Wardrobe", group: "Room" },
  safe: { label: "In-room safe", group: "Room" },
  toiletries: { label: "Toiletries", group: "Room" },
  tea: { label: "Tea and coffee in the room", group: "Room" },
  breakfast: { label: "Breakfast", group: "Room" },
  housekeeping: { label: "Daily housekeeping", group: "Room" },
  wifi: { label: "Wi-Fi", group: "Hotel" },
  parking: { label: "Free parking", group: "Hotel" },
  reception: { label: "24-hour front desk", group: "Hotel" },
  lift: { label: "Lift", group: "Hotel" },
  power: { label: "Power backup", group: "Hotel" },
  cctv: { label: "CCTV", group: "Hotel" },
  laundry: { label: "Laundry", group: "Hotel" },
  luggage: { label: "Luggage storage", group: "Hotel" },
  doctor: { label: "Doctor on call", group: "Hotel" },
  cab: { label: "Cab assistance", group: "Hotel" },
  fire: { label: "Fire safety", group: "Hotel" },
  nonsmoking: { label: "Non-smoking rooms", group: "Hotel" },
  languages: { label: "English and Hindi at reception", group: "Hotel" },
  wakeup: { label: "Wake-up call", group: "Hotel" },
};

export const HOTEL: Hotel = {
  id: "residency",
  name: "Hotel Status Residency",
  locality: "Mahape",
  city: "Navi Mumbai",
  pins: ["400701", "400710"],
  address:
    "Plot No. PAP-595 and 596, Mahape MIDC Road, TTC Industrial Area, near Mahape Bus Stop, Mahape, Navi Mumbai, Maharashtra 400701",
  stars: 3,
  tagline: "A residency in Mahape, Navi Mumbai.",
  description:
    "Hotel Status Residency stands in Mahape, beside the TTC Industrial Area. The LTIMindtree gate is about 500 to 600 metres on foot. Millennium Business Park is beside the hotel. Reliance Corporate Park in Rabale is a few minutes by auto. Ghansoli and Kopar Khairane stations are each about 3 km away. Navi Mumbai International Airport, in Ulwe, is about 20 km.",
  price: 2499,
  inventory: 18,
  amenities: [
    "ac",
    "tv",
    "bathroom",
    "hotWater",
    "hairdryer",
    "desk",
    "wardrobe",
    "safe",
    "toiletries",
    "tea",
    "breakfast",
    "housekeeping",
    "wifi",
    "parking",
    "reception",
    "lift",
    "power",
    "cctv",
    "laundry",
    "luggage",
    "doctor",
    "cab",
    "fire",
    "nonsmoking",
    "languages",
    "wakeup",
  ],
  hero: {
    src: "/hotels/hero-evening.jpg",
    alt: "Hotel Status Residency at evening, Mahape",
  },
  slides: [
    {
      src: "/hotels/hero-evening.jpg",
      alt: "Hotel Status Residency at evening, Mahape",
    },
  ],
  rooms: [
    {
      id: "deluxe",
      name: "Deluxe",
      occupancy: 2,
      size: "18 m²",
      price: 2499,
      photos: [
        { src: "/hotels/rooms/standard-1.jpg", alt: "Deluxe room with a queen bed, gold runner, and gold wallpaper" },
        { src: "/hotels/rooms/standard-2.jpg", alt: "Deluxe room headboard with gold cushions and bedside lamps" },
        { src: "/hotels/rooms/standard-bath.jpg", alt: "Deluxe room bathroom" },
      ],
    },
    {
      id: "super-deluxe",
      name: "Super Deluxe",
      occupancy: 2,
      size: "24 m²",
      price: 3499,
      photos: [
        { src: "/hotels/rooms/deluxe-1.jpg", alt: "Super Deluxe room with a queen bed and gold runner" },
        { src: "/hotels/rooms/deluxe-bath.jpg", alt: "Super Deluxe room bathroom" },
      ],
    },
    {
      id: "suite",
      name: "Suite",
      occupancy: 4,
      size: "32 m²",
      price: 4499,
      photos: [
        { src: "/hotels/rooms/family-1.jpg", alt: "Suite with a queen bed and an extra single bed" },
        { src: "/hotels/rooms/family-2.jpg", alt: "Suite looking across both beds to the television" },
      ],
    },
  ],
};

export const HOTELS: Hotel[] = [HOTEL];

export function getHotel(id: string): Hotel | undefined {
  if (id === HOTEL.id) return HOTEL;
  return undefined;
}

export function pinLabel(hotel: Hotel = HOTEL): string {
  return hotel.pins.join(" / ");
}

export function allPhotos(hotel: Hotel = HOTEL): RoomPhoto[] {
  return hotel.rooms.flatMap((room) => room.photos);
}

export function galleryPhotos(hotel: Hotel = HOTEL): RoomPhoto[] {
  const order = ["suite", "super-deluxe", "deluxe"] as const;
  return order.flatMap((id) => hotel.rooms.find((room) => room.id === id)?.photos ?? []);
}
