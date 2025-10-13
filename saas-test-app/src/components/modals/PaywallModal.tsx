'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Crown, Users, FolderKanban, Zap, X } from 'lucide-react'
import Link from 'next/link'

export type PaywallContext = 
  | 'project_limit'
  | 'team_limit'
  | 'task_limit'
  | 'premium_feature'
  | 'storage_limit'

interface PaywallModalProps {
  open: boolean
  onClose: () => void
  context: PaywallContext
  feature?: string
  currentUsage?: number
  limit?: number
}

const paywallContent = {
  project_limit: {
    icon: FolderKanban,
    title: 'Upgrade to Create More Projects',
    description: 'You\'ve reached your limit on the Free plan.',
    benefits: [
      'Unlimited projects',
      'Unlimited tasks per project',
      'Advanced analytics',
      'Priority support',
    ],
  },
  team_limit: {
    icon: Users,
    title: 'Upgrade to Add More Team Members',
    description: 'You\'ve reached your team size limit on the Free plan.',
    benefits: [
      'Unlimited team members',
      'Advanced permissions',
      'Team activity reports',
      'Priority support',
    ],
  },
  task_limit: {
    icon: Zap,
    title: 'Upgrade for Unlimited Tasks',
    description: 'This project has reached the task limit on the Free plan.',
    benefits: [
      'Unlimited tasks per project',
      'Custom task fields',
      'Bulk task actions',
      'Task templates',
    ],
  },
  premium_feature: {
    icon: Crown,
    title: 'Premium Feature',
    description: 'This feature is only available on Premium plans.',
    benefits: [
      'Advanced analytics',
      'Custom fields',
      'API access',
      'Export data',
    ],
  },
  storage_limit: {
    icon: FolderKanban,
    title: 'Upgrade for More Storage',
    description: 'You\'ve reached your storage limit on the Free plan.',
    benefits: [
      '10GB storage (vs 1GB)',
      'Larger file uploads',
      'Unlimited attachments',
      'File versioning',
    ],
  },
}

export function PaywallModal({ open, onClose, context, feature, currentUsage, limit }: PaywallModalProps) {
  const content = paywallContent[context]
  const Icon = content.icon

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-2">
              <Icon className="h-6 w-6 text-white" />
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogTitle className="text-2xl">{content.title}</DialogTitle>
          <DialogDescription className="text-base">
            {content.description}
            {currentUsage !== undefined && limit !== undefined && (
              <span className="block mt-2 font-medium text-foreground">
                Current usage: {currentUsage} / {limit}
              </span>
            )}
            {feature && (
              <span className="block mt-2 font-medium text-foreground">
                Feature: {feature}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-4">
          <p className="text-sm font-medium">Premium includes:</p>
          <ul className="space-y-2">
            {content.benefits.map((benefit, index) => (
              <li key={index} className="flex items-start gap-2 text-sm">
                <Crown className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 p-4 rounded-lg">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold">$29</span>
            <span className="text-gray-600 dark:text-gray-400">/month</span>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            or $290/year (save 20%)
          </p>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Maybe Later
          </Button>
          <Link href="/pricing" className="w-full sm:w-auto">
            <Button className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800">
              <Crown className="mr-2 h-4 w-4" />
              View Plans
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

