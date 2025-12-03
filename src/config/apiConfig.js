export const API_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:4000'

export const IMAGE_BASE_URL =
  import.meta.env.VITE_R2_PUBLIC_BASE_URL?.replace(/\/+$/, '') ||
  `${API_URL}/product-image`
