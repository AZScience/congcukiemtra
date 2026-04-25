
"use client";

import PageHeader from "@/components/page-header";
import { UploadCloud } from "lucide-react";
import { ClientOnly } from "@/components/client-only";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AnomalyDetectionPage() {
  return (
    <ClientOnly>
      <PageHeader title="Phân tích & Đồng bộ" description="Đưa dữ liệu lên Drive và phân tích các chỉ số bất thường." icon={UploadCloud} />
      <div className="p-4 md:p-6">
        <Card>
          <CardHeader><CardTitle>Tính năng đang phát triển</CardTitle></CardHeader>
          <CardContent><p>Hệ thống đang được tích hợp để đồng bộ dữ liệu tự động lên Google Drive.</p></CardContent>
        </Card>
      </div>
    </ClientOnly>
  );
}
