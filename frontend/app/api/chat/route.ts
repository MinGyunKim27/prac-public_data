export const maxDuration = 60

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080'

// userType 매핑: 프론트 → 백엔드
const USER_TYPE_MAP: Record<string, string> = {
  pregnant: 'ELDERLY',
  withStroller: 'STROLLER',
  disabled: 'WHEELCHAIR',
  elderly: 'ELDERLY',
  general: 'ELDERLY',
}

// 세션 캐시 (개발용 - 서버 재시작 시 초기화)
const sessionCache = new Map<string, number>()

async function getOrCreateSession(deviceId: string): Promise<number> {
  const cached = sessionCache.get(deviceId)
  if (cached) return cached

  try {
    const res = await fetch(`${BACKEND_URL}/api/chat/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
      signal: AbortSignal.timeout(5000),
    })
    const data = await res.json()
    const sessionId: number = data.sessionId ?? 1
    sessionCache.set(deviceId, sessionId)
    return sessionId
  } catch {
    return 1
  }
}

export async function POST(req: Request) {
  const body = await req.json()
  const { id: chatId, messages, context } = body

  const deviceId = `web-${chatId || 'default'}`
  const sessionId = await getOrCreateSession(deviceId)

  // 마지막 사용자 메시지 추출
  const lastUserMsg = [...(messages ?? [])].reverse().find((m: any) => m.role === 'user')
  const messageText: string =
    lastUserMsg?.parts
      ?.filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('') ?? ''

  const backendUserType = USER_TYPE_MAP[context?.userType ?? 'general'] ?? 'ELDERLY'
  const lat: number = context?.lat ?? context?.origin?.lat ?? 37.5665
  const lng: number = context?.lng ?? context?.origin?.lng ?? 126.978
  const stdgCd: string = context?.stdgCd || '1111010100'

  // 백엔드 AI 채팅 호출
  let backendRes: Response
  try {
    backendRes = await fetch(`${BACKEND_URL}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        sessionId,
        message: messageText,
        userType: backendUserType,
        lat,
        lng,
        stdgCd,
      }),
    })
  } catch (err) {
    console.error('백엔드 채팅 연결 실패:', err)
    // 연결 실패 시 AI SDK 데이터 스트림 포맷으로 오류 반환
    const errMsg = '죄송합니다. 현재 AI 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.'
    return new Response(`0:${JSON.stringify(errMsg)}\nd:{"finishReason":"error","usage":{"inputTokens":0,"outputTokens":0}}\n`, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Vercel-AI-Data-Stream': 'v1',
      },
    })
  }

  if (!backendRes.ok || !backendRes.body) {
    const errMsg = `서버 오류가 발생했습니다. (${backendRes.status})`
    return new Response(`0:${JSON.stringify(errMsg)}\nd:{"finishReason":"error","usage":{"inputTokens":0,"outputTokens":0}}\n`, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Vercel-AI-Data-Stream': 'v1',
      },
    })
  }

  // 백엔드 SSE → Vercel AI SDK 데이터 스트림 포맷 변환
  const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
  const writer = writable.getWriter()
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  ;(async () => {
    const reader = backendRes.body!.getReader()
    let buffer = ''
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6).trim()
            if (payload === '[DONE]') {
              // 완료 신호
              await writer.write(
                encoder.encode(`d:{"finishReason":"stop","usage":{"inputTokens":0,"outputTokens":0}}\n`)
              )
            } else if (payload) {
              // 텍스트 청크 → AI SDK 포맷
              await writer.write(encoder.encode(`0:${JSON.stringify(payload)}\n`))
            }
          }
          // event: done 라인은 무시 (data: [DONE]으로 처리)
        }
      }

      // 버퍼 잔여분 처리
      if (buffer.startsWith('data: ')) {
        const payload = buffer.slice(6).trim()
        if (payload && payload !== '[DONE]') {
          await writer.write(encoder.encode(`0:${JSON.stringify(payload)}\n`))
        }
      }
    } catch (err) {
      console.error('SSE 스트림 변환 오류:', err)
    } finally {
      await writer.close()
    }
  })()

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Vercel-AI-Data-Stream': 'v1',
    },
  })
}
