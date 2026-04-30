import { useState } from "react";

const Settings = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [emailNotify, setEmailNotify] = useState(true);
  const [smsNotify, setSmsNotify] = useState(false);

  return (
    <div className="space-y-6">

      {/* PAGE TITLE */}
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* ACCOUNT SETTINGS */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-1">Account Settings</h2>
        <p className="text-sm text-gray-500 mb-4">
          Manage your account information
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            className="border rounded p-2 bg-gray-100"
            value="Rajesh Kumar"
            readOnly
          />
          <input
            className="border rounded p-2 bg-gray-100"
            value="admin@email.com"
            readOnly
          />
        </div>
      </div>

      {/* PREFERENCES */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-1">Preferences</h2>
        <p className="text-sm text-gray-500 mb-4">
          Customize your experience
        </p>

        <div className="space-y-4">

          {/* DARK MODE */}
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Dark Mode</p>
              <p className="text-sm text-gray-500">
                Enable dark theme
              </p>
            </div>

            <input
              type="checkbox"
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
              className="w-5 h-5"
            />
          </div>

          {/* LANGUAGE */}
          <div className="flex justify-between items-center">
            <div>
              <p className="font-medium">Language</p>
              <p className="text-sm text-gray-500">
                Select application language
              </p>
            </div>

            <select className="border rounded p-2">
              <option>English</option>
              <option>Hindi</option>
            </select>
          </div>

        </div>
      </div>

      {/* NOTIFICATIONS */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-1">Notifications</h2>
        <p className="text-sm text-gray-500 mb-4">
          Manage notification preferences
        </p>

        <div className="space-y-4">

          <div className="flex justify-between items-center">
            <span>Email Notifications</span>
            <input
              type="checkbox"
              checked={emailNotify}
              onChange={() => setEmailNotify(!emailNotify)}
              className="w-5 h-5"
            />
          </div>

          <div className="flex justify-between items-center">
            <span>SMS Notifications</span>
            <input
              type="checkbox"
              checked={smsNotify}
              onChange={() => setSmsNotify(!smsNotify)}
              className="w-5 h-5"
            />
          </div>

        </div>
      </div>

      {/* SECURITY */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-1">Security</h2>
        <p className="text-sm text-gray-500 mb-4">
          Protect your account
        </p>

        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium">Change Password</p>
            <p className="text-sm text-gray-500">
              Update your account password
            </p>
          </div>

          <button className="px-4 py-2 border rounded-lg">
            Change Password
          </button>
        </div>
      </div>

      {/* DANGER ZONE */}
      <div className="bg-white rounded-xl shadow p-6 border border-red-200">
        <h2 className="text-lg font-semibold text-red-600 mb-1">
          Danger Zone
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Irreversible actions
        </p>

        <div className="flex justify-between items-center">
          <div>
            <p className="font-medium text-red-600">
              Deactivate Account
            </p>
            <p className="text-sm text-gray-500">
              Temporarily disable your account
            </p>
          </div>

          <button className="px-4 py-2 bg-red-500 text-white rounded-lg">
            Deactivate
          </button>
        </div>
      </div>

    </div>
  );
};

export default Settings;
