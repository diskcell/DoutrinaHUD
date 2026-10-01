import { requireSupabase } from '../../lib/supabase';

const ASSET_BUCKET = 'doutrinahud-assets';

function extensionForMimeType(mimeType: string) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/svg+xml') return 'svg';
  return 'jpg';
}

export function getCloudAssetUrl(path?: string | null) {
  if (!path) return '';

  return requireSupabase().storage.from(ASSET_BUCKET).getPublicUrl(path).data.publicUrl;
}

export async function uploadCloudImage(
  workspaceId: string,
  directory: 'teams' | 'players',
  dataUrl: string
) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  if (!blob.type.startsWith('image/')) {
    throw new Error('O arquivo selecionado nao e uma imagem valida.');
  }

  if (blob.size > 5 * 1024 * 1024) {
    throw new Error('A imagem deve ter no maximo 5 MB.');
  }

  const extension = extensionForMimeType(blob.type);
  const path = `${workspaceId}/${directory}/manual-${crypto.randomUUID()}.${extension}`;
  const { error } = await requireSupabase()
    .storage
    .from(ASSET_BUCKET)
    .upload(path, blob, {
      cacheControl: '31536000',
      contentType: blob.type,
      upsert: false,
    });

  if (error) throw error;
  return path;
}
