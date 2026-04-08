import type { StoryNode, DialogueLine, Character, Asset } from '../../types/project'
import styles from './PlayMode.module.css'

interface Props {
  currentLine: DialogueLine | null
  node: StoryNode | null
  characters: Character[]
  assets: Asset[]
  projectDir: string
}

type Zone = 'left' | 'center' | 'right'
const ZONES: Zone[] = ['left', 'center', 'right']

export default function PlaySprites({ currentLine, node, characters, assets, projectDir }: Props) {
  if (!node) return null

  // Build a map of zone → character+sprite for this line
  const zoneMap: Map<Zone, { char: Character; spriteAsset: Asset | null }> = new Map()

  if (currentLine) {
    const charIds = node.chars
    for (const charId of charIds) {
      const char = characters.find(c => c.id === charId)
      if (!char) continue

      // Find which dialogue lines mention this character to determine position
      // For current line, if the speaker is this char, use their position
      let zone: Zone = 'left'
      if (currentLine.speaker === charId) {
        zone = currentLine.position
      } else {
        // For non-speaking characters, derive position from their first appearance in this node
        const firstLine = node.dialogueLines.find(l => l.speaker === charId)
        if (firstLine) zone = firstLine.position
        else continue // don't show if never speaks in this scene
      }

      // Find the sprite asset
      const poseId = currentLine.speaker === charId ? currentLine.characterPose : null
      const sprite = poseId
        ? char.sprites.find(s => s.id === poseId)
        : (char.sprites[0] ?? null)
      const spriteAsset = sprite ? assets.find(a => a.id === sprite.assetId) ?? null : null

      zoneMap.set(zone, { char, spriteAsset })
    }
  }

  return (
    <div className={styles.sprites}>
      {ZONES.map(zone => {
        const entry = zoneMap.get(zone)
        const isActiveSpeaker = entry && currentLine?.speaker === entry.char.id

        return (
          <div key={zone} className={`${styles.spriteZone} ${styles[`zone_${zone}`]}`}>
            {entry && (
              <img
                className={`${styles.spriteImg} ${isActiveSpeaker ? styles.spriteActive : styles.spriteDim}`}
                src={
                  entry.spriteAsset && projectDir
                    ? `asset://local${projectDir}/assets/${entry.spriteAsset.filename}`
                    : ''
                }
                alt={entry.char.name}
                draggable={false}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
