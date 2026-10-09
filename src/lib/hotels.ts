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
  phones: string[];
  email: string;
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
  phones: ["9076011515", "9076011414"],
  email: "hotelstatusresidency@gmail.com",
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
        { src: "/hotels/gallery/deluxe-1.jpg", alt: "Deluxe room with a gold runner and patterned wallpaper" },
        { src: "/hotels/gallery/deluxe-2.jpg", alt: "Deluxe room from the foot of the bed" },
        { src: "/hotels/gallery/deluxe-window.jpg", alt: "Deluxe room beside the window and desk" },
      ],
    },
    {
      id: "super-deluxe",
      name: "Super Deluxe",
      occupancy: 2,
      size: "24 m²",
      price: 3499,
      photos: [
        { src: "/hotels/gallery/super-1.jpg", alt: "Super Deluxe room with a feature wall and gold cushions" },
        { src: "/hotels/gallery/super-twin.jpg", alt: "Super Deluxe twin room with two beds" },
      ],
    },
    {
      id: "suite",
      name: "Suite",
      occupancy: 4,
      size: "32 m²",
      price: 4499,
      photos: [
        { src: "/hotels/gallery/suite-1.jpg", alt: "Suite with a large bed and a second bed beyond" },
        { src: "/hotels/gallery/suite-2.jpg", alt: "Suite with a sitting chair and television" },
        { src: "/hotels/gallery/suite-sitting.jpg", alt: "Suite sitting corner with a sofa" },
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

export type GalleryGroup = {
  id: string;
  title: string;
  photos: RoomPhoto[];
};

export const GALLERY: GalleryGroup[] = [
  {
    id: "deluxe",
    title: "Deluxe",
    photos: [
      { src: "/hotels/gallery/deluxe-1.jpg", alt: "Deluxe room with a gold runner and patterned wallpaper" },
      { src: "/hotels/gallery/deluxe-2.jpg", alt: "Deluxe room from the foot of the bed" },
      { src: "/hotels/gallery/deluxe-6.jpg", alt: "Deluxe room with lamps, curtains and a work desk" },
      { src: "/hotels/gallery/deluxe-window.jpg", alt: "Deluxe room beside the window" },
      { src: "/hotels/gallery/deluxe-4.jpg", alt: "Deluxe room with curtains and a wall-mounted television" },
      { src: "/hotels/gallery/deluxe-5.jpg", alt: "Deluxe room looking toward the curtains" },
      { src: "/hotels/gallery/deluxe-3.jpg", alt: "Deluxe room with a tufted headboard" },
      { src: "/hotels/gallery/deluxe-detail.jpg", alt: "Gold cushion and the runner on a deluxe bed" },
      { src: "/hotels/gallery/deluxe-tv.jpg", alt: "Television wall in a deluxe room" },
    ],
  },
  {
    id: "super-deluxe",
    title: "Super Deluxe",
    photos: [
      { src: "/hotels/gallery/super-1.jpg", alt: "Super Deluxe room with a feature wall" },
      { src: "/hotels/gallery/super-twin.jpg", alt: "Super Deluxe twin room with two beds" },
    ],
  },
  {
    id: "suite",
    title: "Suite",
    photos: [
      { src: "/hotels/gallery/suite-1.jpg", alt: "Suite with two beds" },
      { src: "/hotels/gallery/suite-2.jpg", alt: "Suite with a chair and television" },
      { src: "/hotels/gallery/suite-3.jpg", alt: "Larger suite with a second bed" },
      { src: "/hotels/gallery/suite-sitting.jpg", alt: "Sitting corner in the suite" },
    ],
  },
  {
    id: "hotel",
    title: "The hotel",
    photos: [
      { src: "/hotels/gallery/exterior.jpg", alt: "Hotel Status Residency from the front" },
      { src: "/hotels/gallery/reception.jpg", alt: "Reception desk" },
      { src: "/hotels/gallery/lounge.jpg", alt: "Lounge with a sofa" },
      { src: "/hotels/gallery/lift.jpg", alt: "Lift lobby" },
      { src: "/hotels/gallery/corridor-1.jpg", alt: "Corridor and staircase" },
      { src: "/hotels/gallery/corridor-2.jpg", alt: "Corridor toward the rooms" },
    ],
  },
  {
    id: "bathrooms",
    title: "Bathrooms",
    photos: [
      { src: "/hotels/gallery/bath-1.jpg", alt: "Bathroom with a shower and wash basin" },
      { src: "/hotels/gallery/bath-2.jpg", alt: "Bathroom with a vessel basin" },
      { src: "/hotels/gallery/bath-3.jpg", alt: "Bathroom with a bathtub" },
    ],
  },
];

export function galleryPhotos(): RoomPhoto[] {
  return GALLERY.flatMap((group) => group.photos);
}
