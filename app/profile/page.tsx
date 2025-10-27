"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { firebasedb } from "../utils/firebaseConfig";
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

interface User {
  id: string;
  fullname: string;
  email: string;
  gender: string;
  user_image_url: string | null;
  password?: string;
}

export default function ProfilePage() {
  const [formData, setFormData] = useState<UserProfile | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser) {
      const userData = JSON.parse(currentUser);
      setUser(userData);

      try {
        console.log("User ID:", userData.id);
        console.log("Fetching user data for ID:", userData.id);

        const userDocRef = doc(firebasedb, "user", userData.id);
        getDoc(userDocRef)
          .then((userDoc) => {
            console.log("Select response:", userDoc);
            let userRow: DbUser | null = userDoc.exists()
              ? ({ id: userData.id, ...userDoc.data() } as DbUser)
              : null;

            if (!userRow) {
              console.log("No user record found, using localStorage data");
              userRow = userData as DbUser;
            }

            const userProfile: UserProfile = {
              id: userRow.id,
              fullName: userRow.fullname ?? "",
              email: userRow.email ?? "",
              gender: userRow.gender ?? "Male",
              profilePicture: userRow.user_image_url ?? null,
            };

            setFormData(userProfile);
            setImagePreview(userProfile.profilePicture);
          })
          .catch((err) => {
            console.error("Error fetching user profile:", err);
            const userProfile: UserProfile = {
              id: userData.id,
              fullName: userData.fullname ?? "",
              email: userData.email ?? "",
              gender: userData.gender ?? "Male",
              profilePicture: userData.user_image_url ?? null,
            };
            setFormData(userProfile);
            setImagePreview(userProfile.profilePicture);
          });
      } catch (err) {
        console.error("Error:", err);
        alert("Failed to load profile data");
      }
    } else {
      alert("Please login first");
      window.location.href = "/auth/login";
    }
    setIsLoading(false);
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
    if (!formData || !user) return;

    setIsUpdating(true);
    try {
      let newImageUrl = formData.profilePicture;

      if (selectedFile) {
        if (selectedFile.size > 5 * 1024 * 1024) {
          throw new Error("File size must be less than 5MB");
        }

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
              const idx = url.pathname.indexOf("/usertb_bk/");
              if (idx >= 0) {
                pathInBucket = decodeURIComponent(
                  url.pathname.substring(idx + "/usertb_bk/".length)
                );
              }
            } catch {
              const marker = "/usertb_bk/";
              const idx2 = formData.profilePicture.indexOf(marker);
              if (idx2 >= 0) {
                pathInBucket = decodeURIComponent(
                  formData.profilePicture.substring(idx2 + marker.length)
                );
              }
            }

            if (pathInBucket) {
              await supabase.storage.from("usertb_bk").remove([pathInBucket]);
            }
          } catch (imgErr) {
            console.warn("Old image removal failed:", imgErr);
          }
        }

        const fileExt = selectedFile.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `profile-images/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("usertb_bk")
          .upload(filePath, selectedFile);

        if (uploadError) {
          throw new Error(`Failed to upload image: ${uploadError.message}`);
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from("usertb_bk").getPublicUrl(filePath);

        newImageUrl = publicUrl;
      }

      const userDocRef = doc(firebasedb, "user", user.id);
      await setDoc(
        userDocRef,
        {
          fullname: formData.fullName,
          email: formData.email,
          gender: formData.gender,
          user_image_url: newImageUrl,
          update_at: new Date().toISOString(),
        },
        { merge: true }
      );

      const updatedUser = {
        ...user,
        fullname: formData.fullName,
        email: formData.email,
        gender: formData.gender,
        user_image_url: newImageUrl,
      };
      localStorage.setItem("currentUser", JSON.stringify(updatedUser));

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
                  unoptimized
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
