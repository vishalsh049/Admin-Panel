import { useState } from "react";

const Support = () => {
  const [formData, setFormData] = useState({
    subject: "",
    category: "Technical",
    message: "",
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Support Ticket Submitted:", formData);
    alert("Support ticket submitted successfully!");
    setFormData({
      subject: "",
      category: "Technical",
      message: "",
    });
  };

  return (
    <div className="space-y-6">

      {/* PAGE TITLE */}
      <h1 className="text-2xl font-bold">Support</h1>

      {/* SUPPORT FORM */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-1">Raise a Support Ticket</h2>
        <p className="text-sm text-gray-500 mb-4">
          Our team will get back to you within 24 hours
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="Subject"
            required
            className="w-full border rounded p-2"
          />

          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full border rounded p-2"
          >
            <option>Technical</option>
            <option>Billing</option>
            <option>Account</option>
            <option>Other</option>
          </select>

          <textarea
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Describe your issue"
            rows="5"
            required
            className="w-full border rounded p-2"
          />

          <input
            type="file"
            className="w-full border rounded p-2"
          />

          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Submit Ticket
          </button>
        </form>
      </div>

      {/* CONTACT INFO */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Contact Support</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="font-medium">Email</p>
            <p className="text-gray-600">support@yourcompany.com</p>
          </div>

          <div>
            <p className="font-medium">Phone</p>
            <p className="text-gray-600">+91 98765 43210</p>
          </div>

          <div>
            <p className="font-medium">Working Hours</p>
            <p className="text-gray-600">Mon–Fri, 10 AM – 6 PM</p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Frequently Asked Questions</h2>

        <div className="space-y-3">
          <details className="border rounded p-3">
            <summary className="cursor-pointer font-medium">
              How long does support take to respond?
            </summary>
            <p className="text-sm text-gray-600 mt-2">
              Our average response time is within 24 hours.
            </p>
          </details>

          <details className="border rounded p-3">
            <summary className="cursor-pointer font-medium">
              How can I upgrade my plan?
            </summary>
            <p className="text-sm text-gray-600 mt-2">
              Go to Billing page and click on Upgrade Plan.
            </p>
          </details>

          <details className="border rounded p-3">
            <summary className="cursor-pointer font-medium">
              Can I reset my password?
            </summary>
            <p className="text-sm text-gray-600 mt-2">
              Yes, go to Profile or Settings and choose Change Password.
            </p>
          </details>
        </div>
      </div>

      {/* SUPPORT STATUS */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-2">Support Information</h2>
        <p className="text-sm text-gray-600">
          • Priority support available for Premium users <br />
          • Emergency issues are handled first <br />
          • Please provide clear details for faster resolution
        </p>
      </div>

    </div>
  );
};

export default Support;
