import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CheckCircle2, Users, Zap, Lock } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b border-gray-200/60 bg-white/70 backdrop-blur-md dark:bg-gray-900/70 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-[1.2rem] font-bold tracking-tight">TaskFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-[2.75rem] md:text-[3.5rem] font-bold tracking-tight mb-6 leading-[1.1]">
            Project management
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              made simple
            </span>
          </h1>
          <p className="text-[1.15rem] text-gray-600 dark:text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            TaskFlow helps small teams organize projects, track tasks, and collaborate seamlessly.
            Built for teams that value simplicity and speed.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="text-base px-8 h-12 shadow-md shadow-blue-600/20">
                Start for free
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="text-base px-8 h-12">
                Sign in
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-32 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200/80 hover:shadow-md transition-shadow duration-200">
            <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mb-5">
              <CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-[1.1rem] font-semibold mb-2">Task Management</h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Create, organize, and track tasks with ease. Assign work, set priorities, and never miss a deadline.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200/80 hover:shadow-md transition-shadow duration-200">
            <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/50 flex items-center justify-center mb-5">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-[1.1rem] font-semibold mb-2">Team Collaboration</h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Invite your team, share projects, and work together in real-time with activity feeds.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200/80 hover:shadow-md transition-shadow duration-200">
            <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center mb-5">
              <Lock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-[1.1rem] font-semibold mb-2">Secure & Private</h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              Enterprise-grade security with role-based access control. Your data stays private and secure.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-32 text-center">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-14 text-white shadow-lg shadow-blue-600/15">
            <h2 className="text-[1.75rem] font-bold mb-4">Ready to get started?</h2>
            <p className="text-[1.1rem] mb-8 text-blue-100">
              Join teams using TaskFlow to ship faster and collaborate better.
            </p>
            <Link href="/signup">
              <Button size="lg" variant="secondary" className="text-base px-8 h-12">
                Create your workspace
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200/60 mt-20 py-8 text-center text-gray-500 dark:text-gray-400">
        <p>&copy; 2026 TaskFlow. Built for demo purposes.</p>
      </footer>
    </div>
  )
}
