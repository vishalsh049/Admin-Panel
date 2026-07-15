export default function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <label className={`relative inline-flex items-center ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}>
      <input
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div
        className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-500
          peer-disabled:opacity-50 transition-colors
          after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white
          after:rounded-full after:h-5 after:w-5 after:transition-transform after:shadow-sm
          peer-checked:after:translate-x-5"
      />
    </label>
  );
}
