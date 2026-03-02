import { supabase } from "./supabase-server";

const PLACEHOLDER_URL = "https://placehold.co/512x512/1a1a2e/e94560?text=Card";
const BUCKET_NAME = "card-images";

/**
 * Generate a card image using DALL-E 3.
 * Returns the temporary DALL-E URL, or null if generation fails.
 */
async function generateImageWithDallE(prompt: string): Promise<string | null> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) return null;

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      }),
    });

    if (!response.ok) {
      console.error("[image-service] DALL-E API error:", response.status, await response.text());
      return null;
    }

    const data = (await response.json()) as { data?: { url: string }[] };
    return data.data?.[0]?.url ?? null;
  } catch (error) {
    console.error("[image-service] DALL-E generation failed:", error);
    return null;
  }
}

/**
 * Download an image from a URL and upload it to Supabase Storage.
 * Returns the permanent public URL.
 */
async function uploadToStorage(imageUrl: string, cardId: string): Promise<string | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error("[image-service] Failed to download image:", response.status);
      return null;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const filePath = `${cardId}.png`;

    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, buffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (error) {
      console.error("[image-service] Storage upload failed:", error.message);
      return null;
    }

    const { data: publicUrlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("[image-service] Upload to storage failed:", error);
    return null;
  }
}

/**
 * Generate a card image with DALL-E 3 and store it in Supabase Storage.
 * Returns the permanent public URL, or a placeholder on failure.
 */
export async function generateAndStoreCardImage(
  prompt: string,
  cardId: string,
): Promise<string> {
  // Step 1: Generate with DALL-E 3
  const dalleUrl = await generateImageWithDallE(prompt);
  if (!dalleUrl) return PLACEHOLDER_URL;

  // Step 2: Upload to Supabase Storage
  const publicUrl = await uploadToStorage(dalleUrl, cardId);
  if (!publicUrl) return PLACEHOLDER_URL;

  return publicUrl;
}
