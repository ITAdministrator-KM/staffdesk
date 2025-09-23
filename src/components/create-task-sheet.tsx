'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
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
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon, Sparkles } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { User, Task } from '@/lib/data';
import { useEffect, useState, useTransition } from 'react';
import { suggestSubtasks } from '@/ai/flows/suggest-subtasks';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';

const taskFormSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  description: z.string().optional(),
  status: z.enum(['To Do', 'In Progress', 'Done', 'Canceled']),
  priority: z.enum(['Low', 'Medium', 'High']),
  assigneeId: z.string().optional(),
  deadline: z.date().optional(),
  storyPoints: z.coerce.number().optional(),
});

type CreateTaskSheetProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  projectUsers: User[];
  taskToEdit?: Task | null;
  onSave: (task: Task) => void;
};

export function CreateTaskSheet({
  isOpen,
  setIsOpen,
  projectUsers,
  taskToEdit,
  onSave,
}: CreateTaskSheetProps) {
  const form = useForm<z.infer<typeof taskFormSchema>>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      status: 'To Do',
      priority: 'Medium',
    },
  });

  const [isPending, startTransition] = useTransition();
  const [suggestedSubtasks, setSuggestedSubtasks] = useState<string[]>([]);
  const [selectedSubtasks, setSelectedSubtasks] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (taskToEdit) {
      form.reset({
        title: taskToEdit.title,
        description: taskToEdit.description,
        status: taskToEdit.status,
        priority: taskToEdit.priority,
        assigneeId: taskToEdit.assignee?.id,
        deadline: taskToEdit.deadline,
        storyPoints: taskToEdit.storyPoints,
      });
      setSelectedSubtasks(taskToEdit.subtasks?.map(st => st.title) || []);
      setSuggestedSubtasks([]);
    } else {
      form.reset({
        title: '',
        description: '',
        status: 'To Do',
        priority: 'Medium',
        assigneeId: undefined,
        deadline: undefined,
        storyPoints: undefined,
      });
      setSelectedSubtasks([]);
      setSuggestedSubtasks([]);
    }
  }, [taskToEdit, isOpen, form]);

  const handleSuggestSubtasks = () => {
    const description = form.getValues('description');
    if (!description) {
        toast({
            title: 'Description needed',
            description: 'Please provide a task description to suggest subtasks.',
            variant: 'destructive',
        });
        return;
    }
    startTransition(async () => {
      try {
        const result = await suggestSubtasks({ taskDescription: description });
        setSuggestedSubtasks(result.subtasks);
      } catch (error) {
        toast({
            title: 'AI Error',
            description: 'Failed to suggest subtasks. Please try again.',
            variant: 'destructive',
        });
      }
    });
  };

  function onSubmit(values: z.infer<typeof taskFormSchema>) {
    const finalTask: Task = {
      id: taskToEdit?.id || '',
      ...values,
      assignee: projectUsers.find(u => u.id === values.assigneeId),
      subtasks: selectedSubtasks.map( (title, i) => ({ id: `sub-${i}`, title, completed: false })),
    };
    onSave(finalTask);
    setIsOpen(false);
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{taskToEdit ? 'Edit Task' : 'Create Task'}</SheetTitle>
          <SheetDescription>
            {taskToEdit ? 'Update the details of your task.' : 'Fill in the details for a new task.'}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Implement new feature" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
                <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                        <Textarea
                        placeholder="Provide a detailed description of the task."
                        {...field}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <Button type="button" variant="outline" size="sm" onClick={handleSuggestSubtasks} disabled={isPending}>
                    <Sparkles className={cn("mr-2 h-4 w-4", isPending && "animate-spin")} />
                    {isPending ? "Generating..." : "Suggest Subtasks with AI"}
                </Button>
            </div>

            {suggestedSubtasks.length > 0 && (
              <div className="space-y-2 rounded-md border p-4">
                <h4 className="font-medium">Suggested Subtasks</h4>
                <div className="space-y-2">
                  {suggestedSubtasks.map((subtask, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Checkbox
                        id={`subtask-${index}`}
                        checked={selectedSubtasks.includes(subtask)}
                        onCheckedChange={(checked) => {
                          return checked
                            ? setSelectedSubtasks([...selectedSubtasks, subtask])
                            : setSelectedSubtasks(selectedSubtasks.filter((s) => s !== subtask));
                        }}
                      />
                      <Label htmlFor={`subtask-${index}`}>{subtask}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                            <SelectItem value="To Do">To Do</SelectItem>
                            <SelectItem value="In Progress">In Progress</SelectItem>
                            <SelectItem value="Done">Done</SelectItem>
                            <SelectItem value="Canceled">Canceled</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <FormField
              control={form.control}
              name="assigneeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assignee</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {projectUsers.map(user => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Deadline</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn('w-full justify-start pl-3 text-left font-normal',!field.value && 'text-muted-foreground')}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="storyPoints"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Story Points</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 5" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            </div>

            <SheetFooter>
                <SheetClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                </SheetClose>
                <Button type="submit">Save Task</Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
