import { ArrowRight } from 'lucide-react'

import { Button } from '@/components/ui/button'

const exampleMessages = [
  {
    heading:
      'John Doe, 58M, chest pain. BP 150/95, HR 88. Diagnosed with acute MI. Not yet treated.',
    message:
      'John Doe, 58M, chest pain. BP 150/95, HR 88. Diagnosed with acute MI. Not yet treated.'
  },
  {
    heading:
      'Jane Smith 65F, meets Dr.Jones, gets diagnosed with stage 4 breast cancer',
    message:
      'Jane Smith 65F, meets Dr.Jones, gets diagnosed with stage 4 breast cancer'
  }
  //   {
  //     heading: 'Tesla vs Rivian',
  //     message: 'Tesla vs Rivian'
  //   },
  //   {
  //     heading: 'Summary: https://arxiv.org/pdf/2501.05707',
  //     message: 'Summary: https://arxiv.org/pdf/2501.05707'
  //   }
]
export function EmptyScreen({
  submitMessage,
  className
}: {
  submitMessage: (message: string) => void
  className?: string
}) {
  return (
    <div className={`mx-auto w-full transition-all ${className}`}>
      <div className="bg-background p-2">
        <div className="mt-2 flex flex-col items-start space-y-2 mb-4">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="link"
              className="h-auto p-0 text-base"
              name={message.message}
              onClick={async () => {
                submitMessage(message.message)
              }}
            >
              <ArrowRight size={16} className="mr-2 text-muted-foreground" />
              {message.heading}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
