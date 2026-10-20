import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { isSameOrigin } from "@/lib/csrf";

const MAX_NAME_LENGTH = 100;
const MAX_URL_LENGTH = 500;
const MAX_ID_LENGTH = 100;
const MAX_SORT_ORDER = 1_000_000;

const BLOB_HOST_SUFFIX =
  ".public.blob.vercel-storage.com";

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

function serializeAccount(account: {
  id: string;
  name: string;
  qrImageUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: account.id,
    name: account.name,
    qrImageUrl: account.qrImageUrl,
    isActive: account.isActive,
    sortOrder: account.sortOrder,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };
}

function validateId(value: unknown) {
  if (typeof value !== "string") {
    return "Payment account id is required.";
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "Payment account id is required.";
  }

  if (trimmed.length > MAX_ID_LENGTH) {
    return "Invalid payment account id.";
  }

  return null;
}

function validateName(value: unknown) {
  if (typeof value !== "string") {
    return "QR account name is required.";
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return "QR account name is required.";
  }

  if (trimmed.length > MAX_NAME_LENGTH) {
    return `QR account name must be ${MAX_NAME_LENGTH} characters or less.`;
  }

  return null;
}

function validateQrImageUrl(
  value: unknown
) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  if (typeof value !== "string") {
    return "QR image URL must be a string.";
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.length > MAX_URL_LENGTH) {
    return `QR image URL must be ${MAX_URL_LENGTH} characters or less.`;
  }

  let url: URL;

  try {
    url = new URL(trimmed);
  } catch {
    return "QR image URL is invalid.";
  }

  /*
   * QR images are uploaded through Vercel Blob.
   * Only HTTPS URLs are accepted.
   */
  if (url.protocol !== "https:") {
    return "QR image URL must use HTTPS.";
  }

  /*
   * Only allow Vercel Blob URLs.
   *
   * This prevents arbitrary external URLs,
   * data URLs, javascript URLs, etc.
   */
  if (
    !url.hostname.endsWith(
      BLOB_HOST_SUFFIX
    )
  ) {
    return "QR image URL must come from the approved image storage.";
  }

  /*
   * Don't allow username/password
   * components.
   */
  if (url.username || url.password) {
    return "QR image URL is invalid.";
  }

  return null;
}

function parseSortOrder(value: unknown) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  const number =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isInteger(number) ||
    number < 0 ||
    number > MAX_SORT_ORDER
  ) {
    return null;
  }

  return number;
}

function unauthorizedResponse() {
  return jsonResponse(
    {
      success: false,
      error: "Unauthorized.",
    },
    401
  );
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

async function parseJsonBody(
  request: Request
) {
  try {
    const body = await request.json();

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return null;
    }

    return body as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}


async function createPaymentAccountWithSortOrder(data: {
  name: string;
  qrImageUrl: string | null;
  isActive: boolean;
}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const lastAccount = await tx.paymentAccount.findFirst({
            orderBy: { sortOrder: "desc" },
            select: { sortOrder: true },
          });

          const sortOrder = lastAccount
            ? Math.min(lastAccount.sortOrder + 10, MAX_SORT_ORDER)
            : 10;

          return tx.paymentAccount.create({
            data: {
              name: data.name,
              qrImageUrl: data.qrImageUrl,
              isActive: data.isActive,
              sortOrder,
            },
            select: {
              id: true,
              name: true,
              qrImageUrl: true,
              isActive: true,
              sortOrder: true,
              createdAt: true,
              updatedAt: true,
            },
          });
        },
        {
          isolationLevel: "Serializable",
        },
      );
    } catch (error) {
      const code =
        typeof error === "object" &&
        error !== null &&
        "code" in error
          ? (error as { code?: unknown }).code
          : undefined;

      if (code !== "P2034" || attempt === 2) {
        throw error;
      }
    }
  }

  throw new Error("Unable to create payment account.");
}

/**
 * GET
 *
 * Return all payment accounts for admin.
 */
export async function GET() {
  try {
    const authenticated =
      await requireAdmin();

    if (!authenticated) {
      return unauthorizedResponse();
    }

    const accounts =
      await prisma.paymentAccount.findMany({
        orderBy: [
          {
            sortOrder: "asc",
          },
          {
            createdAt: "asc",
          },
        ],

        select: {
          id: true,
          name: true,
          qrImageUrl: true,
          isActive: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        },
      });

    return jsonResponse(
      {
        success: true,
        accounts:
          accounts.map(
            serializeAccount
          ),
      },
      200
    );
  } catch (error) {
    console.error(
      "PAYMENT_ACCOUNTS_GET_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Unable to load payment accounts.",
      },
      500
    );
  }
}

/**
 * POST
 *
 * Create a new QR payment account.
 */
export async function POST(
  request: NextRequest
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
     * Admin authorization
     * ---------------------------------------------
     */

    const authenticated =
      await requireAdmin();

    if (!authenticated) {
      return unauthorizedResponse();
    }

    /*
     * ---------------------------------------------
     * Parse request body
     * ---------------------------------------------
     */

    const body =
      await parseJsonBody(request);

    if (!body) {
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid request body.",
        },
        400
      );
    }

    const {
      name,
      qrImageUrl,
      isActive = true,
    } = body;

    /*
     * ---------------------------------------------
     * Validate name
     * ---------------------------------------------
     */

    const nameError =
      validateName(name);

    if (nameError) {
      return jsonResponse(
        {
          success: false,
          error: nameError,
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Validate QR image
     * ---------------------------------------------
     */

    const qrImageUrlError =
      validateQrImageUrl(
        qrImageUrl
      );

    if (qrImageUrlError) {
      return jsonResponse(
        {
          success: false,
          error: qrImageUrlError,
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Validate active state
     * ---------------------------------------------
     */

    if (
      typeof isActive !== "boolean"
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "isActive must be a boolean.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Determine sort order
     * ---------------------------------------------
     */

    /**
     * ---------------------------------------------
     * Create account with safe sort order
     * ---------------------------------------------
     */

    const account =
      await createPaymentAccountWithSortOrder({
        name: (name as string).trim(),

        qrImageUrl:
          typeof qrImageUrl ===
            "string" &&
          qrImageUrl.trim()
            ? qrImageUrl.trim()
            : null,

        isActive,
      });

    return jsonResponse(
      {
        success: true,
        account:
          serializeAccount(
            account
          ),
      },
      201
    );
  } catch (error) {
    console.error(
      "PAYMENT_ACCOUNTS_POST_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Unable to create payment account.",
      },
      500
    );
  }
}

/**
 * PATCH
 *
 * Update an existing QR payment account.
 */
export async function PATCH(
  request: NextRequest
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
     * Admin authorization
     * ---------------------------------------------
     */

    const authenticated =
      await requireAdmin();

    if (!authenticated) {
      return unauthorizedResponse();
    }

    /*
     * ---------------------------------------------
     * Parse request body
     * ---------------------------------------------
     */

    const body =
      await parseJsonBody(request);

    if (!body) {
      return jsonResponse(
        {
          success: false,
          error:
            "Invalid request body.",
        },
        400
      );
    }

    const {
      id,
      name,
      qrImageUrl,
      isActive,
      sortOrder,
    } = body;

    /*
     * ---------------------------------------------
     * Validate ID
     * ---------------------------------------------
     */

    const idError =
      validateId(id);

    if (idError) {
      return jsonResponse(
        {
          success: false,
          error: idError,
        },
        400
      );
    }

    const accountId =
      (id as string).trim();

    /*
     * ---------------------------------------------
     * Confirm account exists
     * ---------------------------------------------
     */

    const existingAccount =
      await prisma.paymentAccount.findUnique(
        {
          where: {
            id: accountId,
          },

          select: {
            id: true,
            name: true,
            qrImageUrl: true,
            isActive: true,
            sortOrder: true,
          },
        }
      );

    if (!existingAccount) {
      return jsonResponse(
        {
          success: false,
          error:
            "Payment account not found.",
        },
        404
      );
    }

    /*
     * ---------------------------------------------
     * Explicit update allowlist
     * ---------------------------------------------
     */

    const data: {
      name?: string;
      qrImageUrl?: string | null;
      isActive?: boolean;
      sortOrder?: number;
    } = {};

    /*
     * ---------------------------------------------
     * Name
     * ---------------------------------------------
     */

    if (name !== undefined) {
      const nameError =
        validateName(name);

      if (nameError) {
        return jsonResponse(
          {
            success: false,
            error: nameError,
          },
          400
        );
      }

      data.name =
        (name as string).trim();
    }

    /*
     * ---------------------------------------------
     * QR image URL
     * ---------------------------------------------
     */

    if (
      qrImageUrl !== undefined
    ) {
      const qrImageUrlError =
        validateQrImageUrl(
          qrImageUrl
        );

      if (qrImageUrlError) {
        return jsonResponse(
          {
            success: false,
            error:
              qrImageUrlError,
          },
          400
        );
      }

      data.qrImageUrl =
        typeof qrImageUrl ===
          "string" &&
        qrImageUrl.trim()
          ? qrImageUrl.trim()
          : null;
    }

    /*
     * ---------------------------------------------
     * Active state
     * ---------------------------------------------
     */

    if (
      isActive !== undefined
    ) {
      if (
        typeof isActive !==
        "boolean"
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "isActive must be a boolean.",
          },
          400
        );
      }

      data.isActive =
        isActive;
    }

    /*
     * ---------------------------------------------
     * Sort order
     * ---------------------------------------------
     */

    if (
      sortOrder !== undefined
    ) {
      const parsedSortOrder =
        parseSortOrder(
          sortOrder
        );

      if (
        parsedSortOrder === null
      ) {
        return jsonResponse(
          {
            success: false,
            error:
              "sortOrder must be a non-negative integer within the allowed range.",
          },
          400
        );
      }

      if (
        parsedSortOrder !==
        undefined
      ) {
        data.sortOrder =
          parsedSortOrder;
      }
    }

    /*
     * ---------------------------------------------
     * Require an actual change
     * ---------------------------------------------
     */

    if (
      Object.keys(data).length ===
      0
    ) {
      return jsonResponse(
        {
          success: false,
          error:
            "No valid fields were provided for update.",
        },
        400
      );
    }

    /*
     * ---------------------------------------------
     * Update
     * ---------------------------------------------
     */

    const account =
      await prisma.paymentAccount.update({
        where: {
          id: accountId,
        },

        data,
      });

    return jsonResponse(
      {
        success: true,
        account:
          serializeAccount(
            account
          ),
      },
      200
    );
  } catch (error) {
    console.error(
      "PAYMENT_ACCOUNTS_PATCH_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Unable to update payment account.",
      },
      500
    );
  }
}

/**
 * DELETE
 *
 * Delete a QR payment account only if it has
 * never been used by an order.
 */
export async function DELETE(
  request: NextRequest
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
     * Admin authorization
     * ---------------------------------------------
     */

    const authenticated =
      await requireAdmin();

    if (!authenticated) {
      return unauthorizedResponse();
    }

    /*
     * ---------------------------------------------
     * Read account ID
     * ---------------------------------------------
     */

    const { searchParams } =
      new URL(request.url);

    const rawId =
      searchParams.get("id");

    const idError =
      validateId(rawId);

    if (idError) {
      return jsonResponse(
        {
          success: false,
          error: idError,
        },
        400
      );
    }

    const id =
      rawId!.trim();

    /*
     * ---------------------------------------------
     * Confirm account exists
     * ---------------------------------------------
     */

    const account =
      await prisma.paymentAccount.findUnique(
        {
          where: {
            id,
          },

          select: {
            id: true,
            name: true,
          },
        }
      );

    if (!account) {
      return jsonResponse(
        {
          success: false,
          error:
            "Payment account not found.",
        },
        404
      );
    }

    /*
     * ---------------------------------------------
     * Protect historical orders
     * ---------------------------------------------
     */

    const orderCount =
      await prisma.order.count({
        where: {
          paymentAccountId: id,
        },
      });

    if (orderCount > 0) {
      return jsonResponse(
        {
          success: false,
          error:
            "This QR account has historical orders and cannot be deleted. Disable it instead.",
        },
        409
      );
    }

    /*
     * ---------------------------------------------
     * Delete
     * ---------------------------------------------
     */

    await prisma.paymentAccount.delete({
      where: {
        id,
      },
    });

    return jsonResponse(
      {
        success: true,
        message:
          "Payment account deleted successfully.",
      },
      200
    );
  } catch (error) {
    console.error(
      "PAYMENT_ACCOUNTS_DELETE_ERROR:",
      error
    );

    return jsonResponse(
      {
        success: false,
        error:
          "Unable to delete payment account.",
      },
      500
    );
  }
}