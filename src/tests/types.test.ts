import { describe, it, expect } from 'vitest'
import { AVAILABLE_MODELS, DEFAULT_MODEL } from '../shared/types'
import type { ModelInfo, StreamChunk, AgentActivity } from '../shared/types'

describe('AVAILABLE_MODELS', () => {
  it('contains at least one model', () => {
    expect(AVAILABLE_MODELS.length).toBeGreaterThan(0)
  })

  it('every model has required fields', () => {
    for (const model of AVAILABLE_MODELS) {
      expect(model.name).toBeTruthy()
      expect(model.label).toBeTruthy()
      expect(model.size).toBeTruthy()
      expect(model.sizeBytes).toBeGreaterThan(0)
      expect(model.description).toBeTruthy()
    }
  })

  it('model names are valid HuggingFace repo IDs', () => {
    for (const model of AVAILABLE_MODELS) {
      expect(model.name).toMatch(/^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+$/)
    }
  })

  it('at most one model is marked as recommended', () => {
    const recommended = AVAILABLE_MODELS.filter((m) => m.recommended)
    expect(recommended.length).toBeLessThanOrEqual(1)
  })

  it('model sizeBytes are positive integers', () => {
    for (const model of AVAILABLE_MODELS) {
      expect(Number.isInteger(model.sizeBytes)).toBe(true)
      expect(model.sizeBytes).toBeGreaterThan(0)
    }
  })
})

describe('DEFAULT_MODEL', () => {
  it('is a non-empty string', () => {
    expect(typeof DEFAULT_MODEL).toBe('string')
    expect(DEFAULT_MODEL.length).toBeGreaterThan(0)
  })

  it('refers to a model that exists in AVAILABLE_MODELS', () => {
    const names = AVAILABLE_MODELS.map((m: ModelInfo) => m.name)
    expect(names).toContain(DEFAULT_MODEL)
  })
})

describe('StreamChunk type structure', () => {
  it('token chunk has text', () => {
    const chunk: StreamChunk = { type: 'token', text: 'hello' }
    expect(chunk.type).toBe('token')
    if (chunk.type === 'token') {
      expect(chunk.text).toBe('hello')
    }
  })

  it('done chunk has correct type', () => {
    const chunk: StreamChunk = { type: 'done' }
    expect(chunk.type).toBe('done')
  })

  it('error chunk has error message', () => {
    const chunk: StreamChunk = { type: 'error', error: 'Something went wrong' }
    expect(chunk.type).toBe('error')
    if (chunk.type === 'error') {
      expect(chunk.error).toBe('Something went wrong')
    }
  })

  it('activity chunk with idle kind', () => {
    const activity: AgentActivity = { kind: 'idle' }
    const chunk: StreamChunk = { type: 'activity', activity }
    expect(chunk.type).toBe('activity')
    if (chunk.type === 'activity') {
      expect(chunk.activity.kind).toBe('idle')
    }
  })
})
