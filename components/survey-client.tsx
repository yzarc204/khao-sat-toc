"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import Image from "next/image";
import type { PublicSurveyData } from "@/lib/types";
import Loader from "@/components/loader";

type ParticipantResponse = {
  participantId: string;
  participantName: string;
  selectedOptionIds: number[];
  submittedAt: string | null;
};

const PARTICIPANT_STORAGE_KEY = "hair-survey-participant-id";

function getOrCreateDeviceId() {
  const existingId = localStorage.getItem(PARTICIPANT_STORAGE_KEY);
  if (existingId) {
    return existingId;
  }

  const newId = crypto.randomUUID();
  localStorage.setItem(PARTICIPANT_STORAGE_KEY, newId);
  return newId;
}

export default function SurveyClient() {
  const [survey, setSurvey] = useState<PublicSurveyData | null>(null);
  const [participant, setParticipant] = useState<ParticipantResponse | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void init();
  }, []);

  const fetchSurveyConfig = useCallback(async () => {
    const configResponse = await fetch("/api/survey/config", { cache: "no-store" });
    if (!configResponse.ok) {
      throw new Error("Không thể tải khảo sát.");
    }
    const configPayload = (await configResponse.json()) as PublicSurveyData;
    setSurvey(configPayload);
  }, []);

  async function init() {
    setLoading(true);
    setError(null);

    try {
      await fetchSurveyConfig();

      const deviceId = getOrCreateDeviceId();
      const participantResponse = await fetch("/api/survey/participant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: deviceId,
          name: `DEVICE-${deviceId.slice(0, 8).toUpperCase()}`,
        }),
      });

      if (!participantResponse.ok) {
        const payload = (await participantResponse.json()) as { error?: string };
        throw new Error(payload.error ?? "Không thể khởi tạo thiết bị khảo sát.");
      }

      const participantPayload = (await participantResponse.json()) as ParticipantResponse;
      setParticipant(participantPayload);
      setSelectedIds(participantPayload.selectedOptionIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchSurveyConfig().catch(() => {
        // Keep existing survey state when background sync fails.
      });
    }, 10000);

    return () => window.clearInterval(interval);
  }, [fetchSurveyConfig]);

  const selectedCount = selectedIds.length;

  function toggle(optionId: number) {
    setError(null);

    if (!survey || participant?.submittedAt) return;

    setSelectedIds((prev) => {
      if (prev.includes(optionId)) {
        return prev.filter((id) => id !== optionId);
      }

      if (prev.length >= survey.settings.maxSelect) {
        return [...prev.slice(1), optionId];
      }

      return [...prev, optionId];
    });
  }

  async function submitSurvey(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!survey || !participant) return;

    if (participant.submittedAt) {
      setError("Khảo sát của thiết bị này đã được xác nhận trước đó.");
      return;
    }

    if (selectedIds.length < survey.settings.minSelect) {
      setError(`Bạn cần chọn ít nhất ${survey.settings.minSelect} kiểu tóc.`);
      return;
    }

    if (selectedIds.length > survey.settings.maxSelect) {
      setError(`Bạn chỉ được chọn tối đa ${survey.settings.maxSelect} kiểu tóc.`);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch("/api/survey/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantId: participant.participantId,
          selectedOptionIds: selectedIds,
        }),
      });

      const payload = (await response.json()) as ParticipantResponse & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Không thể gửi khảo sát.");
      }

      setParticipant(payload);
      setSelectedIds(payload.selectedOptionIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể gửi khảo sát.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <Loader />;
  }

  if (!survey || !participant) {
    return <p className="p-6 text-scarlet">{error ?? "Không tìm thấy khảo sát"}</p>;
  }

  const completed = Boolean(participant.submittedAt);

  if (!survey.settings.isOpen) {
    return (
      <main className="min-h-screen bg-cultured px-4">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center">
            <Image
              src="/images/tlu.webp"
              alt="TLU"
              width={132}
              height={132}
              className="h-28 w-28 object-contain sm:h-32 sm:w-32"
            />
            <p className="text-2xl font-bold text-scarlet sm:text-3xl">Khảo sát chưa được bắt đầu</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cultured pb-10">
      <div className="mx-auto w-full max-w-5xl px-4 pt-6 sm:px-6">
        <header className="relative overflow-hidden rounded-3xl bg-indigo p-6 text-cultured shadow-xl shadow-indigo/20">
          <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-light-blue/40 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-8 left-6 h-24 w-24 rounded-full bg-scarlet/40 blur-2xl" />
          <p className="text-xs uppercase tracking-[0.2em] text-cultured/80">
            {survey.settings.surveyTitle}
          </p>
          <h1 className="mt-2 text-2xl font-bold sm:text-3xl">{survey.settings.questionTitle}</h1>
          {!survey.settings.isOpen && !completed ? (
            <p className="mt-4 inline-flex rounded-full bg-scarlet px-3 py-1 text-xs font-semibold">
              Khảo sát hiện đang tạm đóng
            </p>
          ) : null}
        </header>

        {completed ? (
          <section className="mt-6 rounded-3xl border border-mid-blue/10 bg-white p-6 text-center shadow-md">
            <h2 className="text-2xl font-bold text-indigo">Cảm ơn bạn đã hoàn thành khảo sát</h2>
            <div className="mt-5 flex justify-center">
              <Image
                src="/images/thank-you.gif"
                alt="Thank you"
                width={360}
                height={360}
                className="h-auto w-full max-w-[360px] rounded-2xl"
                unoptimized
              />
            </div>
          </section>
        ) : (
          <section className="mt-6 rounded-3xl border border-mid-blue/10 bg-white p-5 shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-indigo">Thiết bị: {participant.participantName}</h2>
                <p className="text-sm text-mid-blue/80">Chạm vào ảnh để chọn hoặc bỏ chọn.</p>
              </div>
              <div className="rounded-full bg-cultured px-3 py-1 text-sm font-semibold text-mid-blue">
                Đã chọn {selectedCount}/{survey.settings.maxSelect}
              </div>
            </div>

            <form onSubmit={submitSurvey} className="mt-4">
              <div className="grid grid-cols-3 gap-3 lg:grid-cols-4">
                {survey.options.map((option) => {
                  const active = selectedIds.includes(option.id);

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggle(option.id)}
                      className={clsx(
                        "group relative overflow-hidden rounded-2xl border text-left transition",
                        active
                          ? "border-light-blue ring-4 ring-light-blue/25"
                          : "border-mid-blue/15 hover:border-mid-blue/40"
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={option.imageUrl}
                        alt={option.name}
                        className="aspect-square w-full border border-mid-blue/15 object-cover"
                        onError={(event) => {
                          event.currentTarget.src = "/images/tlu.webp";
                        }}
                      />
                      <div
                        className={clsx(
                          "absolute inset-x-0 bottom-0 bg-gradient-to-t p-2 text-xs font-semibold sm:p-3 sm:text-sm",
                          active
                            ? "from-indigo/90 to-indigo/50 text-cultured"
                            : "from-black/70 to-black/10 text-cultured"
                        )}
                      >
                        {option.name}
                      </div>
                      {active ? (
                        <div className="absolute right-2 top-2 rounded-full bg-light-blue px-2 py-1 text-xs font-bold text-cultured">
                          Đã chọn
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              <button
                type="submit"
                disabled={submitting || !survey.settings.isOpen}
                className="mt-5 w-full rounded-xl bg-scarlet px-5 py-3 font-semibold text-cultured transition hover:bg-[#d62008] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {submitting ? "Đang gửi..." : "Xác nhận khảo sát"}
              </button>
            </form>
          </section>
        )}

        {error ? <p className="mt-4 rounded-xl bg-scarlet/10 p-3 text-sm text-scarlet">{error}</p> : null}
      </div>
    </main>
  );
}
