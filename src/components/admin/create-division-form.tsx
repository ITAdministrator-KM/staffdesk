
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const divisionSchema = z.object({
  name: z.string().min(2, 'Division name must be at least 2 characters.'),
});

export function CreateDivisionForm({ onAddDivision }: { onAddDivision: (name: string) => void }) {
  const form = useForm<z.infer<typeof divisionSchema>>({
    resolver: zodResolver(divisionSchema),
    defaultValues: {
      name: '',
    }
  });

  function onSubmit(values: z.infer<typeof divisionSchema>) {
    console.log('Creating division:', values);
    onAddDivision(values.name);
    form.reset();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Division Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Human Resources" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Create Division</Button>
      </form>
    </Form>
  );
}
