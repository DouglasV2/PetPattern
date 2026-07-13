import { t } from '../i18n'

export const PHOTO_AREAS = ['EAR', 'PAW', 'SKIN', 'COAT', 'EYE', 'STOOL', 'WOUND', 'SWELLING', 'SHELL', 'FEATHER', 'FIN_SCALE', 'OTHER']

export function isProfilePhoto(photo) {
  return String(photo?.area || '').toUpperCase() === 'PROFILE'
}

export function photoAreaLabel(area) {
  switch (String(area || 'OTHER').toUpperCase()) {
    case 'PROFILE': return t('Profile photo')
    case 'EAR': return t('Ears')
    case 'PAW': return t('Paw')
    case 'SKIN': return t('Skin')
    case 'COAT': return t('Coat')
    case 'EYE': return t('Eyes')
    case 'STOOL': return t('Stool')
    case 'WOUND': return t('Wound / visible change')
    case 'SWELLING': return t('Swelling')
    case 'SHELL': return t('Shell')
    case 'FEATHER': return t('Feathers')
    case 'FIN_SCALE': return t('Fins / scales')
    default: return t('Other')
  }
}

export function byCapturedDateAsc(a, b) {
  return String(a.capturedDate).localeCompare(String(b.capturedDate))
}

// Downscale + re-encode to JPEG in the browser so uploads stay small and
// the stored bytes are a known-safe raster type.
export function resizeImage(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    if (!file.type || !file.type.startsWith('image/')) {
      reject(new Error('not an image'))
      return
    }
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const width = Math.max(1, Math.round(img.width * scale))
      const height = Math.max(1, Math.round(img.height * scale))
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('encode failed'))),
        'image/jpeg',
        quality
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('could not load image'))
    }
    img.src = url
  })
}
