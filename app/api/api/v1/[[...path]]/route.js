import { NextResponse } from 'next/server';
import { MODEL_PRICING, PLAN_MODEL_ACCESS } from '@/lib/modelPricing';

const MUAPI_BASE = 'https://api.muapi.ai';

function getApiKey(request) {
    const headerKey = request.headers.get('x-api-key');
    if (headerKey) return headerKey;
    return request.cookies.get('muapi_key')?.value;
}

function getUserPlan(request) {
    return request.cookies.get('ph_plan')?.value || 'trial';
}

function cleanHeaders(request) {
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('connection');
    headers.delete('cookie');
    return headers;
}

function checkModelAccess(plan, bodyText, contentType) {
    if (!contentType?.includes('application/json')) return { allowed: true };
    try {
        const json = JSON.parse(bodyText);
        const modelId = json.model || json.model_name || json.modelId;
        if (!modelId) return { allowed: true };

        const info = MODEL_PRICING[modelId];
        if (!info) return { allowed: true };

        const allowedTiers = PLAN_MODEL_ACCESS[plan] ?? PLAN_MODEL_ACCESS.trial;
        if (!allowedTiers.includes(info.tier)) {
            const needsPlan = info.tier === 'premium' ? 'Pro' : 'Starter';
            return {
                allowed: false,
                message: `El modelo "${info.label}" cuesta $${info.cost.toFixed(3)} y requiere el plan ${needsPlan}. Tu plan actual: ${plan}.`,
                upgrade_required: needsPlan.toLowerCase(),
                model: modelId,
                cost: info.cost,
            };
        }
    } catch {}
    return { allowed: true };
}

// Proxies /api/api/v1/* -> https://api.muapi.ai/api/v1/*
// Required because the AiAgent library hardcodes a double /api/api path.
export async function GET(request, { params }) {
    const { path: pathSegments = [] } = await params;
    const path = pathSegments.join('/');
    const { search } = new URL(request.url);
    const targetUrl = `${MUAPI_BASE}/api/v1/${path}${search}`;

    const headers = cleanHeaders(request);
    const apiKey = getApiKey(request);
    if (apiKey) headers.set('x-api-key', apiKey);

    try {
        const response = await fetch(targetUrl, { headers, method: 'GET' });
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request, { params }) {
    const { path: pathSegments = [] } = await params;
    const path = pathSegments.join('/');
    const { search } = new URL(request.url);
    const targetUrl = `${MUAPI_BASE}/api/v1/${path}${search}`;

    const contentType = request.headers.get('content-type') || '';
    const rawBody = await request.arrayBuffer();
    const bodyText = new TextDecoder().decode(rawBody);

    const plan = getUserPlan(request);
    const access = checkModelAccess(plan, bodyText, contentType);
    if (!access.allowed) {
        console.warn(`[PH GATE /api/api] BLOCKED model=${access.model} cost=$${access.cost} plan=${plan}`);
        return NextResponse.json(
            { error: 'model_access_denied', detail: access.message, upgrade_required: access.upgrade_required },
            { status: 403 }
        );
    }

    const headers = cleanHeaders(request);
    const apiKey = getApiKey(request);
    if (apiKey) headers.set('x-api-key', apiKey);

    try {
        const response = await fetch(targetUrl, { method: 'POST', headers, body: rawBody });
        const data = await response.json();
        return NextResponse.json(data, { status: response.status });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
