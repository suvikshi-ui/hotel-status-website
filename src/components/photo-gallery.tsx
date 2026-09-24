import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { RoomPhoto } from "@/lib/hotels";
import { cn } from "@/lib/utils";

export function PhotoGallery({ photos, featured }: { photos: RoomPhoto[]; featured?: number }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {photos.map((photo, index) => {
          const wide = index === (featured ?? 0);
          return (
            <button
              key={photo.src}
              type="button"
              onClick={() => setOpen(index)}
              className={cn(
                "group relative overflow-hidden rounded-lg bg-paper-2",
                wide ? "col-span-2 row-span-2 min-h-56 md:min-h-80" : "min-h-32 md:min-h-40",
              )}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                loading={index < 2 ? "eager" : "lazy"}
                className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            </button>
          );
        })}
      </div>
      <Lightbox photos={photos} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    </>
  );
}

export function Lightbox({
  photos,
  index,
  onClose,
  onIndex,
}: {
  photos: RoomPhoto[];
  index: number | null;
  onClose: () => void;
  onIndex: (next: number) => void;
}) {
  useEffect(() => {
    if (index === null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") onIndex((index! + 1) % photos.length);
      if (event.key === "ArrowLeft") onIndex((index! - 1 + photos.length) % photos.length);
    }
    window.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [index, photos.length, onClose, onIndex]);

  if (index === null) return null;
  const photo = photos[index];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/92 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={photo.alt}
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute top-4 right-4 flex size-11 items-center justify-center rounded-full text-cream"
        aria-label="Close photo"
        onClick={onClose}
      >
        <X className="size-6" />
      </button>
      {photos.length > 1 ? (
        <>
          <button
            type="button"
            className="absolute left-2 flex size-11 items-center justify-center rounded-full text-cream md:left-6"
            aria-label="Previous photo"
            onClick={(event) => {
              event.stopPropagation();
              onIndex((index - 1 + photos.length) % photos.length);
            }}
          >
            <ChevronLeft className="size-7" />
          </button>
          <button
            type="button"
            className="absolute right-2 flex size-11 items-center justify-center rounded-full text-cream md:right-6"
            aria-label="Next photo"
            onClick={(event) => {
              event.stopPropagation();
              onIndex((index + 1) % photos.length);
            }}
          >
            <ChevronRight className="size-7" />
          </button>
        </>
      ) : null}
      <img
        src={photo.src}
        alt={photo.alt}
        className="max-h-[86vh] max-w-full object-contain"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
