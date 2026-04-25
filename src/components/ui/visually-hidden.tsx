
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const visuallyHiddenVariants = cva(
  "absolute -m-px h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)]"
)

export interface VisuallyHiddenProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof visuallyHiddenVariants> {
  asChild?: boolean
}

const VisuallyHidden = React.forwardRef<
  HTMLSpanElement,
  VisuallyHiddenProps
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "span"
  return (
    <Comp
      className={cn(visuallyHiddenVariants({ className }))}
      ref={ref}
      {...props}
    />
  )
})
VisuallyHidden.displayName = "VisuallyHidden"

export { VisuallyHidden, visuallyHiddenVariants }
