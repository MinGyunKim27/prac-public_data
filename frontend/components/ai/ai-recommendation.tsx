'use client'

import { useState, useEffect, useRef } from 'react'
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Sparkles, X, Send, Loader2, RefreshCw, AlertTriangle, Navigation } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Location, MobilityAid, UserType } from '@/types/transportation'

interface AIRecommendationProps {
  origin: Location
  destination: Location
  mobilityAid: MobilityAid
  userType: UserType
  stdgCd?: string
  currentLocation?: Location | null
  onClose: () => void
}

export function AIRecommendation({ origin, destination, mobilityAid, userType, stdgCd, currentLocation, onClose }: AIRecommendationProps) {
  const [input, setInput] = useState('')
  const [hasInitialMessage, setHasInitialMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: '/api/chat',
      prepareSendMessagesRequest: ({ id, messages }) => ({
        body: {
          id,
          messages,
          context: {
            origin,
            destination,
            mobilityAid,
            userType,
            stdgCd: stdgCd || '',
            lat: currentLocation?.lat ?? origin.lat,
            lng: currentLocation?.lng ?? origin.lng,
          },
        },
      }),
    }),
  })

  const isLoading = status === 'streaming' || status === 'submitted'

  // 초기 메시지 자동 전송
  useEffect(() => {
    if (!hasInitialMessage && origin && destination) {
      const initialMessage = `${origin.name || '현재 위치'}에서 ${destination.name || '목적지'}까지 가는 최적의 경로를 추천해주세요.`
      sendMessage({ text: initialMessage })
      setHasInitialMessage(true)
    }
  }, [origin, destination, hasInitialMessage, sendMessage])

  // 메시지 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    sendMessage({ text: input })
    setInput('')
  }

  const handleRetry = () => {
    if (messages.length > 0) {
      const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')
      if (lastUserMessage) {
        const text = lastUserMessage.parts
          ?.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
          .map((p) => p.text)
          .join('')
        if (text) {
          sendMessage({ text })
        }
      }
    }
  }

  return (
    <Card className="shadow-lg border-primary/20">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">AI 경로 추천</CardTitle>
            <p className="text-xs text-muted-foreground">실시간 데이터 기반 최적 경로 안내</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="pt-0">
        {/* 경로 요약 */}
        <div className="flex items-center gap-2 p-3 bg-accent rounded-lg mb-4 text-sm">
          <Navigation className="h-4 w-4 text-primary shrink-0" />
          <span className="font-medium">{origin.name || '현재 위치'}</span>
          <span className="text-muted-foreground">→</span>
          <span className="font-medium">{destination.name || '목적지'}</span>
        </div>

        {/* 메시지 영역 */}
        <div className="max-h-[300px] overflow-y-auto space-y-4 mb-4 pr-1">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-muted text-foreground rounded-bl-sm'
                }`}
              >
                {message.parts.map((part, index) => {
                  if (part.type === 'text') {
                    return (
                      <p key={index} className="text-sm leading-relaxed whitespace-pre-wrap">
                        {part.text}
                      </p>
                    )
                  }
                  return null
                })}
              </div>
            </div>
          ))}

          {/* 로딩 표시 */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">경로를 분석하고 있습니다...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 오류 시 재시도 */}
        {status === 'error' && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-lg mb-4">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <span className="text-sm text-destructive">응답을 가져오는데 실패했습니다.</span>
            <Button variant="outline" size="sm" onClick={handleRetry} className="ml-auto">
              <RefreshCw className="h-4 w-4 mr-1" />
              재시도
            </Button>
          </div>
        )}

        {/* 입력 영역 */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="추가 질문이 있으시면 입력하세요..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()} size="icon" className="shrink-0">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>

        {/* 빠른 질문 버튼 */}
        <div className="flex flex-wrap gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => sendMessage({ text: '주변에 화장실이 어디 있나요?' })}
            disabled={isLoading}
          >
            화장실 위치
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sendMessage({ text: '콜택시 예상 대기시간은 얼마나 되나요?' })}
            disabled={isLoading}
          >
            콜택시 대기시간
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => sendMessage({ text: '저상버스로 갈 수 있는 경로가 있나요?' })}
            disabled={isLoading}
          >
            저상버스 경로
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
