import { NextResponse } from 'next/server';
import { MODEL_PRICING, PREMIUM_THRESHOLD, PLAN_MODEL_ACCESS } from '@/lib/modelPricing';

const MUAPI_BASE = 'https://api.muapi.ai';

const PREMIUM_PLANS = ['pro', 'agency'];

function getApiKey(request) {
  return request.headers.get('x-api-key') || request.cookies.get('muapi_key')?.value;
}

function getUserPlan(request) {
  // ph_plan cookie is set after subscription checkout (Stripe/Supabase, coming soon)
  // Falls back to 'trial' when no plan is detected
  return request.cookies.get('ph_plan')?.value || 'trial';
}

function cleanHeaders(request) {
  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  headers.delete('cookie');
  return headers;
}

function extractModelId(body, contentType) {
  try {
    if (contentType?.includes('application/json')) {
      const json = JSON.parse(body);
      return json.model || json.model_name || json.modelId || null;
    }
    // multipart/form-data — best-effort extraction from raw text
    const match = body.match(/"model"\s*:\s*"([^"]+)"/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

function checkModelAccess(plan, modelId) {
  if (!modelId) return { allowed: true };

  const info = MODEL_PRICING[modelId];
  if (!info) return { allowed: true }; // unknown model — let muapi decide

  const allowedTiers = PLAN_MODEL_ACCESS[plan] ?? PLAN_MODEL_ACCESS.trial;

  if (!allowedTiers.includes(info.tier)) {
    const needsPlan = info.tier === 'premium' ? 'Pro' : 'Starter';
    return {
      allowed: false,
      model: modelId,
      cost: info.cost,
      tier: info.tier,
      message: `El modelo "${info.label}" cuesta $${info.cost.toFixed(3)} y requiere el plan ${needsPlan} o superior. Tu plan actual: ${plan}.`,
      upgrade_required: needsPlan.toLowerCase(),
    };
  }

  return { allowed: true, cost: info.cost, tier: info.tier };
}

async function proxyRequest(method, request, path, search, body) {
  const targetUrl = `${MUAPI_BASE}/api/v1/${path}${search}`;
  const headers = cleanHeaders(request);
  const apiKey = getApiKey(request);
  if (apiKey) headers.set('x-api-key', apiKey);

  const fetchOptions = { method, headers };
  if (body !== undefined) fetchOptions.body = body;

  const response = await fetch(targetUrl, fetchOptions);

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete('content-encoding');

  const data = await response.arrayBuffer();
  return new NextResponse(data, {
    status: response.status,
    headers: responseHeaders,
  });
}

export async function GET(request, { params }) {
  const { path: segments = [] } = await params;
  const path = segments.join('/');
  const { search } = new URL(request.url);
  return proxyRequest('GET', request, path, search);
}

export async function POST(request, { params }) {
  const { path: segments = [] } = await params;
  const path = segments.join('/');
  const { search } = new URL(request.url);

  const contentType = request.headers.get('content-type') || '';
  const rawBody = await request.arrayBuffer();

  // Model access check (JSON requests only — multipart passes through)
  if (contentType.includes('application/json')) {
    const bodyText = new TextDecoder().decode(rawBody);
    const modelId = extractModelId(bodyText, contentType);

    if (modelId) {
      const plan = getUserPlan(request);
      const access = checkModelAccess(plan, modelId);

      if (!access.allowed) {
        console.warn(`[PH GATE] BLOCKED model=${modelId} cost=$${access.cost} plan=${plan}`);
        return NextResponse.json(
          {
            error: 'model_access_denied',
            detail: access.message,
            model: access.model,
            cost: access.cost,
            upgrade_required: access.upgrade_required,
          },
          { status: 403 }
        );
      }

      if (access.tier === 'premium') {
        console.log(`[PH GATE] ALLOWED premium model=${modelId} cost=$${access.cost} plan=${plan}`);
      }
    }
  }

  return proxyRequest('POST', request, path, search, rawBody);
}

export async function PUT(request, { params }) {
  const { path: segments = [] } = await params;
  const path = segments.join('/');
  const { search } = new URL(request.url);
  const body = await request.arrayBuffer();
  return proxyRequest('PUT', request, path, search, body);
}

export async function DELETE(request, { params }) {
  const { path: segments = [] } = await params;
  const path = segments.join('/');
  const { search } = new URL(request.url);
  return proxyRequest('DELETE', request, path, search);
}
