import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PricingCard } from "@/components/pricing-card"
import { PricingFeature } from "@/components/pricing-feature"
import { SiteHeader } from "@/components/site-header"

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#1a0b2e] text-white">
      <SiteHeader />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto">
              <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                Simple, Transparent Pricing
              </h1>
              <p className="text-xl text-white/70 mb-8">
                Choose the plan that works best for you and your team. No hidden fees, no surprises.
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Cards Section */}
        <section className="w-full py-12">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Free Tier */}
              <PricingCard
                title="Free"
                description="Core Experience"
                price="$0"
                period="forever"
                buttonText="Get Started"
                buttonLink="/auth"
                buttonVariant="outline"
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-white/70 mb-2">Instant Access & Onboarding</h3>
                    <ul className="space-y-2">
                      <PricingFeature included>Magic Link Authentication</PricingFeature>
                      <PricingFeature included>No Login Required</PricingFeature>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-white/70 mb-2">Core Kanban Functionality</h3>
                    <ul className="space-y-2">
                      <PricingFeature included>Drag-and-Drop Interface</PricingFeature>
                      <PricingFeature included>Real-Time Collaboration</PricingFeature>
                      <PricingFeature included>Instant Sharing</PricingFeature>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-white/70 mb-2">Basic Customization & Interaction</h3>
                    <ul className="space-y-2">
                      <PricingFeature included>Pre-Defined Stickers</PricingFeature>
                      <PricingFeature included>User Presence Indicators</PricingFeature>
                      <PricingFeature included>Basic Notifications</PricingFeature>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-white/70 mb-2">Communication & Collaboration</h3>
                    <ul className="space-y-2">
                      <PricingFeature>Integrated Real-Time Chat</PricingFeature>
                      <PricingFeature>Advanced Collaboration Tools</PricingFeature>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-white/70 mb-2">Advanced Customization</h3>
                    <ul className="space-y-2">
                      <PricingFeature>Custom Sticker Packs</PricingFeature>
                      <PricingFeature>Custom Themes & Branding</PricingFeature>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-white/70 mb-2">Access & Notifications</h3>
                    <ul className="space-y-2">
                      <PricingFeature>Permissions Control</PricingFeature>
                      <PricingFeature>Smart Notifications</PricingFeature>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-white/70 mb-2">Integrations & Support</h3>
                    <ul className="space-y-2">
                      <PricingFeature>Tool Integrations</PricingFeature>
                      <PricingFeature>Priority Support</PricingFeature>
                    </ul>
                  </div>
                </div>
              </PricingCard>

              {/* Premium Tier */}
              <PricingCard
                title="Premium"
                description="Enhanced & Advanced Features"
                price="$6.99"
                period="per month"
                buttonText="Upgrade to Premium"
                buttonLink="/auth?plan=premium"
                buttonVariant="default"
                highlighted={true}
              >
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-white/70 mb-2">Instant Access & Onboarding</h3>
                    <ul className="space-y-2">
                      <PricingFeature included>Magic Link Authentication</PricingFeature>
                      <PricingFeature included>No Login Required</PricingFeature>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-white/70 mb-2">Core Kanban Functionality</h3>
                    <ul className="space-y-2">
                      <PricingFeature included>Drag-and-Drop Interface</PricingFeature>
                      <PricingFeature included>Real-Time Collaboration</PricingFeature>
                      <PricingFeature included>Instant Sharing</PricingFeature>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-white/70 mb-2">Basic Customization & Interaction</h3>
                    <ul className="space-y-2">
                      <PricingFeature included>Pre-Defined Stickers</PricingFeature>
                      <PricingFeature included>User Presence Indicators</PricingFeature>
                      <PricingFeature included>Basic Notifications</PricingFeature>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-white/70 mb-2">Enhanced Communication & Collaboration</h3>
                    <ul className="space-y-2">
                      <PricingFeature included>Integrated Real-Time Chat</PricingFeature>
                      <PricingFeature included>Advanced Collaboration Tools</PricingFeature>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-white/70 mb-2">Advanced Customization & Personalization</h3>
                    <ul className="space-y-2">
                      <PricingFeature included>Custom Sticker Packs</PricingFeature>
                      <PricingFeature included>Custom Themes & Branding</PricingFeature>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-white/70 mb-2">Granular Access & Notifications</h3>
                    <ul className="space-y-2">
                      <PricingFeature included>Permissions Control</PricingFeature>
                      <PricingFeature included>Smart Notifications</PricingFeature>
                    </ul>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-white/70 mb-2">Future Integrations & Support</h3>
                    <ul className="space-y-2">
                      <PricingFeature included>Tool Integrations</PricingFeature>
                      <PricingFeature included>Priority Support</PricingFeature>
                    </ul>
                  </div>
                </div>
              </PricingCard>
            </div>
          </div>
        </section>

        {/* Why Choose MiniKanban Section */}
        <section className="w-full py-12 md:py-24 bg-[#2a1b3e]">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent mb-4">
                Why Choose MiniKanban?
              </h2>
              <p className="text-white/70">Our unique approach to kanban boards sets us apart from the competition</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-[#3a2b4e]/50 backdrop-blur-sm rounded-xl border border-white/10 p-6 shadow-lg">
                <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-pink-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Hassle Onboarding</h3>
                <p className="text-white/70">
                  Unlike competitors that require full account creation, MiniKanban's phone-based magic link keeps the
                  entry barrier low.
                </p>
              </div>

              <div className="bg-[#3a2b4e]/50 backdrop-blur-sm rounded-xl border border-white/10 p-6 shadow-lg">
                <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-pink-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Simplicity Meets Power</h3>
                <p className="text-white/70">
                  Enjoy a clean, intuitive interface with essential drag-and-drop functionality and real-time updates
                  without the clutter of unnecessary features.
                </p>
              </div>

              <div className="bg-[#3a2b4e]/50 backdrop-blur-sm rounded-xl border border-white/10 p-6 shadow-lg">
                <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center mb-4">
                  <svg
                    className="w-6 h-6 text-pink-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Fun & Customizable</h3>
                <p className="text-white/70">
                  Premium users can elevate their boards with custom stickers, themes, and a built-in chat—making
                  project management both engaging and efficient.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="w-full py-12 md:py-24">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto mb-12">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent mb-4">
                Frequently Asked Questions
              </h2>
              <p className="text-white/70">Everything you need to know about our pricing and features</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              <div className="bg-[#2a1b3e] rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-bold text-white mb-2">Can I try Premium features before subscribing?</h3>
                <p className="text-white/70">
                  Yes! We offer a 14-day free trial of all Premium features. No credit card required to start your
                  trial.
                </p>
              </div>

              <div className="bg-[#2a1b3e] rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-bold text-white mb-2">Can I cancel my subscription anytime?</h3>
                <p className="text-white/70">
                  Absolutely. You can cancel your Premium subscription at any time. Your Premium features will remain
                  active until the end of your billing period.
                </p>
              </div>

              <div className="bg-[#2a1b3e] rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-bold text-white mb-2">Is there a limit to how many boards I can create?</h3>
                <p className="text-white/70">
                  Free users can create up to 3 boards. Premium subscribers enjoy unlimited boards for all their
                  projects.
                </p>
              </div>

              <div className="bg-[#2a1b3e] rounded-xl border border-white/10 p-6">
                <h3 className="text-lg font-bold text-white mb-2">Do you offer team or enterprise plans?</h3>
                <p className="text-white/70">
                  Yes, we offer special pricing for teams of 5 or more. Contact our sales team for custom enterprise
                  solutions and volume discounts.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-16 md:py-24 bg-[#2a1b3e]">
          <div className="container px-4 md:px-6">
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                Ready to Get Started?
              </h2>
              <p className="text-xl text-white/70 mb-8">
                Join thousands of teams who are already using MiniKanban to streamline their workflow.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="bg-pink-500 hover:bg-pink-600 text-white" asChild>
                  <Link href="/auth?plan=premium">Try Premium Free</Link>
                </Button>
                <Button size="lg" variant="outline" className="border-white/20 text-white hover:bg-white/10" asChild>
                  <Link href="/auth">Start for Free</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-white/10 py-6 bg-[#1a0b2e]">
        <div className="container flex flex-col items-center justify-center gap-4 md:flex-row md:gap-8">
          <p className="text-center text-sm text-white/60 md:text-left">© 2024 MiniKanban. All rights reserved.</p>
          <div className="flex gap-4">
            <Link
              href="/terms"
              className="text-sm text-white/60 underline-offset-4 hover:text-pink-400 transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-white/60 underline-offset-4 hover:text-pink-400 transition-colors"
            >
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
