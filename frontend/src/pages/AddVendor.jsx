import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import { useVendors } from "../context/VendorContext";
import { useNavigate } from "react-router-dom";
import { Country, State, City } from "country-state-city";

const Input = ({ label, ...props }) => (
     <div>
          <label className="block text-sm font-medium mb-1">{label}</label>
          <input
               {...props}
               className="w-full border rounded px-3 py-2 text-sm"
          />
     </div>
);


export default function AddVendor() {
     const { addVendor } = useVendors();
     const navigate = useNavigate();

     /* ================== TABS ================== */
     const tabs = [
          "Other Details",
          "Address",
          "Contact Persons",
          "Bank Details",
          "Documents",
     ];
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


     /* ================== VENDOR BASIC ================== */
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

     /* ================== BILLING ================== */
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

     /* ================== SHIPPING ================== */
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

     /* ================== CONTACTS ================== */
     const [contacts, setContacts] = useState([
          { name: "", email: "", phone: "" },
     ]);

     /* ================== BANK ================== */
     const [bank, setBank] = useState({
          bankName: "",
          accountName: "",
          accountNumber: "",
          ifsc: "",
          accountType: "",
          upi: "",
     });

     /* ================== DOCUMENTS ================== */
     const [documents, setDocuments] = useState({
          gst: null,
          pan: null,
          others: [],
     });

     /* ================== HANDLERS ================== */
     const handleVendorChange = (e) => {
          setVendor({ ...vendor, [e.target.name]: e.target.value });
     };

     const handleBillingChange = (e) => {
          setBilling({ ...billing, [e.target.name]: e.target.value });
     };

     const handleShippingChange = (e) => {
          setShipping({ ...shipping, [e.target.name]: e.target.value });
     };

     const copyBillingToShipping = () => {
          setShipping({ ...billing });
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

/* First Name Validation */
if (!vendor.firstName.trim()) {
  newErrors.firstName = "First name is required.";
}

  /* GST Treatment */
  if (!vendor.gstTreatment) {
    newErrors.gstTreatment = "GST Treatment is required.";
  }

  /* Source of Supply */
  if (!vendor.sourceOfSupply) {
    newErrors.sourceOfSupply = "Source of Supply is required.";
  }

  /* Email Validation */
  if (vendor.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(vendor.email)) {
      newErrors.email = "Invalid email address.";
    }
  }

 /* Phone Validation */
if (!vendor.phone) {
  newErrors.phone = "Phone number is required.";
} else {
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(vendor.phone)) {
    newErrors.phone = "Phone must be 10 digits.";
  }
}

  /* PAN Validation */
  if (vendor.pan) {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(vendor.pan.toUpperCase())) {
      newErrors.pan = "Invalid PAN format (ABCDE1234F)";
    }
  }

  /* MSME Validation */
  if (vendor.msmeRegistered) {
    if (!vendor.udyamType) {
      newErrors.udyamType = "Please select Udyam registration type.";
    }

    if (!vendor.udyamNumber) {
      newErrors.udyamNumber = "Udyam Registration Number is required.";
    } else {
      const udyamRegex = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;
      if (!udyamRegex.test(vendor.udyamNumber)) {
        newErrors.udyamNumber =
          "Invalid format. Example: UDYAM-MH-12-1234567";
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

  /* IFSC Validation */
if (bank.ifsc) {
  const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  if (!ifscRegex.test(bank.ifsc.toUpperCase())) {
    alert("Invalid IFSC code");
    return;
  }
}

/* Pincode Validation */
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

     const isFormValid = () => {
  return Object.keys(errors).length === 0;
};

     /* ================== INPUT ================== */


     return (
          <div className="bg-white p-6 rounded shadow">
               {/* BACK */}
               <Link
                    to="/vendors"
                    className="flex items-center gap-2 text-blue-600 mb-4"
               >
                    <FaArrowLeft /> Back to Vendors
               </Link>

               <h2 className="text-2xl font-semibold mb-6">Add Vendor</h2>

               {/* TABS */}
               <div className="flex gap-6 border-b mb-6 text-sm">
                    {tabs.map((tab) => (
                         <button
                              key={tab}
                              onClick={() => setActiveTab(tab)}
                              className={`pb-2 ${activeTab === tab
                                        ? "border-b-2 border-blue-600 text-blue-600 font-semibold"
                                        : "text-gray-500"
                                   }`}
                         >
                              {tab}
                         </button>
                    ))}
               </div>

               {/* ================== OTHER DETAILS ================== */}
               {activeTab === "Other Details" && (
                    <div className="grid grid-cols-2 gap-6">
                         <div>
<Input
  label="First Name"
  name="firstName"
  value={vendor.firstName}
  onChange={handleVendorChange}
/>
{errors.firstName && (
  <p className="text-red-500 text-xs">{errors.firstName}</p>
)}
</div>
                         <Input label="Last Name" name="lastName" value={vendor.lastName} onChange={handleVendorChange} />
                         <Input label="Company Name" name="company" value={vendor.company} onChange={handleVendorChange} />
                        
<div>
<Input label="Email" name="email" value={vendor.email} onChange={handleVendorChange} />
{errors.email && <p className="text-red-500 text-xs">{errors.email}</p>}
</div>

                         <div>
<Input label="Work Phone" name="phone" value={vendor.phone} onChange={handleVendorChange} />
{errors.phone && <p className="text-red-500 text-xs">{errors.phone}</p>}
</div>

                         <div>
                              <label className="block text-sm mb-1">
                                   GST Treatment <span className="text-red-500">*</span>
                              </label>

                              <select
  ref={gstRef}
  name="gstTreatment"
  value={vendor.gstTreatment}
  onChange={(e) => {
    handleVendorChange(e);
    setErrors({ ...errors, gstTreatment: "" });
  }}

                                   className={`w-full rounded px-3 py-2 text-sm border ${errors.gstTreatment ? "border-red-500" : "border-gray-300"
                                        }`}
                              >
                                   <option value="">Select GST treatment</option>
                                   <option>Registered Business</option>
                                   <option>Unregistered Business</option>
                              </select>

                              {errors.gstTreatment && (
                                   <p className="text-red-500 text-xs mt-1">
                                        ⚠ {errors.gstTreatment}
                                   </p>
                              )}
                         </div>

                         { /* ================== SOURCE OF SUPPLY ================== */}

                         <div>
                              <label className="block text-sm mb-1">
                                   Source of Supply <span className="text-red-500">*</span>
                              </label>
 <select
  ref={sourceRef}
  name="sourceOfSupply"
  value={vendor.sourceOfSupply}
  onChange={(e) => {
    handleVendorChange(e);
    setErrors({ ...errors, sourceOfSupply: "" });
  }}
  className={`w-full rounded px-3 py-2 text-sm border ${
    errors.sourceOfSupply ? "border-red-500" : "border-gray-300"
  }`}
>
  <option value="">Select State</option>

  {State.getStatesOfCountry("IN").map((state) => (
    <option key={state.isoCode} value={state.isoCode}>
      {state.name}
    </option>
  ))}

</select>

                              {errors.sourceOfSupply && (
                                   <p className="text-red-500 text-xs mt-1">
                                        ⚠ {errors.sourceOfSupply}
                                   </p>
                              )}
                         </div>

                         <div>
<Input label="PAN" name="pan" value={vendor.pan} onChange={handleVendorChange} />
{errors.pan && <p className="text-red-500 text-xs">{errors.pan}</p>}
</div>

                         {/* MSME REGISTERED */}
<div className="col-span-2">
  <label className="flex items-center gap-2 text-sm">
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
    />
    MSME Registered
  </label>
</div>

{/* UDYAM FIELDS (ONLY IF MSME YES) */}
{vendor.msmeRegistered && (
  <>
    <div>
      <label className="block text-sm mb-1">
        Udyam Registration Type <span className="text-red-500">*</span>
      </label>
      <select
        value={vendor.udyamType}
        onChange={(e) => {
          setVendor({ ...vendor, udyamType: e.target.value });
          setErrors({ ...errors, udyamType: "" });
        }}
        className={`w-full border rounded px-3 py-2 text-sm ${
          errors.udyamType ? "border-red-500" : ""
        }`}
      >
        <option value="">Select Type</option>
        <option>Micro</option>
        <option>Small</option>
        <option>Medium</option>
      </select>
      {errors.udyamType && (
        <p className="text-red-500 text-xs mt-1">{errors.udyamType}</p>
      )}
    </div>

    <div>
      <label className="block text-sm mb-1">
        Udyam Registration Number <span className="text-red-500">*</span>
      </label>
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
        className={`w-full border rounded px-3 py-2 text-sm ${
          errors.udyamNumber ? "border-red-500" : ""
        }`}
      />
      {errors.udyamNumber && (
        <p className="text-red-500 text-xs mt-1">{errors.udyamNumber}</p>
      )}
    </div>
  </>
)}



                         
                    </div>
               )}

               {/* ================== ADDRESS ================== */}
               {activeTab === "Address" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                         <div>
                              <h3 className="font-semibold mb-4">Billing Address</h3>
                              <div className="space-y-4">
                                   <Input label="Attention" name="attention" value={billing.attention} onChange={handleBillingChange} />
                                   <textarea name="address1" value={billing.address1} onChange={handleBillingChange} placeholder="Street 1" className="w-full border rounded p-2" />
                                   <textarea name="address2" value={billing.address2} onChange={handleBillingChange} placeholder="Street 2" className="w-full border rounded p-2" />
                                   
{/* COUNTRY */}
<div>
<label className="block text-sm font-medium mb-1">Country</label>
<select
name="country"
value={billing.country}
onChange={handleBillingChange}
className="w-full border rounded px-3 py-2 text-sm"
>
{Country.getAllCountries().map((c) => (
<option key={c.isoCode} value={c.isoCode}>
{c.name}
</option>
))}
</select>
</div>

{/* STATE */}
<div>
<label className="block text-sm font-medium mb-1">State</label>
<select
name="state"
value={billing.state}
onChange={handleBillingChange}
className="w-full border rounded px-3 py-2 text-sm"
>
<option value="">Select State</option>

{State.getStatesOfCountry(billing.country || "IN").map((s) => (
<option key={s.isoCode} value={s.isoCode}>
{s.name}
</option>
))}
</select>
</div>

{/* CITY */}
<div>
<label className="block text-sm font-medium mb-1">City</label>
<select
name="city"
value={billing.city}
onChange={handleBillingChange}
className="w-full border rounded px-3 py-2 text-sm"
>
<option value="">Select City</option>

{City.getCitiesOfState(
billing.country || "IN",
billing.state
).map((c) => (
<option key={c.name} value={c.name}>
{c.name}
</option>
))}
</select>
</div>

                                   <Input label="Pin Code" name="pincode" value={billing.pincode} onChange={handleBillingChange} />
                                   <Input label="Phone" name="phone" value={billing.phone} onChange={handleBillingChange} />
                                   <Input label="Fax" name="fax" value={billing.fax} onChange={handleBillingChange} />
                              </div>
                         </div>

                         <div>
                              <div className="flex justify-between mb-2">
  <h3 className="font-semibold">Shipping Address</h3>
</div>

<div className="flex items-center gap-2 mb-4">
  <input
    type="checkbox"
    checked={sameAsBilling}
    onChange={(e) => setSameAsBilling(e.target.checked)}
  />
  <label className="text-sm">
    Shipping address same as Billing address
  </label>
</div>

                              <div className="space-y-4">
                                   <Input label="Attention" name="attention" value={shipping.attention} onChange={handleShippingChange} />
                                   <textarea name="address1" value={shipping.address1} onChange={handleShippingChange} placeholder="Street 1" className="w-full border rounded p-2" />
                                   <textarea name="address2" value={shipping.address2} onChange={handleShippingChange} placeholder="Street 2" className="w-full border rounded p-2" />
                              
{/* COUNTRY */}
<div>
<label className="block text-sm font-medium mb-1">Country</label>
<select
name="country"
value={billing.country || "IN"}
onChange={handleBillingChange}
className="w-full border rounded px-3 py-2 text-sm"
>
{Country.getAllCountries().map((c) => (
<option key={c.isoCode} value={c.isoCode}>
{c.name}
</option>
))}
</select>
</div>

{/* STATE */}
<div>
<label className="block text-sm font-medium mb-1">State</label>
<select
name="state"
value={billing.state}
onChange={handleBillingChange}
className="w-full border rounded px-3 py-2 text-sm"
>
<option value="">Select State</option>

{State.getStatesOfCountry(billing.country || "IN").map((s) => (
<option key={s.isoCode} value={s.isoCode}>
{s.name}
</option>
))}
</select>
</div>

{/* CITY */}
<div>
<label className="block text-sm font-medium mb-1">City</label>
<select
name="city"
value={billing.city}
onChange={handleBillingChange}
className="w-full border rounded px-3 py-2 text-sm"
>
<option value="">Select City</option>

{City.getCitiesOfState(
billing.country || "IN",
billing.state
).map((c) => (
<option key={c.name} value={c.name}>
{c.name}
</option>
))}
</select>
</div>

                                   <Input label="Pin Code" name="pincode" value={shipping.pincode} onChange={handleShippingChange} />
                                   <Input label="Phone" name="phone" value={shipping.phone} onChange={handleShippingChange} />
                                   <Input label="Fax" name="fax" value={shipping.fax} onChange={handleShippingChange} />
                              </div>
                         </div>
                    </div>
               )}

               {/* ================== CONTACT PERSONS ================== */}
               {activeTab === "Contact Persons" && (
                    <div className="space-y-6">
                         {contacts.map((c, index) => (
                              <div key={index} className="border rounded p-4 grid grid-cols-3 gap-4 relative">
                                   <input value={c.name} onChange={(e) => updateContact(index, "name", e.target.value)} placeholder="Contact Name" className="border px-3 py-2 rounded text-sm" />
                                   <input value={c.email} onChange={(e) => updateContact(index, "email", e.target.value)} placeholder="Email" className="border px-3 py-2 rounded text-sm" />
                                   <input value={c.phone} onChange={(e) => updateContact(index, "phone", e.target.value)} placeholder="Phone" className="border px-3 py-2 rounded text-sm" />

                                   {contacts.length > 1 && (
                                        <button onClick={() => removeContact(index)} className="absolute top-2 right-2 text-red-500 text-xs">
                                             Remove
                                        </button>
                                   )}
                              </div>
                         ))}
                         <button onClick={addContact} className="text-blue-600 text-sm font-medium">
                              + Add another contact
                         </button>
                    </div>
               )}

               {/* ================== BANK DETAILS ================== */}
               {activeTab === "Bank Details" && (
                    <div className="grid grid-cols-2 gap-6">
                         <Input label="Bank Name" name="bankName" value={bank.bankName} onChange={handleBankChange} />
                         <Input label="Account Holder Name" name="accountName" value={bank.accountName} onChange={handleBankChange} />
                         <Input label="Account Number" name="accountNumber" value={bank.accountNumber} onChange={handleBankChange} />
                         <Input label="IFSC Code" name="ifsc" value={bank.ifsc} onChange={handleBankChange} />
                         <select name="accountType" value={bank.accountType} onChange={handleBankChange} className="w-full border rounded px-3 py-2 text-sm">
                              <option value="">Select account type</option>
                              <option>Savings</option>
                              <option>Current</option>
                         </select>
                         <Input label="UPI ID (Optional)" name="upi" value={bank.upi} onChange={handleBankChange} />
                    </div>
               )}

               {/* ================== DOCUMENTS ================== */}
               {activeTab === "Documents" && (
                    <div className="space-y-6">
                         <div>
                              <label className="block text-sm font-medium mb-1">
                                   GST Certificate (PDF / JPG / PNG)
                              </label>
                              <input type="file" name="gst" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="block w-full text-sm" />
                              {documents.gst && <p className="text-xs text-green-600 mt-1">Selected: {documents.gst.name}</p>}
                         </div>

                         <div>
                              <label className="block text-sm font-medium mb-1">
                                   PAN Card (PDF / JPG / PNG)
                              </label>
                              <input type="file" name="pan" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="block w-full text-sm" />
                              {documents.pan && <p className="text-xs text-green-600 mt-1">Selected: {documents.pan.name}</p>}
                         </div>

                         <div>
                              <label className="block text-sm font-medium mb-1">
                                   Other Supporting Documents (Optional)
                              </label>
                              <input type="file" name="others" multiple accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} className="block w-full text-sm" />

                              {documents.others.length > 0 && (
                                   <ul className="text-xs text-gray-600 mt-2 list-disc ml-4">
                                        {documents.others.map((file, i) => (
                                             <li key={i}>{file.name}</li>
                                        ))}
                                   </ul>
                              )}

                              <p className="text-xs text-gray-500 mt-1">
                                   Max 10 files • Max 10MB each
                              </p>
                         </div>
                    </div>
               )}

               {/* STEP ACTIONS */}
               <div className="flex justify-between mt-8">
                    {currentTabIndex > 0 && (
                         <button onClick={goPrevious} className="border px-5 py-2 rounded">
                              Previous
                         </button>
                    )}

                    <div className="ml-auto flex gap-3">
                         {currentTabIndex < tabs.length - 1 && (
                              <button onClick={goNext} className="bg-blue-600 text-white px-5 py-2 rounded">
                                   Next
                              </button>
                         )}

                         {currentTabIndex === tabs.length - 1 && (
                         <button
  onClick={handleSaveVendor}
  className="px-5 py-2 rounded text-white bg-blue-600"
>
  Save Vendor
</button>

                         )}
                    </div>
               </div>
          </div>
     );
}
