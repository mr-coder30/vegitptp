import { put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin-auth";
import { isSameOrigin } from "@/lib/csrf";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = {
  "image/jpeg": {
    extension: "jpg",
  },
  "image/png": {
    extension: "png",
  },
  "image/webp": {
    extension: "webp",
  },
} as const;

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

function isJpeg(bytes: Uint8Array) {
  return (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  );
}

function isPng(bytes: Uint8Array) {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

function isWebp(bytes: Uint8Array) {
  return (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

function detectImageType(
  bytes: Uint8Array
) {
  if (isJpeg(bytes)) {
    return "image/jpeg" as const;
  }

  if (isPng(bytes)) {
    return "image/png" as const;
  }

  if (isWebp(bytes)) {
    return "image/webp" as const;
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
      return jsonResponse(
        {
          success: false,
          error: "Invalid request origin.",
        },
        403
      );
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
     * Read multipart form data
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
            "The selected image is empty.",
        },
        400
      );
    }

    if (
      file.size > MAX_FILE_SIZE
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Image must be 5 MB or smaller.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Declared MIME type validation
     * ---------------------------------------------
     */

    const declaredType =
      file.type.toLowerCase();

    if (
      !Object.prototype.hasOwnProperty.call(
        ALLOWED_TYPES,
        declaredType
      )
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "Unsupported image format. Use JPG, PNG, or WEBP.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Read file bytes
     * ---------------------------------------------
     */

    const bytes =
      new Uint8Array(
        await file.arrayBuffer()
      );

    /*
     * ---------------------------------------------
     * Magic-byte validation
     * ---------------------------------------------
     */

    const detectedType =
      detectImageType(bytes);

    if (!detectedType) {
      return jsonResponse(
        {
          success: false,
          error:
            "The uploaded file is not a valid JPG, PNG, or WEBP image.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Ensure declared MIME matches actual file
     * ---------------------------------------------
     */

    if (
      detectedType !== declaredType
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "The image file type does not match its contents.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Generate server-controlled filename
     * ---------------------------------------------
     */

    const extension =
      ALLOWED_TYPES[
        detectedType
      ].extension;

    const filename =
      `vegetables/${crypto.randomUUID()}.${extension}`;

    /*
     * ---------------------------------------------
     * Upload to Vercel Blob
     * ---------------------------------------------
     */

    const blob = await put(
      filename,
      file,
      {
        access: "public",
        addRandomSuffix: false,
        contentType:
          detectedType,
      }
    );

    /*
     * ---------------------------------------------
     * Success
     * ---------------------------------------------
     */

    return jsonResponse({
      success: true,
      url: blob.url,
    });
  } catch (error) {
    console.error(
      "VEGETABLE_IMAGE_UPLOAD_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Unable to upload image.",
      },
      500
    );
  }
}