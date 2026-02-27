import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type { ReactNode } from 'react';

interface SortableItemProps {
    id: string;
    children: ReactNode;
}

export function SortableItem({ id, children }: SortableItemProps) {
    const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2">
            <button
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors p-1"
                tabIndex={-1}
            >
                <GripVertical className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
                {children}
            </div>
        </div>
    );
}
