import Link from "next/link";
import Image from "next/image";
import foodtracker from "../app/images/streerfood4.webp";

export default function HomePage() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-green-200 via-blue-200 to-purple-300">
      <main className="container mx-auto flex flex-col items-center justify-center text-center p-8 bg-white/50 backdrop-blur-sm rounded-2xl shadow-lg max-w-2xl">
        <Image
          src={foodtracker}
          alt="Food Tracker Logo"
          width={300}
          height={300}
          className="rounded-lg"
        />

        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-800 mt-6">
          Welcome to <span className="text-green-600">Food Tracker</span>
        </h1>

        <p className="text-xl text-gray-600 mt-4 mb-8">
          Track your meals, count your calories, and achieve your health goals!
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/auth/register" passHref>
            <button className="w-48 px-8 py-3 bg-green-500 text-white font-bold rounded-full hover:bg-green-600 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75">
              Register
            </button>
          </Link>
          <Link href="/auth/login" passHref>
            <button className="w-48 px-8 py-3 bg-gray-700 text-white font-bold rounded-full hover:bg-gray-800 transition-transform transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-75">
              Login
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}
