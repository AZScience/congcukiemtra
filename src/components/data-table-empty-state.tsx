
import React from 'react';
import { LucideIcon, SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TableRow, TableCell } from '@/components/ui/table';
import { useLanguage } from '@/hooks/use-language';

interface DataTableEmptyStateProps {
    colSpan: number;
    icon?: LucideIcon;
    title?: string;
    description?: string;
    filters?: Record<string, any>;
    onClearFilters?: () => void;
}

export function DataTableEmptyState({
    colSpan,
    icon: Icon = SearchX,
    title,
    description,
    filters = {},
    onClearFilters
}: DataTableEmptyStateProps) {
    const { t } = useLanguage();
    const hasFilters = Object.values(filters).some(v => !!v);

    return (
        <TableRow>
            <TableCell colSpan={colSpan} className="text-center h-64">
                <div className="flex flex-col items-center justify-center gap-3 py-10">
                    <div className="bg-muted/30 p-4 rounded-full">
                        <Icon className="h-12 w-12 text-muted-foreground opacity-20" />
                    </div>
                    <div className="space-y-1 max-w-[300px] mx-auto">
                        <p className="text-muted-foreground font-semibold text-lg">
                            {title || t('Không tìm thấy dữ liệu')}
                        </p>
                        <p className="text-muted-foreground/70 text-sm">
                            {description || t('Dữ liệu bạn đang tìm kiếm hiện không có hoặc đã bị ẩn bởi bộ lọc.')}
                        </p>
                        {hasFilters && onClearFilters && (
                            <div className="pt-4">
                                <Button 
                                    variant="outline" 
                                    onClick={onClearFilters}
                                    className="text-primary border-primary/20 hover:bg-primary/5 text-sm font-bold px-6"
                                >
                                    {t('Xóa tất cả bộ lọc và thử lại')}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </TableCell>
        </TableRow>
    );
}
