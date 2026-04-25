import { NextResponse } from 'next/server';

export function authenticateApiKey(request: Request) {
    const authHeader = request.headers.get('authorization');
    const apiKeyHeader = request.headers.get('x-api-key');

    const token = (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null) || apiKeyHeader;
    const expectedKey = process.env.EXTERNAL_API_KEY || "kiemtranoibo_default_secret_key_2026";

    return token === expectedKey;
}

export function unauthorizedResponse() {
    return NextResponse.json({ success: false, message: 'Unauthorized. Invalid API Key.' }, { status: 401 });
}
