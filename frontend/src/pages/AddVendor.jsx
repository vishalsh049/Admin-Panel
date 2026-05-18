import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Country, City, State } from "country-state-city";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  FileText,
  FolderUp,
  Landmark,
  Mail,
  MapPinned,
  Plus,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { useVendors } from "../context/VendorContext";

const tabs = ["Other Details", "Address", "Contact Persons", "Bank Details", "Documents"];

const pageMotion = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
};

const sectionMotion = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: "easeOut" } },
};

const inputBase =
  "w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm text-slate-800 shadow-[0_10px_25px_rgba(15,23,42,0.05)] outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-500/10";
const textareaBase =
  "min-h-[110px] w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm text-slate-800 shadow-[0_10px_25px_rgba(15,23,42,0.05)] outline-none transition-all duration-300 placeholder:text-slate-400 focus:border-violet-300 focus:ring-4 focus:ring-violet-500/10";
const selectBase =
  "w-full rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm text-slate-800 shadow-[0_10px_25px_rgba(15,23,42,0.05)] outline-none transition-all duration-300 focus:border-violet-300 focus:ring-4 focus:ring-violet-500/10";
const labelBase = "mb-2 block text-sm font-medium text-slate-700";
const hintBase = "mt-1 text-xs text-slate-500";
const errorBase = "mt-1 text-xs font-medium text-rose-500";

const fieldCardClass =
  "rounded-[24px] border border-white/70 bg-white/75 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] backdrop-blur-xl";

const TabButton = ({ active, children, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative rounded-2xl px-4 py-2.5 text-sm font-medium transition-all duration-300 ${
      active
        ? "bg-slate-950 text-white shadow-[0_14px_30px_rgba(15,23,42,0.18)]"
        : "bg-white/75 text-slate-600 hover:bg-white hover:text-slate-950"
    }`}
  >
    {children}
  </button>
);

const FieldShell = ({ label, required, error, hint, children }) => (
  <div>
    {label ? (
      <label className={labelBase}>
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </label>
    ) : null}
    {children}
    {error ? <p className={errorBase}>{error}</p> : hint ? <p className={hintBase}>{hint}</p> : null}
  </div>
);

const SectionCard = ({ title, subtitle, icon: Icon, children }) => (
  <motion.section variants={sectionMotion} className={fieldCardClass}>
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-[0_14px_30px_rgba(99,102,241,0.28)]">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
        <p className="text-sm leading-6 text-slate-600">{subtitle}</p>
      </div>
    </div>
    {children}
  </motion.section>
);

const FilePill = ({ file }) => (
  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
    <CheckCircle2 className="h-3.5 w-3.5" />
    {file}
  </div>
);

export default function AddVendor() {
  const { addVendor } = useVendors();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("Other Details");
  const [errors, setErrors] = useState({});

  const gstRef = useRef(null);
  const sourceRef = useRef(null);
  const udyamRef = useRef(null);

  const currentTabIndex = tabs.indexOf(activeTab);

  const goNext = () => {
    if (currentTabIndex < tabs.length - 1) {
      setActiveTab(tabs[currentTabIndex + 1]);
    }
  };

  const goPrevious = () => {
    if (currentTabIndex > 0) {
      setActiveTab(tabs[currentTabIndex - 1]);
    }
  };

  const [vendor, setVendor] = useState({
    firstName: "",
    lastName: "",
    company: "",
    email: "",
    phone: "",
    gstTreatment: "",
    sourceOfSupply: "",
    pan: "",
    msmeRegistered: false,
    udyamType: "",
    udyamNumber: "",
  });

  const [billing, setBilling] = useState({
    attention: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    country: "IN",
    pincode: "",
    phone: "",
    fax: "",
  });

  const [shipping, setShipping] = useState({
    attention: "",
    address1: "",
    address2: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    fax: "",
  });

  const [sameAsBilling, setSameAsBilling] = useState(false);

  useEffect(() => {
    if (sameAsBilling) {
      setShipping({ ...billing });
    }
  }, [billing, sameAsBilling]);

  const [contacts, setContacts] = useState([{ name: "", email: "", phone: "" }]);

  const [bank, setBank] = useState({
    bankName: "",
    accountName: "",
    accountNumber: "",
    ifsc: "",
    accountType: "",
    upi: "",
  });

  const [documents, setDocuments] = useState({
    gst: null,
    pan: null,
    others: [],
  });

  const handleVendorChange = (e) => {
    setVendor({ ...vendor, [e.target.name]: e.target.value });
  };

  const handleBillingChange = (e) => {
    setBilling({ ...billing, [e.target.name]: e.target.value });
  };

  const handleShippingChange = (e) => {
    setShipping({ ...shipping, [e.target.name]: e.target.value });
  };

  const handleBankChange = (e) => {
    setBank({ ...bank, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;

    if (name === "others") {
      setDocuments({ ...documents, others: [...files] });
    } else {
      setDocuments({ ...documents, [name]: files[0] });
    }
  };

  const addContact = () => {
    setContacts([...contacts, { name: "", email: "", phone: "" }]);
  };

  const removeContact = (index) => {
    setContacts(contacts.filter((_, i) => i !== index));
  };

  const updateContact = (index, field, value) => {
    const updated = [...contacts];
    updated[index][field] = value;
    setContacts(updated);
  };

  const validateOtherDetails = () => {
    const newErrors = {};

    if (!vendor.firstName.trim()) {
      newErrors.firstName = "First name is required.";
    }

    if (!vendor.gstTreatment) {
      newErrors.gstTreatment = "GST Treatment is required.";
    }

    if (!vendor.sourceOfSupply) {
      newErrors.sourceOfSupply = "Source of Supply is required.";
    }

    if (vendor.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(vendor.email)) {
        newErrors.email = "Invalid email address.";
      }
    }

    if (!vendor.phone) {
      newErrors.phone = "Phone number is required.";
    } else {
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(vendor.phone)) {
        newErrors.phone = "Phone must be 10 digits.";
      }
    }

    if (vendor.pan) {
      const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      if (!panRegex.test(vendor.pan.toUpperCase())) {
        newErrors.pan = "Invalid PAN format (ABCDE1234F)";
      }
    }

    if (vendor.msmeRegistered) {
      if (!vendor.udyamType) {
        newErrors.udyamType = "Please select Udyam registration type.";
      }

      if (!vendor.udyamNumber) {
        newErrors.udyamNumber = "Udyam Registration Number is required.";
      } else {
        const udyamRegex = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;
        if (!udyamRegex.test(vendor.udyamNumber)) {
          newErrors.udyamNumber = "Invalid format. Example: UDYAM-MH-12-1234567";
        }
      }
    }

    setErrors(newErrors);

    if (newErrors.gstTreatment && gstRef.current) {
      gstRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (newErrors.sourceOfSupply && sourceRef.current) {
      sourceRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    } else if (newErrors.udyamNumber && udyamRef.current) {
      udyamRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSaveVendor = () => {
    const isValid = validateOtherDetails();

    if (!isValid) {
      alert("Please fill all required fields before saving.");
      setActiveTab("Other Details");
      return;
    }

    if (bank.ifsc) {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscRegex.test(bank.ifsc.toUpperCase())) {
        alert("Invalid IFSC code");
        return;
      }
    }

    if (billing.pincode) {
      const pinRegex = /^[1-9][0-9]{5}$/;
      if (!pinRegex.test(billing.pincode)) {
        alert("Invalid Billing Pincode");
        return;
      }
    }

    const finalVendorData = {
      vendorDetails: vendor,
      billingAddress: billing,
      shippingAddress: shipping,
      contacts,
      bankDetails: bank,
      documents: {
        gst: documents.gst?.name || null,
        pan: documents.pan?.name || null,
        others: documents.others.map((f) => f.name),
      },
    };

    addVendor(finalVendorData);

    alert("Vendor saved successfully");
    navigate("/vendors");
  };

  return (
    <motion.div
      variants={pageMotion}
      initial="hidden"
      animate="show"
      className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white/70 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-6 lg:p-8"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-sky-500/10 blur-3xl" />
      </div>

      <motion.div
        variants={sectionMotion}
        className="relative mb-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"
      >
        <div className="max-w-3xl">
          <Link
            to="/vendors"
            className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:text-slate-950"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Vendors
          </Link>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-violet-50/80 px-3 py-1 text-xs font-semibold tracking-wide text-violet-700 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            Premium Vendor Onboarding
          </div>

          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Add Vendor
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Capture vendor identity, tax details, addresses, contacts, banking, and documentation in a luxurious, structured workflow.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <UserRound className="h-3.5 w-3.5 text-violet-600" />
              Profile
            </div>
            <p className="text-sm font-medium text-slate-900">Vendor identity</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <Landmark className="h-3.5 w-3.5 text-violet-600" />
              Finance
            </div>
            <p className="text-sm font-medium text-slate-900">Banking and GST</p>
          </div>
          <div className="rounded-2xl border border-white/80 bg-white/80 px-4 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
            <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              <FileText className="h-3.5 w-3.5 text-violet-600" />
              Files
            </div>
            <p className="text-sm font-medium text-slate-900">Documents and proof</p>
          </div>
        </div>
      </motion.div>

      <motion.div variants={sectionMotion} className="relative mb-6 flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <TabButton key={tab} active={activeTab === tab} onClick={() => setActiveTab(tab)}>
            {tab}
          </TabButton>
        ))}
      </motion.div>

      <motion.div variants={sectionMotion} className="relative">
        {activeTab === "Other Details" && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <SectionCard
              title="Identity"
              subtitle="Basic vendor profile and tax classification."
              icon={Building2}
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FieldShell label="First Name" required error={errors.firstName}>
                  <input
                    name="firstName"
                    value={vendor.firstName}
                    onChange={handleVendorChange}
                    className={`${inputBase} ${errors.firstName ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/10" : ""}`}
                    placeholder="Enter first name"
                  />
                </FieldShell>

                <FieldShell label="Last Name">
                  <input
                    name="lastName"
                    value={vendor.lastName}
                    onChange={handleVendorChange}
                    className={inputBase}
                    placeholder="Enter last name"
                  />
                </FieldShell>

                <div className="md:col-span-2">
                  <FieldShell label="Company Name">
                    <input
                      name="company"
                      value={vendor.company}
                      onChange={handleVendorChange}
                      className={inputBase}
                      placeholder="Enter company name"
                    />
                  </FieldShell>
                </div>

                <FieldShell label="Email" error={errors.email} hint="Optional, but recommended for communications.">
                  <input
                    name="email"
                    value={vendor.email}
                    onChange={handleVendorChange}
                    className={`${inputBase} ${errors.email ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/10" : ""}`}
                    placeholder="vendor@company.com"
                  />
                </FieldShell>

                <FieldShell label="Work Phone" required error={errors.phone}>
                  <input
                    name="phone"
                    value={vendor.phone}
                    onChange={handleVendorChange}
                    className={`${inputBase} ${errors.phone ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/10" : ""}`}
                    placeholder="10-digit mobile number"
                  />
                </FieldShell>
              </div>
            </SectionCard>

            <SectionCard
              title="Tax Profile"
              subtitle="GST treatment, source of supply, PAN, and MSME registration."
              icon={Sparkles}
            >
              <div className="space-y-4">
                <FieldShell label="GST Treatment" required error={errors.gstTreatment}>
                  <select
                    ref={gstRef}
                    name="gstTreatment"
                    value={vendor.gstTreatment}
                    onChange={(e) => {
                      handleVendorChange(e);
                      setErrors({ ...errors, gstTreatment: "" });
                    }}
                    className={`${selectBase} ${errors.gstTreatment ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/10" : ""}`}
                  >
                    <option value="">Select GST treatment</option>
                    <option>Registered Business</option>
                    <option>Unregistered Business</option>
                  </select>
                </FieldShell>

                <FieldShell label="Source of Supply" required error={errors.sourceOfSupply}>
                  <select
                    ref={sourceRef}
                    name="sourceOfSupply"
                    value={vendor.sourceOfSupply}
                    onChange={(e) => {
                      handleVendorChange(e);
                      setErrors({ ...errors, sourceOfSupply: "" });
                    }}
                    className={`${selectBase} ${errors.sourceOfSupply ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/10" : ""}`}
                  >
                    <option value="">Select State</option>
                    {State.getStatesOfCountry("IN").map((state) => (
                      <option key={state.isoCode} value={state.isoCode}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                </FieldShell>

                <FieldShell label="PAN" error={errors.pan} hint="Use the standard 10-character PAN format.">
                  <input
                    name="pan"
                    value={vendor.pan}
                    onChange={handleVendorChange}
                    className={`${inputBase} ${errors.pan ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/10" : ""}`}
                    placeholder="ABCDE1234F"
                  />
                </FieldShell>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
                  <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={vendor.msmeRegistered}
                      onChange={(e) =>
                        setVendor({
                          ...vendor,
                          msmeRegistered: e.target.checked,
                          udyamType: "",
                          udyamNumber: "",
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    MSME Registered
                  </label>
                </div>

                {vendor.msmeRegistered && (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FieldShell label="Udyam Registration Type" required error={errors.udyamType}>
                      <select
                        value={vendor.udyamType}
                        onChange={(e) => {
                          setVendor({ ...vendor, udyamType: e.target.value });
                          setErrors({ ...errors, udyamType: "" });
                        }}
                        className={`${selectBase} ${errors.udyamType ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/10" : ""}`}
                      >
                        <option value="">Select Type</option>
                        <option>Micro</option>
                        <option>Small</option>
                        <option>Medium</option>
                      </select>
                    </FieldShell>

                    <FieldShell label="Udyam Registration Number" required error={errors.udyamNumber}>
                      <input
                        ref={udyamRef}
                        type="text"
                        value={vendor.udyamNumber}
                        placeholder="UDYAM-MH-12-1234567"
                        onChange={(e) => {
                          setVendor({
                            ...vendor,
                            udyamNumber: e.target.value.toUpperCase(),
                          });
                          setErrors({ ...errors, udyamNumber: "" });
                        }}
                        className={`${inputBase} ${errors.udyamNumber ? "border-rose-300 focus:border-rose-400 focus:ring-rose-500/10" : ""}`}
                      />
                    </FieldShell>
                  </div>
                )}
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === "Address" && (
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <SectionCard
              title="Billing Address"
              subtitle="Primary billing destination for purchase records."
              icon={MapPinned}
            >
              <div className="space-y-4">
                <FieldShell label="Attention">
                  <input
                    name="attention"
                    value={billing.attention}
                    onChange={handleBillingChange}
                    className={inputBase}
                    placeholder="Billing contact person"
                  />
                </FieldShell>

                <FieldShell label="Street Address 1">
                  <textarea
                    name="address1"
                    value={billing.address1}
                    onChange={handleBillingChange}
                    placeholder="Street 1"
                    className={textareaBase}
                  />
                </FieldShell>

                <FieldShell label="Street Address 2">
                  <textarea
                    name="address2"
                    value={billing.address2}
                    onChange={handleBillingChange}
                    placeholder="Street 2"
                    className={textareaBase}
                  />
                </FieldShell>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FieldShell label="Country">
                    <select
                      name="country"
                      value={billing.country}
                      onChange={handleBillingChange}
                      className={selectBase}
                    >
                      {Country.getAllCountries().map((c) => (
                        <option key={c.isoCode} value={c.isoCode}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </FieldShell>

                  <FieldShell label="State">
                    <select
                      name="state"
                      value={billing.state}
                      onChange={handleBillingChange}
                      className={selectBase}
                    >
                      <option value="">Select State</option>
                      {State.getStatesOfCountry(billing.country || "IN").map((s) => (
                        <option key={s.isoCode} value={s.isoCode}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </FieldShell>

                  <FieldShell label="City">
                    <select
                      name="city"
                      value={billing.city}
                      onChange={handleBillingChange}
                      className={selectBase}
                    >
                      <option value="">Select City</option>
                      {City.getCitiesOfState(billing.country || "IN", billing.state).map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </FieldShell>

                  <FieldShell label="Pin Code">
                    <input
                      name="pincode"
                      value={billing.pincode}
                      onChange={handleBillingChange}
                      className={inputBase}
                      placeholder="Pincode"
                    />
                  </FieldShell>

                  <FieldShell label="Phone">
                    <input
                      name="phone"
                      value={billing.phone}
                      onChange={handleBillingChange}
                      className={inputBase}
                      placeholder="Phone"
                    />
                  </FieldShell>

                  <FieldShell label="Fax">
                    <input
                      name="fax"
                      value={billing.fax}
                      onChange={handleBillingChange}
                      className={inputBase}
                      placeholder="Fax"
                    />
                  </FieldShell>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="Shipping Address"
              subtitle="Delivery destination for purchase-related shipments."
              icon={MapPinned}
            >
              <div className="mb-4 flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3">
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={(e) => setSameAsBilling(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <label className="text-sm font-medium text-slate-700">
                  Shipping address same as Billing address
                </label>
              </div>

              <div className="space-y-4">
                <FieldShell label="Attention">
                  <input
                    name="attention"
                    value={shipping.attention}
                    onChange={handleShippingChange}
                    className={inputBase}
                    placeholder="Shipping contact person"
                  />
                </FieldShell>

                <FieldShell label="Street Address 1">
                  <textarea
                    name="address1"
                    value={shipping.address1}
                    onChange={handleShippingChange}
                    placeholder="Street 1"
                    className={textareaBase}
                  />
                </FieldShell>

                <FieldShell label="Street Address 2">
                  <textarea
                    name="address2"
                    value={shipping.address2}
                    onChange={handleShippingChange}
                    placeholder="Street 2"
                    className={textareaBase}
                  />
                </FieldShell>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FieldShell label="Country">
                    <select
                      name="country"
                      value={shipping.country || "IN"}
                      onChange={handleShippingChange}
                      className={selectBase}
                    >
                      {Country.getAllCountries().map((c) => (
                        <option key={c.isoCode} value={c.isoCode}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </FieldShell>

                  <FieldShell label="State">
                    <select
                      name="state"
                      value={shipping.state}
                      onChange={handleShippingChange}
                      className={selectBase}
                    >
                      <option value="">Select State</option>
                      {State.getStatesOfCountry(shipping.country || "IN").map((s) => (
                        <option key={s.isoCode} value={s.isoCode}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </FieldShell>

                  <FieldShell label="City">
                    <select
                      name="city"
                      value={shipping.city}
                      onChange={handleShippingChange}
                      className={selectBase}
                    >
                      <option value="">Select City</option>
                      {City.getCitiesOfState(shipping.country || "IN", shipping.state).map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </FieldShell>

                  <FieldShell label="Pin Code">
                    <input
                      name="pincode"
                      value={shipping.pincode}
                      onChange={handleShippingChange}
                      className={inputBase}
                      placeholder="Pincode"
                    />
                  </FieldShell>

                  <FieldShell label="Phone">
                    <input
                      name="phone"
                      value={shipping.phone}
                      onChange={handleShippingChange}
                      className={inputBase}
                      placeholder="Phone"
                    />
                  </FieldShell>

                  <FieldShell label="Fax">
                    <input
                      name="fax"
                      value={shipping.fax}
                      onChange={handleShippingChange}
                      className={inputBase}
                      placeholder="Fax"
                    />
                  </FieldShell>
                </div>
              </div>
            </SectionCard>
          </div>
        )}

        {activeTab === "Contact Persons" && (
          <SectionCard
            title="Contact Persons"
            subtitle="Add one or more vendor contacts for account coordination."
            icon={UserRound}
          >
            <div className="space-y-4">
              {contacts.map((c, index) => (
                <div
                  key={index}
                  className="relative grid grid-cols-1 gap-4 rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4 md:grid-cols-3"
                >
                  <input
                    value={c.name}
                    onChange={(e) => updateContact(index, "name", e.target.value)}
                    placeholder="Contact Name"
                    className={inputBase}
                  />
                  <input
                    value={c.email}
                    onChange={(e) => updateContact(index, "email", e.target.value)}
                    placeholder="Email"
                    className={inputBase}
                  />
                  <input
                    value={c.phone}
                    onChange={(e) => updateContact(index, "phone", e.target.value)}
                    placeholder="Phone"
                    className={inputBase}
                  />

                  {contacts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeContact(index)}
                      className="absolute right-3 top-3 inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 transition-all duration-300 hover:-translate-y-0.5 hover:bg-rose-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addContact}
                className="inline-flex items-center gap-2 rounded-2xl border border-violet-200/70 bg-violet-50 px-4 py-3 text-sm font-medium text-violet-700 transition-all duration-300 hover:-translate-y-0.5 hover:bg-violet-100"
              >
                <Plus className="h-4 w-4" />
                Add another contact
              </button>
            </div>
          </SectionCard>
        )}

        {activeTab === "Bank Details" && (
          <SectionCard
            title="Bank Details"
            subtitle="Store vendor banking information for payment workflows."
            icon={Landmark}
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FieldShell label="Bank Name">
                <input
                  name="bankName"
                  value={bank.bankName}
                  onChange={handleBankChange}
                  className={inputBase}
                  placeholder="Bank name"
                />
              </FieldShell>

              <FieldShell label="Account Holder Name">
                <input
                  name="accountName"
                  value={bank.accountName}
                  onChange={handleBankChange}
                  className={inputBase}
                  placeholder="Account holder"
                />
              </FieldShell>

              <FieldShell label="Account Number">
                <input
                  name="accountNumber"
                  value={bank.accountNumber}
                  onChange={handleBankChange}
                  className={inputBase}
                  placeholder="Account number"
                />
              </FieldShell>

              <FieldShell label="IFSC Code">
                <input
                  name="ifsc"
                  value={bank.ifsc}
                  onChange={handleBankChange}
                  className={inputBase}
                  placeholder="IFSC code"
                />
              </FieldShell>

              <FieldShell label="Account Type">
                <select
                  name="accountType"
                  value={bank.accountType}
                  onChange={handleBankChange}
                  className={selectBase}
                >
                  <option value="">Select account type</option>
                  <option>Savings</option>
                  <option>Current</option>
                </select>
              </FieldShell>

              <FieldShell label="UPI ID (Optional)">
                <input
                  name="upi"
                  value={bank.upi}
                  onChange={handleBankChange}
                  className={inputBase}
                  placeholder="upi@bank"
                />
              </FieldShell>
            </div>
          </SectionCard>
        )}

        {activeTab === "Documents" && (
          <SectionCard
            title="Documents"
            subtitle="Attach tax and compliance files for the vendor record."
            icon={FolderUp}
          >
            <div className="space-y-5">
              <div>
                <label className={labelBase}>GST Certificate (PDF / JPG / PNG)</label>
                <input
                  type="file"
                  name="gst"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="block w-full rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:border-violet-300"
                />
                {documents.gst ? <div className="mt-3"><FilePill file={documents.gst.name} /></div> : null}
              </div>

              <div>
                <label className={labelBase}>PAN Card (PDF / JPG / PNG)</label>
                <input
                  type="file"
                  name="pan"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="block w-full rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:border-violet-300"
                />
                {documents.pan ? <div className="mt-3"><FilePill file={documents.pan.name} /></div> : null}
              </div>

              <div>
                <label className={labelBase}>Other Supporting Documents (Optional)</label>
                <input
                  type="file"
                  name="others"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="block w-full rounded-2xl border border-dashed border-slate-300 bg-white/80 px-4 py-3 text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-violet-600 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white hover:border-violet-300"
                />

                {documents.others.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {documents.others.map((file, i) => (
                      <FilePill key={`${file.name}-${i}`} file={file.name} />
                    ))}
                  </div>
                ) : null}

                <p className="mt-2 text-xs text-slate-500">Max 10 files • Max 10MB each</p>
              </div>
            </div>
          </SectionCard>
        )}
      </motion.div>

      <motion.div
        variants={sectionMotion}
        className="relative mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="text-sm text-slate-500">
          {currentTabIndex + 1} of {tabs.length} sections
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {currentTabIndex > 0 ? (
            <button
              type="button"
              onClick={goPrevious}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:text-slate-950"
            >
              Previous
            </button>
          ) : null}

          <div className="flex gap-3 sm:ml-auto">
            {currentTabIndex < tabs.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(99,102,241,0.32)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(99,102,241,0.42)]"
              >
                Next
                <Sparkles className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSaveVendor}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(99,102,241,0.32)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(99,102,241,0.42)]"
              >
                Save Vendor
                <CheckCircle2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
