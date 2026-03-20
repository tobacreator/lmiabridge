import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import LMIAApplication from '@/lib/models/LMIAApplication';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const { itemId, checked } = await req.json();
    const { id } = params;

    if (!itemId || typeof checked !== 'boolean') {
      return NextResponse.json({ error: 'Invalid itemId or checked value' }, { status: 400 });
    }

    const app = await LMIAApplication.findById(id);
    if (!app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Find existing item or create new one
    const checklist = app.complianceChecklist || [];
    const existingIndex = checklist.findIndex((item: any) => item.itemId === itemId);

    if (existingIndex >= 0) {
      checklist[existingIndex].checked = checked;
      checklist[existingIndex].checkedAt = checked ? new Date() : undefined;
      checklist[existingIndex].checkedBy = 'employer';
    } else {
      checklist.push({
        itemId,
        label: itemId,
        checked,
        checkedAt: checked ? new Date() : undefined,
        checkedBy: 'employer'
      });
    }

    app.complianceChecklist = checklist;
    await app.save();

    return NextResponse.json({ complianceChecklist: app.complianceChecklist });
  } catch (error: any) {
    console.error('[LMIA Checklist] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
