"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";

type Vegetable = {
  id: string;
  nameTe: string;
  nameEn: string;
  price: string;
  unit: string;
  imageUrl: string | null;
  isAvailable: boolean;
};

export default function AdminVegetablesPage() {
  const [vegetables, setVegetables] = useState<Vegetable[]>([]);
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [error, setError] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [nameTe, setNameTe] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [price, setPrice] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  async function loadVegetables() {
    try {
      setError("");

      const response = await fetch("/api/admin/vegetables", {
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to load vegetables."
        );
      }

      setVegetables(data.vegetables || []);
    } catch (error) {
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
    setNameTe("");
    setNameEn("");
    setPrice("");
    setImageUrl("");
    setEditingId(null);
  }

  function openAddModal() {
    resetForm();
    setShowAddModal(true);
  }

  function closeModal() {
    if (saving || uploadingImage) return;

    setShowAddModal(false);
    resetForm();
  }

  function startEditing(vegetable: Vegetable) {
    setEditingId(vegetable.id);
    setNameTe(vegetable.nameTe);
    setNameEn(vegetable.nameEn);
    setPrice(vegetable.price);
    setImageUrl(vegetable.imageUrl || "");
    setShowAddModal(true);
  }

  async function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5 MB.");
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
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to upload image."
        );
      }

      setImageUrl(data.url);
    } catch (error) {
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

    setSaving(true);
    setError("");

    try {
      const url = editingId
        ? `/api/admin/vegetables/${editingId}`
        : "/api/admin/vegetables";

      const response = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nameTe,
          nameEn,
          price,
          imageUrl,
        }),
      });

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
              a.nameEn.localeCompare(b.nameEn)
            )
        );
      } else {
        setVegetables((current) =>
          [...current, data.vegetable].sort(
            (a, b) =>
              a.nameEn.localeCompare(b.nameEn)
          )
        );
      }

      setShowAddModal(false);
      resetForm();
    } catch (error) {
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
    if (updatingId) return;

    setUpdatingId(vegetable.id);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/vegetables/${vegetable.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isAvailable: !vegetable.isAvailable,
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

    if (!confirmed) return;

    setDeletingId(vegetable.id);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/vegetables/${vegetable.id}`,
        {
          method: "DELETE",
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
          (item) => item.id !== vegetable.id
        )
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete vegetable."
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <a
              href="/admin"
              className="text-sm font-medium text-green-600"
            >
              ← Back to dashboard
            </a>

            <h1 className="mt-3 text-3xl font-bold">
              Vegetables
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              Manage your catalog and daily availability.
            </p>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="rounded-2xl bg-green-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-green-700"
          >
            + Add Vegetable
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* Catalog */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              Catalog
            </h2>

            <span className="text-sm text-gray-500">
              {vegetables.length} vegetables
            </span>
          </div>

          {loading ? (
            <div className="mt-4 rounded-2xl border bg-white p-6 text-center text-sm text-gray-500">
              Loading vegetables...
            </div>
          ) : vegetables.length === 0 ? (
            <div className="mt-4 rounded-2xl border bg-white p-8 text-center">
              <p className="font-semibold">
                No vegetables added yet.
              </p>

              <button
                type="button"
                onClick={openAddModal}
                className="mt-4 rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white"
              >
                Add your first vegetable
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {vegetables.map((vegetable) => (
                <div
                  key={vegetable.id}
                  className="rounded-2xl border bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {/* Image */}
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                      {vegetable.imageUrl ? (
                        <img
                          src={vegetable.imageUrl}
                          alt={vegetable.nameEn}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-gray-400">
                          No image
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">
                        {vegetable.nameTe}
                      </p>

                      <p className="text-sm text-gray-500">
                        {vegetable.nameEn}
                      </p>

                      <p className="mt-1 text-sm font-semibold">
                        ₹{vegetable.price} /{" "}
                        {vegetable.unit}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          toggleAvailability(
                            vegetable
                          )
                        }
                        disabled={
                          updatingId === vegetable.id
                        }
                        className={`min-w-28 rounded-full px-4 py-2 text-xs font-bold transition disabled:opacity-50 ${
                          vegetable.isAvailable
                            ? "bg-green-100 text-green-700 hover:bg-green-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        {updatingId === vegetable.id
                          ? "Saving..."
                          : vegetable.isAvailable
                            ? "Available"
                            : "Unavailable"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          startEditing(vegetable)
                        }
                        className="rounded-xl border px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteVegetable(
                            vegetable
                          )
                        }
                        disabled={
                          deletingId === vegetable.id
                        }
                        className="rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === vegetable.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId
                    ? "Edit Vegetable"
                    : "Add Vegetable"}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {editingId
                    ? "Update vegetable details."
                    : "Add a new vegetable to your catalog."}
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={
                  saving || uploadingImage
                }
                className="rounded-full px-2 text-2xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-4"
            >
              {/* Telugu Name */}
              <div>
                <label
                  htmlFor="nameTe"
                  className="text-sm font-semibold"
                >
                  Telugu Name
                </label>

                <input
                  id="nameTe"
                  value={nameTe}
                  onChange={(event) =>
                    setNameTe(event.target.value)
                  }
                  placeholder="టమాటా"
                  required
                  className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none focus:border-green-600"
                />
              </div>

              {/* English Name */}
              <div>
                <label
                  htmlFor="nameEn"
                  className="text-sm font-semibold"
                >
                  English Name
                </label>

                <input
                  id="nameEn"
                  value={nameEn}
                  onChange={(event) =>
                    setNameEn(event.target.value)
                  }
                  placeholder="Tomato"
                  required
                  className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none focus:border-green-600"
                />
              </div>

              {/* Price */}
              <div>
                <label
                  htmlFor="price"
                  className="text-sm font-semibold"
                >
                  Price per kg
                </label>

                <input
                  id="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={price}
                  onChange={(event) =>
                    setPrice(event.target.value)
                  }
                  placeholder="40"
                  required
                  className="mt-2 w-full rounded-2xl border px-4 py-3 outline-none focus:border-green-600"
                />
              </div>

              {/* Image Upload */}
              <div>
                <label
                  htmlFor="vegetableImage"
                  className="text-sm font-semibold"
                >
                  Vegetable Image
                </label>

                <div className="mt-2 rounded-2xl border border-dashed border-gray-300 p-4">
                  {imageUrl && (
                    <div className="mb-4 overflow-hidden rounded-2xl bg-gray-100">
                      <img
                        src={imageUrl}
                        alt="Vegetable preview"
                        className="h-40 w-full object-cover"
                      />
                    </div>
                  )}

                  <label
                    htmlFor="vegetableImage"
                    className={`flex cursor-pointer items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition ${
                      uploadingImage
                        ? "cursor-not-allowed bg-gray-100 text-gray-400"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
                      accept="image/*"
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

                  <p className="mt-2 text-center text-xs text-gray-400">
                    JPG, PNG, WEBP • Maximum 5 MB
                  </p>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={
                    saving || uploadingImage
                  }
                  className="flex-1 rounded-2xl border py-3 font-semibold text-gray-700 disabled:opacity-50"
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
                    !price
                  }
                  className="flex-1 rounded-2xl bg-green-600 py-3 font-bold text-white disabled:bg-gray-300"
                >
                  {saving
                    ? editingId
                      ? "Saving..."
                      : "Adding..."
                    : uploadingImage
                      ? "Uploading..."
                      : editingId
                        ? "Save Changes"
                        : "Add Vegetable"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}