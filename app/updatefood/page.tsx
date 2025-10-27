"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { firebasedb } from "@/app/utils/firebaseConfig";
import { supabase } from "@/app/utils/supabaseClient";

interface FoodItem {
  id: string;
  date: string;
  name: string;
  meal: string;
  imageUrl: string | null;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditFoodPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [foodItem, setFoodItem] = useState<FoodItem | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const foodDocRef = doc(firebasedb, "food", id);
        const foodDoc = await getDoc(foodDocRef);

        if (!foodDoc.exists()) {
          alert("Food item not found!");
          router.push("/dashboard");
          return;
        }

        const data = foodDoc.data();
        const mapped: FoodItem = {
          id: foodDoc.id,
          date: data.fooddate_at ?? "",
          name: data.foodname ?? "",
          meal: data.meal ?? "",
          imageUrl: data.food_image_url ?? null,
        };
        setFoodItem(mapped);
        setImagePreview(mapped.imageUrl);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, router]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    if (!foodItem) return;
    const { name, value } = e.target;
    setFoodItem((prev) => (prev ? { ...prev, [name]: value } : null));
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
    if (!foodItem) return;

    setIsUpdating(true);
    try {
      let newImageUrl = foodItem.imageUrl;

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

        if (foodItem.imageUrl) {
          try {
            let pathInBucket: string | null = null;
            try {
              const url = new URL(foodItem.imageUrl);
              const idx = url.pathname.indexOf("/Foodtb_bk/");
              if (idx >= 0) {
                pathInBucket = decodeURIComponent(
                  url.pathname.substring(idx + "/Foodtb_bk/".length)
                );
              }
            } catch {
              const marker = "/Foodtb_bk/";
              const idx2 = foodItem.imageUrl.indexOf(marker);
              if (idx2 >= 0) {
                pathInBucket = decodeURIComponent(
                  foodItem.imageUrl.substring(idx2 + marker.length)
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
        const filePath = `food-images/${fileName}`;

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

      const foodDocRef = doc(firebasedb, "food", foodItem.id);
      await updateDoc(foodDocRef, {
        foodname: foodItem.name,
        meal: foodItem.meal,
        fooddate_at: foodItem.date,
        food_image_url: newImageUrl,
        update_at: new Date().toISOString(),
      });

      alert("Food item updated successfully!");
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      alert(`Update failed: ${msg}`);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading || !foodItem) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-xl text-gray-600">Loading food data...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <main className="container mx-auto bg-white rounded-2xl shadow-xl max-w-lg p-8 border border-gray-200">
        <h1 className="text-4xl font-bold text-gray-800 mb-6 text-center">
          Edit Meal
        </h1>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Food Picture
            </label>
            <div className="relative w-full h-48 bg-gray-200 rounded-lg flex items-center justify-center mb-4 border-2 border-dashed border-gray-300 overflow-hidden">
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="Food Preview"
                  width={400}
                  height={192}
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-gray-500">No Image Preview</span>
              )}
            </div>
            <label
              htmlFor="foodPicture"
              className="w-full text-center cursor-pointer bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors block"
            >
              Change Image
            </label>
            <input
              id="foodPicture"
              name="foodPicture"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>

          <div>
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="name"
            >
              Food Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={foodItem.name}
              onChange={handleInputChange}
              required
              className="shadow-sm appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div>
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="meal"
            >
              Meal
            </label>
            <select
              id="meal"
              name="meal"
              value={foodItem.meal}
              onChange={handleInputChange}
              className="shadow-sm border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option>Breakfast</option>
              <option>Lunch</option>
              <option>Dinner</option>
              <option>Snack</option>
            </select>
          </div>

          <div>
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="date"
            >
              Date
            </label>
            <input
              id="date"
              name="date"
              type="date"
              value={foodItem.date}
              onChange={handleInputChange}
              required
              className="shadow-sm appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Link href="/dashboard" passHref className="w-full">
              <button
                type="button"
                className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-full transition-transform transform hover:scale-105"
              >
                Cancel
              </button>
            </Link>
            <button
              type="submit"
              disabled={isUpdating}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-full transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? "Updating..." : "Update Meal"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
