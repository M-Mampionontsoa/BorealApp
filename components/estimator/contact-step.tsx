"use client"

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export function ContactStep() {
  return (
    <div className="grid gap-6">
      <FormField
        name="fullName"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor="fullName">Nom complet</FormLabel>
            <FormControl>
              <Input
                id="fullName"
                autoComplete="name"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor="email">Courriel</FormLabel>
            <FormControl>
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor="phone">Téléphone</FormLabel>
            <FormControl>
              <Input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="450 555-0123"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="city"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor="city">Ville</FormLabel>
            <FormControl>
              <Input
                id="city"
                autoComplete="address-level2"
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        name="message"
        render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor="message">Message (facultatif)</FormLabel>
            <FormControl>
              <Textarea
                id="message"
                rows={4}
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
              />
            </FormControl>
            <FormDescription>
              Précisions sur votre projet, accès au toit, échéancier, etc.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  )
}
