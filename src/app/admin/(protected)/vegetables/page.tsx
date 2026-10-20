"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";

type Vegetable = {
  id: string;
  nameTe: string;
  nameEn: string;
  price: string;
  unit: string;
  imageUrl: string | null;
  isAvailable: boolean;
};

const EMPTY_FORM = {
  nameTe: "",
  nameEn: "",
  price: "",
  unit: "kg",
  imageUrl: "",
  isAvailable: false,
};

export default function AdminVegetablesPage() {
  const [vegetables, setVegetables] = useState<
    Vegetable[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] =
    useState(false);

  const [updatingId, setUpdatingId] =
    useState<string | null>(null);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [error, setError] = useState("");

  const [showModal, setShowModal] =
    useState(false);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [nameTe, setNameTe] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("kg");
  const [imageUrl, setImageUrl] = useState("");
  const [isAvailable, setIsAvailable] =
    useState(false);

  async function loadVegetables() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/vegetables",
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to load vegetables."
        );
      }

      setVegetables(data.vegetables || []);
    } catch (error) {
      console.error(
        "ADMIN_VEGETABLES_ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load vegetables."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVegetables();
  }, []);

  function resetForm() {
    setNameTe(EMPTY_FORM.nameTe);
    setNameEn(EMPTY_FORM.nameEn);
    setPrice(EMPTY_FORM.price);
    setUnit(EMPTY_FORM.unit);
    setImageUrl(EMPTY_FORM.imageUrl);
    setIsAvailable(EMPTY_FORM.isAvailable);
    setEditingId(null);
  }

  function openAddModal() {
    resetForm();
    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving || uploadingImage) {
      return;
    }

    setShowModal(false);
    resetForm();
  }

  function startEditing(
    vegetable: Vegetable
  ) {
    setEditingId(vegetable.id);
    setNameTe(vegetable.nameTe);
    setNameEn(vegetable.nameEn);
    setPrice(vegetable.price);
    setUnit(vegetable.unit);
    setImageUrl(vegetable.imageUrl || "");
    setIsAvailable(vegetable.isAvailable);
    setError("");
    setShowModal(true);
  }

  async function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError("Please select a JPG, PNG, or WEBP image.");
      event.target.value = "";
      return;
    }

    if (file.size <= 0) {
      setError("The selected image is empty.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }

    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "/api/admin/vegetables/upload",
        {
          method: "POST",
          body: formData,
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (
        !response.ok ||
        !data?.success ||
        typeof data?.url !== "string" ||
        !data.url
      ) {
        throw new Error(
          data?.error || "Unable to upload image."
        );
      }

      setImageUrl(data.url);
    } catch (error) {
      console.error(
        "VEGETABLE_IMAGE_UPLOAD_ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to upload image."
      );
    } finally {
      setUploadingImage(false);
      event.target.value = "";
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (uploadingImage) {
      setError(
        "Please wait for the image upload to finish."
      );
      return;
    }

    if (!nameTe.trim()) {
      setError("Telugu name is required.");
      return;
    }

    if (!nameEn.trim()) {
      setError("English name is required.");
      return;
    }

    if (!price.trim()) {
      setError("Price is required.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        ...(editingId
          ? { id: editingId }
          : {}),
        nameTe: nameTe.trim(),
        nameEn: nameEn.trim(),
        price,
        unit: unit.trim() || "kg",
        imageUrl: imageUrl.trim() || null,
        isAvailable,
      };

      const response = await fetch(
        "/api/admin/vegetables",
        {
          method: editingId
            ? "PATCH"
            : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            (editingId
              ? "Unable to update vegetable."
              : "Unable to add vegetable.")
        );
      }

      if (editingId) {
        setVegetables((current) =>
          current
            .map((item) =>
              item.id === editingId
                ? data.vegetable
                : item
            )
            .sort((a, b) =>
              a.nameEn.localeCompare(
                b.nameEn
              )
            )
        );
      } else {
        setVegetables((current) =>
          [...current, data.vegetable].sort(
            (a, b) =>
              a.nameEn.localeCompare(
                b.nameEn
              )
          )
        );
      }

      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error(
        "VEGETABLE_SAVE_ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(
    vegetable: Vegetable
  ) {
    if (updatingId) {
      return;
    }

    setUpdatingId(vegetable.id);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/vegetables",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: vegetable.id,
            isAvailable:
              !vegetable.isAvailable,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to update availability."
        );
      }

      setVegetables((current) =>
        current.map((item) =>
          item.id === vegetable.id
            ? data.vegetable
            : item
        )
      );
    } catch (error) {
      console.error(
        "VEGETABLE_AVAILABILITY_ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to update availability."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteVegetable(
    vegetable: Vegetable
  ) {
    const confirmed = window.confirm(
      `Delete ${vegetable.nameEn} permanently?`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(vegetable.id);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/vegetables",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: vegetable.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to delete vegetable."
        );
      }

      setVegetables((current) =>
        current.filter(
          (item) =>
            item.id !== vegetable.id
        )
      );
    } catch (error) {
      console.error(
        "VEGETABLE_DELETE_ERROR:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete vegetable."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const availableCount =
    vegetables.filter(
      (vegetable) =>
        vegetable.isAvailable
    ).length;

  return (
    <main className="min-h-screen bg-[#FFF7E8] pb-[96px] text-[#24332D]">
      {/* =================================================
          HEADER
      ================================================= */}

      <header className="sticky top-0 z-40 border-b border-[#E5DED2] bg-[#FFF7E8]/96 backdrop-blur-xl">
        <div className="flex h-[68px] items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin"
              aria-label="Back to dashboard"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] border border-[#E5DED2] bg-white text-[#315C4C] shadow-[0_5px_18px_rgba(36,51,45,0.06)] active:scale-95"
            >
              <Icon name="back" size={20} />
            </Link>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B756F]">
                Catalog
              </p>

              <h1 className="text-[19px] font-bold tracking-tight text-[#24483B]">
                Vegetables
              </h1>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="flex h-10 items-center gap-1.5 rounded-[15px] bg-[#315C4C] px-3.5 text-[11px] font-bold text-white shadow-[0_7px_20px_rgba(49,92,76,0.18)] active:scale-95"
          >
            <span className="text-[18px] leading-none">
              +
            </span>

            <span>Add</span>
          </button>
        </div>
      </header>

      <div className="px-4">
        {/* =================================================
            OVERVIEW
        ================================================= */}

        <section className="pt-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B756F]">
                Catalog
              </p>

              <h2 className="mt-1 text-[20px] font-bold tracking-tight text-[#24483B]">
                Inventory
              </h2>
            </div>

            <span className="rounded-full bg-[#EEF5F0] px-3 py-1.5 text-[10px] font-bold text-[#315C4C]">
              {vegetables.length} items
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <StatCard
              label="Total"
              value={vegetables.length}
              caption="vegetables"
            />

            <StatCard
              label="Available"
              value={availableCount}
              caption="active for customers"
              active
            />
          </div>
        </section>

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mt-4 rounded-[21px] border border-[#E7CACA] bg-[#FFF3F3] px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#F3E8E8] text-[13px] font-bold text-[#9B5252]">
                !
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-bold text-[#9B5252]">
                  Something needs attention
                </p>

                <p className="mt-0.5 text-[10px] leading-4 text-[#9B5252]">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            INVENTORY
        ================================================= */}

        <section className="mt-6">
          <div className="mb-3 flex items-end justify-between px-1">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B756F]">
                Products
              </p>

              <h2 className="mt-1 text-[19px] font-bold tracking-tight text-[#24483B]">
                Your vegetables
              </h2>
            </div>

            <span className="text-[10px] font-semibold text-[#8A928D]">
              {availableCount} active
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-[158px] animate-pulse rounded-[27px] bg-white"
                />
              ))}
            </div>
          ) : vegetables.length === 0 ? (
            <EmptyVegetables
              onAdd={openAddModal}
            />
          ) : (
            <div className="space-y-3">
              {vegetables.map(
                (vegetable) => (
                  <VegetableCard
                    key={vegetable.id}
                    vegetable={vegetable}
                    updating={
                      updatingId ===
                      vegetable.id
                    }
                    deleting={
                      deletingId ===
                      vegetable.id
                    }
                    onToggle={() =>
                      toggleAvailability(
                        vegetable
                      )
                    }
                    onEdit={() =>
                      startEditing(
                        vegetable
                      )
                    }
                    onDelete={() =>
                      deleteVegetable(
                        vegetable
                      )
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        <div className="h-5" />
      </div>

      {/* =================================================
          ADMIN BOTTOM NAV

          EXACTLY:
          Orders / Payments / Customers / Vegetables
      ================================================= */}

      <AdminBottomNav />

      {/* =================================================
          ADD / EDIT MODAL
      ================================================= */}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#24332D]/45 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-[30px] bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-[30px] sm:p-6">
            {/* Modal header */}

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B756F]">
                  Catalog
                </p>

                <h2 className="mt-1 text-[20px] font-bold tracking-tight text-[#24483B]">
                  {editingId
                    ? "Edit Vegetable"
                    : "Add Vegetable"}
                </h2>

                <p className="mt-1 text-[11px] leading-5 text-[#6B756F]">
                  {editingId
                    ? "Update the details for this vegetable."
                    : "Add a new vegetable to your catalog."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={
                  saving ||
                  uploadingImage
                }
                aria-label="Close"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-[#F8F6F0] text-xl text-[#6B756F] disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-4"
            >
              <FormField
                label="Telugu Name"
                htmlFor="nameTe"
              >
                <input
                  id="nameTe"
                  value={nameTe}
                  onChange={(event) =>
                    setNameTe(
                      event.target.value
                    )
                  }
                  placeholder="టమాటా"
                  required
                  className="adminInput"
                />
              </FormField>

              <FormField
                label="English Name"
                htmlFor="nameEn"
              >
                <input
                  id="nameEn"
                  value={nameEn}
                  onChange={(event) =>
                    setNameEn(
                      event.target.value
                    )
                  }
                  placeholder="Tomato"
                  required
                  className="adminInput"
                />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField
                  label="Price"
                  htmlFor="price"
                >
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#6B756F]">
                      ₹
                    </span>

                    <input
                      id="price"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={price}
                      onChange={(event) =>
                        setPrice(
                          event.target.value
                        )
                      }
                      placeholder="40"
                      required
                      className="adminInput pl-9"
                    />
                  </div>
                </FormField>

                <FormField
                  label="Unit"
                  htmlFor="unit"
                >
                  <input
                    id="unit"
                    value={unit}
                    onChange={(event) =>
                      setUnit(
                        event.target.value
                      )
                    }
                    placeholder="kg"
                    required
                    className="adminInput"
                  />
                </FormField>
              </div>

              {/* Availability */}

              <div className="flex items-center justify-between rounded-[21px] bg-[#F8F6F0] px-4 py-3.5">
                <div className="pr-4">
                  <p className="text-[12px] font-bold text-[#24332D]">
                    Available for customers
                  </p>

                  <p className="mt-0.5 text-[10px] leading-4 text-[#6B756F]">
                    Show this vegetable in the customer catalog.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setIsAvailable(
                      (current) => !current
                    )
                  }
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                    isAvailable
                      ? "bg-[#315C4C]"
                      : "bg-[#D7D3CA]"
                  }`}
                  aria-label="Toggle availability"
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
                      isAvailable
                        ? "left-6"
                        : "left-1"
                    }`}
                  />
                </button>
              </div>

              {/* Image */}

              <div>
                <p className="text-[12px] font-semibold text-[#24332D]">
                  Vegetable Image
                </p>

                <div className="mt-2 overflow-hidden rounded-[23px] border border-dashed border-[#D9D2C5] bg-[#FBFAF6] p-3">
                  {imageUrl ? (
                    <div className="relative overflow-hidden rounded-[18px]">
                      <img
                        src={imageUrl}
                        alt="Vegetable preview"
                        className="h-44 w-full object-cover"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setImageUrl("")
                        }
                        disabled={
                          uploadingImage ||
                          saving
                        }
                        className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold text-[#9B5252] shadow-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex h-32 items-center justify-center rounded-[18px] bg-[#EEF5F0] text-[#6B756F]">
                      <div className="text-center">
                        <Icon
                          name="image"
                          size={28}
                        />

                        <p className="mt-2 text-[10px] font-medium">
                          No image selected
                        </p>
                      </div>
                    </div>
                  )}

                  <label
                    htmlFor="vegetableImage"
                    className={`mt-3 flex cursor-pointer items-center justify-center rounded-[17px] px-4 py-3 text-[11px] font-bold transition ${
                      uploadingImage
                        ? "cursor-not-allowed bg-[#F1EEE8] text-[#9A9F9B]"
                        : "bg-[#EEF5F0] text-[#315C4C]"
                    }`}
                  >
                    {uploadingImage
                      ? "Uploading image..."
                      : imageUrl
                      ? "Change Image"
                      : "Choose Image"}

                    <input
                      id="vegetableImage"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={
                        handleImageUpload
                      }
                      disabled={
                        uploadingImage ||
                        saving
                      }
                      className="hidden"
                    />
                  </label>

                  <p className="mt-2 text-center text-[10px] text-[#8A928D]">
                    JPG, PNG or WEBP · Maximum 5 MB
                  </p>
                </div>
              </div>

              {/* Buttons */}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={
                    saving ||
                    uploadingImage
                  }
                  className="flex-1 rounded-[18px] border border-[#E5DED2] bg-white py-3.5 text-[11px] font-bold text-[#6B756F] disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    uploadingImage ||
                    !nameTe.trim() ||
                    !nameEn.trim() ||
                    !price.trim()
                  }
                  className="flex-1 rounded-[18px] bg-[#315C4C] py-3.5 text-[11px] font-bold text-white shadow-[0_7px_20px_rgba(49,92,76,0.15)] disabled:bg-[#D5D7D4] disabled:shadow-none"
                >
                  {saving
                    ? editingId
                      ? "Saving..."
                      : "Adding..."
                    : editingId
                    ? "Save Changes"
                    : "Add Vegetable"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        .adminInput {
          width: 100%;
          height: 48px;
          border-radius: 17px;
          border: 1px solid #e5ded2;
          background: #fffdf8;
          padding: 0 15px;
          font-size: 12px;
          font-weight: 500;
          color: #24332d;
          outline: none;
        }

        .adminInput::placeholder {
          color: #a0a49f;
        }

        .adminInput:focus {
          border-color: #315c4c;
          box-shadow: 0 0 0 3px
            rgba(49, 92, 76, 0.08);
        }
      `}</style>
    </main>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  label,
  value,
  caption,
  active = false,
}: {
  label: string;
  value: number;
  caption: string;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-[22px] border p-4 shadow-[0_7px_22px_rgba(36,51,45,0.045)] ${
        active
          ? "border-[#D9E8DF] bg-[#EEF5F0]"
          : "border-[#E5DED2] bg-white"
      }`}
    >
      <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[#6B756F]">
        {label}
      </p>

      <p
        className={`mt-1.5 text-[24px] font-bold tracking-tight ${
          active
            ? "text-[#315C4C]"
            : "text-[#24483B]"
        }`}
      >
        {value}
      </p>

      <p className="mt-0.5 text-[9px] text-[#8A928D]">
        {caption}
      </p>
    </div>
  );
}

/* =========================================================
   VEGETABLE CARD
========================================================= */

function VegetableCard({
  vegetable,
  updating,
  deleting,
  onToggle,
  onEdit,
  onDelete,
}: {
  vegetable: Vegetable;
  updating: boolean;
  deleting: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-[27px] border border-[#E5DED2] bg-white p-4 shadow-[0_9px_30px_rgba(36,51,45,0.055)]">
      <div className="flex gap-3.5">
        {/* Image */}

        <div className="h-[82px] w-[82px] shrink-0 overflow-hidden rounded-[21px] bg-[#EEF5F0]">
          {vegetable.imageUrl ? (
            <img
              src={vegetable.imageUrl}
              alt={vegetable.nameEn}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-[#8A928D]">
              <Icon
                name="image"
                size={25}
              />
            </div>
          )}
        </div>

        {/* Details */}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold text-[#24332D]">
                {vegetable.nameTe}
              </p>

              <p className="mt-0.5 truncate text-[11px] text-[#6B756F]">
                {vegetable.nameEn}
              </p>
            </div>

            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold ${
                vegetable.isAvailable
                  ? "bg-[#D9E8DF] text-[#315C4C]"
                  : "bg-[#F1EEE8] text-[#777E79]"
              }`}
            >
              {vegetable.isAvailable
                ? "Available"
                : "Unavailable"}
            </span>
          </div>

          <p className="mt-3 text-[15px] font-bold text-[#315C4C]">
            ₹{vegetable.price}
            <span className="text-[10px] font-medium text-[#8A928D]">
              {" "}
              / {vegetable.unit}
            </span>
          </p>
        </div>
      </div>

      {/* Actions */}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onToggle}
          disabled={
            updating || deleting
          }
          className={`rounded-[15px] py-2.5 text-[10px] font-bold disabled:opacity-50 ${
            vegetable.isAvailable
              ? "bg-[#EEF5F0] text-[#315C4C]"
              : "bg-[#F1EEE8] text-[#6B756F]"
          }`}
        >
          {updating
            ? "Saving..."
            : vegetable.isAvailable
            ? "Disable"
            : "Enable"}
        </button>

        <button
          type="button"
          onClick={onEdit}
          disabled={
            updating || deleting
          }
          className="rounded-[15px] border border-[#E5DED2] bg-white py-2.5 text-[10px] font-bold text-[#315C4C] disabled:opacity-50"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={
            updating || deleting
          }
          className="rounded-[15px] border border-[#E7CACA] bg-white py-2.5 text-[10px] font-bold text-[#9B5252] disabled:opacity-50"
        >
          {deleting
            ? "Deleting..."
            : "Delete"}
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyVegetables({
  onAdd,
}: {
  onAdd: () => void;
}) {
  return (
    <div className="rounded-[27px] border border-[#E5DED2] bg-white p-8 text-center shadow-[0_9px_28px_rgba(36,51,45,0.05)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[19px] bg-[#EEF5F0] text-[#315C4C]">
        <Icon
          name="vegetables"
          size={25}
        />
      </div>

      <h3 className="mt-4 text-[14px] font-bold text-[#24332D]">
        No vegetables yet
      </h3>

      <p className="mx-auto mt-1 max-w-[260px] text-[10px] leading-5 text-[#6B756F]">
        Add your first vegetable to start building the catalog.
      </p>

      <button
        type="button"
        onClick={onAdd}
        className="mt-5 rounded-[16px] bg-[#315C4C] px-5 py-3 text-[11px] font-bold text-white"
      >
        Add Vegetable
      </button>
    </div>
  );
}

/* =========================================================
   FORM FIELD
========================================================= */

function FormField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-semibold text-[#24332D]"
      >
        {label}
      </label>

      <div className="mt-2">
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   ADMIN BOTTOM NAV
========================================================= */

function AdminBottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E5DED2] bg-white/97 shadow-[0_-8px_30px_rgba(36,51,45,0.08)] backdrop-blur-xl">
      <div className="mx-auto grid h-[76px] max-w-2xl grid-cols-4 px-1">
        <BottomNavItem
          href="/admin/orders"
          label="Orders"
          icon="orders"
        />

        <BottomNavItem
          href="/admin/payments"
          label="Payments"
          icon="payments"
        />

        <BottomNavItem
          href="/admin/customers"
          label="Customers"
          icon="customers"
        />

        <BottomNavItem
          href="/admin/vegetables"
          label="Vegetables"
          icon="vegetables"
          active
        />
      </div>
    </nav>
  );
}

/* =========================================================
   BOTTOM NAV ITEM
========================================================= */

function BottomNavItem({
  href,
  label,
  icon,
  active = false,
}: {
  href: string;
  label: string;
  icon:
    | "orders"
    | "payments"
    | "customers"
    | "vegetables";
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-h-[76px] flex-col items-center justify-center gap-1.5 text-[10px] font-bold transition active:bg-[#F8F6F0] ${
        active
          ? "text-[#315C4C]"
          : "text-[#8A928D]"
      }`}
    >
      <span
        className={`flex h-8 w-8 items-center justify-center rounded-[12px] ${
          active
            ? "bg-[#EEF5F0]"
            : ""
        }`}
      >
        <Icon
          name={icon}
          size={20}
        />
      </span>

      <span>{label}</span>
    </Link>
  );
}

/* =========================================================
   ICONS
========================================================= */

function Icon({
  name,
  size = 20,
}: {
  name:
    | "back"
    | "orders"
    | "payments"
    | "customers"
    | "vegetables"
    | "image";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "back") {
    return (
      <svg {...common}>
        <path d="m15 18-6-6 6-6" />
      </svg>
    );
  }

  if (name === "orders") {
    return (
      <svg {...common}>
        <path d="M6 4h12v16H6z" />
        <path d="M9 8h6M9 12h6M9 16h4" />
      </svg>
    );
  }

  if (name === "payments") {
    return (
      <svg {...common}>
        <rect
          x="3"
          y="6"
          width="18"
          height="12"
          rx="2"
        />
        <path d="M3 10h18M7 14h3" />
      </svg>
    );
  }

  if (name === "customers") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5 20c.6-3.5 2.9-5.5 7-5.5s6.4 2 7 5.5" />
      </svg>
    );
  }

  if (name === "vegetables") {
    return (
      <svg {...common}>
        <path d="M12 20c0-7 1-11 7-15" />
        <path d="M12 20c0-5-2-8-6-10" />
        <path d="M18 5c-4-1-7 1-7 5 4 1 7-1 7-5Z" />
        <path d="M6 10c4 0 6 2 6 6-4 0-6-2-6-6Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <rect
        x="3.5"
        y="3.5"
        width="17"
        height="17"
        rx="2.5"
      />
      <circle
        cx="9"
        cy="9"
        r="1.5"
      />
      <path d="m4 16 4-4 3 3 2-2 7 6" />
    </svg>
  );
}