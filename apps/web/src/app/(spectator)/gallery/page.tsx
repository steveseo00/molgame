import { api } from "@/lib/api-client";
import { GalleryClient } from "./GalleryClient";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  let initialCards: any[] = [];
  let total = 0;

  try {
    const result = await api.getCardGallery();
    initialCards = result.cards;
    total = result.total;
  } catch {
    // API not connected
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Card Gallery</h1>
      <GalleryClient initialCards={initialCards} total={total} />
    </div>
  );
}
