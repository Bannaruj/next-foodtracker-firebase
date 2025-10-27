"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs } from "firebase/firestore";
import { firebasedb } from "@/app/utils/firebaseConfig";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const q = query(
        collection(firebasedb, "user"),
        where("email", "==", email),
        where("password", "==", password)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      localStorage.setItem(
        "currentUser",
        JSON.stringify({
          id: userDoc.id,
          ...userData,
        })
      );

      console.log("Logged in user:", userData);
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("Login Error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred during login.";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-200 via-blue-200 to-purple-300 p-4">
      {isClient ? (
        <main className="container mx-auto flex flex-col items-center justify-center bg-white/60 backdrop-blur-md rounded-2xl shadow-lg max-w-sm p-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-6">
            Welcome Back!
          </h1>
          <p className="text-gray-600 mb-8">Login to continue tracking.</p>

          <form onSubmit={handleSubmit} className="w-full">
            {error && (
              <p className="text-red-500 mb-4 font-semibold p-2 bg-red-100 rounded-lg">
                {error}
              </p>
            )}

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
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="mb-6">
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
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-full focus:outline-none focus:shadow-outline transform transition-transform hover:scale-105 disabled:bg-gray-400"
                type="submit"
                disabled={loading}
              >
                {loading ? "Logging In..." : "Login"}
              </button>
            </div>
          </form>

          <p className="text-center text-gray-600 text-sm mt-8">
            Don&apos;t have an account?{" "}
            <Link
              href="/auth/register"
              className="font-bold text-green-600 hover:text-green-800 transition-colors"
            >
              Register here
            </Link>
          </p>
        </main>
      ) : (
        <div className="text-center p-8 bg-white/60 backdrop-blur-md rounded-2xl shadow-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto mb-3"></div>
          <p className="text-gray-700">Loading authentication form...</p>
        </div>
      )}
    </div>
  );
}
