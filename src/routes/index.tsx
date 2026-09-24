import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bath,
  Car,
  Cctv,
  Coffee,
  Utensils,
  Droplets,
  Flame,
  Languages,
  Lock,
  Luggage,
  Phone,
  Shirt,
  Sparkles,
  Stethoscope,
  Tv,
  Wifi,
  Wind,
  Zap,
  Bell,
  ArrowUpDown,
  Clock,
} from "lucide-react";
import { useState } from "react";
import { Lightbox, PhotoGallery } from "@/components/photo-gallery";
import { PageShell } from "@/components/site-chrome";
import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/format";
import { AMENITIES, HOTEL, galleryPhotos, type AmenityId, type RoomType } from "@/lib/hotels";

const AMENITY_ICON: Record<AmenityId, typeof Wifi> = {
  wifi: Wifi,
  parking: Car,
  ac: Wind,
  tv: Tv,
  bathroom: Bath,
  hotWater: Droplets,
  hairdryer: Wind,
  desk: Phone,
  wardrobe: Shirt,
  safe: Lock,
  housekeeping: Sparkles,
  toiletries: Sparkles,
  tea: Coffee,
  breakfast: Utensils,
  reception: Clock,
  power: Zap,
  cctv: Cctv,
  lift: ArrowUpDown,
  laundry: Shirt,
  luggage: Luggage,
  doctor: Stethoscope,
  cab: Car,
  fire: Flame,
  nonsmoking: Flame,
  languages: Languages,
  wakeup: Bell,
};

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const roomItems = HOTEL.amenities.filter((id) => AMENITIES[id].group === "Room");
  const hotelItems = HOTEL.amenities.filter((id) => AMENITIES[id].group === "Hotel");

  return (
    <PageShell>
      <main>
        <section className="relative">
          <img src={HOTEL.hero.src} alt={HOTEL.hero.alt} className="block h-auto w-full" />
          <img
            src="/hotels/logo-mark.png"
            alt=""
            className="absolute top-2.5 left-3 size-16 object-contain sm:top-5 sm:left-6 sm:size-24"
          />
        </section>

        <section id="stay" className="mx-auto max-w-6xl px-4 pt-12 pb-14 sm:px-6">
          <p className="text-xs tracking-[0.22em] text-muted uppercase">Mahape, Navi Mumbai</p>
          <h1 className="mt-2 max-w-3xl font-display text-4xl font-semibold text-ink sm:text-6xl">
            Hotel Status Residency
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft">{HOTEL.description}</p>
          <Button asChild variant="ink" className="mt-8 rounded-none tracking-[0.16em] uppercase">
            <Link to="/contact">Book a stay</Link>
          </Button>
          <dl className="mt-12 grid gap-6 border-t border-ink/10 pt-8 sm:grid-cols-4">
            <div>
              <dt className="text-xs tracking-[0.18em] text-muted uppercase">Locality</dt>
              <dd className="mt-2 font-display text-2xl">{HOTEL.locality}</dd>
            </div>
            <div>
              <dt className="text-xs tracking-[0.18em] text-muted uppercase">Rooms</dt>
              <dd className="mt-2 font-display text-2xl">Three types</dd>
            </div>
            <div>
              <dt className="text-xs tracking-[0.18em] text-muted uppercase">Front desk</dt>
              <dd className="mt-2 font-display text-2xl">24 hours</dd>
            </div>
            <div>
              <dt className="text-xs tracking-[0.18em] text-muted uppercase">From</dt>
              <dd className="mt-2 font-display text-2xl tabular-nums">{formatInr(HOTEL.price)}</dd>
            </div>
          </dl>
        </section>

        <section id="rooms" className="mx-auto max-w-6xl px-4 pb-6 sm:px-6">
          <p className="text-xs tracking-[0.22em] text-gold uppercase">Rooms</p>
          <h2 className="mt-3 font-display text-4xl font-semibold">Three ways to stay</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {HOTEL.rooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        </section>

        <section id="amenities" className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <p className="text-xs tracking-[0.22em] text-gold uppercase">Amenities</p>
          <h2 className="mt-3 font-display text-4xl font-semibold">What the residency offers</h2>
          <AmenityGroup title="In the room" ids={roomItems} />
          <AmenityGroup title="In the hotel" ids={hotelItems} />
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <p className="text-xs tracking-[0.22em] text-gold uppercase">Location</p>
          <h2 className="mt-3 font-display text-4xl font-semibold">Mahape, on the MIDC road</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">{HOTEL.address}</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {["Mahape Bus Stop", "TTC Industrial Area", "Millennium Business Park", "Ghansoli and Rabale"].map(
              (place) => (
                <li key={place} className="border-t border-ink/10 pt-3 text-sm">
                  {place}
                </li>
              ),
            )}
          </ul>
        </section>

        <AroundSection />

        <section id="gallery" className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
          <p className="text-xs tracking-[0.22em] text-gold uppercase">Gallery</p>
          <h2 className="mt-3 font-display text-4xl font-semibold">The rooms, as they are</h2>
          <p className="mt-3 max-w-lg text-sm text-ink-soft">Tap a photograph to open it.</p>
          <div className="mt-8">
            <PhotoGallery photos={galleryPhotos()} />
          </div>
        </section>
      </main>
    </PageShell>
  );
}

const AROUND = [
  {
    id: "neighbourhood",
    label: "Neighbourhood",
    places: [
      {
        name: "LTIMindtree gate",
        note: "The LTM entry on Shil–Mahape Road is a walk from Hotel Status Residency. The gate is about 500 to 600 metres away. Guests going in for work do not need a cab for this one.",
        km: "500–600 m",
      },
      {
        name: "Millennium Business Park",
        note: "The office campus is beside the hotel, inside the TTC area. Capgemini, Accenture, TCS and Tech Mahindra are among the companies there. From the hotel it is a short walk or a two-minute auto, so the morning trip is simple.",
        km: "Beside the hotel",
      },
      {
        name: "Reliance Corporate Park, Rabale",
        note: "Reliance’s campus is on Thane–Belapur Road, on the Rabale side. From Hotel Status Residency it is a short auto ride, a few minutes, not a cross-city trip. Coming back to the hotel after work is the same easy ride.",
        km: "A few minutes",
      },
      {
        name: "Ghansoli station",
        note: "The nearer Harbour line link for the hotel. Ghansoli station is about 3 km from Hotel Status Residency. An auto or cab takes about 5 to 10 minutes. NMMT buses on Thane–Belapur Road also run toward the station.",
        km: "About 3 km",
      },
      {
        name: "Kopar Khairane station",
        note: "The other Harbour line station for the hotel, about 3 km the other way. An auto or cab from Hotel Status Residency takes about 6 to 10 minutes. Use this station when the train toward Vashi is the easier one.",
        km: "About 3 km",
      },
      {
        name: "Navi Mumbai International Airport",
        note: "The new airport is in Ulwe. The road from Mahape to Ulwe is about 20 km, around half an hour by cab, depending on traffic. Use the direction link for the route from Hotel Status Residency, and the cab link to book the ride.",
        km: "About 20 km",
      },
    ],
  },
  {
    id: "nature",
    label: "Nature",
    places: [
      {
        name: "Central Park, Ghansoli",
        note: "A public park in Ghansoli. It has lawn, trees and a walking path. This is the nearest proper green space.",
        km: "About 4 km",
      },
      {
        name: "Thane–Belapur Road",
        note: "The main road past the hotel. Trees stand along parts of it through Mahape, Ghansoli and Airoli.",
        km: "In front",
      },
    ],
  },
  {
    id: "temples",
    label: "Temples",
    places: [
      {
        name: "Shree Mookambika Temple",
        note: "The best-known temple on this side. It is on Ghansoli Station Road, Sector 2, Ghansoli.",
        km: "About 5 km",
      },
      {
        name: "Shri Siddhivinayak Temple",
        note: "A Ganesh temple in Sector 10, Airoli. Still inside the 7 km road distance.",
        km: "About 7 km",
      },
      {
        name: "Ganpati Temple, Kopar Khairane",
        note: "Ganpati mandir and the visarjan talao in Sector 19, Kopar Khairane. Busy during Ganeshotsav.",
        km: "About 3 km",
      },
      {
        name: "Chikneshwar Temple",
        note: "An older local temple in Sector 3, Kopar Khairane.",
        km: "About 3 km",
      },
    ],
  },
  {
    id: "malls",
    label: "Malls",
    places: [
      {
        name: "Aurum Square",
        note: "A mall at Aurum Q Parc, Ghansoli. Shops, a food court and events.",
        km: "About 4 km",
      },
      {
        name: "Inorbit Mall",
        note: "The large mall in Vashi, on Palm Beach Road. Shops, food and a cinema. It is farther than the 8 km circle.",
        km: "Vashi",
      },
    ],
  },
  {
    id: "hotels",
    label: "Hotels nearby",
    places: [
      {
        name: "Park Inn by Radisson",
        note: "This hotel was earlier Country Inn & Suites by Radisson. It is at Plot X-4/5-B, TTC Industrial Area, Mahape, on the Ghansoli side, about 2 km from here.",
        km: "About 2 km",
      },
      {
        name: "Ramada by Wyndham, Navi Mumbai",
        note: "A hotel at Rupa Solitaire, on the Mahape–Ghansoli stretch near Millennium Business Park.",
        km: "About 2 km",
      },
    ],
  },
  {
    id: "mumbai",
    label: "Mumbai Darshan",
    places: [
      {
        name: "Shree Siddhivinayak Temple",
        note: "This is the famous Ganesh temple in Prabhadevi, not the smaller Siddhivinayak in Airoli. The black stone idol is visited through the day, and Tuesday draws the longest queues. People come from across the city for a short darshan before work.\n\nThe temple sits on S.K. Bole Road. Shoes are left outside, and phones are restricted in the sanctum. It is a half-day outing from Mahape by train to Dadar and a taxi onward, or by road across the city.",
        km: "Mumbai",
      },
      {
        name: "Mahalakshmi Temple",
        note: "An old temple on the coast at Bhulabhai Desai Road, near the sea and the Haji Ali causeway. The shrine is for Mahalakshmi, with Mahakali and Mahasaraswati beside her. Navratri is the busiest week.\n\nThe visit is usually short. Most people combine it with a walk toward Haji Ali or a drive along the western shore. From Navi Mumbai it is a planned half day, not a stop on the way to the office.",
        km: "Mumbai",
      },
      {
        name: "Gateway of India",
        note: "The basalt arch at Apollo Bunder, Colaba, was finished in 1924 to mark the landing of King George V and Queen Mary. Boats to Elephanta leave from the steps in front of it. The Taj Mahal Palace hotel stands across the road.\n\nEvenings are crowded with photographers, ferry queues and street sellers. Go early if you want the arch without the crush. Colaba Causeway, a few minutes on foot, is the old shopping street beside it.",
        km: "Mumbai",
      },
      {
        name: "Marine Drive",
        note: "The curved seafront from Nariman Point to Malabar Hill. At night the street lights follow the bay, which is why it is called the Queen’s Necklace. The buildings behind the promenade are part of Mumbai’s Art Deco row.\n\nPeople come to walk, not to enter a monument. There is no ticket. Late afternoon and after sunset are the usual times. It pairs easily with the Gateway, since both are in south Mumbai.",
        km: "Mumbai",
      },
      {
        name: "Chhatrapati Shivaji Maharaj Terminus",
        note: "The main Central Railway terminus, still called VT by many people. Frederick William Stevens designed the Gothic building, and it opened in 1888. It is a UNESCO World Heritage site and a working station, so local trains run through it all day.\n\nYou can see the stone facade, the dome and the carved animals from the road without a ticket. Guided visits of the interior happen on a limited schedule. It sits in Fort, close to the museum and the old business district.",
        km: "Mumbai",
      },
      {
        name: "Haji Ali Dargah",
        note: "The dargah of Pir Haji Ali Shah Bukhari stands on an islet off Worli. A causeway joins it to the shore, and the sea covers that path at high tide, so the walk is only possible when the water is low.\n\nCheck the tide before you leave Mahape. The white dome is visible from the coastal road. Visitors cover their heads inside. Mahalakshmi Temple is a short ride away if you want both on the same outing.",
        km: "Mumbai",
      },
      {
        name: "Elephanta Caves",
        note: "Rock-cut Shiva caves on Gharapuri island, also called Elephanta, in the harbour. The main cave holds the large Trimurti. The site is UNESCO listed and is generally closed on Monday.\n\nFerries leave from the Gateway of India. The crossing takes about an hour, then a walk or the toy train up to the caves. Carry water. It is a full day from Mahape, not an evening plan.",
        km: "Mumbai",
      },
      {
        name: "Juhu Beach",
        note: "The city’s best-known public beach, in the western suburbs. The sand is for a walk and street food, not for a swim. Evenings bring chaat stalls, families and a long line of cars along the promenade.\n\nIt is closer to the airport than to south Mumbai. From Mahape the drive crosses Airoli or the eastern freeway and then the western suburbs, so allow the better part of a day if you also want Bandra.",
        km: "Mumbai",
      },
      {
        name: "Bandra Bandstand",
        note: "A seafront walk in Bandra West, with the Bandra–Worli Sea Link in view. Mount Mary Church is up the hill, and a short walk reaches Bandra Fort, a small Portuguese-era outpost on the point.\n\nSunset is the reason most people come. The promenade is free. Street food and the chapel make it an easy second stop if you are already on the western shore for Juhu or the Sea Link.",
        km: "Mumbai",
      },
      {
        name: "Sanjay Gandhi National Park",
        note: "A large forest inside the city at Borivali, with the Kanheri Caves cut into the basalt hill. The caves are old Buddhist monasteries, with halls, water cisterns and a stupa. The park also has a lion and tiger safari, which runs on its own ticket and timetable.\n\nThis is the green day out, not a temple round. Go in the morning. The park closes in the evening. From Mahape it is a long cross-city drive, so treat it as a separate day from south Mumbai.",
        km: "Mumbai",
      },
    ],
  },
] as const;

const GOOGLE_QUERY: Record<string, string> = {
  "LTIMindtree gate": "LTIMindtree SEZ Mahape Shil Mahape Road",
  "Millennium Business Park": "Millennium Business Park Mahape Navi Mumbai",
  "Reliance Corporate Park, Rabale": "Reliance Corporate Park Rabale Navi Mumbai",
  "Ghansoli station": "Ghansoli Railway Station",
  "Kopar Khairane station": "Kopar Khairane Railway Station",
  "Navi Mumbai International Airport": "Navi Mumbai International Airport Ulwe",
  "Central Park, Ghansoli": "Central Park Ghansoli Navi Mumbai",
  "Thane–Belapur Road": "Thane Belapur Road Mahape",
  "Shree Mookambika Temple": "Shree Mookambika Temple Ghansoli",
  "Shri Siddhivinayak Temple": "Siddhivinayak Temple Sector 10 Airoli",
  "Ganpati Temple, Kopar Khairane": "Ganpati Temple Sector 19 Kopar Khairane",
  "Chikneshwar Temple": "Chikneshwar Temple Kopar Khairane",
  "Aurum Square": "Aurum Square Mall Ghansoli",
  "Inorbit Mall": "Inorbit Mall Vashi",
  "Park Inn by Radisson": "Park Inn by Radisson Navi Mumbai Mahape",
  "Ramada by Wyndham, Navi Mumbai": "Ramada by Wyndham Navi Mumbai Rupa Solitaire",
  "Shree Siddhivinayak Temple": "Siddhivinayak Temple Prabhadevi Mumbai",
  "Mahalakshmi Temple": "Mahalakshmi Temple Mumbai",
  "Gateway of India": "Gateway of India Mumbai",
  "Marine Drive": "Marine Drive Mumbai",
  "Chhatrapati Shivaji Maharaj Terminus": "Chhatrapati Shivaji Maharaj Terminus Mumbai",
  "Haji Ali Dargah": "Haji Ali Dargah Mumbai",
  "Elephanta Caves": "Elephanta Caves Mumbai",
  "Juhu Beach": "Juhu Beach Mumbai",
  "Bandra Bandstand": "Bandstand Promenade Bandra Mumbai",
  "Sanjay Gandhi National Park": "Sanjay Gandhi National Park Borivali",
};

function googlePlaceUrl(name: string) {
  const query = GOOGLE_QUERY[name] ?? `${name} Navi Mumbai`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const HOTEL_ORIGIN = "Hotel Status Residency, Mahape, Navi Mumbai";
const HOTEL_PICKUP = {
  lat: 19.11331,
  lng: 73.02171,
  nickname: "Hotel Status Residency",
  address: "Mahape MIDC, near Mahape Bus Stop, Navi Mumbai 400701",
};

const UBER_POINT: Record<string, { lat: number; lng: number }> = {
  "Millennium Business Park": { lat: 19.10896, lng: 73.01953 },
  "Reliance Corporate Park, Rabale": { lat: 19.12717, lng: 73.01124 },
  "Ghansoli station": { lat: 19.11657, lng: 73.00505 },
  "Kopar Khairane station": { lat: 19.10312, lng: 73.01235 },
  "Navi Mumbai International Airport": { lat: 18.99135, lng: 73.06575 },
  "Central Park, Ghansoli": { lat: 19.11461, lng: 73.00463 },
  "Aurum Square": { lat: 19.12004, lng: 73.0098 },
  "Inorbit Mall": { lat: 19.06604, lng: 73.00126 },
  "Ramada by Wyndham, Navi Mumbai": { lat: 19.10896, lng: 73.01953 },
  "Shree Siddhivinayak Temple": { lat: 19.0169, lng: 72.83028 },
  "Mahalakshmi Temple": { lat: 18.9764, lng: 72.8101 },
  "Gateway of India": { lat: 18.92198, lng: 72.83465 },
  "Marine Drive": { lat: 18.943, lng: 72.8234 },
  "Chhatrapati Shivaji Maharaj Terminus": { lat: 18.93985, lng: 72.83546 },
  "Haji Ali Dargah": { lat: 18.98278, lng: 72.80897 },
  "Elephanta Caves": { lat: 18.96335, lng: 72.93149 },
  "Juhu Beach": { lat: 19.0989, lng: 72.8265 },
  "Bandra Bandstand": { lat: 19.0428, lng: 72.8196 },
  "Sanjay Gandhi National Park": { lat: 19.2304, lng: 72.8634 },
};

function directionsUrl(name: string) {
  const destination = GOOGLE_QUERY[name] ?? `${name} Navi Mumbai`;
  const mode = name === "LTIMindtree gate" ? "walking" : "driving";
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(HOTEL_ORIGIN)}&destination=${encodeURIComponent(destination)}&travelmode=${mode}`;
}

function olaQuery(name: string) {
  const destination = GOOGLE_QUERY[name] ?? `${name}, Navi Mumbai`;
  const point = UBER_POINT[name];
  const params = new URLSearchParams({
    lat: String(HOTEL_PICKUP.lat),
    lng: String(HOTEL_PICKUP.lng),
    pickup_name: "Hotel Status Residency",
    drop_name: name,
    drop_address: destination,
    landing_page: "bk",
    bk_act: "rn",
  });
  if (point) {
    params.set("drop_lat", String(point.lat));
    params.set("drop_lng", String(point.lng));
  }
  return params.toString();
}

function olaAppUrl(name: string) {
  return `olacabs://app/launch?${olaQuery(name)}`;
}

function olaAndroidUrl(name: string) {
  return `intent://app/launch?${olaQuery(name)}#Intent;scheme=olacabs;package=com.olacabs.customer;end`;
}

function olaWebUrl(name: string) {
  return `https://book.olacabs.com/?serviceType=p2p&${olaQuery(name)}`;
}

function openOla(name: string) {
  const mobile = typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!mobile) {
    window.open(olaWebUrl(name), "_blank", "noopener,noreferrer");
    return;
  }
  const android = /Android/i.test(navigator.userAgent);
  window.location.href = android ? olaAndroidUrl(name) : olaAppUrl(name);
}

function AroundSection() {
  const [tab, setTab] = useState<(typeof AROUND)[number]["id"]>("neighbourhood");
  const current = AROUND.find((item) => item.id === tab) ?? AROUND[0];

  return (
    <section id="around" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <p className="text-xs tracking-[0.22em] text-gold uppercase">Surroundings</p>
      <h2 className="mt-3 max-w-2xl font-display text-4xl font-semibold">From the hotel</h2>
      <p className="mt-4 max-w-2xl leading-relaxed text-ink-soft">
        Distances are from Hotel Status Residency. The LTM gate is a 500 to 600 metre walk. Reliance Corporate Park in Rabale is a few minutes by auto. Ghansoli and Kopar Khairane stations are each about 3 km. Navi Mumbai International Airport, in Ulwe, is about 20 km. Every place has a free direction link, plus Ola with the hotel already set as pickup.
      </p>
      <div className="mt-8 flex gap-2 overflow-x-auto border-b border-ink/10" role="tablist">
        {AROUND.map((item) => {
          const on = item.id === current.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={on}
              className={
                on
                  ? "h-11 shrink-0 border-b-2 border-ink px-4 text-xs tracking-[0.16em] text-ink uppercase"
                  : "h-11 shrink-0 border-b-2 border-transparent px-4 text-xs tracking-[0.16em] text-muted uppercase"
              }
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <ul className={current.id === "mumbai" ? "mt-6 grid gap-4" : "mt-6 grid gap-4 sm:grid-cols-2"}>
        {current.places.map((place) => (
          <li key={place.name} className="border border-ink/10 p-5">
            <p className="text-xs tracking-[0.16em] text-gold uppercase">{place.km}</p>
            <h3 className="mt-2 font-display text-2xl font-semibold">{place.name}</h3>
            <p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink-soft">{place.note}</p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
              <a
                href={googlePlaceUrl(place.name)}
                target="_blank"
                rel="noreferrer"
                className="text-xs tracking-[0.16em] uppercase underline decoration-ink/30 underline-offset-4"
              >
                Google
              </a>
              <a
                href={directionsUrl(place.name)}
                target="_blank"
                rel="noreferrer"
                className="text-xs tracking-[0.16em] uppercase underline decoration-ink/30 underline-offset-4"
              >
                From the hotel
              </a>
              <a
                href={olaWebUrl(place.name)}
                target="_blank"
                rel="noreferrer"
                onClick={(event) => {
                  const mobile =
                    typeof navigator !== "undefined" && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
                  if (!mobile) return;
                  event.preventDefault();
                  openOla(place.name);
                }}
                className="text-xs tracking-[0.16em] uppercase underline decoration-ink/30 underline-offset-4"
              >
                Ola
              </a>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function AmenityGroup({ title, ids }: { title: string; ids: AmenityId[] }) {
  return (
    <div className="mt-10">
      <h3 className="text-xs tracking-[0.18em] text-muted uppercase">{title}</h3>
      <ul className="mt-4 grid grid-cols-2 border-t border-ink/10 sm:grid-cols-3">
        {ids.map((id) => {
          const Icon = AMENITY_ICON[id];
          return (
            <li key={id} className="flex h-14 items-center gap-2 border-b border-ink/10 pr-3 text-sm">
              <Icon className="size-4 shrink-0" />
              {AMENITIES[id].label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RoomCard({ room }: { room: RoomType }) {
  const [open, setOpen] = useState<number | null>(null);
  const cover = room.photos[0];

  return (
    <article className="flex flex-col">
      <button type="button" className="relative aspect-[3/2] w-full overflow-hidden" onClick={() => setOpen(0)}>
        <img src={cover.src} alt={cover.alt} className="size-full object-cover" />
      </button>
      <div className="flex flex-1 flex-col border-b border-ink/10 py-5">
        <h3 className="font-display text-3xl font-semibold">{room.name}</h3>
        <p className="mt-1 text-sm text-muted">
          {room.size} · {room.occupancy} guests
        </p>
        <p className="mt-4 font-display text-2xl tabular-nums">{formatInr(room.price)}</p>
        <p className="text-xs tracking-[0.14em] text-muted uppercase">per night</p>
        <Button asChild variant="outline" className="mt-5 w-full rounded-none tracking-[0.14em] uppercase">
          <Link to="/contact">Contact the hotel</Link>
        </Button>
      </div>
      <Lightbox photos={room.photos} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    </article>
  );
}

