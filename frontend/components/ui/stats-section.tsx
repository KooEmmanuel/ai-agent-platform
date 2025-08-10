import { Users, Zap, Globe, Shield, ArrowRight } from "lucide-react"

const stats = [
  {
    icon: Users,
    value: "10,000+",
    label: "Active Developers",
    description: "Building AI agents worldwide",
    gradient: "from-blue-500 to-purple-600"
  },
  {
    icon: Zap,
    value: "50+",
    label: "Pre-built Tools",
    description: "Ready-to-use integrations",
    gradient: "from-purple-500 to-pink-600"
  },
  {
    icon: Globe,
    value: "15+",
    label: "Platforms Supported",
    description: "From WhatsApp to Slack",
    gradient: "from-green-500 to-blue-600"
  },
  {
    icon: Shield,
    value: "99.9%",
    label: "Uptime",
    description: "Enterprise-grade reliability",
    gradient: "from-orange-500 to-red-600"
  }
]

export default function StatsSection() {
  return (
    <section className="py-12 sm:py-16 lg:py-20 xl:py-32 bg-gradient-to-br from-gray-50 via-white to-blue-50/30 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, #3B82F6 1px, transparent 1px), radial-gradient(circle at 75% 75%, #8B5CF6 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <div className="inline-flex items-center space-x-2 bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-full px-4 sm:px-6 py-2 sm:py-3 mb-4 sm:mb-6 shadow-sm">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs sm:text-sm font-medium text-gray-700">Growing Community</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
            Trusted by developers worldwide
          </h2>
          <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-gray-600 max-w-2xl sm:max-w-3xl mx-auto leading-relaxed px-4">
            Join thousands of developers who are building the future with AgentFlow
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-12 sm:mb-16 lg:mb-20">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="group relative"
            >
              {/* Card */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-200/50 shadow-sm hover:shadow-xl transition-all duration-300 group-hover:-translate-y-1 sm:group-hover:-translate-y-2">
                {/* Icon */}
                <div className={`w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 bg-gradient-to-br ${stat.gradient} rounded-lg sm:rounded-xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
                </div>

                {/* Stats */}
                <div className="space-y-2 sm:space-y-3">
                  <div className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900">
                    {stat.value}
                  </div>
                  <div className="text-sm sm:text-base lg:text-lg font-semibold text-gray-700">
                    {stat.label}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                    {stat.description}
                  </div>
                </div>

                {/* Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Call to Action */}
        <div className="relative">
          <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 text-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-full blur-2xl sm:blur-3xl"></div>
              <div className="absolute bottom-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-full blur-2xl sm:blur-3xl"></div>
            </div>

            <div className="relative z-10 text-center">
              <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-3 sm:mb-4">
                Ready to build your first AI agent?
              </h3>
              <p className="text-sm sm:text-base lg:text-lg text-white/90 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed px-4">
                Start building intelligent agents in minutes, not months. No coding required.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                <button className="w-full sm:w-auto bg-white text-gray-900 hover:bg-gray-100 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 group">
                  <span className="text-sm sm:text-base">Get Started Free</span>
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform duration-200" />
                </button>
                <button className="w-full sm:w-auto border-2 border-white/30 hover:border-white/50 text-white hover:bg-white/10 px-6 sm:px-8 py-3 sm:py-4 rounded-full font-semibold transition-all duration-200 backdrop-blur-sm text-sm sm:text-base">
                  View Documentation
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
} 