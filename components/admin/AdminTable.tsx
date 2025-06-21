import * as React from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

interface Column {
  key: string;
  label: string;
  width?: string;
  sticky?: boolean;
  align?: 'left' | 'right' | 'center';
  render?: (row: any, index: number) => React.ReactNode;
  sortable?: boolean;
  onSort?: () => void;
  className?: string;
}

interface AdminTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  draggable?: boolean;
  onDragEnd?: (oldIndex: number, newIndex: number) => void;
  getRowId?: (row: any) => string;
  emptyMessage?: string;
  className?: string;
}

function DraggableRow({ id, children, handle, ...props }: { id: string; children: React.ReactNode; handle?: (args: { listeners: any }) => React.ReactNode; [key: string]: any }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    background: isDragging ? '#f3f4f6' : undefined,
  };
  return (
    <tr ref={setNodeRef} style={style} {...attributes} {...props}>
      {typeof handle === 'function' ? handle({ listeners }) : null}
      {children}
    </tr>
  );
}

export const AdminTable: React.FC<AdminTableProps> = ({
  columns,
  data,
  loading = false,
  draggable = false,
  onDragEnd,
  getRowId = (row) => row.id,
  emptyMessage = 'No data found.',
  className = '',
}) => {
  const [order, setOrder] = React.useState(data.map(getRowId));
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  React.useEffect(() => {
    setOrder(data.map(getRowId));
  }, [data, getRowId]);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id) {
      const oldIndex = order.indexOf(active.id);
      const newIndex = order.indexOf(over.id);
      setOrder((items) => arrayMove(items, oldIndex, newIndex));
      if (onDragEnd) onDragEnd(oldIndex, newIndex);
    }
  };

  return (
    <div className="overflow-x-auto w-full">
      <table
        className={cn(
          'w-full border border-gray-200 rounded-lg overflow-hidden admin-table text-[13px] text-[#19191c] bg-white',
          className
        )}
        style={{ borderCollapse: 'separate', borderSpacing: 0 }}
      >
        <thead>
          <tr className="border-b" style={{ background: '#f5f5f5', color: '#0a0a0a' }}>
            {columns.map((col, idx) => (
              <th
                key={col.key}
                className={cn(
                  'py-3 px-4 text-left align-middle font-medium whitespace-nowrap',
                  col.sticky ? `sticky left-[${col.width || idx * 80}px] bg-white z-10` : '',
                  col.className
                )}
                style={{
                  minWidth: col.width,
                  maxWidth: col.width,
                  left: col.sticky ? undefined : undefined,
                  color: '#0a0a0a',
                  fontWeight: 500,
                  fontSize: 13,
                }}
                onClick={col.sortable ? col.onSort : undefined}
              >
                <div className={cn('flex items-center', col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start')}>
                  {col.label}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                Loading...
              </td>
            </tr>
          ) : order.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-muted-foreground">
                {emptyMessage}
              </td>
            </tr>
          ) : draggable ? (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={order} strategy={verticalListSortingStrategy}>
                {order.map((id) => {
                  const row = data.find((r) => getRowId(r) === id);
                  if (!row) return null;
                  return (
                    <DraggableRow key={id} id={id} handle={({ listeners }) => (
                      <td className="pl-2 pr-0 w-6 align-middle cursor-grab select-none sticky left-0 bg-white z-10" style={{ verticalAlign: 'middle' }} {...listeners}>
                        <span className="flex items-center justify-center h-6 w-6 text-gray-400 hover:text-gray-600 focus:outline-none">
                          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 2v12M2 8h12" /></svg>
                        </span>
                      </td>
                    )}>
                      {columns.map((col, colIdx) => (
                        <td
                          key={col.key}
                          className={cn(
                            'py-3 px-4 text-[13px] font-normal whitespace-nowrap align-middle',
                            col.sticky ? `sticky left-[${col.width || colIdx * 80}px] bg-white z-10` : '',
                            col.className
                          )}
                          style={{
                            minWidth: col.width,
                            maxWidth: col.width,
                            color: '#19191c',
                          }}
                        >
                          {col.render ? col.render(row, colIdx) : row[col.key]}
                        </td>
                      ))}
                    </DraggableRow>
                  );
                })}
              </SortableContext>
            </DndContext>
          ) : (
            order.map((id) => {
              const row = data.find((r) => getRowId(r) === id);
              if (!row) return null;
              return (
                <tr key={id}>
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key}
                      className={cn(
                        'py-3 px-4 text-[13px] font-normal whitespace-nowrap align-middle',
                        col.sticky ? `sticky left-[${col.width || colIdx * 80}px] bg-white z-10` : '',
                        col.className
                      )}
                      style={{
                        minWidth: col.width,
                        maxWidth: col.width,
                        color: '#19191c',
                      }}
                    >
                      {col.render ? col.render(row, colIdx) : row[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}; 