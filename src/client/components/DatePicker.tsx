"use client"

import { CalendarIcon } from "lucide-react"
import * as React from "react"

import { Button } from "@/client/components/ui/button"
import { Calendar } from "@/client/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/client/components/ui/popover"
import { cn } from "@/client/lib/utils"
import {
  dateToIsoString,
  formatDate,
  isIsoDateString,
  parseIsoDate,
} from "@/shared/dates"

interface DatePickerProps {
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  disabled?: (date: Date) => boolean
  className?: string
}

function DatePicker({
  value,
  onChange,
  placeholder = "Datum wählen",
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = value && isIsoDateString(value) ? parseIsoDate(value) : undefined

  function handleSelect(date: Date | undefined) {
    onChange(date ? dateToIsoString(date) : null)
    if (date) setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start gap-2 text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 opacity-50" />
          {value ? formatDate(value) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
