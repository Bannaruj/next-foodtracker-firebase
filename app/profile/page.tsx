// app/profile/page.tsx

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "../utils/supabaseClient";

interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  gender: string;
  profilePicture: string | null;
}

interface DbUser {
  id: string;
  created_at?: string | null;
  update_at?: string | null;
  fullname?: string | null;
  email?: string | null;
  password?: string | null;
  gender?: string | null;
  user_image_url?: string | null;
}

export default function ProfilePage() {
  const [formData, setFormData] = useState<UserProfile | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log("Session:", session);
        if (!session?.user) {
          alert("Please login first");
          window.location.href = "/auth/login";
          return;
        }
        console.log("User ID:", session.user.id);

        console.log("Fetching user data for ID:", session.user.id);
        const selectResp = await supabase
          .from("user_tb")
          .select("*")
          .eq("id", session.user.id)
          .single<DbUser>();

        console.log("Select response:", selectResp);
        let userRow: DbUser | null = selectResp.data ?? null;
        const selectError = selectResp.error;

        if (selectError && !userRow) {
          console.log("No user record found, creating default profile");
          const fullNameMeta =
            (session.user as { user_metadata?: { full_name?: string } })
              .user_metadata?.full_name ?? "";

          userRow = {
            id: session.user.id,
            email: session.user.email ?? "",
            fullname: fullNameMeta,
            gender: "Male",
            user_image_url: null,
          } as DbUser;
        }

        if (!userRow) {
          throw new Error("Profile not found after insert");
        }

        const userProfile: UserProfile = {
          id: userRow.id,
          fullName: userRow.fullname ?? "",
          email: userRow.email ?? session.user.email ?? "",
          gender: userRow.gender ?? "Male",
          profilePicture: userRow.user_image_url ?? null,
        };

        setFormData(userProfile);
        setImagePreview(userProfile.profilePicture);
      } catch (err) {
        console.error("Error fetching user profile:", err);
        console.error("Error details:", {
          message: err instanceof Error ? err.message : "Unknown error",
          stack: err instanceof Error ? err.stack : undefined,
          error: err,
        });

        let errorMessage = "Unknown error";
        if (err instanceof Error) {
          errorMessage = err.message;
        } else if (typeof err === "string") {
          errorMessage = err;
        } else if (err && typeof err === "object") {
          errorMessage = JSON.stringify(err);
        }

        console.error("Final error message:", errorMessage);
        alert(`Failed to load profile data: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => (prev ? { ...prev, [name]: value } : null));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!formData) return;

    setIsUpdating(true);
    try {
      let newImageUrl = formData.profilePicture;

      if (selectedFile) {
        if (selectedFile.size > 5 * 1024 * 1024) {
          throw new Error("File size must be less than 5MB");
        }

        // ตรวจสอบประเภทไฟล์
        const allowedTypes = [
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/gif",
          "image/webp",
        ];
        if (!allowedTypes.includes(selectedFile.type)) {
          throw new Error(
            "Only image files are allowed (JPEG, PNG, GIF, WebP)"
          );
        }

        if (formData.profilePicture) {
          try {
            let pathInBucket: string | null = null;
            try {
              const url = new URL(formData.profilePicture);
              const idx = url.pathname.indexOf("/Foodtb_bk/");
              if (idx >= 0) {
                pathInBucket = decodeURIComponent(
                  url.pathname.substring(idx + "/Foodtb_bk/".length)
                );
              }
            } catch {
              const marker = "/Foodtb_bk/";
              const idx2 = formData.profilePicture.indexOf(marker);
              if (idx2 >= 0) {
                pathInBucket = decodeURIComponent(
                  formData.profilePicture.substring(idx2 + marker.length)
                );
              }
            }

            if (pathInBucket) {
              await supabase.storage.from("Foodtb_bk").remove([pathInBucket]);
            }
          } catch (imgErr) {
            console.warn("Old image removal failed:", imgErr);
          }
        }

        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `profile-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("Foodtb_bk")
          .upload(filePath, selectedFile);

        if (uploadError) {
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("Foodtb_bk").getPublicUrl(filePath);

        newImageUrl = publicUrl;
      }

      const { error } = await supabase.from("user_tb").upsert({
        id: formData.id,
        fullname: formData.fullName,
        email: formData.email,
        gender: formData.gender,
        user_image_url: newImageUrl,
      });

      if (error) throw error;

      alert("Profile updated successfully!");

      setFormData((prev) =>
        prev ? { ...prev, profilePicture: newImageUrl } : null
      );
      setImagePreview(newImageUrl);
      setSelectedFile(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      alert(`Update failed: ${msg}`);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="text-center">
          <p className="text-xl text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="text-center">
          <p className="text-xl text-gray-600">Failed to load profile data</p>
          <Link href="/dashboard" className="text-blue-500 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <main className="container mx-auto bg-white rounded-2xl shadow-xl max-w-md p-8 border border-gray-200">
        <h1 className="text-4xl font-bold text-gray-800 mb-6 text-center">
          Edit Profile
        </h1>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden ring-4 ring-green-200 relative">
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Profile Preview"
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              ) : (
                <span className="text-gray-500 text-sm">No Image</span>
              )}
            </div>
            <label
              htmlFor="profilePicture"
              className="cursor-pointer bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Change Picture
            </label>
            <input
              id="profilePicture"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          <div>
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="fullName"
            >
              Full Name
            </label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={formData.fullName}
              onChange={handleInputChange}
              required
              className="shadow-sm appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="email"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              className="shadow-sm appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="gender"
            >
              Gender
            </label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleInputChange}
              className="shadow-sm border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Link href="/dashboard" passHref className="w-full">
              <button
                type="button"
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-full transition-transform transform hover:scale-105"
              >
                Back
              </button>
            </Link>
            <button
              type="submit"
              disabled={isUpdating}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-full transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? "Updating..." : "Save Changes"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
