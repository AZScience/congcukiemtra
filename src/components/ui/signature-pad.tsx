'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Button } from './button';
import { RotateCcw, PenTool, Maximize2, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from './dialog';

interface SignaturePadProps {
    value?: string; // Base64 string
    onChange: (value: string) => void;
    disabled?: boolean;
    t?: (key: string) => string;
}

export function SignaturePad({ value, onChange, disabled, t }: SignaturePadProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    
    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        if (disabled) return;
        setIsDrawing(true);
        draw(e);
    };

    const stopDrawing = () => {
        setIsDrawing(false);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing || disabled || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const rect = canvas.getBoundingClientRect();
        let clientX, clientY;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = (clientX - rect.left) * (canvas.width / rect.width);
        const y = (clientY - rect.top) * (canvas.height / rect.height);

        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#000';

        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const clear = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
    };

    const handleConfirm = () => {
        if (canvasRef.current) {
            const dataUrl = canvasRef.current.toDataURL();
            // Check if blank (can be tricky, but basic check is usually fine)
            onChange(dataUrl);
            setIsOpen(false);
        }
    };

    // Load existing signature into canvas when dialog opens
    useEffect(() => {
        if (isOpen && value && canvasRef.current) {
            const img = new Image();
            img.src = value;
            img.onload = () => {
                const canvas = canvasRef.current;
                const ctx = canvas?.getContext('2d');
                if (ctx && canvas) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                }
            };
        }
    }, [isOpen, value]);

    return (
        <div className="space-y-2">
            <Dialog open={isOpen} onOpenChange={(val) => !disabled && setIsOpen(val)}>
                <DialogTrigger asChild>
                    <div className="relative border-2 border-dashed border-muted-foreground/30 rounded-lg overflow-hidden bg-white cursor-pointer hover:bg-muted/10 transition-colors group">
                        {value ? (
                            <img src={value} alt="Signature Preview" className="w-full h-[100px] object-contain p-2" />
                        ) : (
                            <div className="w-full h-[100px] flex flex-col items-center justify-center text-muted-foreground gap-1">
                                <PenTool className="h-5 w-5 opacity-50" />
                                <span className="text-xs">{disabled ? 'Chưa có chữ ký' : 'Nhấp để ký tên'}</span>
                            </div>
                        )}
                        {!disabled && (
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Maximize2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                        )}
                    </div>
                </DialogTrigger>
                
                <DialogContent className="sm:max-w-2xl bg-white p-0 overflow-hidden">
                    <DialogHeader className="p-4 border-b">
                        <DialogTitle className="flex items-center gap-2">
                            <PenTool className="h-5 w-5 text-rose-500" />
                            Ký tên xác nhận
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="p-4 bg-slate-50">
                        <div className="relative border-2 border-slate-300 rounded-xl bg-white shadow-inner overflow-hidden">
                            <canvas
                                ref={canvasRef}
                                width={800}
                                height={400}
                                className="w-full aspect-[2/1] touch-none cursor-crosshair"
                                onMouseDown={startDrawing}
                                onMouseMove={draw}
                                onMouseUp={stopDrawing}
                                onMouseOut={stopDrawing}
                                onTouchStart={startDrawing}
                                onTouchMove={draw}
                                onTouchEnd={stopDrawing}
                            />
                            <div className="absolute top-2 left-2 text-[10px] text-slate-400 font-bold uppercase pointer-events-none">
                                Vùng ký tên của sinh viên
                            </div>
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={clear}
                                className="absolute bottom-3 right-3 h-9 gap-2 shadow-sm border-rose-200 text-rose-600 hover:bg-rose-50"
                            >
                                <RotateCcw className="h-4 w-4" />
                                Xóa chữ ký
                            </Button>
                        </div>
                    </div>
                    
                    <DialogFooter className="p-4 border-t bg-slate-50 gap-2">
                        <Button variant="ghost" onClick={() => setIsOpen(false)}>Hủy bỏ</Button>
                        <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700 gap-2">
                            <Check className="h-4 w-4" />
                            Xác nhận chữ ký
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            
            {value && !disabled && (
                <p className="text-[10px] text-muted-foreground italic">Nhấp vào hình trên để ký lại nếu cần.</p>
            )}
        </div>
    );
}
