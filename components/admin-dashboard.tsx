"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { QRCodeSVG } from "qrcode.react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import type { AdminDashboardData, HairOption, SurveySettings } from "@/lib/types";

const PASTEL_COLORS = [
  "#FADADD",
  "#FEE1C7",
  "#FFE8A3",
  "#FFF6B7",
  "#E5F7C8",
  "#CFF4D2",
  "#CDEEE6",
  "#CDE7FF",
  "#D8D4FF",
  "#EAD6FF",
  "#F8D9FF",
  "#FFD8E8",
  "#F6E2D3",
  "#E9DFC8",
  "#E2F0CB",
  "#D3F2E3",
  "#D7F0F8",
  "#D7E6FF",
  "#E5E0FF",
  "#F2E4FF",
];

type EditableOption = Pick<HairOption, "id" | "name" | "imageUrl" | "sortOrder">;
type AdminTab = "survey" | "results" | "qr";
type OptionModalMode = "create" | "edit";
type OptionDraft = { name: string; imageUrl: string };
type OptionModalState = {
  isOpen: boolean;
  mode: OptionModalMode;
  option: EditableOption | null;
};
type SettingsForm = Pick<
  SurveySettings,
  "surveyTitle" | "questionTitle" | "minSelect" | "maxSelect" | "isOpen"
>;

const MAX_IMAGE_SIZE = 4 * 1024 * 1024;

function getRandomPaletteOrder() {
  const shuffled = [...PASTEL_COLORS];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function normalizeOptions(options: HairOption[]) {
  return options.map((item, index) => ({ ...item, sortOrder: index }));
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Không thể đọc ảnh đã chọn."));
    reader.readAsDataURL(file);
  });
}

function SortableOptionCard({
  option,
  onEdit,
  onDelete,
}: {
  option: EditableOption;
  onEdit: (option: EditableOption) => void;
  onDelete: (id: number) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: option.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className={clsx(
        "cursor-grab rounded-2xl border border-mid-blue/15 bg-white p-4 shadow-sm active:cursor-grabbing",
        isDragging && "opacity-70"
      )}
    >
      <div className="flex items-start gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={option.imageUrl}
          alt={option.name}
          className="h-20 w-20 rounded-xl object-cover"
          onError={(event) => {
            event.currentTarget.src = "/images/tlu.webp";
          }}
        />

        <div className="flex-1 space-y-2">
          <p className="font-medium text-indigo">{option.name}</p>
          <p className="text-xs text-mid-blue/70">Sắp xếp: #{option.sortOrder + 1}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onEdit(option)}
              className="rounded-lg bg-mid-blue px-3 py-2 text-sm font-medium text-cultured"
            >
              Chỉnh sửa
            </button>
            <button
              type="button"
              onClick={() => onDelete(option.id)}
              className="rounded-lg border border-scarlet/40 px-3 py-2 text-sm font-medium text-scarlet"
            >
              Xóa
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function OptionModal({
  state,
  submitting,
  onClose,
  onSubmit,
}: {
  state: OptionModalState;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (draft: OptionDraft) => Promise<void>;
}) {
  const [name, setName] = useState(() => state.option?.name ?? "");
  const [imageUrl, setImageUrl] = useState(() => state.option?.imageUrl ?? "");
  const [localError, setLocalError] = useState<string | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const image = acceptedFiles[0];
    if (!image) return;

    try {
      const base64 = await fileToDataUrl(image);
      setImageUrl(base64);
      setLocalError(null);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "Không thể xử lý ảnh.");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    maxSize: MAX_IMAGE_SIZE,
    accept: {
      "image/png": [],
      "image/jpeg": [],
      "image/webp": [],
      "image/gif": [],
    },
    onDropRejected: () => {
      setLocalError("Ảnh không hợp lệ. Vui lòng dùng PNG/JPG/WEBP/GIF và dung lượng < 4MB.");
    },
  });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!name.trim()) {
      setLocalError("Vui lòng nhập tên kiểu tóc.");
      return;
    }

    if (!imageUrl.trim()) {
      setLocalError("Vui lòng tải ảnh kiểu tóc.");
      return;
    }

    setLocalError(null);
    await onSubmit({ name: name.trim(), imageUrl: imageUrl.trim() });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-xl font-bold text-indigo">
            {state.mode === "create" ? "Thêm kiểu tóc" : "Chỉnh sửa kiểu tóc"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-mid-blue/20 px-3 py-1.5 text-sm font-medium text-mid-blue"
          >
            Đóng
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-sm text-mid-blue">
            Tên kiểu tóc
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-mid-blue/20 px-3 py-2 outline-none focus:border-light-blue"
            />
          </label>

          <div>
            <p className="text-sm text-mid-blue">Hình ảnh kiểu tóc</p>
            <div
              {...getRootProps()}
              className={clsx(
                "mt-1 cursor-pointer rounded-2xl border border-dashed px-4 py-8 text-center transition",
                isDragActive
                  ? "border-light-blue bg-light-blue/10"
                  : "border-mid-blue/30 bg-cultured/60 hover:border-mid-blue/50"
              )}
            >
              <input {...getInputProps()} />
              <p className="text-sm text-mid-blue">
                {isDragActive
                  ? "Thả ảnh vào đây..."
                  : "Kéo thả ảnh hoặc bấm để chọn ảnh (PNG/JPG/WEBP/GIF, tối đa 4MB)"}
              </p>
            </div>
          </div>

          {imageUrl ? (
            <div className="overflow-hidden rounded-2xl border border-mid-blue/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={name || "Preview"}
                className="h-48 w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src = "/images/tlu.webp";
                }}
              />
            </div>
          ) : null}

          {localError ? (
            <p className="rounded-xl bg-scarlet/10 px-3 py-2 text-sm text-scarlet">{localError}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-mid-blue/20 px-4 py-2 text-sm font-semibold text-mid-blue"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-indigo px-4 py-2 text-sm font-semibold text-cultured disabled:opacity-60"
            >
              {submitting ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminDashboard({ tab }: { tab: AdminTab }) {
  const router = useRouter();
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingOption, setSavingOption] = useState(false);
  const [optionModal, setOptionModal] = useState<OptionModalState>({
    isOpen: false,
    mode: "create",
    option: null,
  });

  const [settingsForm, setSettingsForm] = useState<SettingsForm>({
    surveyTitle: "",
    questionTitle: "",
    minSelect: 1,
    maxSelect: 1,
    isOpen: true,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const optionMap = useMemo(() => {
    const map = new Map<number, HairOption>();
    data?.options.forEach((option) => map.set(option.id, option));
    return map;
  }, [data?.options]);

  const chartData = useMemo(() => {
    const optionStats = data?.optionStats ?? [];
    const randomizedColors = getRandomPaletteOrder();

    return optionStats.map((item, index) => ({
      optionId: item.optionId,
      name: item.optionName,
      votes: item.votes,
      ratio: item.ratio,
      color: randomizedColors[index] ?? `hsl(${(index * 37) % 360} 70% 84%)`,
    }));
  }, [data?.optionStats]);

  const surveyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/`
      : "https://your-domain.com";

  const loadDashboard = useCallback(async () => {
    setError(null);

    try {
      const response = await fetch("/api/admin/dashboard", { cache: "no-store" });

      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }

      if (!response.ok) {
        throw new Error("Không thể tải dashboard");
      }

      const payload = (await response.json()) as AdminDashboardData;
      setData(payload);
      setSettingsForm({
        surveyTitle: payload.settings.surveyTitle,
        questionTitle: payload.settings.questionTitle,
        minSelect: payload.settings.minSelect,
        maxSelect: payload.settings.maxSelect,
        isOpen: payload.settings.isOpen,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
    }
  }, [router]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  async function persistSettings(nextSettings: SettingsForm) {
    const response = await fetch("/api/admin/survey", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextSettings),
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "Không thể lưu cài đặt");
    }
  }

  async function saveSettings(event: FormEvent) {
    event.preventDefault();
    setSavingSettings(true);
    setError(null);

    try {
      await persistSettings(settingsForm);
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể lưu cài đặt");
    } finally {
      setSavingSettings(false);
    }
  }

  async function saveOptionDraft(draft: OptionDraft) {
    if (!data) return;

    setSavingOption(true);
    setError(null);
    const previousOptions = data.options;

    const optimisticOptions =
      optionModal.mode === "create"
        ? [
            ...previousOptions,
            {
              id: -Date.now(),
              name: draft.name,
              imageUrl: draft.imageUrl,
              sortOrder: previousOptions.length,
              createdAt: new Date().toISOString(),
            },
          ]
        : previousOptions.map((item) =>
            item.id === optionModal.option?.id
              ? { ...item, name: draft.name, imageUrl: draft.imageUrl }
              : item
          );
    setData((prev) => (prev ? { ...prev, options: normalizeOptions(optimisticOptions) } : prev));

    try {
      const endpoint =
        optionModal.mode === "create"
          ? "/api/admin/options"
          : `/api/admin/options/${optionModal.option?.id}`;
      const method = optionModal.mode === "create" ? "POST" : "PATCH";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? "Không thể lưu lựa chọn");
      }

      const payload = (await response.json()) as HairOption;
      const updatedOption: HairOption = {
        id: payload.id,
        name: payload.name,
        imageUrl: payload.imageUrl,
        sortOrder: payload.sortOrder,
        createdAt: payload.createdAt,
      };

      if (optionModal.mode === "create") {
        setData((prev) =>
          prev
            ? {
                ...prev,
                options: normalizeOptions([
                  ...previousOptions,
                  { ...updatedOption, sortOrder: previousOptions.length },
                ]),
              }
            : prev
        );
      } else {
        setData((prev) =>
          prev
            ? {
                ...prev,
                options: normalizeOptions(
                  prev.options.map((item) => (item.id === updatedOption.id ? { ...item, ...updatedOption } : item))
                ),
              }
            : prev
        );
      }

      setOptionModal({ isOpen: false, mode: "create", option: null });
    } catch (err) {
      setData((prev) => (prev ? { ...prev, options: previousOptions } : prev));
      setError(err instanceof Error ? err.message : "Không thể lưu lựa chọn");
    } finally {
      setSavingOption(false);
    }
  }

  async function removeOption(id: number) {
    if (!window.confirm("Bạn chắc chắn muốn xóa lựa chọn này?")) return;
    if (!data) return;

    const previousOptions = data.options;
    const nextOptions = normalizeOptions(previousOptions.filter((item) => item.id !== id));
    setData((prev) => (prev ? { ...prev, options: nextOptions } : prev));

    try {
      const response = await fetch(`/api/admin/options/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Không thể xóa lựa chọn");
    } catch (err) {
      setData((prev) => (prev ? { ...prev, options: previousOptions } : prev));
      setError(err instanceof Error ? err.message : "Không thể xóa lựa chọn");
    }
  }

  async function deleteAllResult() {
    if (!window.confirm("Xóa toàn bộ kết quả khảo sát?")) return;

    try {
      const response = await fetch("/api/admin/responses", { method: "DELETE" });
      if (!response.ok) throw new Error("Không thể xóa toàn bộ kết quả");
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xóa toàn bộ kết quả");
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  async function onDragEnd(event: DragEndEvent) {
    if (!data) return;
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = data.options.findIndex((item) => item.id === Number(active.id));
    const newIndex = data.options.findIndex((item) => item.id === Number(over.id));

    if (oldIndex < 0 || newIndex < 0) return;

    const previousOptions = data.options;
    const reordered = normalizeOptions(arrayMove(data.options, oldIndex, newIndex));

    setData({ ...data, options: reordered });

    try {
      const response = await fetch("/api/admin/options/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((item) => item.id) }),
      });
      if (!response.ok) {
        throw new Error("Không thể lưu sắp xếp");
      }
    } catch (err) {
      setData((prev) => (prev ? { ...prev, options: previousOptions } : prev));
      setError(err instanceof Error ? err.message : "Không thể lưu sắp xếp");
    }
  }

  function formatDate(dateIso: string) {
    return new Date(dateIso).toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  if (!data) {
    return error ? <p className="p-6 text-scarlet">{error}</p> : null;
  }

  const totalVotes = chartData.reduce((sum, row) => sum + row.votes, 0);
  const optionStatsSorted = [...data.optionStats].sort((a, b) => b.votes - a.votes);

  return (
    <main className="min-h-screen bg-cultured pb-12">
      <div className="mx-auto w-full max-w-7xl px-4 pt-6 sm:px-6">
        <header className="rounded-3xl bg-indigo p-5 text-cultured shadow-xl shadow-indigo/25">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-cultured/80">Hair Survey Admin</p>
              <h1 className="text-2xl font-bold">Bảng điều khiển khảo sát mẫu tóc</h1>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-xl bg-cultured px-4 py-2 text-sm font-semibold text-indigo"
            >
              Đăng xuất
            </button>
          </div>
        </header>

        <nav className="mt-4 rounded-2xl border border-mid-blue/10 bg-white p-2">
          <div className="grid gap-2 sm:grid-cols-3">
            <TabLink href="/admin/survey" active={tab === "survey"}>
              Khảo sát
            </TabLink>
            <TabLink href="/admin/results" active={tab === "results"}>
              Kết quả
            </TabLink>
            <TabLink href="/admin/qr" active={tab === "qr"}>
              QR Code
            </TabLink>
          </div>
        </nav>

        {error ? <p className="mt-4 rounded-xl bg-scarlet/10 p-3 text-sm text-scarlet">{error}</p> : null}

        {tab === "survey" ? (
          <>
            <section className="mt-6">
              <form
                onSubmit={saveSettings}
                className="rounded-3xl border border-mid-blue/10 bg-white p-5 shadow-md"
              >
                <h2 className="text-lg font-bold text-indigo">Thiết lập khảo sát</h2>

                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-medium text-mid-blue">Tiêu đề khảo sát</label>
                  <input
                    value={settingsForm.surveyTitle}
                    onChange={(event) =>
                      setSettingsForm((prev) => ({ ...prev, surveyTitle: event.target.value }))
                    }
                    className="w-full rounded-xl border border-mid-blue/20 px-3 py-2 outline-none focus:border-light-blue"
                  />
                </div>

                <div className="mt-4 space-y-3">
                  <label className="block text-sm font-medium text-mid-blue">Tiêu đề câu hỏi</label>
                  <input
                    value={settingsForm.questionTitle}
                    onChange={(event) =>
                      setSettingsForm((prev) => ({ ...prev, questionTitle: event.target.value }))
                    }
                    className="w-full rounded-xl border border-mid-blue/20 px-3 py-2 outline-none focus:border-light-blue"
                  />
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <label className="text-sm text-mid-blue">
                    Tối thiểu
                    <input
                      type="number"
                      min={1}
                      value={settingsForm.minSelect}
                      onChange={(event) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          minSelect: Math.max(1, Number(event.target.value) || 1),
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-mid-blue/20 px-3 py-2 outline-none focus:border-light-blue"
                    />
                  </label>

                  <label className="text-sm text-mid-blue">
                    Tối đa
                    <input
                      type="number"
                      min={1}
                      value={settingsForm.maxSelect}
                      onChange={(event) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          maxSelect: Math.max(1, Number(event.target.value) || 1),
                        }))
                      }
                      className="mt-1 w-full rounded-xl border border-mid-blue/20 px-3 py-2 outline-none focus:border-light-blue"
                    />
                  </label>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settingsForm.isOpen}
                    aria-label="Chuyển trạng thái khảo sát"
                    onClick={async () => {
                      if (savingSettings) return;
                      setError(null);
                      const nextSettings = { ...settingsForm, isOpen: !settingsForm.isOpen };
                      setSettingsForm(nextSettings);
                      setSavingSettings(true);
                      try {
                        await persistSettings(nextSettings);
                        await loadDashboard();
                      } catch (err) {
                        setError(err instanceof Error ? err.message : "Không thể lưu cài đặt");
                        await loadDashboard();
                      } finally {
                        setSavingSettings(false);
                      }
                    }}
                    disabled={savingSettings}
                    className="inline-flex items-center gap-3 rounded-xl border border-mid-blue/20 bg-cultured px-3 py-2 disabled:opacity-60"
                  >
                    <span
                      className={clsx(
                        "relative inline-block h-6 w-11 shrink-0 rounded-full transition-colors",
                        settingsForm.isOpen ? "bg-light-blue" : "bg-scarlet/70"
                      )}
                    >
                      <span
                        className={clsx(
                          "absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                          settingsForm.isOpen ? "translate-x-5" : "translate-x-0"
                        )}
                      />
                    </span>
                    <span className="text-sm font-semibold text-indigo">
                      {settingsForm.isOpen ? "Đang mở khảo sát" : "Đang tạm đóng"}
                    </span>
                  </button>

                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="rounded-xl bg-indigo px-4 py-2 text-sm font-semibold text-cultured disabled:opacity-60"
                  >
                    {savingSettings ? "Đang lưu..." : "Lưu thiết lập"}
                  </button>
                </div>
              </form>
            </section>

            <section className="mt-6 rounded-3xl border border-mid-blue/10 bg-white p-5 shadow-md">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold text-indigo">Quản lý lựa chọn kiểu tóc</h2>
                <button
                  type="button"
                  onClick={() =>
                    setOptionModal({
                      isOpen: true,
                      mode: "create",
                      option: null,
                    })
                  }
                  className="rounded-xl bg-mid-blue px-4 py-2 text-sm font-semibold text-cultured"
                >
                  Thêm kiểu tóc
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext
                    items={data.options.map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {data.options.map((option) => (
                      <SortableOptionCard
                        key={option.id}
                        option={option}
                        onEdit={(selectedOption) =>
                          setOptionModal({
                            isOpen: true,
                            mode: "edit",
                            option: selectedOption,
                          })
                        }
                        onDelete={removeOption}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </section>
          </>
        ) : null}

        {tab === "results" ? (
          <>
            <section className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Thiết bị đã tham gia" value={data.stats.totalParticipants} />
              <StatCard label="Lượt khảo sát" value={data.stats.totalResponses} />
              <StatCard label="Số mẫu chọn TB" value={data.stats.averageSelections} />
              <StatCard
                label="Mẫu tóc nổi bật"
                value={data.stats.mostVotedOptionName ?? "Chưa có dữ liệu"}
              />
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl border border-mid-blue/10 bg-white p-5 shadow-md">
                <h2 className="text-lg font-bold text-indigo">Danh sách lượt vote: {totalVotes}</h2>
                <div className="mt-4 overflow-hidden rounded-2xl border border-mid-blue/10">
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-cultured text-left text-mid-blue">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Lựa chọn</th>
                        <th className="px-3 py-2 font-semibold">Vote</th>
                        <th className="px-3 py-2 font-semibold">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {optionStatsSorted.length === 0 ? (
                        <tr>
                          <td className="px-3 py-3 text-mid-blue/70" colSpan={3}>
                            Chưa có lựa chọn.
                          </td>
                        </tr>
                      ) : (
                        optionStatsSorted.map((item) => (
                          <tr key={item.optionId} className="border-t border-mid-blue/10">
                            <td className="px-3 py-2 text-mid-blue">{item.optionName}</td>
                            <td className="px-3 py-2 font-semibold text-indigo">{item.votes}</td>
                            <td className="px-3 py-2 font-semibold text-indigo">
                              {totalVotes > 0 ? `${((item.votes / totalVotes) * 100).toFixed(1)}%` : "0%"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-3xl border border-mid-blue/10 bg-white p-5 shadow-md">
                <h2 className="text-lg font-bold text-indigo">Tỷ trọng lựa chọn</h2>
                <div className="mt-4 h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="votes"
                        nameKey="name"
                        innerRadius={0}
                        outerRadius={95}
                        labelLine={false}
                        label={({ cx, cy, midAngle, outerRadius, percent }) => {
                          const radius = Number(outerRadius) * 0.62;
                          const x = Number(cx) + radius * Math.cos((-Number(midAngle) * Math.PI) / 180);
                          const y = Number(cy) + radius * Math.sin((-Number(midAngle) * Math.PI) / 180);
                          const ratio = Math.round((percent ?? 0) * 100);

                          if (ratio <= 0) return null;

                          return (
                            <text
                              x={x}
                              y={y}
                              fill="#1F2937"
                              textAnchor="middle"
                              dominantBaseline="central"
                              className="text-[11px] font-semibold"
                            >
                              {ratio}%
                            </text>
                          );
                        }}
                      >
                        {chartData.map((item) => (
                          <Cell key={`pie-${item.optionId}`} fill={item.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${Number(value ?? 0)} vote`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {chartData.map((item) => (
                    <div
                      key={`legend-${item.optionId}`}
                      className="flex items-center gap-2 rounded-xl border border-mid-blue/10 bg-cultured/60 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full border border-mid-blue/15"
                          style={{ backgroundColor: item.color }}
                        />
                        <p className="text-sm text-mid-blue">{item.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="mt-6 rounded-3xl border border-mid-blue/10 bg-white p-5 shadow-md">
              <div className="flex items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-indigo">Kết quả khảo sát</h2>
                <button
                  type="button"
                  onClick={deleteAllResult}
                  className="rounded-xl border border-scarlet/35 px-3 py-2 text-sm font-semibold text-scarlet"
                >
                  Xóa toàn bộ
                </button>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-mid-blue/10">
                {data.responses.length === 0 ? (
                  <p className="p-4 text-sm text-mid-blue/75">Chưa có kết quả nào.</p>
                ) : (
                  <table className="w-full border-collapse text-sm">
                    <thead className="bg-cultured text-left text-mid-blue">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Tên thiết bị</th>
                        <th className="px-3 py-2 font-semibold">Lựa chọn</th>
                        <th className="px-3 py-2 font-semibold">Thời gian khảo sát</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.responses.map((response) => {
                        const optionNames = response.selectedOptionIds
                          .map((id) => optionMap.get(id)?.name)
                          .filter(Boolean)
                          .join(", ");

                        return (
                          <tr key={response.id} className="border-t border-mid-blue/10 align-top">
                            <td className="px-3 py-2 text-indigo">{response.participantName}</td>
                            <td className="px-3 py-2 text-mid-blue">
                              {optionNames || "Không có lựa chọn"}
                            </td>
                            <td className="px-3 py-2 text-mid-blue">{formatDate(response.submittedAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        ) : null}

        {tab === "qr" ? (
          <section className="mt-6 rounded-3xl border border-mid-blue/10 bg-white p-5 shadow-md">
            <h2 className="text-lg font-bold text-indigo">QR khảo sát</h2>
            <p className="mt-2 text-sm text-mid-blue/80">
              Quét mã để vào nhanh trang khảo sát trên thiết bị khác.
            </p>
            <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl bg-cultured p-4">
              <QRCodeSVG value={surveyUrl} size={240} bgColor="#F5F5F7" fgColor="#000066" />
              <p className="max-w-full break-all text-center text-xs text-mid-blue">{surveyUrl}</p>
            </div>
          </section>
        ) : null}
      </div>
      {optionModal.isOpen ? (
        <OptionModal
          key={`${optionModal.mode}-${optionModal.option?.id ?? "new"}`}
          state={optionModal}
          submitting={savingOption}
          onClose={() => setOptionModal((prev) => ({ ...prev, isOpen: false }))}
          onSubmit={saveOptionDraft}
        />
      ) : null}
    </main>
  );
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: string }) {
  return (
    <Link
      href={href}
      className={clsx(
        "rounded-xl px-4 py-2 text-center text-sm font-semibold transition",
        active ? "bg-indigo text-cultured" : "bg-cultured text-mid-blue hover:bg-light-blue/20"
      )}
    >
      {children}
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <article className="rounded-2xl border border-mid-blue/10 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-mid-blue/75">{label}</p>
      <p className="mt-2 text-2xl font-bold text-indigo">{value}</p>
    </article>
  );
}
