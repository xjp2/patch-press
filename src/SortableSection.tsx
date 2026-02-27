import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { ReactNode } from 'react';

interface SortableSectionProps {
    id: string;
    children: ReactNode;
    dragHandle?: boolean; // if true, renders a drag handle instead of making entire element draggable
}

export function SortableSection({ id, children, dragHandle = true }: SortableSectionProps) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : undefined,
    };

    return (
        <div ref={setNodeRef} style={style} className="relative">
            {dragHandle && (
                <button
                    ref={setActivatorNodeRef}
                    {...attributes}
                    {...listeners}
                    className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing z-10 text-gray-300 hover:text-gray-500 transition-colors"
                    tabIndex={-1}
                >
                    <GripVertical className="w-4 h-4" />
                </button>
            )}
            <div className={dragHandle ? 'pl-8' : ''}>
                {children}
            </div>
        </div>
    );
}
