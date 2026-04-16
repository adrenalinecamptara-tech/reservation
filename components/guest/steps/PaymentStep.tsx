"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  paymentSchema,
  type PaymentValues,
} from "@/lib/validations/registrationSchema";
import { useRegistrationStore } from "@/lib/store/registrationStore";
import { calcRemaining } from "@/lib/utils/pricing";

interface Props {
  token: string;
}

type UploadState = "idle" | "uploading" | "done" | "error";

export function PaymentStep({ token }: Props) {
  const router = useRouter();
  const { personalInfo, groupDetails, payment, setPayment, prevStep, reset } =
    useRegistrationStore();

  // total_amount may be pre-calculated in step 2 when a package was selected
  const prefilledTotal = payment.total_amount ?? null;
  const hasPackage = !!(groupDetails as { package_id?: string | null })
    .package_id;

  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadedFileName, setUploadedFileName] = useState<string>(
    payment.payment_proof_name ?? "",
  );
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      deposit_amount: (payment.deposit_amount as number) || undefined,
      total_amount: (payment.total_amount as number) || undefined,
      remaining_amount: (payment.remaining_amount as number) || undefined,
      payment_proof_path: payment.payment_proof_path ?? "",
      payment_proof_name: payment.payment_proof_name ?? "",
    },
  });

  const watchedDeposit = watch("deposit_amount");

  // Auto-calculate remaining when package selected
  useEffect(() => {
    if (hasPackage && prefilledTotal != null && watchedDeposit > 0) {
      const remaining = calcRemaining(prefilledTotal, watchedDeposit);
      setValue("remaining_amount", remaining);
    }
  }, [watchedDeposit, prefilledTotal, hasPackage, setValue]);

  // Handle file upload to Supabase Storage via signed URL
  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
      ];
      if (!allowedTypes.includes(file.type)) {
        alert("Dozvoljeni formati: JPEG, PNG, WebP, PDF");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert("Maksimalna veličina fajla je 10MB");
        return;
      }

      setUploadState("uploading");
      try {
        // 1. Get signed upload URL
        const urlRes = await fetch(`/api/upload?token=${token}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, mimeType: file.type }),
        });
        if (!urlRes.ok) throw new Error("Greška pri dobijanju upload URL-a");
        const { signedUrl, storagePath } = await urlRes.json();

        // 2. Upload directly to Supabase Storage
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadRes.ok) throw new Error("Greška pri uploadu fajla");

        setValue("payment_proof_path", storagePath, { shouldValidate: true });
        setValue("payment_proof_name", file.name);
        setPayment({
          payment_proof_path: storagePath,
          payment_proof_name: file.name,
        });
        setUploadedFileName(file.name);
        setUploadState("done");
      } catch (err) {
        console.error(err);
        setUploadState("error");
      }
    },
    [token, setValue, setPayment],
  );

  const onSubmit = async (data: PaymentValues) => {
    setSubmitting(true);
    try {
      const payload = {
        ...personalInfo,
        ...groupDetails,
        ...data,
        total_amount: prefilledTotal ?? data.total_amount,
        currency: "EUR",
        invite_link_id: null,
      };

      const res = await fetch(`/api/reservations?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error ?? "Greška pri slanju prijave. Pokušaj ponovo.");
        setSubmitting(false);
        return;
      }

      reset();
      router.push(`/register/${token}/success`);
    } catch {
      alert("Greška pri slanju prijave. Proveri internet konekciju.");
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <p className="act-hint">
        Unesite iznos depozita koji ste uplatili i priložite potvrdu o uplati
        (slika ili PDF). Ostatak plaćate pri dolasku u kamp.
      </p>

      {/* Total — read-only if pre-calculated from package */}
      {hasPackage && prefilledTotal != null ? (
        <div className="act-field act-field--calc">
          <label className="act-label">Ukupna cijena (izračunato)</label>
          <div className="act-calc-value">{prefilledTotal} €</div>
          <input
            type="hidden"
            {...register("total_amount", { valueAsNumber: true })}
            value={prefilledTotal}
          />
        </div>
      ) : null}

      <div className="act-row-2">
        <div className="act-field">
          <label className="act-label" htmlFor="deposit_amount">
            Depozit plaćen (€)
          </label>
          <input
            id="deposit_amount"
            type="number"
            step="0.01"
            min="0"
            className={`act-input ${errors.deposit_amount ? "act-input--error" : ""}`}
            placeholder="25.00"
            {...register("deposit_amount", { valueAsNumber: true })}
          />
          {errors.deposit_amount && (
            <p className="act-error">{errors.deposit_amount.message}</p>
          )}
        </div>
        <div className="act-field">
          <label className="act-label" htmlFor="remaining_amount">
            Ostatak za platiti (€)
            {hasPackage}
          </label>
          <input
            id="remaining_amount"
            type="number"
            step="0.01"
            min="0"
            readOnly={hasPackage && prefilledTotal != null}
            className={`act-input ${hasPackage ? "act-input--readonly" : ""} ${errors.remaining_amount ? "act-input--error" : ""}`}
            placeholder={hasPackage ? "Izračunava se..." : "65.00"}
            {...register("remaining_amount", { valueAsNumber: true })}
          />
        </div>
      </div>

      {/* File upload */}
      <div className="act-field">
        <label className="act-label">Dokaz o uplati</label>
        <label
          htmlFor="payment_proof"
          className={`act-upload ${uploadState === "done" ? "act-upload--done" : ""} ${errors.payment_proof_path ? "act-upload--error" : ""}`}
        >
          {uploadState === "idle" && (
            <>
              <span className="act-upload-icon">📎</span>
              <span className="act-upload-text">
                Klikni ili prevuci fajl ovde
              </span>
              <span className="act-upload-sub">JPEG, PNG, PDF · max 10MB</span>
            </>
          )}
          {uploadState === "uploading" && (
            <>
              <span className="act-upload-icon act-spin">⟳</span>
              <span className="act-upload-text">Uploadujem...</span>
            </>
          )}
          {uploadState === "done" && (
            <>
              <span className="act-upload-icon">✓</span>
              <span className="act-upload-text">{uploadedFileName}</span>
              <span className="act-upload-sub">Klikni za promenu</span>
            </>
          )}
          {uploadState === "error" && (
            <>
              <span className="act-upload-icon">✗</span>
              <span className="act-upload-text">Greška — pokušaj ponovo</span>
            </>
          )}
          <input
            id="payment_proof"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="act-upload-input"
            onChange={handleFileChange}
          />
        </label>
        {/* Hidden field for Zod validation */}
        <input type="hidden" {...register("payment_proof_path")} />
        {errors.payment_proof_path && (
          <p className="act-error">{errors.payment_proof_path.message}</p>
        )}
      </div>

      <div className="act-btn-row">
        <button
          type="button"
          className="act-btn act-btn--secondary"
          onClick={prevStep}
          disabled={submitting}
          style={{ flex: "0 0 auto", width: "100px" }}
        >
          ← Nazad
        </button>
        <button
          type="submit"
          className="act-btn act-btn--primary"
          disabled={submitting || uploadState === "uploading"}
        >
          {submitting ? "Šaljem..." : "Pošalji prijavu ✓"}
        </button>
      </div>

      <style>{`
        .act-field--calc { margin-bottom: 12px; }
        .act-calc-value { font-size: 22px; font-weight: 700; color: #7dcfcf; padding: 6px 0; }
        .act-label-auto { font-size: 10px; color: rgba(168,213,213,0.35); font-weight: 400; }
        .act-input--readonly { opacity: 0.6; cursor: default; }
        .act-upload {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 24px 20px;
          border: 1.5px dashed rgba(62,140,140,0.3);
          border-radius: 10px;
          cursor: pointer;
          text-align: center;
          transition: all 0.2s;
          position: relative;
          background: rgba(255,255,255,0.02);
        }
        .act-upload:hover { border-color: rgba(58,144,144,0.6); background: rgba(58,144,144,0.04); }
        .act-upload--done { border-style: solid; border-color: rgba(42,112,112,0.5); background: rgba(42,112,112,0.06); }
        .act-upload--error { border-color: rgba(196,30,58,0.4); }
        .act-upload-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; }
        .act-upload-icon { font-size: 24px; line-height: 1; color: #3a9090; }
        .act-upload-text { font-size: 14px; color: rgba(168,213,213,0.8); font-weight: 500; }
        .act-upload-sub { font-size: 11px; color: rgba(168,213,213,0.4); }
        .act-upload--done .act-upload-icon { color: #7dcfcf; }
        .act-spin { display: inline-block; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </form>
  );
}
