import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { isSameOrigin } from "@/lib/csrf";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type AllowedMimeType =
  keyof typeof ALLOWED_TYPES;

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function invalidOriginResponse() {
  return jsonResponse(
    {
      success: false,
      error: "Invalid request origin.",
    },
    403
  );
}

async function detectImageType(
  file: File
): Promise<AllowedMimeType | null> {
  const buffer =
    await file.arrayBuffer();

  const bytes =
    new Uint8Array(buffer);

  /*
   * JPEG: FF D8 FF
   */
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }

  /*
   * PNG:
   * 89 50 4E 47 0D 0A 1A 0A
   */
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  /*
   * WEBP:
   * RIFF....WEBP
   */
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export async function POST(
  request: Request
) {
  try {
    /*
     * ---------------------------------------------
     * CSRF / Origin protection
     * ---------------------------------------------
     */

    if (!isSameOrigin(request)) {
      return invalidOriginResponse();
    }

    /*
     * ---------------------------------------------
     * Admin authentication
     * ---------------------------------------------
     */

    const isAdmin =
      await requireAdmin();

    if (!isAdmin) {
      return jsonResponse(
        {
          success: false,
          error: "Unauthorized.",
        },
        401
      );
    }

    /*
     * ---------------------------------------------
     * Parse multipart form data
     * ---------------------------------------------
     */

    let formData: FormData;

    try {
      formData =
        await request.formData();
    } catch {
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid upload request.",
        },
        400
      );
    }

    const file =
      formData.get("file");

    if (!(file instanceof File)) {
      return jsonResponse(
        {
          success: false,
          error:
            "No image file provided.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * File size validation
     * ---------------------------------------------
     */

    if (file.size <= 0) {
      return jsonResponse(
        {
          success: false,
          error:
            "The uploaded image is empty.",
        },
        400
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return jsonResponse(
        {
          success: false,
          error:
            "Image must be smaller than 5 MB.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Detect actual image type
     * ---------------------------------------------
     *
     * Do not trust file.type alone.
     */

    const detectedType =
      await detectImageType(file);

    if (!detectedType) {
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid image file. Use JPG, PNG, or WEBP.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Verify browser-provided MIME type
     * ---------------------------------------------
     */

    if (
      file.type &&
      file.type !== detectedType
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "The uploaded image type is invalid.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Server-controlled storage path
     * ---------------------------------------------
     */

    const extension =
      ALLOWED_TYPES[
        detectedType
      ];

    const storagePath =
      `payment-accounts/${crypto.randomUUID()}.${extension}`;

    /*
     * ---------------------------------------------
     * Upload to Vercel Blob
     * ---------------------------------------------
     */

    const blob = await put(
      storagePath,
      file,
      {
        access: "public",
        contentType:
          detectedType,
        addRandomSuffix: false,
      }
    );

    /*
     * ---------------------------------------------
     * Success
     * ---------------------------------------------
     */

    return jsonResponse(
      {
        success: true,
        url: blob.url,
      },
      200
    );
  } catch (error) {
    console.error(
      "PAYMENT_ACCOUNT_IMAGE_UPLOAD_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Unable to upload QR image.",
      },
      500
    );
  }
}