"use client";

import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { firebasedb } from "@/app/utils/firebaseConfig";
import { supabase } from "@/app/utils/supabaseClient";
import Link from "next/link";
import Image from "next/image";

interface FoodRow {
  id: string;
  foodname: string | null;
  meal: string | null;
  fooddate_at: string | null;
  food_image_url: string | null;
}

const formatDate = (date: string | unknown): string => {
  if (!date) return "-";
  if (typeof date === "string") return date;
  if (date && typeof date === "object") {
    const dateObj = date as Record<string, unknown>;
    if ("toDate" in dateObj && typeof dateObj.toDate === "function") {
      return dateObj.toDate().toLocaleDateString();
    }
    if ("seconds" in dateObj && typeof dateObj.seconds === "number") {
      return new Date(dateObj.seconds * 1000).toLocaleDateString();
    }
  }
  return "-";
};

interface User {
  id: string;
  fullname: string;
  email: string;
  gender: string;
  user_image_url: string | null;
}

export default function DashBoardPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [userImage, setUserImage] = useState<string | null>(null);
  const [foods, setFoods] = useState<FoodRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const currentUser = localStorage.getItem("currentUser");
    if (currentUser) {
      const userData = JSON.parse(currentUser);
      setUser(userData);
      setUserImage(userData.user_image_url || null);
    } else {
      window.location.href = "/auth/login";
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    setIsLoading(true);
    setLoadError(null);

    const q = query(
      collection(firebasedb, "food"),
      orderBy("fooddate_at", "desc")
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const foodData: FoodRow[] = [];
        snapshot.forEach((doc) => {
          foodData.push({
            id: doc.id,
            ...doc.data(),
          } as FoodRow);
        });
        setFoods(foodData);
        setIsLoading(false);
      },
      (error) => {
        console.error("Error fetching foods:", error);
        setLoadError(error.message);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleDelete = async (food: FoodRow) => {
    if (!food?.id) return;
    const confirmed = window.confirm("Delete this food item?");
    if (!confirmed) return;

    setIsDeletingId(food.id);
    try {
      if (food.food_image_url) {
        try {
          let pathInBucket: string | null = null;
          try {
            const url = new URL(food.food_image_url);
            const idx = url.pathname.indexOf("/Foodtb_bk/");
            if (idx >= 0) {
              pathInBucket = decodeURIComponent(
                url.pathname.substring(idx + "/Foodtb_bk/".length)
              );
            }
          } catch {
            const marker = "/Foodtb_bk/";
            const idx2 = food.food_image_url.indexOf(marker);
            if (idx2 >= 0) {
              pathInBucket = decodeURIComponent(
                food.food_image_url.substring(idx2 + marker.length)
              );
            }
          }

          if (pathInBucket) {
            await supabase.storage.from("Foodtb_bk").remove([pathInBucket]);
          }
        } catch (imgErr) {
          console.warn("Image removal failed:", imgErr);
        }
      }

      await deleteDoc(doc(firebasedb, "food", food.id));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      alert(`Failed to delete: ${msg}`);
    } finally {
      setIsDeletingId(null);
    }
  };

  const filteredFoods = foods.filter((f) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    const formattedDate = formatDate(f.fooddate_at);
    return (
      (f.foodname ?? "").toLowerCase().includes(term) ||
      (f.meal ?? "").toLowerCase().includes(term) ||
      formattedDate.toLowerCase().includes(term)
    );
  });

  const totalPages = 1;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-200 via-blue-200 to-purple-300 p-4 sm:p-6 lg:p-8">
      <main className="container mx-auto bg-white/70 backdrop-blur-md rounded-2xl shadow-lg p-6">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Link href="/profile" passHref>
              <div className="cursor-pointer">
                <Image
                  src={
                    userImage && userImage.startsWith("http")
                      ? userImage
                      : "https://ui-avatars.com/api/?name=User&background=8b5cf6&color=fff&rounded=true&size=48"
                  }
                  alt="Profile Avatar"
                  width={48}
                  height={48}
                  className="w-12 h-12 rounded-full border-2 border-purple-300 shadow-sm hover:scale-105 transition-transform object-cover"
                  onError={() => setUserImage(null)}
                  priority
                  unoptimized
                />
              </div>
            </Link>
            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search food..."
                value={searchTerm}
                onChange={handleSearchChange}
                className="pl-10 pr-4 py-2 border rounded-full w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <svg
                className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-4.35-4.35M16.65 10.35a6.3 6.3 0 11-12.6 0 6.3 6.3 0 0112.6 0z"
                ></path>
              </svg>
            </div>
          </div>
          <Link href="/addfood" passHref>
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2 bg-green-500 text-white font-bold rounded-full hover:bg-green-600 transition-transform transform hover:scale-105">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 4v16m8-8H4"
                ></path>
              </svg>
              <span>Add Food</span>
            </button>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left table-auto">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Date</th>
                <th className="p-4 font-semibold text-gray-600">Picture</th>
                <th className="p-4 font-semibold text-gray-600">Food</th>
                <th className="p-4 font-semibold text-gray-600">Meal</th>
                <th className="p-4 font-semibold text-gray-600 text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-gray-500">
                    Loading...
                  </td>
                </tr>
              )}
              {loadError && !isLoading && (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-red-500">
                    {loadError}
                  </td>
                </tr>
              )}
              {!isLoading && !loadError && filteredFoods.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center p-8 text-gray-500">
                    No food found.
                  </td>
                </tr>
              )}
              {!isLoading &&
                !loadError &&
                filteredFoods.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="p-4 text-gray-600 align-middle">
                      {formatDate(f.fooddate_at)}
                    </td>
                    <td className="p-4 align-middle">
                      {f.food_image_url ? (
                        <Image
                          src={f.food_image_url}
                          alt={f.foodname ?? "Food"}
                          width={64}
                          height={64}
                          className="w-16 h-16 object-cover rounded-md border"
                          unoptimized
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded-md border flex items-center justify-center text-gray-500 text-xs">
                          No Image
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-gray-600 align-middle">
                      {f.foodname ?? "-"}
                    </td>
                    <td className="p-4 text-gray-600 align-middle">
                      {f.meal ?? "-"}
                    </td>
                    <td className="p-4 text-gray-600 align-middle text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          href={`/updatefood/${f.id}`}
                          className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(f)}
                          className="px-3 py-1 text-sm rounded-md text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isDeletingId === f.id}
                          title={
                            isDeletingId === f.id ? "Deleting..." : "Delete"
                          }
                        >
                          {isDeletingId === f.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-6 gap-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-4 py-2 border rounded-md ${
                  currentPage === page
                    ? "bg-green-500 text-white"
                    : "bg-white hover:bg-gray-100"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-white border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
