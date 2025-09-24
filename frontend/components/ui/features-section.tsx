import { Bot, Wrench, Globe, Play, Search, Settings, Zap, Shield } from "lucide-react"

const features = [
  {
    icon: Bot,
    title: "AI Agent Builder",
    description: "Create intelligent agents with our intuitive drag-and-drop interface. No coding required.",
    gradient: "from-blue-500 to-purple-600",
    position: "translate-y-0"
  },
  {
    icon: Wrench,
    title: "Tool Marketplace",
    description: "Access 50+ pre-built tools or create custom ones. From web search to database queries.",
    gradient: "from-purple-500 to-pink-600",
    position: "translate-y-4"
  },
  {
    icon: Globe,
    title: "Multi-Platform Integration",
    description: "Deploy your agents to WhatsApp, Telegram, Discord, Slack, and more with one click.",
    gradient: "from-green-500 to-blue-600",
    position: "translate-y-8"
  },
  {
    icon: Play,
    title: "Real-time Playground",
    description: "Test your agents instantly in our interactive playground before deployment.",
    gradient: "from-orange-500 to-red-600",
    position: "translate-y-12"
  }
]

export default function FeaturesSection() {
  return (
    <section className="bg-white relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-blue-100 rounded-full opacity-30 blur-xl"></div>
        <div className="absolute bottom-20 right-10 w-40 h-40 bg-purple-100 rounded-full opacity-30 blur-xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-50 to-purple-50 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 mb-20">
        {/* Section Header */}
        <div className="text-center mb-20 sm:mb-20 lg:mb-20 pt-12 sm:pt-16 lg:pt-20">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
            Everything you need to build powerful AI agents
          </h2>
          <p className="text-sm sm:text-base lg:text-lg xl:text-xl text-gray-600 max-w-2xl sm:max-w-3xl mx-auto leading-relaxed px-4">
            From simple chatbots to complex enterprise solutions, Drixai provides all the tools you need to create intelligent, scalable AI agents.
          </p>
        </div>

        {/* Main Interface Container */}
        <div className="relative max-w-6xl mx-auto pb-12 sm:pb-16 lg:pb-20">
          {/* Base Interface Layer */}
          <div className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200/50 p-4 sm:p-6 lg:p-8 xl:p-12 relative">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 pb-4 sm:pb-6 border-b border-white/20">
              <div className="flex items-center space-x-3 sm:space-x-4 mb-4 sm:mb-0">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl flex items-center justify-center">
                  <Bot className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm sm:text-base">Drixai Studio</h3>
                  <p className="text-xs sm:text-sm text-white/80">AI Agent Development Platform</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Search className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Settings className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                </div>
                <div className="w-6 h-6 sm:w-8 sm:h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <span className="text-white text-xs sm:text-sm font-medium">AF</span>
                </div>
              </div>
            </div>

            {/* Content Grid */}
            <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
              {/* Left Column - Main Content */}
              <div className="space-y-4 sm:space-y-6">
                <div className="bg-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-white/20">
                  <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                    <div className="w-2 h-2 sm:w-3 sm:h-3 bg-green-400 rounded-full"></div>
                    <span className="text-xs sm:text-sm font-medium text-white">Active Agents</span>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-white/10 backdrop-blur-sm rounded-lg sm:rounded-xl border border-white/20">
                        <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-300 rounded-full"></div>
                        <div className="flex-1 h-3 sm:h-4 bg-white/20 rounded animate-pulse"></div>
                        <div className="w-12 sm:w-16 h-3 sm:h-4 bg-white/20 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Floating Feature Cards */}
              <div className="relative hidden lg:block">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className={`absolute ${feature.position} right-0 w-64 sm:w-72 lg:w-80 bg-white/95 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-gray-200/50 p-4 sm:p-6 hover:shadow-2xl transition-all duration-300 group z-${index + 1}`}
                    style={{ zIndex: index + 1 }}
                  >
                    {/* Card Header */}
                    <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br ${feature.gradient} rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <feature.icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">{feature.title}</h3>
                        <div className="flex items-center space-x-1 sm:space-x-2">
                          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-gray-500">Active</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Content */}
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed mb-3 sm:mb-4">
                      {feature.description}
                    </p>

                    {/* Action Button */}
                    <button className="w-full bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 border border-gray-200 rounded-lg sm:rounded-xl py-2 text-xs sm:text-sm font-medium text-gray-700 transition-all duration-200 group-hover:shadow-sm">
                      Learn More
                    </button>
                  </div>
                ))}
              </div>

              {/* Mobile Feature Cards */}
              <div className="lg:hidden space-y-4">
                {features.map((feature, index) => (
                  <div
                    key={index}
                    className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg border border-gray-200/50 p-4"
                  >
                    {/* Card Header */}
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`w-10 h-10 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center`}>
                        <feature.icon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-gray-500">Active</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Content */}
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">
                      {feature.description}
                    </p>

                    {/* Action Button */}
                    <button className="w-full bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 border border-gray-200 rounded-xl py-2 text-sm font-medium text-gray-700 transition-all duration-200">
                      Learn More
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Floating Elements */}
          <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-gray-200/50 p-3 sm:p-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
                <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-900">Secure</p>
                <p className="text-xs text-gray-500">Enterprise-grade</p>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-2 -left-2 sm:-bottom-4 sm:-left-4 bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg border border-gray-200/50 p-3 sm:p-4">
            <div className="text-center">
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-1 sm:mb-2">
                <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-gray-900">Fast</p>
              <p className="text-xs text-gray-500">Real-time</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
} 