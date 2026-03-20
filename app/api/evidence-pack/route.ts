import { generateEvidencePDF } from '@/lib/generate-evidence-pdf'
import connectToDatabase from '@/lib/mongodb'
import Employer from '@/lib/models/Employer'
import Worker from '@/lib/models/Worker'
import LMIAApplication from '@/lib/models/LMIAApplication'
import WageCache from '@/lib/models/WageCache'

export async function POST(request: Request) {
  try {
    await connectToDatabase()
    const { employerId, workerId, applicationId } = await request.json()

    const [employer, worker, application] = await Promise.all([
      Employer.findById(employerId).lean(),
      Worker.findById(workerId).lean(),
      LMIAApplication.findById(applicationId).lean()
    ])

    if (!employer || !worker || !application) {
      return new Response(JSON.stringify({ error: 'Missing data' }), { status: 404 })
    }

    const wageCache = await WageCache.findOne({
      nocCode: (employer as any).nocCode,
      province: (employer as any).province
    }).lean()

    const wageData = (wageCache as any)?.data || null

    const doc = generateEvidencePDF({ employer, worker, application, wageData })

    const pdfBytes = doc.output('arraybuffer')

    return new Response(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="LMIA-Evidence-Pack-${(employer as any).companyName}-${new Date().toISOString().split('T')[0]}.pdf"`
      }
    })
  } catch (error: any) {
    console.error('[Evidence Pack] Error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
}
