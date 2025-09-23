
import { User } from '@/lib/data';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

type PrintLayoutProps = {
  users: User[];
  selectedFields: { [key: string]: boolean };
};

const formatDate = (date: Date | Timestamp | undefined) => {
    if (!date) return 'N/A';
    if (date instanceof Timestamp) {
        return format(date.toDate(), 'PPP');
    }
    return format(date, 'PPP');
}

const allPossibleFields: {key: keyof User | 'workingHistory' | 'inventory'; label: string}[] = [
    { key: 'name', label: 'Name' },
    { key: 'nic', label: 'NIC' },
    { key: 'designation', label: 'Designation' },
    { key: 'dob', label: 'Date of Birth' },
    { key: 'mobile', label: 'Mobile Number' },
    { key: 'appointmentDate', label: 'Appointment Date' },
    { key: 'email', label: 'Email' },
    { key: 'workingHistory', label: 'Working History' },
    { key: 'inventory', label: 'Inventory' },
]


export function PrintLayout({ users, selectedFields }: PrintLayoutProps) {
  const activeColumns = allPossibleFields.filter(field => selectedFields[field.key]);

  return (
    <div className="print-container p-8 font-sans">
      <style>
        {`
          @media print {
            .print-container {
              color: black !important;
            }
            table, th, td {
              border-color: #d1d5db !important; /* gray-300 */
            }
            thead {
                display: table-header-group;
            }
            tr {
                page-break-inside: avoid;
            }
          }
        `}
      </style>
      <h1 className="mb-8 text-3xl font-bold text-center">Staff Details</h1>
      <table className="w-full border-collapse text-sm border border-gray-300">
        <thead>
          <tr className="bg-gray-100">
            {activeColumns.map(col => (
              <th key={col.key} className="p-3 border border-gray-300 text-left font-semibold">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} className="break-inside-avoid odd:bg-white even:bg-gray-50">
              {activeColumns.map(col => (
                <td key={`${user.id}-${col.key}`} className="p-3 border border-gray-300 align-top">
                  {(() => {
                    switch (col.key) {
                      case 'dob':
                        return formatDate(user.dob);
                      case 'appointmentDate':
                        return formatDate(user.appointmentDate);
                      case 'workingHistory':
                        return (
                          user.workingHistory && user.workingHistory.length > 0 ? (
                            <ul className="list-disc list-inside space-y-1">
                              {user.workingHistory.map((h, i) => <li key={i}>{h.name} at {h.place}</li>)}
                            </ul>
                          ) : 'N/A'
                        );
                      case 'inventory':
                        return (
                          user.inventory ? (
                            <ul className="list-disc list-inside space-y-1">
                              {user.inventory.pcLaptop && <li>PC/Laptop</li>}
                              {user.inventory.lgnAccount && <li>LGN Account</li>}
                              {user.inventory.printer && <li>Printer {user.inventory.printerName && `(${user.inventory.printerName})`}</li>}
                              {user.inventory.router && <li>Router</li>}
                              {user.inventory.ups && <li>UPS</li>}
                            </ul>
                          ) : 'N/A'
                        );
                      default:
                        // User[keyof User] is tricky with mixed types
                        const value = user[col.key as keyof User];
                        return (value as React.ReactNode) || 'N/A';
                    }
                  })()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && (
        <p className="mt-4 text-center text-gray-500">No users selected or no data to display.</p>
      )}
    </div>
  );
}
