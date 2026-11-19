"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Popover as PopoverPrimitive } from "radix-ui"

function Popover({
  ...props
}: { [key: string]: any }) {
  return <PopoverPrimitive.Root data-slot="popover" {...(props as any)} />
}

function PopoverTrigger({
  ...props
}: { [key: string]: any }) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...(props as any)} />
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: { className?: any; align?: any; sideOffset?: number; [key: string]: any }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-72 origin-(--radix-popover-content-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          className
        )}
        {...(props as any)}
      />
    </PopoverPrimitive.Portal>
  )
}

function PopoverAnchor({
  ...props
}: { [key: string]: any }) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...(props as any)} />
}

function PopoverHeader({ className, ...props }: { className?: any; [key: string]: any }) {
  return (
    <div
      data-slot="popover-header"
      className={cn("flex flex-col gap-1 text-sm", className)}
      {...(props as any)}
    />
  )
}

function PopoverTitle({ className, ...props }: { className?: any; [key: string]: any }) {
  return (
    <div
      data-slot="popover-title"
      className={cn("font-medium", className)}
      {...(props as any)}
    />
  )
}

function PopoverDescription({
  className,
  ...props
}: { className?: any; [key: string]: any }) {
  return (
    <p
      data-slot="popover-description"
      className={cn("text-muted-foreground", className)}
      {...(props as any)}
    />
  )
}

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
}
