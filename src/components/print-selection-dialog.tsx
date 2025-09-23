
'use client';

import { useState } from 'react';
import { User } from '@/lib/data';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { ScrollArea } from './ui/scroll-area';
import { PrintLayout } from './print-layout';

const PRINTABLE_FIELDS = {
  'Personal Details': ['name', 'nic', 'designation', 'dob', 'mobile', 'appointmentDate', 'email'],
  'Working History': ['workingHistory'],
  'Inventory Checklist': ['inventory'],
};

type SelectedFields = {
    [key: string]: boolean;
}

export function PrintSelectionDialog({
  isOpen,
  onOpenChange,
  users,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  users: User[];
}) {
  const [selectedFields, setSelectedFields] = useState<SelectedFields>({
    name: true,
    designation: true,
    email: true,
  });

  const handlePrint = () => {
    const printContent = document.getElementById('print-content');
    if (printContent) {
        const printWindow = window.open('', '_blank', 'height=800,width=800');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Print Staff Details</title>');
            // You may need to link to your stylesheet for proper printing styles
            const stylesheetUrl = `${window.location.origin}/globals.css`;
             printWindow.document.write(`<link rel="stylesheet" href="${stylesheetUrl}" type="text/css" media="print"/>`);
            printWindow.document.write('<style>@media print { body { -webkit-print-color-adjust: exact; } .print-container { padding: 2rem; } .print-header { display: none; } }</style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(printContent.innerHTML);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            
            // Timeout to ensure content is loaded before printing
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    }
  };

  const handleFieldChange = (field: string, checked: boolean) => {
    setSelectedFields(prev => ({ ...prev, [field]: checked }));
  }

  return (
    <>
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
            <DialogHeader>
            <DialogTitle>Print Selection</DialogTitle>
            <DialogDescription>
                Select the fields you want to include in the printout for the {users.length} selected users.
            </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-96 pr-6">
                <div className="space-y-6">
                {Object.entries(PRINTABLE_FIELDS).map(([group, fields]) => (
                    <div key={group}>
                    <h3 className="mb-3 font-semibold text-foreground">{group}</h3>
                    <div className="space-y-3">
                        {fields.map(field => (
                        <div key={field} className="flex items-center space-x-2">
                            <Checkbox
                            id={`field-${field}`}
                            checked={!!selectedFields[field]}
                            onCheckedChange={(checked) => handleFieldChange(field, !!checked)}
                            />
                            <Label htmlFor={`field-${field}`} className="capitalize">
                                {field.replace(/([A-Z])/g, ' $1')}
                            </Label>
                        </div>
                        ))}
                    </div>
                    </div>
                ))}
                </div>
            </ScrollArea>
            <DialogFooter>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                </Button>
                <Button onClick={handlePrint}>Print</Button>
            </DialogFooter>
        </DialogContent>
        </Dialog>
        {/* Hidden div for printing */}
        <div className="hidden">
            <div id="print-content">
                <PrintLayout users={users} selectedFields={selectedFields} />
            </div>
        </div>
    </>
  );
}
