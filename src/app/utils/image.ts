/**
 * Réduit une image (data URL) pour qu'elle tienne facilement dans un document Firestore (limite 1 Mo).
 * Une photo de profil 320 px en JPEG qualité 0.7 pèse environ 20 à 40 Ko.
 */
export function shrinkImage(dataUrl: string, maxSize = 320, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error("Impossible de traiter l'image."));
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error("Image illisible."));
    img.src = dataUrl;
  });
}
