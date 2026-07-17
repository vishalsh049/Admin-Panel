import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/api";
import { setAuthHeader } from "../utils/authHeader";

/* ---------- small inline icon set (no extra deps) ---------- */
const IconUser = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" strokeLinecap="round" />
  </svg>
);
const IconLock = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
    <rect x="5" y="10.5" width="14" height="9" rx="2" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" strokeLinecap="round" />
  </svg>
);
const IconEye = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
    <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
    <circle cx="12" cy="12" r="2.6" />
  </svg>
);
const IconEyeOff = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
    <path d="M3 3l18 18" strokeLinecap="round" />
    <path d="M10.6 5.7C11 5.6 11.5 5.5 12 5.5c6.4 0 10 6.5 10 6.5a14.7 14.7 0 0 1-3.2 4M6.5 7.6A14.4 14.4 0 0 0 2 12s3.6 6.5 10 6.5c1.4 0 2.6-.3 3.7-.8" strokeLinecap="round" />
    <path d="M9.9 10.1a2.6 2.6 0 0 0 3.6 3.7" strokeLinecap="round" />
  </svg>
);
const IconArrow = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconShield = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
    <path d="M12 3l7 3v5c0 4.6-3 8-7 10-4-2-7-5.4-7-10V6l7-3Z" strokeLinejoin="round" />
    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconChart = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
    <path d="M4 19h16" strokeLinecap="round" />
    <rect x="6" y="13" width="2.6" height="6" rx="0.5" />
    <rect x="10.7" y="9" width="2.6" height="10" rx="0.5" />
    <rect x="15.4" y="5" width="2.6" height="14" rx="0.5" />
  </svg>
);
const IconUsers = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}>
    <circle cx="9" cy="8.5" r="2.5" />
    <path d="M3.5 19c.7-3 2.8-4.6 5.5-4.6s4.8 1.6 5.5 4.6" strokeLinecap="round" />
    <path d="M15.5 7.2a2.5 2.5 0 1 1 0 5" strokeLinecap="round" />
    <path d="M16 14.5c2 .4 3.3 1.9 3.9 4.5" strokeLinecap="round" />
  </svg>
);
const IconChevronDown = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const IconGoogle = (p) => (
  <svg viewBox="0 0 24 24" {...p}>
    <path fill="#4285F4" d="M22.5 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-1.9 3.2-4.8 3.2-8Z" />
    <path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.2 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.3v2.8A11 11 0 0 0 12 23Z" />
    <path fill="#FBBC05" d="M6 14.4a6.6 6.6 0 0 1 0-4.2V7.4H2.3a11 11 0 0 0 0 9.8L6 14.4Z" />
    <path fill="#EA4335" d="M12 5.4c1.6 0 3 .5 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.4L6 10.2c.9-2.5 3.2-4.4 6-4.4Z" />
  </svg>
);
const IconMicrosoft = (p) => (
  <svg viewBox="0 0 24 24" {...p}>
    <rect x="3" y="3" width="8.4" height="8.4" fill="#F35325" />
    <rect x="12.6" y="3" width="8.4" height="8.4" fill="#81BC06" />
    <rect x="3" y="12.6" width="8.4" height="8.4" fill="#05A6F0" />
    <rect x="12.6" y="12.6" width="8.4" height="8.4" fill="#FFBA08" />
  </svg>
);

/* hexagon brand mark used both top-left and on the form card */
const BrandMark = ({ className = "h-10 w-10" }) => (
  <svg viewBox="0 0 40 40" className={className}>
    <defs>
      <linearGradient id="pingoria-grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fb923c" />
        <stop offset="100%" stopColor="#ec4899" />
      </linearGradient>
    </defs>
    <path
      d="M20 2 36 11v18L20 38 4 29V11Z"
      fill="url(#pingoria-grad)"
    />
    <path d="M16 11h7a6 6 0 0 1 0 12h-3v6h-4Zm4 3.5v5h3a2.5 2.5 0 0 0 0-5Z" fill="#fff" />
  </svg>
);

export default function Login() {
  const [mode, setMode] = useState("login"); // "login" | "register" | "forgot"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("token") && sessionStorage.getItem("session-auth-active") === "true") {
      navigate("/dashboard");
    }
  }, [navigate]);

  const normalizedEmail = email.trim().toLowerCase();

  const handleLogin = async (e) => {
  e.preventDefault();

  setLoading(true);

  try {
      const res = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: normalizedEmail,
        password,
      });

      if (res.data?.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user || {}));
        sessionStorage.setItem("session-auth-active", "true");
        setAuthHeader(res.data.token);
        window.dispatchEvent(new Event("auth-changed"));
        navigate("/dashboard");
      } else {
        alert("Invalid login");
      }
    } catch (err) {
      alert(err?.response?.data?.message || "Login failed");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${BASE_URL}/api/auth/register`, {
        name: name.trim(),
        email: normalizedEmail,
        password,
      });

      alert("Account created");
      setMode("login");
    } catch (err) {
      alert(err?.response?.data?.message || "Registration failed");
    }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${BASE_URL}/api/auth/forgot-password`, {
        email: normalizedEmail,
      });

      alert("Reset link sent");
      setMode("login");
    } catch (err) {
      alert(err?.response?.data?.message || "Email not found");
    }
  };

  const getTitle = () => {
    if (mode === "login") return "Welcome back \uD83D\uDC4B";
    if (mode === "register") return "Create your account";
    return "Reset your password";
  };

  const getSubtitle = () => {
    if (mode === "login") return "Sign in to continue to your account";
    if (mode === "register") return "Start managing your business smarter";
    return "We'll email you a link to reset it";
  };

  const getButtonLabel = () => {
    if (mode === "login") return "Sign In";
    if (mode === "register") return "Create Account";
    return "Send Reset Link";
  };

 return (
  <div
    className="flex h-screen w-full overflow-hidden"
    style={{
      backgroundImage: "url('/login-bg.png')",
      backgroundSize: "100% 100%",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
    }}
  >
      {/* ---------------- LEFT: brand / marketing panel ---------------- */}
<div
  className="relative hidden w-[42%] overflow-hidden lg:flex lg:flex-col"
>
      
   {/* content */}
        <div className="relative z-20 flex h-full flex-col justify-between p-10 xl:p-14">
          <div className="flex items-center gap-3">
            <BrandMark className="h-11 w-11 shrink-0" />
            <div className="leading-tight">
              <p className="text-lg font-bold tracking-[0.15em] text-white">PINGORIA</p>
              <p className="text-[11px] tracking-[0.3em] text-gray-400">ENTERPRISE</p>
            </div>
          </div>

          <div className="max-w-md">
            <h1 className="text-4xl font-bold leading-tight text-white xl:text-[2.6rem]">
              Your Business.
              <br />
              <span className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">
                Smarter
              </span>{" "}
              Together.
            </h1>
            <p className="mt-5 text-[15px] leading-relaxed text-gray-400">
              Sign in to access your CRM &amp; ERP dashboard and manage your business with
              clarity and confidence.
            </p>
          </div>

          <div className="mb-8 space-y-5">
            {[
              { icon: IconShield, color: "text-sky-400 bg-sky-400/10 border-sky-400/30", title: "Secure Access", desc: "Enterprise-grade security to protect your data" },
              { icon: IconChart, color: "text-pink-400 bg-pink-400/10 border-pink-400/30", title: "Real-time Insights", desc: "Make smarter decisions with real-time data" },
              { icon: IconUsers, color: "text-purple-400 bg-purple-400/10 border-purple-400/30", title: "Team Collaboration", desc: "Work together efficiently across your organization" },
            ].map(({ icon: Icon, color, title, desc }) => (
              <div key={title} className="flex items-start gap-4">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-sm text-gray-400">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>



      </div>

      {/* ---------------- RIGHT: auth form panel ---------------- */}
<div className="relative flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
          <div className="w-full max-w-[460px]">
          <div className="relative rounded-3xl bg-white p-8 pt-14 shadow-lg sm:p-10 sm:pt-16">
            {/* badge logo overlapping the top edge */}
            <div className="absolute -top-9 left-1/2 flex h-16 w-16 -translate-x-1/2 items-center justify-center rounded-full border border-gray-100 bg-white shadow-md">
              <BrandMark className="h-9 w-9" />
            </div>

            <h1 className="text-center text-2xl font-bold text-gray-900">{getTitle()}</h1>
            <p className="mt-1.5 text-center text-sm text-gray-500">{getSubtitle()}</p>

            <form
              onSubmit={
                mode === "login" ? handleLogin : mode === "register" ? handleRegister : handleForgot
              }
              className="mt-8 mb-8 space-y-5"
            >
              {mode === "register" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Full name</label>
                  <div className="relative">
                    <IconUser className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Jane Cooper"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Email address</label>
                <div className="relative">
                  <IconUser className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    placeholder="Enter your valid email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-12 pr-4 text-sm outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                  />
                </div>
              </div>

              {mode !== "forgot" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">Password</label>
                  <div className="relative">
                    <IconLock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3.5 pl-12 pr-12 text-sm outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <IconEyeOff className="h-5 w-5" /> : <IconEye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              )}

              {mode === "login" && (
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                    />
                    Remember me
                  </label>
                  <button
                    type="button"
                    className="text-sm font-medium text-orange-500 hover:text-orange-600"
                    onClick={() => setMode("forgot")}
                  >
                    Forgot password?
                  </button>
                </div>
              )}

            <button
  type="submit"
  disabled={loading}
  className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 py-3.5 font-semibold text-white shadow-lg shadow-pink-500/20 transition hover:opacity-95 disabled:opacity-70 disabled:cursor-not-allowed"
>
  {loading ? "Signing In..." : getButtonLabel()}
  {!loading && <IconArrow className="h-4 w-4" />}
</button>
            </form>

            
          </div>

          {/* footer */}
          <div className="mt-4 flex flex-col gap-3 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <span>© 2026 Pingoria Enterprise</span>
            <div className="flex items-center gap-4 sm:gap-6">
              <span className="cursor-pointer hover:text-gray-700">Contact Us</span>
              <span className="flex cursor-pointer items-center gap-1 hover:text-gray-700">
                English <IconChevronDown className="h-3.5 w-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
