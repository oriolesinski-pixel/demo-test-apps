'use client'

import { ReactNode, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  LayoutDashboard,
  FolderKanban,
  Activity,
  Users,
  Settings,
  Zap,
  LogOut,
  User,
  Crown,
  Menu,
  X,
  CreditCard,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Profile, Workspace } from '@/lib/types/database'
import { UsageWidget } from '@/components/UsageWidget'

interface AppLayoutProps {
  children: ReactNode
  user: Profile
  workspace: Workspace
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/dashboard/projects', icon: FolderKanban },
  { name: 'Activity', href: '/dashboard/activity', icon: Activity },
  { name: 'Team', href: '/dashboard/team', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Billing', href: '/dashboard/settings/billing', icon: CreditCard },
]

export function AppLayout({ children, user, workspace }: AppLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const getInitials = (name: string | null) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-[260px] lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200/80 bg-white dark:bg-gray-800 px-5">
          <div className="flex h-16 shrink-0 items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-[1.15rem] font-bold tracking-tight">TaskFlow</span>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-0.5">
                  {navigation.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                    return (
                      <li key={item.name}>
                        <Link
                          href={item.href}
                          className={cn(
                            isActive
                              ? 'bg-blue-50 text-blue-700 border-l-[3px] border-blue-600 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-400'
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-l-[3px] border-transparent dark:text-gray-300 dark:hover:bg-gray-700/50 dark:hover:text-gray-100',
                            'group flex gap-x-3 rounded-r-lg py-2.5 pl-3 pr-3 text-[0.875rem] leading-6 font-medium transition-all duration-150'
                          )}
                        >
                          <item.icon className={cn('h-[1.15rem] w-[1.15rem] shrink-0', isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300')} aria-hidden="true" />
                          {item.name}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </li>
              <li className="mt-auto space-y-3 pb-4">
                <div className="-mx-2">
                  <UsageWidget workspaceId={workspace.id} />
                </div>
                <Link
                  href="/pricing"
                  className="group -mx-2 flex gap-x-3 rounded-lg p-2.5 text-[0.875rem] leading-6 font-medium text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20 transition-all duration-150"
                >
                  <Crown className="h-[1.15rem] w-[1.15rem] shrink-0" aria-hidden="true" />
                  Upgrade to Pro
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <div className={cn(
        'lg:hidden fixed inset-0 z-50 transition-opacity duration-200',
        sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      )}>
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
        <aside className={cn(
          'fixed inset-y-0 left-0 w-[260px] bg-white dark:bg-gray-800 transition-transform duration-200 shadow-xl',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}>
          <div className="flex h-16 shrink-0 items-center gap-2.5 px-5 border-b border-gray-200/80">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-sm">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="text-[1.15rem] font-bold tracking-tight">TaskFlow</span>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <nav className="flex flex-1 flex-col px-5 py-4">
            <ul role="list" className="space-y-0.5">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        isActive
                          ? 'bg-blue-50 text-blue-700 border-l-[3px] border-blue-600 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-400'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border-l-[3px] border-transparent dark:text-gray-300 dark:hover:bg-gray-700/50',
                        'group flex gap-x-3 rounded-r-lg py-2.5 pl-3 pr-3 text-[0.875rem] leading-6 font-medium transition-all duration-150'
                      )}
                    >
                      <item.icon className={cn('h-[1.15rem] w-[1.15rem] shrink-0', isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 group-hover:text-gray-600')} aria-hidden="true" />
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>
      </div>

      {/* Main content */}
      <div className="lg:pl-[260px]">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-x-4 border-b border-gray-200/80 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95 px-4 sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                {workspace.name}
              </span>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-blue-100 text-blue-700 text-sm font-semibold dark:bg-blue-900 dark:text-blue-300">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-semibold leading-none">{user.full_name || 'User'}</p>
                      <p className="text-xs leading-none text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings/profile">
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 dark:text-red-400">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-8">
          <div className="px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

