import { describe, it, expect } from 'vitest'
import { projectToJSON, projectFromJSON, projectToXML, projectFromXML } from '../serialization'
import type { Project } from '../../types/project'

const sampleProject: Project = {
  projectName: 'Test Story',
  nodes: [
    {
      id: 'A1',
      title: 'Opening Scene',
      type: 'scene',
      status: 'done',
      day: 1,
      block: 'Morning',
      path: 'A',
      x: 0,
      y: 0,
      summary: 'The story begins.',
      trigger: '',
      chars: ['c1'],
      branches: [{ option: 'A', desc: 'Go left', leads: ['A2'], effects: ['loyalty=high'], condition: null }],
      dialogue: '',
      grokHandoff: '',
      consequences: '',
      background: null,
      music: null,
      sfx: null,
      transition: 'fade',
      dialogueLines: [
        { id: 'dl1', speaker: 'c1', text: 'Hello world', characterPose: null, position: 'center', sfx: null }
      ],
      variables: []
    }
  ],
  edges: [
    { id: 'e1', from: 'A1', to: 'A2', label: 'A', desc: 'Go left', isDeath: false }
  ],
  characters: [
    { id: 'c1', name: 'Hero', color: '#4a8cff', sprites: [{ id: 's1', label: 'neutral', assetId: 'img1' }] }
  ],
  variables: [
    { id: 'v1', name: 'loyalty', type: 'number', defaultValue: 0 }
  ],
  assets: [
    { id: 'img1', name: 'hero_neutral', type: 'image', filename: 'img1.png', path: 'assets/img1.png' }
  ]
}

describe('JSON round-trip', () => {
  it('serializes and deserializes without data loss', () => {
    const json = projectToJSON(sampleProject)
    const restored = projectFromJSON(json)

    expect(restored.projectName).toBe(sampleProject.projectName)
    expect(restored.nodes).toHaveLength(1)
    expect(restored.nodes[0].id).toBe('A1')
    expect(restored.nodes[0].title).toBe('Opening Scene')
    expect(restored.nodes[0].type).toBe('scene')
    expect(restored.nodes[0].status).toBe('done')
    expect(restored.nodes[0].branches).toHaveLength(1)
    expect(restored.nodes[0].branches[0].leads).toEqual(['A2'])
    expect(restored.nodes[0].dialogueLines).toHaveLength(1)
    expect(restored.nodes[0].dialogueLines[0].text).toBe('Hello world')
    expect(restored.edges).toHaveLength(1)
    expect(restored.characters).toHaveLength(1)
    expect(restored.characters[0].sprites).toHaveLength(1)
    expect(restored.variables).toHaveLength(1)
    expect(restored.assets).toHaveLength(1)
  })

  it('produces valid JSON string', () => {
    const json = projectToJSON(sampleProject)
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it('wraps in envelope with meta', () => {
    const json = projectToJSON(sampleProject)
    const parsed = JSON.parse(json)
    expect(parsed.meta.app).toBe('Narrative Flow')
    expect(parsed.meta.version).toBe('2.0')
    expect(parsed.meta.projectName).toBe('Test Story')
  })

  it('handles empty project', () => {
    const empty: Project = { projectName: 'Empty', nodes: [], edges: [], characters: [], variables: [], assets: [] }
    const json = projectToJSON(empty)
    const restored = projectFromJSON(json)
    expect(restored.nodes).toHaveLength(0)
    expect(restored.edges).toHaveLength(0)
  })
})

describe('XML round-trip', () => {
  it('serializes and deserializes without data loss', () => {
    const xml = projectToXML(sampleProject)
    const restored = projectFromXML(xml)

    expect(restored.projectName).toBe(sampleProject.projectName)
    expect(restored.nodes).toHaveLength(1)
    expect(restored.nodes[0].id).toBe('A1')
    expect(restored.nodes[0].title).toBe('Opening Scene')
    expect(restored.edges).toHaveLength(1)
    expect(restored.characters).toHaveLength(1)
    expect(restored.variables).toHaveLength(1)
    expect(restored.assets).toHaveLength(1)
  })

  it('produces non-empty XML string', () => {
    const xml = projectToXML(sampleProject)
    expect(xml).toContain('narrativeFlow')
    expect(xml).toContain('A1')
    expect(xml).toContain('Test Story')
  })

  it('handles single-node project (no array collapse)', () => {
    // A common XML pitfall: single-element arrays get collapsed to objects
    const xml = projectToXML(sampleProject)
    const restored = projectFromXML(xml)
    // Should still be arrays even with one element
    expect(Array.isArray(restored.nodes)).toBe(true)
    expect(Array.isArray(restored.edges)).toBe(true)
    expect(Array.isArray(restored.characters)).toBe(true)
  })
})

describe('normalizeProject handles missing fields', () => {
  it('fills in defaults for missing node fields', () => {
    const partial = {
      projectName: 'Partial',
      nodes: [{ id: 'X1', x: 0, y: 0 }] as Parameters<typeof projectFromJSON>[0] extends string ? never : never,
      edges: [], characters: [], variables: [], assets: []
    }
    const json = JSON.stringify({ meta: { projectName: 'Partial' }, ...partial })
    const restored = projectFromJSON(json)
    expect(restored.nodes[0].type).toBe('scene')
    expect(restored.nodes[0].status).toBe('todo')
    expect(restored.nodes[0].branches).toEqual([])
    expect(restored.nodes[0].dialogueLines).toEqual([])
  })
})
