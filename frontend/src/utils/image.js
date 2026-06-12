export const compressImageFile = (file, options = {}) =>
  new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file selected'));
      return;
    }

    const {
      maxWidth = 1400,
      maxHeight = 1400,
      quality = 0.82,
      outputType = 'image/jpeg',
    } = options;

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read image'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Could not load image'));
      image.onload = () => {
        const widthRatio = maxWidth / image.width;
        const heightRatio = maxHeight / image.height;
        const scale = Math.min(1, widthRatio, heightRatio);
        const targetWidth = Math.max(1, Math.round(image.width * scale));
        const targetHeight = Math.max(1, Math.round(image.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('Canvas is not supported'));
          return;
        }

        context.drawImage(image, 0, 0, targetWidth, targetHeight);
        resolve(canvas.toDataURL(outputType, quality));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
