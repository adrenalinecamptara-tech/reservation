import { useState } from "react";
import backgroundImg from "voucher-background.png";

export function VoucherDocument() {
  const [voucherData, setVoucherData] = useState({
    title: "VAUČER",
    subtitle: "PROMOCIJA MAJ 2026",
    activity: "Aktivni Rafting Vikend na Tari",
    presalePrice: "90",
    regularPrice: "125",
    included: "Uključeno: Rafting, 2 noćenja, 2 doručka, 1 ručak",
    emailLabel: "Email:",
    phoneLabel: "Broj telefona:",
    nameLabel: "Ime i prezime:",
    jmbgLabel: "JMBG:",
    voucherNumLabel: "Broj vaučera:",
    dateLabel: "Datum izdavanja:",
    validLabel: "Važi do:",
    managerLabel: "Kamp menadžer",
    address: "9R74+WF4, Bastasi, Bosna i Hercegovina",
    email: "info@adrenalinetara.com",
    phone: "+38163315829",
    swift: "NOBIBA22",
    iban: "BA395500005617164",
    bank: "NOVA BANKA A.D. BANJA LUKA",
    emailValue: "",
    phoneValue: "",
    nameValue: "",
    jmbgValue: "",
    voucherNumValue: "",
    dateValue: "",
    validValue: "",
    managerValue: "Milan Popović",
  });

  const updateField = (field: string, value: string) => {
    setVoucherData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div
        className="relative bg-white shadow-2xl"
        style={{
          width: "210mm",
          height: "310mm",
          backgroundImage: `url(${backgroundImg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* VOUCHER Title */}
        <div
          className="absolute"
          style={{ top: "230px", left: "0", right: "0" }}
        >
          <input
            type="text"
            value={voucherData.title}
            onChange={(e) => updateField("title", e.target.value)}
            className="w-full text-center bg-transparent border-none outline-none"
            style={{
              fontSize: "105px",
              fontWeight: "700",
              color: "#1e4d4d",
              fontFamily: "Arial Black, sans-serif",
              letterSpacing: "0.02em",
            }}
          />
        </div>

        {/* PRESALE 2026 */}
        <div
          className="absolute"
          style={{ top: "360px", left: "0", right: "0" }}
        >
          <input
            type="text"
            value={voucherData.subtitle}
            onChange={(e) => updateField("subtitle", e.target.value)}
            className="w-full text-center bg-transparent border-none outline-none"
            style={{
              fontSize: "42px",
              fontWeight: "700",
              color: "#1e4d4d",
              fontFamily: "Arial, sans-serif",
              letterSpacing: "0.08em",
            }}
          />
        </div>

        {/* Activity */}
        <div
          className="absolute"
          style={{ top: "450px", left: "0", right: "0" }}
        >
          <input
            type="text"
            value={voucherData.activity}
            onChange={(e) => updateField("activity", e.target.value)}
            className="w-full text-center bg-transparent border-none outline-none"
            style={{
              fontSize: "38px",
              fontWeight: "700",
              color: "#1e4d4d",
              fontFamily: "Arial, sans-serif",
            }}
          />
        </div>

        {/* Presale Price */}
        <div
          className="absolute"
          style={{ top: "510px", left: "0", right: "0" }}
        >
          <div className="flex items-center justify-center gap-2">
            <span
              style={{
                fontSize: "30px",
                fontWeight: "700",
                color: "#c41e3a",
                fontFamily: "Arial, sans-serif",
              }}
            >
              Presale cena:
            </span>
            <input
              type="text"
              value={voucherData.presalePrice}
              onChange={(e) => updateField("presalePrice", e.target.value)}
              className="bg-transparent border-none outline-none"
              style={{
                fontSize: "30px",
                fontWeight: "700",
                color: "#c41e3a",
                fontFamily: "Arial, sans-serif",
                width: "45px",
              }}
            />
            <span
              style={{
                fontSize: "30px",
                fontWeight: "700",
                color: "#c41e3a",
                fontFamily: "Arial, sans-serif",
              }}
            >
              €
            </span>
          </div>
        </div>

        {/* Included text */}
        <div
          className="absolute"
          style={{ top: "560px", left: "100px", right: "100px" }}
        >
          <input
            type="text"
            value={voucherData.included}
            onChange={(e) => updateField("included", e.target.value)}
            className="w-full text-center bg-transparent border-none outline-none"
            style={{
              fontSize: "20px",
              fontWeight: "400",
              color: "#1e4d4d",
              fontFamily: "Arial, sans-serif",
            }}
          />
        </div>

        {/* Form Fields */}
        <div
          className="absolute"
          style={{ top: "625px", left: "80px", right: "80px" }}
        >
          {/* Email */}
          <div className="flex items-end mb-3">
            <input
              type="text"
              value={voucherData.emailLabel}
              onChange={(e) => updateField("emailLabel", e.target.value)}
              className="bg-transparent border-none outline-none"
              style={{
                fontSize: "24px",
                fontWeight: "700",
                color: "#1e4d4d",
                fontFamily: "Arial, sans-serif",
                width: "230px",
              }}
            />
            <div className="relative" style={{ flex: 1, marginLeft: "10px" }}>
              <input
                type="text"
                value={voucherData.emailValue}
                onChange={(e) => updateField("emailValue", e.target.value)}
                className="w-full bg-transparent border-none outline-none pb-1"
                style={{
                  fontSize: "20px",
                  fontWeight: "400",
                  color: "#1e4d4d",
                  fontFamily: "Arial, sans-serif",
                }}
              />
              <div style={{ borderBottom: "2px solid #1e4d4d" }} />
            </div>
          </div>

          {/* Broj telefona */}
          <div className="flex items-end mb-3">
            <input
              type="text"
              value={voucherData.phoneLabel}
              onChange={(e) => updateField("phoneLabel", e.target.value)}
              className="bg-transparent border-none outline-none"
              style={{
                fontSize: "24px",
                fontWeight: "700",
                color: "#1e4d4d",
                fontFamily: "Arial, sans-serif",
                width: "230px",
              }}
            />
            <div className="relative" style={{ flex: 1, marginLeft: "10px" }}>
              <input
                type="text"
                value={voucherData.phoneValue}
                onChange={(e) => updateField("phoneValue", e.target.value)}
                className="w-full bg-transparent border-none outline-none pb-1"
                style={{
                  fontSize: "20px",
                  fontWeight: "400",
                  color: "#1e4d4d",
                  fontFamily: "Arial, sans-serif",
                }}
              />
              <div style={{ borderBottom: "2px solid #1e4d4d" }} />
            </div>
          </div>

          {/* Name */}
          <div className="flex items-end mb-3">
            <input
              type="text"
              value={voucherData.nameLabel}
              onChange={(e) => updateField("nameLabel", e.target.value)}
              className="bg-transparent border-none outline-none"
              style={{
                fontSize: "24px",
                fontWeight: "700",
                color: "#1e4d4d",
                fontFamily: "Arial, sans-serif",
                width: "230px",
              }}
            />
            <div className="relative" style={{ flex: 1, marginLeft: "10px" }}>
              <input
                type="text"
                value={voucherData.nameValue}
                onChange={(e) => updateField("nameValue", e.target.value)}
                className="w-full bg-transparent border-none outline-none pb-1"
                style={{
                  fontSize: "20px",
                  fontWeight: "400",
                  color: "#1e4d4d",
                  fontFamily: "Arial, sans-serif",
                }}
              />
              <div style={{ borderBottom: "2px solid #1e4d4d" }} />
            </div>
          </div>

          {/* JMBG */}
          <div className="flex items-end mb-3">
            <input
              type="text"
              value={voucherData.jmbgLabel}
              onChange={(e) => updateField("jmbgLabel", e.target.value)}
              className="bg-transparent border-none outline-none"
              style={{
                fontSize: "24px",
                fontWeight: "700",
                color: "#1e4d4d",
                fontFamily: "Arial, sans-serif",
                width: "100px",
              }}
            />
            <div className="relative" style={{ flex: 1, marginLeft: "10px" }}>
              <input
                type="text"
                value={voucherData.jmbgValue}
                onChange={(e) => updateField("jmbgValue", e.target.value)}
                className="w-full bg-transparent border-none outline-none pb-1"
                style={{
                  fontSize: "20px",
                  fontWeight: "400",
                  color: "#1e4d4d",
                  fontFamily: "Arial, sans-serif",
                }}
              />
              <div style={{ borderBottom: "2px solid #1e4d4d" }} />
            </div>
          </div>

          {/* Voucher Number */}
          <div className="flex items-end mb-3">
            <input
              type="text"
              value={voucherData.voucherNumLabel}
              onChange={(e) => updateField("voucherNumLabel", e.target.value)}
              className="bg-transparent border-none outline-none"
              style={{
                fontSize: "24px",
                fontWeight: "700",
                color: "#1e4d4d",
                fontFamily: "Arial, sans-serif",
                width: "220px",
              }}
            />
            <div className="relative" style={{ flex: 1, marginLeft: "10px" }}>
              <input
                type="text"
                value={voucherData.voucherNumValue}
                onChange={(e) => updateField("voucherNumValue", e.target.value)}
                className="w-full bg-transparent border-none outline-none pb-1"
                style={{
                  fontSize: "20px",
                  fontWeight: "400",
                  color: "#1e4d4d",
                  fontFamily: "Arial, sans-serif",
                }}
              />
              <div style={{ borderBottom: "2px solid #1e4d4d" }} />
            </div>
          </div>

          {/* Date */}
          <div className="flex items-end mb-3">
            <input
              type="text"
              value={voucherData.dateLabel}
              onChange={(e) => updateField("dateLabel", e.target.value)}
              className="bg-transparent border-none outline-none"
              style={{
                fontSize: "24px",
                fontWeight: "700",
                color: "#1e4d4d",
                fontFamily: "Arial, sans-serif",
                width: "260px",
              }}
            />
            <div className="relative" style={{ flex: 1, marginLeft: "10px" }}>
              <input
                type="text"
                value={voucherData.dateValue}
                onChange={(e) => updateField("dateValue", e.target.value)}
                className="w-full bg-transparent border-none outline-none pb-1"
                style={{
                  fontSize: "20px",
                  fontWeight: "400",
                  color: "#1e4d4d",
                  fontFamily: "Arial, sans-serif",
                }}
              />
              <div style={{ borderBottom: "2px solid #1e4d4d" }} />
            </div>
          </div>

          {/* Valid Until */}
          <div className="flex items-end mb-3">
            <input
              type="text"
              value={voucherData.validLabel}
              onChange={(e) => updateField("validLabel", e.target.value)}
              className="bg-transparent border-none outline-none"
              style={{
                fontSize: "24px",
                fontWeight: "700",
                color: "#1e4d4d",
                fontFamily: "Arial, sans-serif",
                width: "130px",
              }}
            />
            <div className="relative" style={{ flex: 1, marginLeft: "10px" }}>
              <input
                type="text"
                value={voucherData.validValue}
                onChange={(e) => updateField("validValue", e.target.value)}
                className="w-full bg-transparent border-none outline-none pb-1"
                style={{
                  fontSize: "20px",
                  fontWeight: "400",
                  color: "#1e4d4d",
                  fontFamily: "Arial, sans-serif",
                }}
              />
              <div style={{ borderBottom: "2px solid #1e4d4d" }} />
            </div>
          </div>

          {/* Manager */}
          <div className="flex items-end mb-3">
            <input
              type="text"
              value={voucherData.managerLabel}
              onChange={(e) => updateField("managerLabel", e.target.value)}
              className="bg-transparent border-none outline-none"
              style={{
                fontSize: "24px",
                fontWeight: "700",
                color: "#1e4d4d",
                fontFamily: "Arial, sans-serif",
                width: "220px",
              }}
            />
            <div className="relative" style={{ flex: 1, marginLeft: "10px" }}>
              <input
                type="text"
                value={voucherData.managerValue}
                onChange={(e) => updateField("managerValue", e.target.value)}
                className="w-full bg-transparent border-none outline-none pb-1"
                style={{
                  fontSize: "20px",
                  fontWeight: "400",
                  color: "#1e4d4d",
                  fontFamily: "Arial, sans-serif",
                }}
              />
              <div style={{ borderBottom: "2px solid #1e4d4d" }} />
            </div>
          </div>

          {/* Bottom line */}
          <div
            style={{
              marginTop: "40px",
            }}
          />
        </div>

        {/* Footer */}
        <div
          className="absolute"
          style={{ bottom: "20px", left: "80px", right: "80px" }}
        >
          <div className="mb-1/2">
            <span
              style={{
                fontSize: "16px",
                fontWeight: "400",
                color: "#1e4d4d",
                fontFamily: "Arial, sans-serif",
              }}
            >
              Adresa:{" "}
            </span>
            <input
              type="text"
              value={voucherData.address}
              onChange={(e) => updateField("address", e.target.value)}
              className="bg-transparent border-none outline-none"
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "#1e4d4d",
                fontFamily: "Arial, sans-serif",
                width: "500px",
              }}
            />
          </div>

          <div className="mb-1/2 flex items-center gap-2">
            <span
              style={{
                fontSize: "16px",
                fontWeight: "400",
                color: "#1e4d4d",
                fontFamily: "Arial, sans-serif",
              }}
            >
              Email:
            </span>
            <input
              type="text"
              value={voucherData.email}
              onChange={(e) => updateField("email", e.target.value)}
              className="bg-transparent border-none outline-none"
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "#1e4d4d",
                fontFamily: "Arial, sans-serif",
                width: "203px",
              }}
            />
            <span
              style={{
                fontSize: "16px",
                fontWeight: "400",
                color: "#1e4d4d",
                fontFamily: "Arial, sans-serif",
              }}
            >
              |
            </span>
            <input
              type="text"
              value={voucherData.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className="bg-transparent border-none outline-none"
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "#1e4d4d",
                fontFamily: "Arial, sans-serif",
                width: "150px",
              }}
            />
          </div>

          <div className="mb-1/2 flex items-center gap-2">
            <span
              style={{
                fontSize: "16px",
                fontWeight: "400",
                color: "#1e4d4d",
                fontFamily: "Arial, sans-serif",
              }}
            >
              SWIFT:
            </span>
            <input
              type="text"
              value={voucherData.swift}
              onChange={(e) => updateField("swift", e.target.value)}
              className="bg-transparent border-none outline-none"
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "#1e4d4d",
                fontFamily: "Arial, sans-serif",
                width: "92px",
              }}
            />
            <span
              style={{
                fontSize: "16px",
                fontWeight: "400",
                color: "#1e4d4d",
                fontFamily: "Arial, sans-serif",
              }}
            >
              | IBAN:
            </span>
            <input
              type="text"
              value={voucherData.iban}
              onChange={(e) => updateField("iban", e.target.value)}
              className="bg-transparent border-none outline-none"
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "#1e4d4d",
                fontFamily: "Arial, sans-serif",
                width: "220px",
              }}
            />
            <div className="ml-auto">
              <span
                style={{
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#1e4d4d",
                  fontFamily: "Arial, sans-serif",
                }}
              >
                NOVA BANKA
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <span
              style={{
                fontSize: "16px",
                fontWeight: "400",
                color: "#1e4d4d",
                fontFamily: "Arial, sans-serif",
              }}
            >
              Banka:{"   "}
            </span>
            <input
              type="text"
              value={voucherData.bank}
              onChange={(e) => updateField("bank", e.target.value)}
              className="bg-transparent border-none outline-none"
              style={{
                fontSize: "16px",
                fontWeight: "700",
                color: "#1e4d4d",
                fontFamily: "Arial, sans-serif",
                width: "400px",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
