import { NextRequest, NextResponse } from 'next/server';
import { testGenerationFlow } from '@/ai/flows/test-generation-flow';

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        },
    });
}

export async function POST(req: NextRequest) {
  try {
    const { content, file, type, count } = await req.json();
    
    if (!content && !file) {
      return NextResponse.json({ success: false, message: 'Content or file is required' }, { status: 400 });
    }

    const result = await testGenerationFlow({
      content,
      file,
      type: type || 'mcq',
      count: count || 5
    });

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('AI Generation Error:', error);
    return NextResponse.json({
      success: false,
      message: error.message
    }, { status: 500 });
  }
}
