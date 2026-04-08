import { useState, useEffect } from 'react'
import type { Asset } from '../../types/project'
import styles from './PlayMode.module.css'

interface Props {
  assetId: string | null
  assets: Asset[]
  projectDir: string
}

export default function PlayBackground({ assetId, assets, projectDir }: Props) {
  const [src, setSrc] = useState<string | null>(null)
  const [prevSrc, setPrevSrc] = useState<string | null>(null)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const asset = assetId ? assets.find(a => a.id === assetId) : null
    const newSrc = asset && projectDir
      ? `asset://local${projectDir}/assets/${asset.filename}`
      : null

    if (newSrc !== src) {
      setPrevSrc(src)
      setSrc(newSrc)
      setFading(true)
      const t = setTimeout(() => setFading(false), 400)
      return () => clearTimeout(t)
    }
  }, [assetId, assets, projectDir]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={styles.background}>
      {prevSrc && fading && (
        <img
          className={`${styles.bgImage} ${styles.bgImageOut}`}
          src={prevSrc}
          alt=""
          draggable={false}
        />
      )}
      {src ? (
        <img
          className={`${styles.bgImage} ${fading ? styles.bgImageIn : ''}`}
          src={src}
          alt=""
          draggable={false}
        />
      ) : (
        <div className={styles.bgFallback} />
      )}
    </div>
  )
}
