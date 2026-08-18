import { NextResponse } from 'next/server';
import { MODEL_PRICING, PLAN_MODEL_ACCESS, PREMIUM_THRESHOLD } from '@/lib/modelPricing';

// GET /api/model-info?model=kling-v2.1-master-t2v
// GET /api/model-info  → returns all premium models list
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const modelId = searchParams.get('model');
  const plan = request.cookies.get('ph_plan')?.value || 'trial';

  if (modelId) {
    const info = MODEL_PRICING[modelId] ?? { cost: 0, tier: 'standard', type: 'unknown', label: modelId };
    const allowedTiers = PLAN_MODEL_ACCESS[plan] ?? PLAN_MODEL_ACCESS.trial;
    return NextResponse.json({
      model: modelId,
      ...info,
      plan,
      allowed: allowedTiers.includes(info.tier),
    });
  }

  // Return all premium models (≥ threshold)
  const premium = Object.entries(MODEL_PRICING)
    .filter(([, v]) => v.cost >= PREMIUM_THRESHOLD)
    .sort(([, a], [, b]) => b.cost - a.cost)
    .map(([id, v]) => ({ id, ...v }));

  return NextResponse.json({ threshold: PREMIUM_THRESHOLD, count: premium.length, models: premium });
}
