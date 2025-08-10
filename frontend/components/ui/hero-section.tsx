import { LogIn, UserPlus } from "lucide-react"
import { HeroFlow } from "./HeroFlow"
import { useState, useEffect } from "react"
import Link from "next/link"

export default function HeroSection() {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Small delay to ensure smooth loading
    const timer = setTimeout(() => {
      setIsLoaded(true)
    }, 100)

    return () => clearTimeout(timer)
  }, [])

  return (
    <section className="relative min-h-[60vh] sm:min-h-[70vh] lg:min-h-[80vh] bg-white overflow-hidden">
      {/* Background dot grid pattern */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, #E5E5E5 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0",
        }}
      />

      {/* Blue gradient overlay */}
      <div
        className="absolute top-0 right-0 w-3/4 h-full"
        style={{
          background: "radial-gradient(ellipse 800px 600px at 70% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)",
        }}
      />

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div className="space-y-4 sm:space-y-6 text-center lg:text-left">
            <div className="space-y-3 sm:space-y-4">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
                Build your ideas{" "}
                <span className="bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#06B6D4] bg-clip-text text-transparent font-extrabold">
                  with AgentFlow
                </span>
              </h1>

              <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-gray-600 leading-relaxed max-w-lg mx-auto lg:mx-0">
                A customizable platform for building AI agents and interactive workflows. 
                Create intelligent agents with our intuitive drag-and-drop interface.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
              <Link href="/auth/login" className="w-full sm:w-auto">
                <button
                  className="w-full sm:w-auto bg-[#3B82F6] hover:bg-[#2563EB] text-white px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-semibold rounded-full flex items-center justify-center transition-colors"
                >
                  <LogIn className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Log In
                </button>
              </Link>

              <Link href="/auth/register" className="w-full sm:w-auto">
                <button
                  className="w-full sm:w-auto border-r-2 border-[#3B82F6] text-[#3B82F6] hover:bg-[#3B82F6] hover:text-white px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-semibold rounded-full bg-transparent flex items-center justify-center transition-colors shadow-[0_4px_14px_rgba(59,130,246,0.3)]"
                >
                  <UserPlus className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                  Sign Up
                </button>
              </Link>
            </div>
          </div>

          {/* Right Interactive Flow Diagram */}
          <div className="relative order-first lg:order-last">
            {isLoaded ? (
              <div className="w-full h-[300px] sm:h-[400px] lg:h-[500px]">
                <HeroFlow />
              </div>
            ) : (
              <div className="w-full h-[300px] sm:h-[400px] lg:h-[500px] rounded-2xl bg-gray-100 animate-pulse flex items-center justify-center">
                <div className="text-gray-400">Loading...</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
