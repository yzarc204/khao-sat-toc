"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(pin)) {
      setError("PIN phải gồm đúng 6 chữ số.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error ?? "Đăng nhập thất bại");
      }

      router.push("/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đã có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-cultured px-4 py-10">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-indigo/10 bg-white p-6 shadow-xl shadow-indigo/10 sm:p-8">
        <h1 className="text-2xl font-bold text-indigo">Đăng nhập Admin</h1>
        <p className="mt-2 text-sm text-mid-blue/80">
          Nhập mã PIN 6 chữ số để truy cập trang quản lý khảo sát.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={pin}
            onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
            placeholder="******"
            className="w-full rounded-xl border border-mid-blue/20 px-4 py-3 text-lg tracking-[0.4em] text-indigo outline-none transition focus:border-light-blue focus:ring-4 focus:ring-light-blue/15"
          />

          {error ? <p className="text-sm text-scarlet">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo px-4 py-3 font-semibold text-cultured transition hover:bg-mid-blue disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Đang đăng nhập..." : "Vào trang quản lý"}
          </button>
        </form>
      </div>
    </main>
  );
}
