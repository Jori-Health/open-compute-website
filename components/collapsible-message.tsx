import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from './ui/collapsible'
import { IconLogo } from './ui/icons'
import { Separator } from './ui/separator'
import { CurrentUserAvatar } from './current-user-avatar'

interface CollapsibleMessageProps {
  children: React.ReactNode
  role: 'user' | 'assistant'
  isCollapsible?: boolean
  isOpen?: boolean
  header?: React.ReactNode
  onOpenChange?: (open: boolean) => void
  showBorder?: boolean
  showIcon?: boolean
}

export function CollapsibleMessage({
  children,
  role,
  isCollapsible = false,
  isOpen = true,
  header,
  onOpenChange,
  showBorder = true,
  showIcon = true
}: CollapsibleMessageProps) {
  const content = <div className="flex-1">{children}</div>

  return (
    <div className="flex gap-2 sm:gap-3">
      {showIcon && (
        <div className="relative flex flex-col items-center flex-shrink-0">
          <div className="w-4 sm:w-5">
            {role === 'assistant' ? (
              <IconLogo className="size-4 sm:size-5" />
            ) : (
              <CurrentUserAvatar />
            )}
          </div>
        </div>
      )}

      {isCollapsible ? (
        <div
          className={cn(
            'flex-1 rounded-xl sm:rounded-2xl p-3 sm:p-4 min-w-0',
            showBorder && 'border border-border/50'
          )}
        >
          <Collapsible
            open={isOpen}
            onOpenChange={onOpenChange}
            className="w-full"
          >
            <div className="flex items-center justify-between w-full gap-2">
              {header && <div className="text-xs sm:text-sm w-full min-w-0">{header}</div>}
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="rounded-md p-1 hover:bg-accent group flex-shrink-0"
                  aria-label={isOpen ? 'Collapse' : 'Expand'}
                >
                  <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="data-[state=closed]:animate-collapse-up data-[state=open]:animate-collapse-down">
              <Separator className="my-3 sm:my-4 border-border/50" />
              {content}
            </CollapsibleContent>
          </Collapsible>
        </div>
      ) : (
        <div
          className={cn(
            'flex-1 rounded-xl sm:rounded-2xl min-w-0',
            role === 'assistant' ? 'px-0' : 'px-2 sm:px-3'
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}
