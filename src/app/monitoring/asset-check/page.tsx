
'use client';

import * as React from "react";
import { useState } from "react";
import PageHeader from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardPaste, Undo2, HeartHandshake } from "lucide-react";
import { ClientOnly } from "@/components/client-only";
import ReceptionTab from "./_components/reception-tab";
import ReturnTab from "./_components/return-tab";
import GratitudeTab from "./_components/gratitude-tab";
import { format } from "date-fns";


import { useLocalStorage } from "@/hooks/use-local-storage";


export default function AssetCheckPage() {
    const [advancedFilters, setAdvancedFilters] = useLocalStorage<any>('asset_check_advanced_filters_v1', {
        date: format(new Date(), 'yyyy-MM-dd'), 
        buildings: []
    });


    return (
        <ClientOnly>
            <PageHeader
                title="Nhận - Trả tài sản"
                description="Quản lý tài sản sinh viên/nhân viên gửi và trả lại."
                icon={ClipboardPaste}
            />
            <div className="p-4 md:p-6">
                <Tabs defaultValue="reception">
                    <TabsList>
                        <TabsTrigger value="reception" className="flex items-center gap-2">
                            <ClipboardPaste className="h-4 w-4 text-blue-500" />
                            Sổ Tiếp nhận Tài sản
                        </TabsTrigger>
                        <TabsTrigger value="return" className="flex items-center gap-2">
                            <Undo2 className="h-4 w-4 text-orange-500" />
                            Sổ Trao trả Tài sản
                        </TabsTrigger>
                        <TabsTrigger value="gratitude" className="flex items-center gap-2">
                            <HeartHandshake className="h-4 w-4 text-pink-500" />
                            Sổ Người tốt việc tốt
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="reception">
                        <ReceptionTab 
                            advancedFilters={advancedFilters} 
                            setAdvancedFilters={setAdvancedFilters} 
                        />
                    </TabsContent>
                    <TabsContent value="return">
                        <ReturnTab 
                            advancedFilters={advancedFilters} 
                            setAdvancedFilters={setAdvancedFilters} 
                        />
                    </TabsContent>
                    <TabsContent value="gratitude">
                        <GratitudeTab 
                            advancedFilters={advancedFilters} 
                            setAdvancedFilters={setAdvancedFilters} 
                        />
                    </TabsContent>
                </Tabs>
            </div>
        </ClientOnly>
    );
}

