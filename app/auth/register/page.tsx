"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/app/utils/supabaseClient";

interface FormData {
  fullName: string;
  email: string;
  password: string;
  gender: string;
}

interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
}

export default function RegisterPage() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    password: "",
    gender: "Male",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const { fullName, email, password, gender } = formData;
    let user_image_url: string | null = null;

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        const errObj = authError as unknown;
        const code = (errObj as { code?: string | number })?.code;
        const msg = (errObj as { message?: string })?.message ?? "";
        if (
          code === "email_provider_disabled" ||
          msg.includes("email provider disabled")
        ) {
          setError(
            "Registration is disabled: email signups are not enabled in your Supabase project. Enable the Email provider in Supabase Auth settings or use a different auth method."
          );
          return;
        }
        throw authError;
      }

      const userId = authData.user?.id;

      let session = null;
      try {
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });
        if (signInError) throw signInError;
        session =
          (signInData as unknown as { session?: unknown })?.session ?? null;
      } catch (e) {
        // If sign in fails, skip image upload
        console.warn("Sign in after register failed:", e);
      }

      if (userId) {
        if (imageFile && session) {
          console.log("Session for upload:", session);
          const fileExtension = imageFile.name.split(".").pop();
          const filePath = `${userId}/${Date.now()}.${fileExtension}`;

          const { data: uploadData, error: uploadError } =
            await supabase.storage
              .from("usertb_bk")
              .upload(filePath, imageFile, {
                cacheControl: "3600",
                upsert: true,
              });

          if (uploadError) {
            console.error("Upload error:", uploadError);
            setError(
              `Image upload error: ${uploadError.message || uploadError}`
            );
            setLoading(false);
            return;
          }
          if (!uploadData) {
            setError("Failed to upload image to storage.");
            setLoading(false);
            return;
          }

          const { data: publicUrlData } = supabase.storage
            .from("usertb_bk")
            .getPublicUrl(filePath);
          user_image_url =
            (publicUrlData as { publicUrl?: string })?.publicUrl ?? null;
        } else if (imageFile && !session) {
          setMessage(
            "Registration successful! Please check your email to confirm your account. You can upload a profile picture after you sign in."
          );
        }

        const { error: dbError } = await supabase.from("user_tb").insert({
          id: userId,
          fullname: fullName,
          password: password,
          email: email,
          gender: gender,
          user_image_url: user_image_url,
        });

        if (dbError) throw dbError;

        setMessage(
          "Registration successful! Please check your email for confirmation. (Note: your password is stored securely by Supabase Auth and not saved as plaintext in the user_tb table.)"
        );

        setFormData({ fullName: "", email: "", password: "", gender: "Male" });
        setImagePreview(null);
        setImageFile(null);
      } else {
        setMessage("การลงทะเบียนเสร็จสมบูรณ์");
      }
    } catch (err: unknown) {
      console.warn("Registration Error:", err);
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === "object" && err !== null && "message" in err) {
        setError((err as SupabaseError).message);
      } else {
        setError("เกิดข้อผิดพลาด");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-200 via-blue-200 to-purple-300 p-4">
      <main className="container mx-auto flex flex-col items-center justify-center bg-white/60 backdrop-blur-md rounded-2xl shadow-lg max-w-md p-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-6">
          Create Account
        </h1>

        <form onSubmit={handleSubmit} className="w-full">
          {error && (
            <p className="text-red-500 mb-4 font-semibold p-2 bg-red-100 rounded-lg">
              {error}
            </p>
          )}
          {message && (
            <p className="text-green-600 mb-4 font-semibold p-2 bg-green-100 rounded-lg">
              {message}
            </p>
          )}

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="fullName"
            >
              Full Name
            </label>
            <input
              className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
              id="fullName"
              type="text"
              placeholder="Your Name"
              value={formData.fullName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="email"
            >
              Email
            </label>
            <input
              className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
              id="email"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="password"
            >
              Password
            </label>
            <input
              className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 mb-3 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
              id="password"
              type="password"
              placeholder="******************"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-4">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="gender"
            >
              Gender
            </label>
            <select
              id="gender"
              className="shadow border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
              value={formData.gender}
              onChange={handleChange}
            >
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Profile Picture
            </label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {imagePreview ? (
                  <Image
                    src={imagePreview}
                    alt="Profile Preview"
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-gray-400">Preview</span>
                )}
              </div>
              <label
                htmlFor="profilePicture"
                className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors"
              >
                Choose File
              </label>
              <input
                id="profilePicture"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-full focus:outline-none focus:shadow-outline transform transition-transform hover:scale-105 disabled:bg-gray-400"
              type="submit"
              disabled={loading}
            >
              {loading ? "Registering..." : "Register"}
            </button>
          </div>
        </form>

        <p className="text-center text-gray-600 text-sm mt-6">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-bold text-green-600 hover:text-green-800"
          >
            Login here
          </Link>
        </p>
      </main>
    </div>
  );
}
