import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { BASE_URL } from "../utils/api";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem("token")) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const normalizedEmail = email.trim().toLowerCase();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${BASE_URL}/api/auth/login`, {
        email: normalizedEmail,
        password,
      });

      if (res.data?.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("user", JSON.stringify(res.data.user));
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
    if (mode === "login") return "Sign In";
    if (mode === "register") return "Create Account";
    return "Reset Password";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-[480px] bg-white rounded-3xl shadow-xl p-10">
      
        <h1 className="text-2xl font-semibold mb-6">{getTitle()}</h1>

        <form
          onSubmit={
            mode === "login"
              ? handleLogin
              : mode === "register"
              ? handleRegister
              : handleForgot
          }
          className="space-y-5"
        >
          {mode === "register" && (
            <input
              type="text"
              placeholder="Full Name"
              className="w-full px-5 py-4 rounded-full border bg-gray-100 focus:bg-white focus:border-orange-400 outline-none"
              onChange={(e) => setName(e.target.value)}
            />
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-5 py-4 rounded-full border bg-gray-100 focus:bg-white focus:border-orange-400 outline-none"
          />

          {mode !== "forgot" && (
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-5 py-4 rounded-full border bg-gray-100 focus:bg-white focus:border-orange-400 outline-none"
            />
          )}

          {mode === "login" && (
            <p
              className="text-orange-500 text-sm cursor-pointer"
              onClick={() => setMode("forgot")}
            >
              Forgot password?
            </p>
          )}

          <button className="w-full py-4 rounded-full text-white font-semibold bg-gradient-to-r from-orange-500 to-pink-500">
            {getTitle()}
          </button>
        </form>

        <div className="flex justify-between mt-10 text-sm text-gray-500">
          <span>© 2026 Pingoria Enterprises</span>
          <div className="flex gap-6">
            <span>Contact Us</span>
            <span>English</span>
          </div>
        </div>
      </div>
    </div>
  );
}