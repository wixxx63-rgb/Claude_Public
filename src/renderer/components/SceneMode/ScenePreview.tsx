import React, { useMemo } from 'react'
import { useProjectStore } from '../../store/useProjectStore'
import { useUIStore } from '../../store/useUIStore'
import styles from './SceneMode.module.css'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ScenePreviewProps {
  nodeId: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildAssetUrl(filePath: string | null, filename: string, assetPath: string): string {
  if (filePath) {
    const dir = filePath.replace(/\\/g, '/').replace(/\/[^/]+$/, '')
    return `asset://local${dir}/assets/${filename}`
  }
  return assetPath
}

// ─── Component ────────────────────────────────────────────────────────────────

const ScenePreview: React.FC<ScenePreviewProps> = ({ nodeId }) => {
  const node = useProjectStore((s) => s.project.nodes.find((n) => n.id === nodeId))
  const characters = useProjectStore((s) => s.project.characters)
  const assets = useProjectStore((s) => s.project.assets)
  const filePath = useProjectStore((s) => s.filePath)

  const activeLineId = useUIStore((s) => s.activeLineId)
  const startPlay = useUIStore((s) => s.startPlay)

  const currentLine = useMemo(() => {
    if (!node) return null
    if (activeLineId) {
      return node.dialogueLines.find((l) => l.id === activeLineId) ?? node.dialogueLines[0] ?? null
    }
    return node.dialogueLines[0] ?? null
  }, [node, activeLineId])

  const bgAsset = node?.background ? assets.find((a) => a.id === node.background) : null
  const bgUrl = bgAsset ? buildAssetUrl(filePath, bgAsset.filename, bgAsset.path) : null

  // Build sprite data for each zone
  const spriteZones = useMemo(() => {
    const zones: { position: 'left' | 'center' | 'right'; url: string | null; charId: string | null }[] = [
      { position: 'left', url: null, charId: null },
      { position: 'center', url: null, charId: null },
      { position: 'right', url: null, charId: null },
    ]

    if (!node || !currentLine) return zones

    // For each line in node, find unique characters at each position
    // We show the current line's speaker's sprite in the current line's position
    // and any other speakers who appear at other positions in nearby lines
    const charPositionMap: Record<string, 'left' | 'center' | 'right'> = {}
    const charPoseMap: Record<string, string | null> = {}

    for (const line of node.dialogueLines) {
      if (line.speaker) {
        charPositionMap[line.speaker] = line.position
        if (line.id === currentLine.id) {
          charPoseMap[line.speaker] = line.characterPose
        }
      }
    }

    // Override with current line's speaker
    if (currentLine.speaker) {
      charPositionMap[currentLine.speaker] = currentLine.position
      charPoseMap[currentLine.speaker] = currentLine.characterPose
    }

    for (const [charId, pos] of Object.entries(charPositionMap)) {
      const char = characters.find((c) => c.id === charId)
      if (!char) continue
      const poseId = charPoseMap[charId]
      const sprite = poseId
        ? char.sprites.find((s) => s.id === poseId) ?? char.sprites[0]
        : char.sprites[0]

      if (!sprite) continue
      const spriteAsset = assets.find((a) => a.id === sprite.assetId)
      if (!spriteAsset) continue

      const url = buildAssetUrl(filePath, spriteAsset.filename, spriteAsset.path)
      const zone = zones.find((z) => z.position === pos)
      if (zone) {
        zone.url = url
        zone.charId = charId
      }
    }

    return zones
  }, [node, currentLine, characters, assets, filePath])

  const speakerChar = currentLine?.speaker
    ? characters.find((c) => c.id === currentLine.speaker)
    : null

  if (!node) return null

  return (
    <div className={styles.previewWrapper}>
      {/* Background */}
      <div
        className={styles.previewBg}
        style={
          bgUrl
            ? { backgroundImage: `url("${bgUrl}")` }
            : { background: 'linear-gradient(180deg, #0d0d14 0%, #1a1a2a 100%)' }
        }
      />

      {/* Character sprites */}
      <div className={styles.previewSprites}>
        {spriteZones.map((zone) => (
          <div key={zone.position} className={styles.spriteZone}>
            {zone.url && (
              <img
                src={zone.url}
                alt={zone.position}
                className={styles.spriteImg}
                style={{
                  opacity:
                    !currentLine?.speaker ||
                    zone.charId === currentLine.speaker
                      ? 1
                      : 0.6,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Dialogue box */}
      {currentLine ? (
        <div className={styles.previewDialogueBox}>
          {(speakerChar || currentLine.speaker === null) && (
            <div
              className={styles.previewSpeaker}
              style={{ color: speakerChar?.color ?? '#ffffff' }}
            >
              {speakerChar?.name ?? 'Narrator'}
            </div>
          )}
          <div className={styles.previewText}>
            {currentLine.text || <em className={styles.emptyText}>No text yet…</em>}
          </div>
        </div>
      ) : (
        <div className={styles.previewPlaceholder}>No dialogue lines yet</div>
      )}

      {/* Play from here button */}
      <button
        className={styles.playFromHereBtn}
        onClick={() => startPlay(nodeId)}
        title="Play from this scene"
      >
        ▶ Play from here
      </button>
    </div>
  )
}

export default ScenePreview
