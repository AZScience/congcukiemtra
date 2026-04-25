"use client";

import { FileCheck } from "lucide-react";
import PageHeader from "@/components/page-header";
import { ClientOnly } from "@/components/client-only";
import { CustomGoogleForm } from "@/components/custom-google-form";

export default function FeedbackPage() {
  return (
    <ClientOnly>
      <PageHeader 
        title="Minh chứng ca trực" 
        description="Minh chứng báo cáo kết thúc ca trực" 
        icon={FileCheck} 
      />
      <div className="p-4 md:p-6 min-h-[calc(100vh-120px)] flex flex-col items-center justify-center relative overflow-hidden bg-gray-50/50">
        <div className="w-full relative z-10">
          <CustomGoogleForm />
        </div>
      </div>
    </ClientOnly>
  );
}
