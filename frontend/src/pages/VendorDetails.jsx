import { Link, useParams } from "react-router-dom";
import { useVendors } from "../context/VendorContext";
import { State } from "country-state-city";

export default function VendorDetails() {
  const { id } = useParams();
  const { getVendorById } = useVendors();

  const vendor = getVendorById(id);
  const getStateName = (code) => {
  const state = State.getStateByCodeAndCountry(code, "IN");
  return state ? state.name : code;
};

  if (!vendor) {
    return (
      <div className="rounded bg-white p-4 shadow text-red-600 sm:p-6">
        Vendor not found
      </div>
    );
  }

  const {
    vendorDetails,
    billingAddress,
    shippingAddress,
    contacts,
    bankDetails,
    documents,
  } = vendor;

  return (


    <div className="rounded bg-white p-4 shadow sm:p-6">

      <Link to="/vendors" className="text-blue-600">
        ← Back to Vendors
      </Link>


      <div className="mb-6 flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between">


        <h2 className="text-2xl font-semibold">Vendor Details</h2>
        <Link
          to={`/vendors/edit/${vendor.id}`}
          className="rounded bg-blue-600 px-4 py-2 text-white w-full sm:w-auto"
        >
          Edit Vendor
        </Link>
      </div>

      {/* BASIC INFO */}
      <h3 className="font-semibold mb-2">Basic Information</h3>
      <p><b>Name:</b> {vendorDetails.firstName} {vendorDetails.lastName}</p>
      <p><b>Company:</b> {vendorDetails.company}</p>
      <p><b>Email:</b> {vendorDetails.email}</p>
      <p><b>Phone:</b> {vendorDetails.phone}</p>
      <p><b>GST Treatment:</b> {vendorDetails.gstTreatment || "Not provided"}</p>
      <p>
<b>Source of Supply:</b>{" "}
{vendorDetails.sourceOfSupply
  ? getStateName(vendorDetails.sourceOfSupply)
  : "Not provided"}
</p>
      <p><b>PAN:</b> {vendorDetails.pan || "Not provided"}</p>

      {/* ADDRESS */}
      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h3 className="font-semibold mb-2">Billing Address</h3>

<p>{billingAddress.attention || ""}</p>
<p>{billingAddress.address1 || ""}</p>
<p>{billingAddress.address2 || ""}</p>

<p>
{billingAddress.city || ""}
{billingAddress.state ? ", " + getStateName(billingAddress.state) : ""}
</p>

<p>{billingAddress.pincode || ""}</p>
<p>{billingAddress.country || ""}</p>

{billingAddress.phone && <p>Phone: {billingAddress.phone}</p>}
{billingAddress.fax && <p>Fax: {billingAddress.fax}</p>}
        </div>

        <div>
          <h3 className="font-semibold mb-2">Shipping Address</h3>

<p>{shippingAddress.attention || ""}</p>
<p>{shippingAddress.address1 || ""}</p>
<p>{shippingAddress.address2 || ""}</p>

<p>
{shippingAddress.city || ""}
{shippingAddress.state ? ", " + getStateName(shippingAddress.state) : ""}
</p>

<p>{shippingAddress.pincode || ""}</p>

{shippingAddress.phone && <p>Phone: {shippingAddress.phone}</p>}
{shippingAddress.fax && <p>Fax: {shippingAddress.fax}</p>}
        </div>
      </div>

      {/* CONTACTS */}
      <div className="mt-6">
        <h3 className="font-semibold mb-2">Contact Persons</h3>
        {contacts.length === 0 ? (
          <p>Not provided</p>
        ) : (
          <ul className="list-disc ml-5">
            {contacts.map((c, i) => (
              <li key={i}>
                {c.name || "Unnamed"} — {c.email || "No email"} —{" "}
                {c.phone || "No phone"}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* BANK */}
      <div className="mt-6">
        <h3 className="font-semibold mb-2">Bank Details</h3>
        <p><b>Bank:</b> {bankDetails.bankName || "Not provided"}</p>
        <p><b>Account Name:</b> {bankDetails.accountName || "Not provided"}</p>
        <p><b>Account No:</b> {bankDetails.accountNumber || "Not provided"}</p>
        <p><b>IFSC:</b> {bankDetails.ifsc || "Not provided"}</p>
        <p><b>Account Type:</b> {bankDetails.accountType || "Not provided"}</p>
        <p><b>UPI:</b> {bankDetails.upi || "Not provided"}</p>
      </div>

      {/* DOCUMENTS */}
      <div className="mt-6">
        <h3 className="font-semibold mb-2">Documents</h3>
        <p><b>GST:</b> {documents.gst || "Not uploaded"}</p>
        <p><b>PAN:</b> {documents.pan || "Not uploaded"}</p>
        {documents.others?.length > 0 && (
          <ul className="list-disc ml-5">
            {documents.others.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
      </div>


    </div>
  );
}
