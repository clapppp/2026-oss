import { NextRequest, NextResponse } from 'next/server'

export const maxDuration = 600 // 10분

const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8000'

async function handler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params
  const url = `${BACKEND}/${path.join('/')}${req.nextUrl.search}`

  const headers = new Headers()
  req.headers.forEach((v, k) => {
    if (!['host', 'connection'].includes(k)) headers.set(k, v)
  })

  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body

  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body,
    // @ts-expect-error Node.js fetch needs this for streaming bodies
    duplex: 'half',
  })

  const resHeaders = new Headers()
  upstream.headers.forEach((v, k) => resHeaders.set(k, v))

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: resHeaders,
  })
}

export const GET = handler
export const POST = handler
export const DELETE = handler
export const PUT = handler
export const PATCH = handler
