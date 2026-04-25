"use client";

import React, { useState, useRef, useEffect } from 'react';
import PageHeader from "@/components/page-header";
import { FileSearch, Send, Bot, User, Loader2, Sparkles } from "lucide-react";
import { ClientOnly } from "@/components/client-only";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { callAiAssistant } from "./actions";
import { useSystemParameters } from "@/providers/system-parameters-provider";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export default function AiAssistantPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<'general' | 'faq'>('faq');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { params: systemParams, loading: isParamsLoading } = useSystemParameters();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await callAiAssistant({
        question: userMessage,
        searchMode: searchMode,
        sheetId: systemParams.googleSheetId,
        sheetTabName: systemParams.faqSheetTabName,
        serviceAccountEmail: systemParams.googleServiceAccountEmail,
        privateKey: systemParams.googlePrivateKey,
        // Dynamic AI config
        aiApiKey: systemParams.aiApiKey,
        aiModel: systemParams.aiModel,
        aiSystemPrompt: systemParams.aiSystemPrompt
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Đã có lỗi xảy ra khi kết nối với trợ lý AI. Vui lòng thử lại sau." }]);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <ClientOnly>
      <PageHeader 
        title="Trợ lý Tra cứu" 
        description="Tìm kiếm thông tin quy định và dữ liệu nội bộ bằng AI." 
        icon={FileSearch} 
      />
      <div className="p-4 md:p-6 max-w-5xl mx-auto h-[calc(100vh-180px)] flex flex-col">
        <Card className="flex-1 flex flex-col overflow-hidden border-2 shadow-xl">
          <CardHeader className="border-b bg-muted/20 py-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <CardTitle className="text-lg flex items-center gap-2 text-primary">
                <Bot className="h-5 w-5" />
                Hỏi đáp thông minh
              </CardTitle>
              <div className="flex bg-muted p-1 rounded-lg">
                <Button 
                  variant={searchMode === 'faq' ? 'default' : 'ghost'} 
                  size="sm" 
                  className="h-8 text-xs px-3"
                  onClick={() => { setSearchMode('faq'); setMessages([]); }}
                >
                  Hỏi đáp thủ tục
                </Button>
                <Button 
                  variant={searchMode === 'general' ? 'default' : 'ghost'} 
                  size="sm" 
                  className="h-8 text-xs px-3"
                  onClick={() => { setSearchMode('general'); setMessages([]); }}
                >
                  Kiến thức chung
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-10 space-y-4">
                  <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="h-8 w-8 text-primary animate-pulse" />
                  </div>
                  <div className="max-w-md mx-auto space-y-2">
                    <h3 className="font-bold text-xl">
                      {searchMode === 'faq' ? "Tra cứu thủ tục nội bộ" : "Chào bạn! Tôi có thể giúp gì cho bạn?"}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {searchMode === 'faq' 
                        ? "Nhập câu hỏi liên quan đến các thủ tục, quy định để tôi tra cứu giúp bạn từ dữ liệu hệ thống."
                        : "Tôi có thể trả lời các kiến thức chung hoặc hỗ trợ bạn sử dụng hệ thống bằng trí tuệ nhân tạo."}
                    </p>
                  </div>
                </div>
              )}

              
              {messages.map((msg, index) => (
                <div 
                  key={index} 
                  className={cn(
                    "flex gap-3 max-w-[85%]",
                    msg.role === 'user' ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center shrink-0 border",
                    msg.role === 'user' ? "bg-primary text-primary-foreground" : "bg-white text-primary"
                  )}>
                    {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={cn(
                    "rounded-2xl p-3 text-sm shadow-sm",
                    msg.role === 'user' 
                      ? "bg-primary text-primary-foreground rounded-tr-none" 
                      : "bg-white border rounded-tl-none text-foreground"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3 mr-auto max-w-[85%]">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 border bg-white text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="bg-white border rounded-2xl rounded-tl-none p-3 text-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span>Đang suy nghĩ...</span>
                  </div>
                </div>
              )}
              {isParamsLoading && messages.length === 0 && (
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
                    <span className="text-sm text-muted-foreground">Đang tải cấu hình AI...</span>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <CardFooter className="p-4 border-t bg-muted/10">
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
              className="flex w-full gap-2"
            >
              <Input 
                placeholder="Nhập câu hỏi của bạn tại đây..." 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="flex-1 shadow-inner h-11"
                disabled={isLoading}
              />
              <Button type="submit" size="icon" className="h-11 w-11 rounded-full shadow-lg" disabled={isLoading || !input.trim()}>
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </ClientOnly>
  );
}
