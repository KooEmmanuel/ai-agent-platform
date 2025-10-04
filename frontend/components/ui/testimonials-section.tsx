import { AnimatedTestimonials } from "./animated-testimonials"

const testimonials = [
  {
    quote:
      "Drixai has revolutionized our customer service. We built an AI assistant that handles 80% of our inquiries automatically.",
    name: "Sarah Chen",
    designation: "Customer Success Manager at RetailCorp",
    src: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    quote:
      "As a small business owner, I never thought I could afford AI. Drixai made it accessible and affordable for us.",
    name: "Marcus Rodriguez",
    designation: "Owner at Rodriguez Consulting",
    src: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    quote:
      "The no-code approach is perfect for our marketing team. We created chatbots for all our campaigns without any technical background.",
    name: "Dr. Emily Watson",
    designation: "Marketing Director at HealthTech",
    src: "https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    quote:
      "Our sales team productivity increased by 40% with the AI assistant handling lead qualification and follow-ups.",
    name: "James Kim",
    designation: "Sales Director at FinanceFlow",
    src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
  {
    quote:
      "The WhatsApp integration was a game-changer for our international customers. We can now support them 24/7 in their language.",
    name: "Lisa Thompson",
    designation: "Operations Manager at GlobalTrade",
    src: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=3540&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
]

export default function TestimonialsSection() {
  return (
    <section className="py-12 sm:py-16 lg:py-20 xl:py-32 bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-3 sm:mb-4">
            Loved by users worldwide
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-300 max-w-2xl mx-auto px-4">
            See what our users are saying about Drixai
          </p>
        </div>

        {/* Animated Testimonials */}
        <div className="max-w-6xl mx-auto">
          <AnimatedTestimonials testimonials={testimonials} autoplay={true} />
        </div>
      </div>
    </section>
  )
} 